use tauri::Manager;

mod commands;
mod config;
mod daemon;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(handle_single_instance))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::request_shutdown,
            commands::request_refresh_pin,
            commands::request_unlink,
            commands::get_daemon_base_url,
            commands::get_daemon_secret
        ])
        .setup(|app| {
            tray::setup_system_tray(app)?;
            daemon::start_agent_polling_loop(app.handle().clone());
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                daemon::check_update_and_spawn(&app_handle).await;
            });
            Ok(())
        })
        .on_window_event(handle_window_event)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_single_instance(app: &tauri::AppHandle, _args: Vec<String>, _cwd: String) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    let tauri::WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    api.prevent_close();
    let _ = window.hide();
}
