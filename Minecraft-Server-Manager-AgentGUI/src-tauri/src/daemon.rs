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
            perms.set_mode(perms.mode() | 0o111);
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

    let _ = cmd.spawn();
}

pub fn start_agent_polling_loop(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(1))
            .build()
            .unwrap_or_default();

        loop {
            poll_agent_status(&app_handle, &client).await;
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}

async fn poll_agent_status(app_handle: &AppHandle, client: &reqwest::Client) {
    let base_url = crate::config::get_agent_base_url(Some(app_handle));
    let status_url = format!("{}/status", base_url);

    let Ok(res) = client.get(&status_url).send().await else {
        let _ = app_handle.emit("agent-state-changed", r#"{"status":"offline"}"#);
        return;
    };

    if !res.status().is_success() {
        let _ = app_handle.emit("agent-state-changed", r#"{"status":"offline"}"#);
        return;
    }

    let Ok(json) = res.text().await else {
        return;
    };

    let _ = app_handle.emit("agent-state-changed", json);
}
