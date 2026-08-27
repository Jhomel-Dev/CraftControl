import ConnectionService from "../services/ConnectionService.js";
import FileService from "../services/FileService.js";
import EnvManager from "../config/EnvManager.js";
import PlayerStatsService from "../services/PlayerStatsService.js";
import BackupService from "../services/BackupService.js";
import ServerManagerService from "../services/ServerManagerService.js";
import os from "os";
import path from "path";
import fs from "fs/promises";
import logger from "../utils/logger.js";

export default class LocalAgentController {
  constructor(config) {
    this.validateConfig(config);
    this.isHibernating = config.agentStatus === "HIBERNATING";
    this.saveStatusToEnv = config.saveStatusToEnv;
    this.daemon = config.daemon;

    this.connectionService = new ConnectionService(
      config.apiUrl,
      config.agentToken,
      this.isHibernating,
    );
    this.serverManager = new ServerManagerService(this.connectionService);
    this.fileService = new FileService();
    this.playerStatsService = new PlayerStatsService();
    this.backupService = new BackupService(
      (serverId) =>
        this.serverManager.activeServers.get(serverId)?.nativeServerService,
    );

    this.activeServers = this.serverManager.activeServers;

    this.initialize();
  }

  validateConfig(config) {
    if (!config) throw new Error("Controller configuration is required");
    if (!config.apiUrl) throw new Error("API URL is required");
    if (!config.agentToken) throw new Error("Agent Token is required");
  }

  initialize() {
    this.setupConnectionListeners();
  }

  start() {
    this.connectionService.connect();
  }

  setupConnectionListeners() {
    this.connectionService.on("connected", () => {
      logger.info("[INFO] Local Agent connected successfully to Cloud API.");
      if (this.daemon) this.daemon.setStatus("paired");

      if (this.connectionService.socket) {
        const activeState = Array.from(
          this.serverManager.activeServers.entries(),
        ).map(([id]) => ({
          id,
          status: "ONLINE",
        }));
        this.connectionService.socket.emit("ENVELOPE", {
          type: "SYNC_STATE",
          payload: activeState,
        });
      }
    });

    this.connectionService.on("disconnected", () => {
      logger.warn("[WARN] Connection lost with Cloud API. Retrying...");
    });

    this.connectionService.on("error", (err) => {
      logger.error(`[ERROR] API connection error: ${err.message || err}`);
      if (err.message && err.message.includes("Missing Token")) {
        logger.info("The local token has been invalidated by the server.");
        this.connectionService.emit("AGENT_UNLINK");
      }
    });

    this.connectionService.on("AGENT_HIBERNATE", () => {
      logger.info(
        "[HIBERNATE] Hibernate command received. Blocking commands...",
      );
      this.isHibernating = true;
      if (this.saveStatusToEnv) this.saveStatusToEnv("HIBERNATING");
      this.connectionService.sendAgentStatus("HIBERNATING");
    });

    this.connectionService.on("AGENT_WAKE", () => {
      logger.info("[WAKE] Wake command received. Restoring functions...");
      this.isHibernating = false;
      if (this.saveStatusToEnv) this.saveStatusToEnv("ACTIVE");
      this.connectionService.sendAgentStatus("ACTIVE");
    });

    const eventHandlers = {
      command_start: async (serverConfig) => {
        if (this.isHibernating) {
          logger.info(
            `[Hibernate] Start command blocked for server: ${serverConfig.id}`,
          );
          return;
        }
        logger.info(`Received start command for server: ${serverConfig.id}`);
        await this.serverManager.startServer(serverConfig);
      },
      command_stop: (payload) => {
        if (this.isHibernating) {
          logger.info(
            `[Hibernate] Stop command blocked for server: ${payload?.id}`,
          );
          return;
        }
        logger.info(`Received stop command for server: ${payload?.id}`);
        this.serverManager.stopServer(payload?.id);
      },
      AGENT_UNLINK: async () => {
        logger.warn(
          "[WARN] Received unlink command from web.\n[System] Stopping active servers for deep cleanup...",
        );
        await this.serverManager.stopAllServers();
        try {
          EnvManager.saveTokenToEnv("");
          logger.info("Local credentials cleared.");
        } catch (e) {
          logger.error(`Failed to clear local credentials: ${e}`);
        }
        logger.info("Agent disconnected. Shutting down process in 3s...");
        setTimeout(() => process.exit(0), 3000);
      },
      delete_server: async (payload) => {
        if (this.isHibernating) return;
        logger.info(`Received delete command for server: ${payload?.id}`);
        try {
          const targetDir = path.join(
            os.homedir(),
            ".minecraft-manager",
            "servers",
            payload.id,
          );
          await fs.rm(targetDir, { recursive: true, force: true });
          logger.info(`Directory ${targetDir} deleted.`);
        } catch (err) {
          logger.error(`Error deleting server directory: ${err}`);
        }
      },
      server_command: async (payload) => {
        try {
          const active = this.serverManager.activeServers.get(
            payload.serverId || payload.id,
          );
          if (active)
            await active.nativeServerService.sendCommand(
              payload.command || payload,
            );
        } catch (err) {
          logger.error(`Error sending command: ${err}`);
        }
      },
      fs_operation: async (payload, callback) => {
        try {
          const result = await this.fileService.execute(payload);
          callback({ success: true, data: result });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      },
      get_player_stats: async (payload, callback) => {
        try {
          let onlineNames = [];
          const active = this.serverManager.activeServers.get(payload.serverId);
          if (
            active &&
            active.nativeServerService.processManager?.isRunning()
          ) {
            onlineNames = Array.from(
              active.nativeServerService.onlinePlayers || [],
            );
            try {
              active.nativeServerService.sendCommand("save-all");
              await new Promise((resolve) => setTimeout(resolve, 1500));
            } catch (e) {}
          }
          const players = await this.playerStatsService.getPlayers(
            payload.serverId,
            onlineNames,
          );
          callback({ success: true, data: players });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      },
      list_backups: async (payload, callback) => {
        try {
          const backups = await this.backupService.listBackups(
            payload.serverId,
          );
          callback({ success: true, data: backups });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      },
      create_backup: async (payload, callback) => {
        try {
          const result = await this.backupService.createBackup(
            payload.serverId,
            payload.profile,
          );
          callback(result);
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      },
      delete_backup: async (payload, callback) => {
        try {
          const result = await this.backupService.deleteBackup(
            payload.serverId,
            payload.fileName,
          );
          callback(result);
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      },
    };

    for (const [event, handler] of Object.entries(eventHandlers)) {
      this.connectionService.on(event, handler);
    }
  }
}
