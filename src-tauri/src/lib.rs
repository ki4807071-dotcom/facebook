use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use serde::Serialize;
use std::sync::Mutex;

const INJECTED_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/bimbam_bundle.css"));
const INJECTED_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/bimbam_bundle.js"));

#[derive(Clone, Serialize)]
struct TabInfo {
    label: String,
    title: String,
}

#[derive(Clone, Serialize)]
struct TabsSnapshot {
    tabs: Vec<TabInfo>,
    active: String,
}

struct TabManager {
    tabs: Mutex<Vec<TabInfo>>,
    active: Mutex<String>,
    next_id: Mutex<u64>,
}

impl Default for TabManager {
    fn default() -> Self {
        Self {
            tabs: Mutex::new(vec![TabInfo {
                label: "main".into(),
                title: "Messenger".into(),
            }]),
            active: Mutex::new("main".into()),
            next_id: Mutex::new(1),
        }
    }
}

fn tabs_snapshot(state: &TabManager) -> Result<TabsSnapshot, String> {
    Ok(TabsSnapshot {
        tabs: state.tabs.lock().map_err(|error| error.to_string())?.clone(),
        active: state
            .active
            .lock()
            .map_err(|error| error.to_string())?
            .clone(),
    })
}

fn emit_tabs(app: &AppHandle, state: &TabManager) -> Result<(), String> {
    app.emit("bimbam:tabs-updated", tabs_snapshot(state)?)
        .map_err(|error| error.to_string())
}

fn parse_tab_url(value: &str) -> Result<tauri::Url, String> {
    let url = value
        .parse::<tauri::Url>()
        .map_err(|error| format!("Địa chỉ không hợp lệ: {error}"))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Chỉ hỗ trợ trang web HTTP hoặc HTTPS".into());
    }
    Ok(url)
}

#[tauri::command]
fn list_tabs(state: State<'_, TabManager>) -> Result<TabsSnapshot, String> {
    tabs_snapshot(&state)
}

#[tauri::command]
fn create_tab(app: AppHandle, state: State<'_, TabManager>, url: String) -> Result<String, String> {
    let parsed_url = parse_tab_url(&url)?;
    let title = parsed_url.host_str().unwrap_or("Trang mới").to_string();
    let label = {
        let mut next_id = state
            .next_id
            .lock()
            .map_err(|error| error.to_string())?;
        let label = format!("tab-{next_id}");
        *next_id += 1;
        label
    };

    let active_label = state
        .active
        .lock()
        .map_err(|error| error.to_string())?
        .clone();
    let active_window = app
        .get_webview_window(&active_label)
        .or_else(|| app.get_webview_window("main"))
        .ok_or_else(|| "Không tìm thấy cửa sổ đang mở".to_string())?;
    let scale = active_window.scale_factor().map_err(|error| error.to_string())?;
    let position = active_window
        .outer_position()
        .map_err(|error| error.to_string())?;
    let size = active_window
        .inner_size()
        .map_err(|error| error.to_string())?;

    let new_window = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::External(parsed_url),
    )
    .title(format!("{title} — BimBimBamBam"))
    .position(position.x as f64 / scale, position.y as f64 / scale)
    .inner_size(size.width as f64 / scale, size.height as f64 / scale)
    .visible(false)
    .initialization_script(&build_init_script())
    .on_navigation(|target_url| is_blocked_tracker(target_url.as_str()))
    .build()
    .map_err(|error| error.to_string())?;

    if let Some(previous) = app.get_webview_window(&active_label) {
        if let Err(error) = previous.hide() {
            let _ = new_window.close();
            return Err(error.to_string());
        }
    }
    if let Err(error) = new_window.show() {
        if let Some(previous) = app.get_webview_window(&active_label) {
            let _ = previous.show();
        }
        let _ = new_window.close();
        return Err(error.to_string());
    }
    new_window.set_focus().map_err(|error| error.to_string())?;

    state
        .tabs
        .lock()
        .map_err(|error| error.to_string())?
        .push(TabInfo {
            label: label.clone(),
            title,
        });
    *state
        .active
        .lock()
        .map_err(|error| error.to_string())? = label.clone();
    emit_tabs(&app, &state)?;
    Ok(label)
}

#[tauri::command]
fn switch_tab(app: AppHandle, state: State<'_, TabManager>, label: String) -> Result<(), String> {
    let exists = state
        .tabs
        .lock()
        .map_err(|error| error.to_string())?
        .iter()
        .any(|tab| tab.label == label);
    if !exists {
        return Err("Không tìm thấy trang cần chuyển".into());
    }

    let target = app
        .get_webview_window(&label)
        .ok_or_else(|| "Cửa sổ trang không còn tồn tại".to_string())?;
    target.show().map_err(|error| error.to_string())?;
    let previous_label = state
        .active
        .lock()
        .map_err(|error| error.to_string())?
        .clone();
    if previous_label != label {
        if let Some(previous) = app.get_webview_window(&previous_label) {
            previous.hide().map_err(|error| error.to_string())?;
        }
    }
    target.set_focus().map_err(|error| error.to_string())?;
    *state
        .active
        .lock()
        .map_err(|error| error.to_string())? = label;
    emit_tabs(&app, &state)
}

#[tauri::command]
fn close_tab(app: AppHandle, state: State<'_, TabManager>, label: String) -> Result<(), String> {
    if label == "main" {
        return Err("Không thể đóng trang Messenger mặc định".into());
    }
    let next_label = {
        let mut tabs = state.tabs.lock().map_err(|error| error.to_string())?;
        let index = tabs
            .iter()
            .position(|tab| tab.label == label)
            .ok_or_else(|| "Không tìm thấy trang cần đóng".to_string())?;
        tabs.remove(index);
        tabs.get(index.saturating_sub(1))
            .map(|tab| tab.label.clone())
            .unwrap_or_else(|| "main".into())
    };

    let was_active = *state
        .active
        .lock()
        .map_err(|error| error.to_string())?
        == label;
    if was_active {
        let next = app
            .get_webview_window(&next_label)
            .ok_or_else(|| "Không tìm thấy trang để chuyển tới".to_string())?;
        next.show().map_err(|error| error.to_string())?;
        next.set_focus().map_err(|error| error.to_string())?;
        *state
            .active
            .lock()
            .map_err(|error| error.to_string())? = next_label;
    }
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|error| error.to_string())?;
    }
    emit_tabs(&app, &state)
}

fn build_init_script() -> String {
    let escaped_css = serde_json::to_string(INJECTED_CSS)
        .expect("failed to encode injected CSS as a JavaScript string");
    let app_version = serde_json::to_string(env!("CARGO_PKG_VERSION"))
        .expect("failed to encode app version as a JavaScript string");
    format!(
        r#"
(function() {{
  window.BimBam = window.BimBam || {{}};
  window.BimBam.appVersion = {app_version};
  function injectStyles() {{
    if (document.getElementById('bimbam-pro-style')) return;
    const style = document.createElement('style');
    style.id = 'bimbam-pro-style';
    style.textContent = {escaped_css};
    (document.head || document.documentElement).appendChild(style);
  }}
  if (document.documentElement) {{
    injectStyles();
  }}
  window.addEventListener('DOMContentLoaded', injectStyles, {{ once: true }});
}})();
{INJECTED_JS}
"#
    )
}

fn is_blocked_tracker(url: &str) -> bool {
    const BLOCKED_PATTERNS: [&str; 5] = [
        "pixel.facebook.com",
        "/ajax/bz",
        "/logging/",
        "impression",
        "cavalry",
    ];
    !BLOCKED_PATTERNS.iter().any(|pattern| url.contains(pattern))
}

#[tauri::command]
async fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn show_message_notification(app: AppHandle, sender: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    let sender = sender.trim();
    let sender = if sender.is_empty() {
        "người gửi".to_string()
    } else {
        sender.chars().take(80).collect()
    };
    app.notification()
        .builder()
        .title("BimBimBamBam")
        .body(format!("Ê Sigma, bạn nhận tin nhắn mới từ {sender}"))
        .show()
        .map_err(|error| error.to_string())
}

pub fn run() {
    let init_script = build_init_script();

    tauri::Builder::default()
        .manage(TabManager::default())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            open_external_url,
            show_message_notification,
            list_tabs,
            create_tab,
            switch_tab,
            close_tab
        ])
        .setup(move |app| {
            let show_item =
                MenuItem::with_id(app, "show", "Hiện BimBimBamBam", true, None::<&str>)?;
            let update_item =
                MenuItem::with_id(app, "check-update", "Kiểm tra cập nhật", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &update_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(
                    tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                        .expect("failed to load tray icon"),
                )
                .menu(&tray_menu)
                .tooltip("BimBimBamBam")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "check-update" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("bimbam-check-update", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let url = tauri::WebviewUrl::External(
                "https://www.facebook.com/messages"
                    .parse()
                    .expect("invalid Messenger URL"),
            );
            let window = tauri::WebviewWindowBuilder::new(app, "main", url)
                .title("BimBimBamBam")
                .inner_size(1140.0, 760.0)
                .min_inner_size(640.0, 460.0)
                .initialization_script(&init_script)
                .on_navigation(|target_url| is_blocked_tracker(target_url.as_str()));

            #[cfg(target_os = "macos")]
            let window = window.transparent(true);

            let _window = window.build()?;

            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&_window, NSVisualEffectMaterial::Sidebar, None, None);
            }

            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_mica;
                let _ = apply_mica(&_window, Some(true));
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    let app = window.app_handle();
                    if let Some(state) = app.try_state::<TabManager>() {
                        if let Ok(mut tabs) = state.tabs.lock() {
                            tabs.retain(|tab| tab.label != window.label());
                            if let Ok(mut active) = state.active.lock() {
                                if *active == window.label() {
                                    let next_label = tabs
                                        .last()
                                        .map(|tab| tab.label.clone())
                                        .unwrap_or_else(|| "main".into());
                                    *active = next_label.clone();
                                    if let Some(next) = app.get_webview_window(&next_label) {
                                        let _ = next.show();
                                        let _ = next.set_focus();
                                    }
                                }
                            }
                            let _ = emit_tabs(&app, &state);
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running BimBimBamBam");
}
