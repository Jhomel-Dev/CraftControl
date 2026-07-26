import fs from 'fs';
import path from 'path';
import os from 'os';

const getAppDataPath = () => {
  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'minecraft-server-manager-agent');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft-server-manager-agent');
  } else {
    return path.join(os.homedir(), '.config', 'minecraft-server-manager-agent');
  }
};

const appDataDir = getAppDataPath();
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

const DEFAULT_API_URL = 'https://minecraft-server-pl80.onrender.com';
const ENV_PATH = process.pkg 
  ? path.join(appDataDir, '.env')
  : path.join(process.cwd(), '.env');
const LOCK_PATH = path.join(appDataDir, 'daemon.lock');

export default class EnvManager {
  static ENV_PATH = ENV_PATH;

  static getLockfilePath() {
    return LOCK_PATH;
  }

  static getDaemonPort() {
    const rawPort = process.env.DAEMON_PORT || '45987';
    return parseInt(rawPort, 10);
  }

  static saveDaemonPort(port) {
    this._updateEnvVar('DAEMON_PORT', String(port));
  }

  static readDaemonLock() {
    if (!fs.existsSync(LOCK_PATH)) return null;
    try {
      const content = fs.readFileSync(LOCK_PATH, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static writeDaemonLock(port) {
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }
    const data = {
      pid: process.pid,
      port: Number(port),
      timestamp: Date.now()
    };
    fs.writeFileSync(LOCK_PATH, JSON.stringify(data, null, 2), 'utf8');
  }

  static deleteDaemonLock() {
    if (!fs.existsSync(LOCK_PATH)) return;
    try {
      fs.unlinkSync(LOCK_PATH);
    } catch {}
  }

  static getApiUrl() {
    if (process.env.API_URL) return process.env.API_URL;
    const argUrl = process.argv.find(arg => arg.startsWith('--api='));
    if (argUrl) return argUrl.split('=')[1];
    return DEFAULT_API_URL;
  }

  static getAgentToken() {
    const argToken = process.argv.find(arg => arg.startsWith('--token='));
    if (argToken) return argToken.split('=')[1];
    return process.env.AGENT_SECRET_TOKEN || process.env.AGENT_TOKEN;
  }

  static getAgentStatus() {
    return process.env.AGENT_STATUS || 'ACTIVE';
  }

  static saveTokenToEnv(token) {
    this._updateEnvVar('AGENT_SECRET_TOKEN', token);
  }

  static saveStatusToEnv(status) {
    this._updateEnvVar('AGENT_STATUS', status);
  }

  static updateApiUrl(url) {
    this._updateEnvVar('API_URL', url);
  }

  static _updateEnvVar(key, value) {
    let envContent = '';
    
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    if (envContent.includes(`${key}=`)) {
      const regex = new RegExp(`${key}=.*`);
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}\n`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');
  }
}
