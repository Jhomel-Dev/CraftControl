use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "linux")]
const AGENT_BIN: &[u8] = include_bytes!("../bin/agentcore-x86_64-unknown-linux-gnu");

#[cfg(target_os = "windows")]
const AGENT_BIN: &[u8] = include_bytes!("../bin/agentcore-x86_64-pc-windows-msvc.exe");

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
const AGENT_BIN: &[u8] = &[];

pub fn spawn_detached_agent(app_handle: &AppHandle) {
    if AGENT_BIN.is_empty() {
        return;
    }

    let Ok(app_data) = app_handle.path().app_data_dir() else {
        return;
    };
    let _ = std::fs::create_dir_all(&app_data);

    let file_name = if cfg!(target_os = "windows") {
        "agentcore.exe"
    } else {
        "agentcore"
    };
    let path = app_data.join(file_name);

    let _ = std::fs::write(&path, AGENT_BIN);

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&path, perms);
        }
    }

    let mut cmd = Command::new(&path);

    if cfg!(debug_assertions) {
        cmd.arg("--api=https://craft-control-api-staging.onrender.com");
    } else {
        cmd.arg("--api=https://minecraft-server-pl80.onrender.com");
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000008 | 0x08000000);
    }

    let pid = crate::config::read_daemon_pid(Some(app_handle)).unwrap_or(u32::MAX);
    if is_process_alive(pid) {
        println!(
            "Agent process (PID {}) is already running, skipping spawn.",
            pid
        );
        return;
    }

    let _ = cmd
        .spawn()
        .inspect(|child| {
            println!(
                "Agent process spawned successfully with PID: {}",
                child.id()
            )
        })
        .inspect_err(|e| eprintln!("Failed to spawn agent process: {}", e));
}

fn is_process_alive(pid: u32) -> bool {
    #[cfg(unix)]
    return std::process::Command::new("kill")
        .arg("-0")
        .arg(pid.to_string())
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    #[cfg(windows)]
    return std::process::Command::new("tasklist")
        .arg("/FI")
        .arg(format!("PID eq {}", pid))
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
        .unwrap_or(false);

    #[cfg(not(any(unix, windows)))]
    return false;
}

pub fn start_agent_polling_loop(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(1))
            .build()
            .unwrap_or_default();

        let mut consecutive_failures: u32 = 0;
        let mut was_online: bool = false;

        loop {
            let is_online = poll_agent_status(&app_handle, &client).await;
            if is_online {
                consecutive_failures = 0;
                was_online = true;
                tokio::time::sleep(Duration::from_secs(2)).await;
                continue;
            }

            consecutive_failures += 1;
            let wait_secs = get_offline_sleep_secs(&app_handle, was_online, consecutive_failures);
            tokio::time::sleep(Duration::from_secs(wait_secs)).await;
        }
    });
}

fn get_offline_sleep_secs(
    app_handle: &AppHandle,
    _was_online: bool,
    consecutive_failures: u32,
) -> u64 {
    if consecutive_failures % 3 == 1 {
        spawn_detached_agent(app_handle);
    }

    let wait = (1u64 << (consecutive_failures.min(3) - 1)).min(5);
    wait
}

async fn poll_agent_status(app_handle: &AppHandle, client: &reqwest::Client) -> bool {
    let base_url = crate::config::get_agent_base_url(Some(app_handle));
    let status_url = format!("{}/status", base_url);
    let secret = crate::config::read_daemon_secret(Some(app_handle)).unwrap_or_default();

    let Ok(res) = client
        .get(&status_url)
        .header("Authorization", format!("Bearer {}", secret))
        .send()
        .await
    else {
        let _ = app_handle.emit("agent-state-changed", r#"{"status":"offline"}"#);
        return false;
    };

    if !res.status().is_success() {
        let _ = app_handle.emit("agent-state-changed", r#"{"status":"offline"}"#);
        return false;
    }

    let Ok(json) = res.text().await else {
        return false;
    };

    let mut json_val: serde_json::Value = serde_json::from_str(&json).unwrap_or_default();
    if let Some(pin) = crate::config::read_daemon_pin(Some(app_handle)) {
        json_val["pin"] = serde_json::Value::String(pin);
    } else {
        json_val["pin"] = serde_json::Value::Null;
    }

    let modified_json = json_val.to_string();
    let _ = app_handle.emit("agent-state-changed", &modified_json);
    true
}

pub async fn graceful_shutdown(app_handle: &AppHandle) {
    let base_url = crate::config::get_agent_base_url(Some(app_handle));
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap_or_default();
    let secret = crate::config::read_daemon_secret(Some(app_handle)).unwrap_or_default();
    let res = client
        .post(format!("{}/shutdown", base_url))
        .header("Authorization", format!("Bearer {}", secret))
        .send()
        .await;
    if res.is_ok_and(|r| !r.status().is_success()) {
        return;
    }

    tokio::time::sleep(Duration::from_millis(300)).await;
    crate::config::remove_daemon_lockfiles(Some(app_handle));
}

pub async fn restart_agent(app_handle: &AppHandle) {
    graceful_shutdown(app_handle).await;
    spawn_detached_agent(app_handle);
}
