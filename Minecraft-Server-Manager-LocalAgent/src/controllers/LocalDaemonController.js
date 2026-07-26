import http from 'http';
import EnvManager from '../config/EnvManager.js';
import SmartBootService from '../services/SmartBootService.js';

export default class LocalDaemonController {
  constructor(port = EnvManager.getDaemonPort()) {
    this.port = port;
    this.status = 'initializing';
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
      const tempServer = http.createServer((req, res) => this.handleRequest(req, res));
      tempServer.once('error', () => resolve(false));
      tempServer.listen(port, '127.0.0.1', () => {
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      return res.end();
    }

    if (req.url === '/identity' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        app: 'craftcontrol-agent',
        identity: 'CraftControlAgent'
      }));
    }

    if (req.url === '/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: this.status,
        pin: global.currentPairingPin || null,
        apiUrl: EnvManager.getApiUrl()
      }));
    }

    if (req.url === '/unlink' && req.method === 'POST') {
      if (this.onUnlinkCallback) this.onUnlinkCallback();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    if (req.url === '/shutdown' && req.method === 'POST') {
      this.status = 'shutting_down';
      if (this.onShutdownCallback) this.onShutdownCallback();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: 'Graceful shutdown initiated' }));
    }

    if (req.url === '/set-api' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { apiUrl } = JSON.parse(body);
          if (apiUrl) EnvManager.updateApiUrl(apiUrl);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  }
}
