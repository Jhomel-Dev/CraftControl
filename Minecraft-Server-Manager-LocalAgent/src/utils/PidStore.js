import fs from "fs";
import path from "path";
import os from "os";

const stateFile = path.join(
  os.homedir(),
  ".minecraft-manager",
  "agent-state.json",
);

export default class PidStore {
  static savePid(serverId, pid) {
    this.ensureDir();
    const state = this.loadAll();
    state[serverId] = pid;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  static removePid(serverId) {
    this.ensureDir();
    const state = this.loadAll();
    if (!state[serverId]) return;
    delete state[serverId];
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  static loadAll() {
    this.ensureDir();
    if (!fs.existsSync(stateFile)) return {};
    try {
      return JSON.parse(fs.readFileSync(stateFile, "utf8"));
    } catch (error) {
      return {};
    }
  }

  static ensureDir() {
    const dir = path.dirname(stateFile);
    if (fs.existsSync(dir)) return;
    fs.mkdirSync(dir, { recursive: true });
  }

  static isAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async waitForExit(pid, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (!this.isAlive(pid)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }
}
