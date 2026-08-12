import fs from "fs/promises";
import path from "path";
import os from "os";
import * as tar from "tar";

export default class BackupService {
  constructor(getNativeServerService) {
    this.getNativeServerService = getNativeServerService;
    this.schedules = new Map();
    this.startScheduler();
  }

  startScheduler() {
    setInterval(() => this.processAllSchedules(), 60000);
  }

  async processAllSchedules() {
    try {
      const serversDir = path.join(
        os.homedir(),
        ".minecraft-manager",
        "servers",
      );
      const servers = await this.safeReadDir(serversDir);
      for (const serverId of servers) {
        await this.processServerBackup(serverId, serversDir);
      }
    } catch (err) {}
  }

  async safeReadDir(dir) {
    try {
      return await fs.readdir(dir);
    } catch (e) {
      return [];
    }
  }

  async processServerBackup(serverId, serversDir) {
    const configPath = path.join(serversDir, serverId, "backup-config.json");

    try {
      const rawConfig = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(rawConfig);

      if (!config.enabled || !config.time) return;
      if (!this.isTimeToRun(config.time)) return;

      const lastRunKey = `${serverId}-${new Date().toISOString().split("T")[0]}`;
      if (this.schedules.has(lastRunKey)) return;

      this.schedules.set(lastRunKey, true);
      await this.createBackup(serverId, config.profile);
      await this.enforceRetentionPolicy(serverId, config.maxRetained);
    } catch (e) {}
  }

  isTimeToRun(timeString) {
    const now = new Date();
    const [hours, minutes] = timeString.split(":").map(Number);
    return now.getHours() === hours && now.getMinutes() === minutes;
  }

  async enforceRetentionPolicy(serverId, maxRetained) {
    let max = parseInt(maxRetained, 10);
    if (isNaN(max) || max < 1) max = 5;

    const backups = await this.listBackups(serverId);
    if (backups.length <= max) return;

    const toDelete = backups.slice(max);
    for (const backup of toDelete) {
      await this.deleteBackup(serverId, backup.name);
    }
  }

  getServerDir(serverId) {
    return path.join(os.homedir(), ".minecraft-manager", "servers", serverId);
  }

  async getBackupsDir(serverId) {
    const dir = path.join(this.getServerDir(serverId), "backups");
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async createBackup(serverId, profile = "full") {
    const safeProfile = ["full", "world", "configs"].includes(profile)
      ? profile
      : "full";
    const serverDir = this.getServerDir(serverId);
    const backupsDir = await this.getBackupsDir(serverId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${safeProfile}-${timestamp}.tar.gz`;
    const filePath = path.join(backupsDir, fileName);

    const validPaths = await this.getValidBackupPaths(serverDir, safeProfile);
    if (validPaths.length === 0) throw new Error("No valid files to backup");

    const isOnline = this.isServerOnline(serverId);

    try {
      await this.prepareServerForBackup(serverId, isOnline);
      await this.compressFiles(serverDir, validPaths, filePath);
      return { success: true, file: fileName };
    } catch (err) {
      throw new Error("Failed to create backup archive.");
    } finally {
      await this.resumeServerAfterBackup(serverId, isOnline);
    }
  }

  async getValidBackupPaths(serverDir, profile) {
    const targetPaths = await this.getTargetPathsByProfile(serverDir, profile);
    const validPaths = [];

    for (const p of targetPaths) {
      try {
        await fs.access(path.join(serverDir, p));
        validPaths.push(p);
      } catch (e) {}
    }

    return validPaths;
  }

  async getTargetPathsByProfile(serverDir, profile) {
    if (profile === "world") return ["world", "world_nether", "world_the_end"];

    const files = await this.safeReadDir(serverDir);
    if (profile === "configs") {
      const configs = files.filter(
        (f) =>
          f.endsWith(".json") ||
          f.endsWith(".properties") ||
          f.endsWith(".yml"),
      );
      configs.push("plugins");
      return configs;
    }

    return files.filter((f) => f !== "backups");
  }

  isServerOnline(serverId) {
    const service = this.getNativeServerService(serverId);
    return service && service.process;
  }

  async prepareServerForBackup(serverId, isOnline) {
    if (!isOnline) return;
    try {
      const service = this.getNativeServerService(serverId);
      await service.sendCommand("save-all flush");
      await new Promise((res) => setTimeout(res, 2000));
      await service.sendCommand("save-off");
      await new Promise((res) => setTimeout(res, 1000));
    } catch (e) {}
  }

  async resumeServerAfterBackup(serverId, isOnline) {
    if (!isOnline) return;
    try {
      const service = this.getNativeServerService(serverId);
      await service.sendCommand("save-on");
    } catch (e) {}
  }

  async compressFiles(serverDir, paths, archivePath) {
    await tar.c(
      {
        gzip: true,
        file: archivePath,
        cwd: serverDir,
      },
      paths,
    );
  }

  async listBackups(serverId) {
    const dir = await this.getBackupsDir(serverId);
    const files = await this.safeReadDir(dir);
    const zips = files.filter(
      (f) => f.endsWith(".zip") || f.endsWith(".tar.gz"),
    );

    const results = [];
    for (const file of zips) {
      const stat = await fs.stat(path.join(dir, file));
      results.push({
        name: file,
        size: stat.size,
        date: stat.mtime,
      });
    }
    return results.sort((a, b) => b.date - a.date);
  }

  async deleteBackup(serverId, fileName) {
    if (
      (!fileName.endsWith(".zip") && !fileName.endsWith(".tar.gz")) ||
      fileName.includes("/")
    ) {
      throw new Error("Invalid file");
    }

    const dir = await this.getBackupsDir(serverId);
    const filePath = path.join(dir, fileName);

    await fs.unlink(filePath);
    return { success: true };
  }
}
