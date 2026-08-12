use tauri::AppHandle;

#[tauri::command]
pub async fn request_shutdown(app_handle: AppHandle) -> Result<(), String> {
    crate::daemon::graceful_shutdown(&app_handle).await;
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn request_refresh_pin(app_handle: AppHandle) -> Result<(), String> {
    crate::daemon::restart_agent(&app_handle).await;
    Ok(())
}

#[tauri::command]
pub async fn request_unlink(app_handle: AppHandle) -> Result<(), String> {
    let base_url = crate::config::get_agent_base_url(Some(&app_handle));
    let url = format!("{}/unlink", base_url);

    let secret = crate::config::read_daemon_secret(Some(&app_handle)).unwrap_or_default();
    reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", secret))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_daemon_base_url(app_handle: AppHandle) -> Result<String, String> {
    Ok(crate::config::get_agent_base_url(Some(&app_handle)))
}

#[tauri::command]
pub async fn get_daemon_secret(app_handle: AppHandle) -> Result<String, String> {
    Ok(crate::config::read_daemon_secret(Some(&app_handle)).unwrap_or_default())
}
