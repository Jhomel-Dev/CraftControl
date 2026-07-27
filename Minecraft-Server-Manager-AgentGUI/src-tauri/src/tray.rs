use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Manager};

pub fn setup_system_tray(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let unlink_i = MenuItem::with_id(app, "unlink", "Desvincular Cuenta", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Apagar Agente", true, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "Mostrar Ventana", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &unlink_i, &quit_i])?;

    let default_icon = app.default_window_icon().unwrap().clone();

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .icon(default_icon)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event)
        .build(app)?;

    Ok(())
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.as_ref() {
        "unlink" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let base_url = crate::config::get_agent_base_url(Some(&handle));
                let _ = reqwest::Client::new()
                    .post(format!("{}/unlink", base_url))
                    .send()
                    .await;
            });
        }
        "quit" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
                crate::daemon::graceful_shutdown(&handle).await;
                handle.exit(0);
            });
        }
        "show" => show_main_window(app),
        _ => {}
    }
}

fn handle_tray_event(tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    else {
        return;
    };

    show_main_window(tray.app_handle());
}

fn show_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.show();
    let _ = window.set_focus();
}
