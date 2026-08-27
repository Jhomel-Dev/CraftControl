import http from "http";
import os from "os";
import fs from "fs/promises";
import EnvManager from "../config/EnvManager.js";
import SmartBootService from "../services/SmartBootService.js";

export default class LocalDaemonController {
  constructor(port = EnvManager.getDaemonPort()) {
    this.port = port;
    this.status = "initializing";
    this.server = null;
    this.onUnlinkCallback = null;
    this.onShutdownCallback = null;
  }

  async start() {
    await SmartBootService.runPreflightCleanup();
    await this._bindToAvailablePort(this.port);
    EnvManager.writeDaemonLock(this.port);
  }

  async _bindToAvailablePort(startPort) {
    let currentPort = Number(startPort) || 45987;
    while (true) {
      const bound = await this._tryListen(currentPort);
      if (bound) {
        this.port = currentPort;
        return;
      }
      currentPort += 1;
    }
  }

  _tryListen(port) {
    return new Promise((resolve) => {
      const tempServer = http.createServer((req, res) =>
        this.handleRequest(req, res),
      );
      tempServer.once("error", () => resolve(false));
      tempServer.listen(port, "127.0.0.1", () => {
        this.server = tempServer;
        resolve(true);
      });
    });
  }

  setStatus(newStatus) {
    this.status = newStatus;
  }

  onUnlink(callback) {
    this.onUnlinkCallback = callback;
  }

  onShutdown(callback) {
    this.onShutdownCallback = callback;
  }

  handleRequest(req, res) {
    this._setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      return this._sendResponse(res, 200);
    }

    if (!this._isAuthorizedRequest(req)) {
      return this._sendResponse(res, 401, {
        success: false,
        error: "Unauthorized",
      });
    }

    const routeHandler = this._getRouteHandler(req.method, req.url);
    if (!routeHandler) {
      return this._sendResponse(res, 404);
    }

    return routeHandler.call(this, req, res);
  }

  _setCorsHeaders(req, res) {
    const origin = req.headers.origin || "";
    const allowedOrigins = [
      "tauri://localhost",
      "http://tauri.localhost",
      "https://tauri.localhost",
    ];

    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://localhost:")
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
  }

  _isAuthorizedRequest(req) {
    if (req.url === "/identity" && req.method === "GET") return true;
    const authHeader = req.headers.authorization;
    const expectedSecret = EnvManager.getDaemonSecret();
    return authHeader === `Bearer ${expectedSecret}`;
  }

  _getRouteHandler(method, url) {
    const routes = {
      "GET /identity": this._handleIdentity,
      "GET /status": this._handleStatus,
      "GET /health": this._handleHealth.bind(this),
      "POST /unlink": this._handleUnlink,
      "POST /shutdown": this._handleShutdown,
      "POST /set-api": this._handleSetApi,
    };
    return routes[`${method} ${url}`];
  }

  _sendResponse(res, statusCode, data = null) {
    if (data) {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(data));
    }
    res.writeHead(statusCode);
    return res.end();
  }

  _handleIdentity(req, res) {
    return this._sendResponse(res, 200, {
      app: "craftcontrol-agent",
      identity: "CraftControlAgent",
    });
  }

  _handleStatus(req, res) {
    return this._sendResponse(res, 200, {
      status: this.status,
      apiUrl: EnvManager.getApiUrl(),
    });
  }

  async _handleHealth(req, res) {
    const freeMem = os.freemem();
    const hasMemory = freeMem > 1024 * 1024 * 100; // >100MB

    let canExecute = true;
    try {
      // Just check if we can read the home directory, which indicates fs permissions are healthy
      await fs.access(os.homedir());
    } catch (e) {
      canExecute = false;
    }

    if (!hasMemory || !canExecute) {
      return this._sendResponse(res, 503, {
        status: "error",
        freeMemory: freeMem,
        canExecute,
      });
    }

    return this._sendResponse(res, 200, {
      status: "ok",
      freeMemory: freeMem,
      canExecute,
    });
  }

  _handleUnlink(req, res) {
    if (this.onUnlinkCallback) this.onUnlinkCallback();
    return this._sendResponse(res, 200, { success: true });
  }

  _handleShutdown(req, res) {
    this.status = "shutting_down";
    if (this.onShutdownCallback) this.onShutdownCallback();
    return this._sendResponse(res, 200, {
      success: true,
      message: "Graceful shutdown initiated",
    });
  }

  _handleSetApi(req, res) {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => this._processSetApiBody(body, res));
  }

  _processSetApiBody(body, res) {
    try {
      const { apiUrl } = JSON.parse(body);
      if (apiUrl) EnvManager.updateApiUrl(apiUrl);
      return this._sendResponse(res, 200, { success: true });
    } catch (e) {
      return this._sendResponse(res, 400, { success: false, error: e.message });
    }
  }
}
