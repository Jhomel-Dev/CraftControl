use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

pub fn get_agent_base_url(app_handle: Option<&AppHandle>) -> String {
    let port = resolve_daemon_port(app_handle);
    format!("http://127.0.0.1:{}", port)
}

fn resolve_daemon_port(app_handle: Option<&AppHandle>) -> u16 {
    if let Ok(port_str) = std::env::var("DAEMON_PORT") {
        if let Ok(port) = port_str.parse::<u16>() {
            return port;
        }
    }

    for dir in get_agent_config_dirs(app_handle) {
        if let Some(port) = read_port_from_lockfile(&dir) {
            return port;
        }
        if let Some(port) = read_port_from_env_file(&dir) {
            return port;
        }
    }

    45987
}

fn get_agent_config_dirs(app_handle: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Some(handle) = app_handle {
        if let Ok(app_data) = handle.path().app_data_dir() {
            dirs.push(app_data);
        }
    }

    if let Ok(home) = std::env::var("HOME") {
        let home_path = PathBuf::from(home);
        dirs.push(home_path.join(".config").join("minecraft-server-manager-agent"));
        dirs.push(home_path.join("Library").join("Application Support").join("minecraft-server-manager-agent"));
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs.push(PathBuf::from(appdata).join("minecraft-server-manager-agent"));
    }

    dirs
}

fn read_port_from_lockfile(app_data: &PathBuf) -> Option<u16> {
    let lock_path = app_data.join("daemon.lock");
    let content = fs::read_to_string(lock_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let port_val = json.get("port")?.as_u64()?;
    u16::try_from(port_val).ok()
}

fn read_port_from_env_file(app_data: &PathBuf) -> Option<u16> {
    let env_path = app_data.join(".env");
    let content = fs::read_to_string(env_path).ok()?;
    for line in content.lines() {
        if let Some(port_str) = line.strip_prefix("DAEMON_PORT=") {
            return port_str.trim().parse::<u16>().ok();
        }
    }
    None
}
