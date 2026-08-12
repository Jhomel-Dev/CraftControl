use std::fs;
use std::path::{Path, PathBuf};
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
        dirs.push(
            home_path
                .join(".config")
                .join("minecraft-server-manager-agent"),
        );
        dirs.push(
            home_path
                .join("Library")
                .join("Application Support")
                .join("minecraft-server-manager-agent"),
        );
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        dirs.push(PathBuf::from(appdata).join("minecraft-server-manager-agent"));
    }

    dirs
}

fn read_port_from_lockfile(app_data: &Path) -> Option<u16> {
    let lock_path = app_data.join("daemon.lock");
    let content = fs::read_to_string(lock_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let port_val = json.get("port")?.as_u64()?;
    u16::try_from(port_val).ok()
}

pub fn read_daemon_pid(app_handle: Option<&AppHandle>) -> Option<u32> {
    get_agent_config_dirs(app_handle)
        .into_iter()
        .find_map(|dir| {
            let content = fs::read_to_string(dir.join("daemon.lock")).ok()?;
            let json: serde_json::Value = serde_json::from_str(&content).ok()?;
            json.get("pid")?.as_u64().map(|p| p as u32)
        })
}

fn read_string_from_lockfiles(app_handle: Option<&AppHandle>, key: &str) -> Option<String> {
    get_agent_config_dirs(app_handle)
        .into_iter()
        .find_map(|dir| {
            let content = fs::read_to_string(dir.join("daemon.lock")).ok()?;
            let json: serde_json::Value = serde_json::from_str(&content).ok()?;
            json.get(key)?.as_str().map(String::from)
        })
}

pub fn read_daemon_secret(app_handle: Option<&AppHandle>) -> Option<String> {
    read_string_from_lockfiles(app_handle, "secret")
}

pub fn read_daemon_pin(app_handle: Option<&AppHandle>) -> Option<String> {
    read_string_from_lockfiles(app_handle, "pin")
}

fn read_port_from_env_file(app_data: &Path) -> Option<u16> {
    let env_path = app_data.join(".env");
    let content = fs::read_to_string(env_path).ok()?;
    for line in content.lines() {
        if let Some(port_str) = line.strip_prefix("DAEMON_PORT=") {
            return port_str.trim().parse::<u16>().ok();
        }
    }
    None
}

pub fn remove_daemon_lockfiles(app_handle: Option<&AppHandle>) {
    for lock_path in get_daemon_lockfile_paths(app_handle) {
        let _ = fs::remove_file(lock_path);
    }
}

fn get_daemon_lockfile_paths(app_handle: Option<&AppHandle>) -> Vec<PathBuf> {
    get_agent_config_dirs(app_handle)
        .into_iter()
        .map(|dir| dir.join("daemon.lock"))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_default_port() {
        std::env::remove_var("DAEMON_PORT");
        let port = resolve_daemon_port(None);
        assert!(port >= 45987);
    }

    #[test]
    fn test_read_port_from_env_string() {
        let temp_dir = std::env::temp_dir().join("mc_test_env_port");
        let _ = fs::create_dir_all(&temp_dir);
        let env_path = temp_dir.join(".env");
        let _ = fs::write(&env_path, "DAEMON_PORT=45999\n");
        let port = read_port_from_env_file(&temp_dir);
        assert_eq!(port, Some(45999));
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_read_port_from_lockfile() {
        let temp_dir = std::env::temp_dir().join("mc_test_lock_port");
        let _ = fs::create_dir_all(&temp_dir);
        let lock_path = temp_dir.join("daemon.lock");
        let _ = fs::write(&lock_path, r#"{"port":45988,"pid":12345}"#);
        let port = read_port_from_lockfile(&temp_dir);
        assert_eq!(port, Some(45988));
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
