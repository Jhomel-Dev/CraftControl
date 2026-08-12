import fs from "fs";
import path from "path";

export default class ServerPropertiesEditor {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.propsPath = path.join(this.dataDir, "server.properties");
  }

  acceptEula() {
    const eulaPath = path.join(this.dataDir, "eula.txt");
    fs.writeFileSync(eulaPath, "eula=true\n");
  }

  createOrUpdateProperties(config) {
    let props = this.readExistingProperties();
    const settings = this.getSettingsMap(config);

    for (const [key, value] of Object.entries(settings)) {
      props = this.applySetting(props, key, value);
    }

    fs.writeFileSync(this.propsPath, props.trim());
  }

  readExistingProperties() {
    if (!fs.existsSync(this.propsPath)) return "";
    return fs.readFileSync(this.propsPath, "utf8");
  }

  getSettingsMap(config) {
    return {
      "server-port": config.port || 25565,
      "max-players": config.maxPlayers || 20,
      "white-list": config.whitelist ? "true" : "false",
      "online-mode": config.onlineMode ? "true" : "false",
    };
  }

  applySetting(props, key, value) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(props)) return props.replace(regex, `${key}=${value}`);
    return `${props}\n${key}=${value}`;
  }

  formatJvmArgs(config, softwareConfig) {
    const memString = this.getMemoryString(config.memory);
    const memoryArgXmx = `-Xmx${memString}`;
    const memoryArgXms = `-Xms${memString}`;

    if (softwareConfig.type === "jar") {
      return [
        memoryArgXms,
        memoryArgXmx,
        "-XX:+AlwaysPreTouch",
        "-jar",
        softwareConfig.path,
        "nogui",
      ];
    }

    this.writeUserJvmArgs(memoryArgXms, memoryArgXmx);
    return [...softwareConfig.args, "nogui"];
  }

  getMemoryString(memory) {
    if (!memory || typeof memory !== "string") return "2G";

    const cleanMem = memory.trim().toUpperCase();
    if (/^\d+[MG]$/.test(cleanMem)) return cleanMem;

    const numOnly = parseInt(memory);
    if (!isNaN(numOnly) && numOnly > 0) return `${numOnly}M`;

    return "2G";
  }

  writeUserJvmArgs(xms, xmx) {
    const userJvmArgsFile = path.join(this.dataDir, "user_jvm_args.txt");
    if (fs.existsSync(userJvmArgsFile)) {
      const content = fs.readFileSync(userJvmArgsFile, "utf8");
      const lines = content
        .split("\n")
        .filter(
          (line) =>
            !line.trim().startsWith("-Xms") && !line.trim().startsWith("-Xmx"),
        );
      lines.unshift(xms, xmx);
      fs.writeFileSync(userJvmArgsFile, lines.join("\n"));
    } else {
      fs.writeFileSync(
        userJvmArgsFile,
        `${xms}\n${xmx}\n-XX:+AlwaysPreTouch\n`,
      );
    }
  }
}
