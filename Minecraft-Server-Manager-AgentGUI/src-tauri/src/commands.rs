use tauri::AppHandle;

#[tauri::command]
pub async fn request_shutdown(app_handle: AppHandle) -> Result<(), String> {
    let base_url = crate::config::get_agent_base_url(Some(&app_handle));
    let url = format!("{}/shutdown", base_url);

    let _ = reqwest::Client::new()
        .post(&url)
        .send()
        .await;
    
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn request_refresh_pin(app_handle: AppHandle) -> Result<(), String> {
    let base_url = crate::config::get_agent_base_url(Some(&app_handle));
    let url = format!("{}/shutdown", base_url);

    reqwest::Client::new()
        .post(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn request_unlink(app_handle: AppHandle) -> Result<(), String> {
    let base_url = crate::config::get_agent_base_url(Some(&app_handle));
    let url = format!("{}/unlink", base_url);

    reqwest::Client::new()
        .post(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
