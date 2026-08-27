import EventEmitter from "events";
import pidusage from "pidusage";
import os from "os";
import ProcessManager from "./ProcessManager.js";

export default class ServerProcess extends EventEmitter {
  constructor(dataDir, javaExe, spawnArgs) {
    super();
    this.processManager = new ProcessManager(dataDir, javaExe, spawnArgs);
    this.metricsInterval = null;
  }

  start() {
    this.attachOutputListeners();
    const pid = this.processManager.start();

    this.startTelemetry();
    this.processManager.on("exit", () => this.handleExit());
    return pid;
  }

  attachOutputListeners() {
    this.processManager.on("stdout", (data) => this.processStdout(data));
    this.processManager.on("stderr", (data) => this.processStderr(data));
  }

  processStdout(data) {
    const lines = data.toString("utf8").split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      this.emit("log", line);
      this.detectPlayerEvents(line);
      this.detectServerStarted(line);
    }
  }

  detectServerStarted(line) {
    if (line.includes("Done (") && line.includes(")! For help")) {
      this.emit("started");
    }
  }

  processStderr(data) {
    const logLine = data.toString("utf8").trim();
    if (!logLine) return;
    this.emit("log", logLine);
  }

  detectPlayerEvents(line) {
    const joinMatch = line.match(
      /\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) joined the game/,
    );
    if (joinMatch) this.emit("player_join", joinMatch[1]);

    const leaveMatch = line.match(
      /\]: (?:\[.*?\] )?([a-zA-Z0-9_]{3,16}) left the game/,
    );
    if (leaveMatch) this.emit("player_leave", leaveMatch[1]);
  }

  startTelemetry() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    this.metricsInterval = setInterval(async () => {
      if (!this.processManager.isRunning()) return;
      try {
        const pid = this.processManager.process.pid;
        const stats = await pidusage(pid);
        this.emit("telemetry", {
          cpu: stats.cpu / os.cpus().length,
          memory: stats.memory,
        });
      } catch (err) {}
    }, 3000);
  }

  handleExit() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.emit("stopped");
  }

  async stop() {
    await this.processManager.stopGracefully(10000);
  }

  sendCommand(command) {
    this.processManager.sendCommand(command);
  }

  killForcefully() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.processManager.kill();
    this.emit("stopped");
  }
}
