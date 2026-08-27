import { spawn } from "child_process";
import EventEmitter from "events";
import { killProcessHard } from "../utils/osUtils.js";

export default class ProcessManager extends EventEmitter {
  constructor(cwd, command, args, env = process.env) {
    super();
    this.cwd = cwd;
    this.command = command;
    this.args = args;
    this.env = env;

    this.process = null;
  }

  start() {
    if (this.isRunning()) {
      throw new Error("Process is already running");
    }

    this.process = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      detached: process.platform !== "win32",
    });

    this.process.stdout.on("data", (data) => this.emit("stdout", data));
    this.process.stderr.on("data", (data) => this.emit("stderr", data));

    this.process.on("exit", () => {
      this.process = null;
      this.emit("exit");
    });

    return this.process.pid.toString();
  }

  async stopGracefully(timeoutMs = 10000) {
    if (!this.isRunning()) return;

    return new Promise((resolve) => {
      let timeoutId;

      const onExit = () => {
        clearTimeout(timeoutId);
        this.process = null;
        resolve();
      };

      this.process.once("exit", onExit);

      if (this.process.stdin) {
        this.process.stdin.write("stop\n");
      }

      timeoutId = setTimeout(() => {
        this.kill();
        resolve();
      }, timeoutMs);
    });
  }

  kill() {
    if (!this.isRunning()) return;
    try {
      killProcessHard(this.process.pid);
    } catch (e) {}
    this.process = null;
  }

  isRunning() {
    return this.process !== null && !this.process.killed;
  }

  sendCommand(cmd) {
    if (!this.isRunning() || !this.process.stdin) {
      throw new Error("Process is not running or stdin is unavailable");
    }
    this.process.stdin.write(`${cmd}\n`);
  }
}
