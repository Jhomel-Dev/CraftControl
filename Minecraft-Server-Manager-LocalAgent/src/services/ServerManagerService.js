import path from "path";
import os from "os";
import NativeServerService from "./NativeServerService.js";
import TunnelService from "./TunnelService.js";
import PidStore from "../utils/PidStore.js";

export default class ServerManagerService {
  constructor(connectionService) {
    this.activeServers = new Map();
    this.nextPort = 25565;
    this.connectionService = connectionService;
    this.recoverOrphans();
  }

  recoverOrphans() {
    const saved = PidStore.loadAll();
    for (const [serverId, pid] of Object.entries(saved)) {
      if (!PidStore.isAlive(pid)) {
        PidStore.removePid(serverId);
        continue;
      }
      this.activeServers.set(serverId, {
        port: null,
        isOrphan: true,
        nativeServerService: {
          process: { pid },
          stopMinecraftServer: async () => {
            try {
              process.kill(pid, "SIGTERM");
            } catch (e) {}
            const exited = await PidStore.waitForExit(pid, 10000);
            if (!exited) {
              try {
                process.kill(pid, "SIGKILL");
              } catch (e) {}
            }
          },
          killMinecraftServer: () => {
            try {
              process.kill(pid, "SIGKILL");
            } catch (e) {}
          },
          sendCommand: () => {},
        },
        tunnelService: {
          stopTunnel: () => {},
        },
      });
    }
  }

  getAvailablePort() {
    let port = this.nextPort;
    const usedPorts = Array.from(this.activeServers.values()).map(
      (s) => s.port,
    );
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }

  setupServerListeners(serverId, nativeServerService, tunnelService) {
    const nativeEventHandlers = {
      log: (logLine) => this.connectionService.sendLog({ serverId, logLine }),
      telemetry: (stats) =>
        this.connectionService.sendTelemetry({ serverId, stats }),
      started: () =>
        this.connectionService.sendStateUpdate({ serverId, status: "ONLINE" }),
      stopped: () => {
        this.connectionService.sendStateUpdate({ serverId, status: "OFFLINE" });
        if (this.activeServers.get(serverId)) {
          this.activeServers
            .get(serverId)
            .nativeServerService.killMinecraftServer();
        }
      },
    };

    for (const [event, handler] of Object.entries(nativeEventHandlers)) {
      nativeServerService.on(event, handler);
    }

    const tunnelEventHandlers = {
      address_assigned: (address) =>
        this.connectionService.sendTunnelInfo({ serverId, address }),
      claim_link: (link) =>
        this.connectionService.sendTunnelInfo({ serverId, claimLink: link }),
      log: (logLine) =>
        this.connectionService.sendLog({
          serverId,
          logLine: `[TUNNEL] ${logLine}`,
        }),
      error: (err) =>
        this.connectionService.sendLog({
          serverId,
          logLine: `[TUNNEL ERROR] ${err}`,
        }),
    };

    for (const [event, handler] of Object.entries(tunnelEventHandlers)) {
      tunnelService.on(event, handler);
    }
  }

  async startServer(serverConfig) {
    const serverId = serverConfig.id;

    if (!/^[a-zA-Z0-9-]+$/.test(serverId)) {
      this.connectionService.sendLog({
        serverId,
        logLine: "[System Error] Invalid or malicious server ID.",
      });
      return;
    }

    if (this.activeServers.has(serverId)) {
      this.connectionService.sendLog({
        serverId,
        logLine: "[System] Server is already running.",
      });
      return;
    }

    try {
      const managerDir = path.join(os.homedir(), ".minecraft-manager");
      serverConfig.dataDir = path.join(managerDir, "servers", serverId);

      const port = this.getAvailablePort();
      serverConfig.port = port;

      const nativeServerService = new NativeServerService();
      const tunnelService = new TunnelService();

      this.setupServerListeners(serverId, nativeServerService, tunnelService);

      this.activeServers.set(serverId, {
        nativeServerService,
        tunnelService,
        port,
      });

      this.connectionService.sendLog({
        serverId,
        logLine: "[System] Booting Native server...",
      });
      const pid = await nativeServerService.startMinecraftServer(serverConfig);
      if (pid) PidStore.savePid(serverId, parseInt(pid));
      await tunnelService.startTunnel(port, serverConfig.tunnelSecret);
    } catch (error) {
      console.error("Error in startServer:", error);
      this.connectionService.sendLog({
        serverId,
        logLine: `Error starting server: ${error.message}`,
      });
      this.connectionService.sendStateUpdate({ serverId, status: "OFFLINE" });
      this.activeServers.delete(serverId);
    }
  }

  async stopServer(requestedServerId) {
    if (!requestedServerId || !/^[a-zA-Z0-9-]+$/.test(requestedServerId)) {
      return;
    }

    const active = this.activeServers.get(requestedServerId);
    if (!active) return;

    try {
      active.tunnelService.stopTunnel();
      await active.nativeServerService.stopMinecraftServer();
      this.connectionService.sendLog({
        serverId: requestedServerId,
        logLine: "[System] Server and Tunnel stopped locally.",
      });
    } catch (error) {
      this.connectionService.sendLog({
        serverId: requestedServerId,
        logLine: `[System] Error stopping server: ${error.message}`,
      });
    } finally {
      PidStore.removePid(requestedServerId);
      this.connectionService.sendStateUpdate({
        serverId: requestedServerId,
        status: "OFFLINE",
      });
      this.activeServers.delete(requestedServerId);
    }
  }

  killServerForcefully(requestedServerId) {
    if (!requestedServerId || !/^[a-zA-Z0-9-]+$/.test(requestedServerId))
      return;
    const active = this.activeServers.get(requestedServerId);
    if (!active) return;

    try {
      if (active.tunnelService) active.tunnelService.stopTunnel();
      if (active.nativeServerService)
        active.nativeServerService.killMinecraftServer();
      this.connectionService.sendLog({
        serverId: requestedServerId,
        logLine: "[System] Server and Tunnel killed forcefully.",
      });
    } catch (e) {
    } finally {
      PidStore.removePid(requestedServerId);
      this.connectionService.sendStateUpdate({
        serverId: requestedServerId,
        status: "OFFLINE",
      });
      this.activeServers.delete(requestedServerId);
    }
  }

  async stopAllServers() {
    for (const [serverId, active] of this.activeServers.entries()) {
      try {
        if (active.tunnelService) active.tunnelService.stopTunnel();
        if (active.nativeServerService)
          active.nativeServerService.killMinecraftServer();
        PidStore.removePid(serverId);
      } catch (e) {}
    }
    this.activeServers.clear();
  }
}
