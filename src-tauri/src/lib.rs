use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

const INJECTED_CSS: &str = include_str!(concat!(env!("OUT_DIR"), "/bimbam_bundle.css"));
const INJECTED_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/bimbam_bundle.js"));

fn build_init_script() -> String {
    let escaped_css = serde_json::to_string(INJECTED_CSS)
        .expect("failed to encode injected CSS as a JavaScript string");
    format!(
        r#"
(function() {{
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

pub fn run() {
    let init_script = build_init_script();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(move |app| {
            let show_item =
                MenuItem::with_id(app, "show", "Hiện BimBimBamBam", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Thoát", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("BimBimBamBam")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
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
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running BimBimBamBam");
}
