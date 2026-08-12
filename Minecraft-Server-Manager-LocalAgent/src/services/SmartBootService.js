import killPort from "kill-port";
import { execSync } from "child_process";
import EnvManager from "../config/EnvManager.js";

export default class SmartBootService {
  static async runPreflightCleanup() {
    await this.checkLockfileAndSmartBoot();
    this.sweepGlobalZombiesByTitle();
  }

  static async checkLockfileAndSmartBoot() {
    const lock = EnvManager.readDaemonLock();
    if (!lock || !lock.pid) return;

    const isAlive = this._isPidAlive(lock.pid);
    if (!isAlive) return EnvManager.deleteDaemonLock();

    const isHealthy = await this._verifyIdentityEndpoint(lock.port);
    if (isHealthy) return process.exit(0);

    this._killPidForcefully(lock.pid);
    EnvManager.deleteDaemonLock();
  }

  static _isPidAlive(pid) {
    try {
      return process.kill(pid, 0);
    } catch {
      return false;
    }
  }

  static async _verifyIdentityEndpoint(port) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/identity`, {
        signal: AbortSignal.timeout(1000),
      });
      const data = await res.json();
      return data && data.identity === "CraftControlAgent";
    } catch {
      return false;
    }
  }

  static _killPidForcefully(pid) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }

  static sweepGlobalZombiesByTitle() {
    const pids = this._findCraftControlPids();
    for (const pid of pids) {
      if (pid !== process.pid) this._killPidForcefully(pid);
    }
  }

  static _findCraftControlPids() {
    const command =
      process.platform === "win32"
        ? "wmic process get processid,commandline"
        : "ps -eo pid,command";
    try {
      const output = execSync(command, {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
      return this._parsePidsFromPsOutput(output);
    } catch {
      return [];
    }
  }

  static _parsePidsFromPsOutput(output) {
    const lines = output.split("\n");
    const matchingPids = [];
    for (const line of lines) {
      if (!this._isCraftControlProcessLine(line)) continue;
      if (this._isProtectedDevelopmentProcess(line)) continue;
      const pid = this._extractPidFromLine(line);
      if (!isNaN(pid)) matchingPids.push(pid);
    }
    return matchingPids;
  }

  static _isCraftControlProcessLine(line) {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("craftcontrol") ||
      lowerLine.includes("minecraft-server-manager-localagent") ||
      lowerLine.includes("agentcore")
    );
  }

  static _isProtectedDevelopmentProcess(line) {
    const lowerLine = line.toLowerCase();
    const ignoreKeywords = [
      "nodemon",
      "concurrently",
      "npm",
      "vitest",
      "code",
      "vscode",
      "bash",
      "sh -c",
      "grep",
      "wmic",
      "jest",
      "cypress",
    ];
    return ignoreKeywords.some((keyword) => lowerLine.includes(keyword));
  }

  static _extractPidFromLine(line) {
    const match = line.trim().match(/^(\d+)/) || line.trim().match(/(\d+)$/);
    if (!match) return NaN;
    return parseInt(match[1], 10);
  }

  static async isPortFree(port) {
    try {
      await fetch(`http://127.0.0.1:${port}/identity`, {
        signal: AbortSignal.timeout(1000),
      });
      return false;
    } catch (e) {
      return e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED";
    }
  }

  static async checkPortAndKillIfImposter(port) {
    const isHealthy = await this._verifyIdentityEndpoint(port);
    if (isHealthy) return process.exit(0);

    const isFree = await this.isPortFree(port);
    if (isFree) return;

    try {
      await killPort(port);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch {}
  }
}
