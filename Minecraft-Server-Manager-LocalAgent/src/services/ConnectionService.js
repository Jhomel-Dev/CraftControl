import { io } from "socket.io-client";
import EventEmitter from "events";
import os from "os";
import Envelope from "../utils/Envelope.js";

export default class ConnectionService extends EventEmitter {
  constructor(apiUrl, agentToken, isHibernating = false) {
    super();
    this.apiUrl = apiUrl;
    this.agentToken = agentToken;
    this.isHibernating = isHibernating;
    this.socket = null;
  }

  connect() {
    this.validateCredentials();

    this.socket = io(this.apiUrl, {
      auth: { token: this.agentToken },
    });

    this.attachSocketListeners();
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  validateCredentials() {
    if (!this.apiUrl) throw new Error("API URL is required");
    if (!this.agentToken) throw new Error("Agent Token is required");
  }

  attachSocketListeners() {
    this.socket.on("connect", () => {
      this.emit("connected");
      this.socket.emit(
        "ENVELOPE",
        Envelope.create("AGENT_INFO", {
          totalMem: os.totalmem(),
          freeMem: os.freemem(),
          cpus: os.cpus().length,
          status: this.isHibernating ? "HIBERNATING" : "ACTIVE",
        }),
      );
    });
    this.socket.on("disconnect", () => this.emit("disconnected"));
    this.socket.on("connect_error", (err) => this.emit("error", err));
    this.socket.on("AGENT_HIBERNATE", () => {
      this.isHibernating = true;
      this.emit("AGENT_HIBERNATE");
    });
    this.socket.on("AGENT_WAKE", () => {
      this.isHibernating = false;
      this.emit("AGENT_WAKE");
    });

    const eventMap = {
      START_SERVER: "command_start",
      STOP_SERVER: "command_stop",
      DELETE_SERVER: "delete_server",
      SEND_COMMAND: "server_command",
      AGENT_UNLINK: "AGENT_UNLINK",
      FS_OPERATION: "fs_operation",
      get_player_stats: "get_player_stats",
      list_backups: "list_backups",
      create_backup: "create_backup",
      delete_backup: "delete_backup",
    };

    for (const [socketEvent, localEvent] of Object.entries(eventMap)) {
      this.socket.on(socketEvent, (payload, callback) => {
        this.emit(localEvent, payload, callback);
      });
    }
  }

  sendTelemetry(stats) {
    if (!this.verifyConnection()) return;
    this.socket.emit("ENVELOPE", Envelope.create("TELEMETRY_UPDATE", stats));
  }

  sendLog(logLine) {
    if (!this.verifyConnection()) return;
    this.socket.emit("ENVELOPE", Envelope.create("SERVER_LOG", logLine));
  }

  sendTunnelInfo(info) {
    if (!this.verifyConnection()) return;
    this.socket.emit("ENVELOPE", Envelope.create("TUNNEL_INFO", info));
  }

  sendStateUpdate(payload) {
    if (!this.verifyConnection()) return;
    this.socket.emit("ENVELOPE", Envelope.create("STATUS_UPDATE", payload));
  }

  sendAgentStatus(status) {
    if (!this.verifyConnection()) return;
    this.socket.emit(
      "ENVELOPE",
      Envelope.create("AGENT_STATUS_ACK", { status }),
    );
  }

  verifyConnection() {
    return this.socket && this.socket.connected;
  }
}
