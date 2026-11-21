use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn collect_files(dir: &Path, ext: &str, out: &mut String) {
    if !dir.exists() {
        return;
    }

    let mut entries: Vec<_> = fs::read_dir(dir)
        .expect("failed to read injection directory")
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.extension().and_then(|value| value.to_str()) == Some(ext))
        .collect();
    entries.sort();

    for path in entries {
        let content = fs::read_to_string(&path)
            .unwrap_or_else(|error| panic!("failed to read {}: {error}", path.display()));
        out.push_str(&format!(
            "\n/* === {} === */\n",
            path.file_name().unwrap().to_string_lossy()
        ));
        out.push_str(&content);
        out.push('\n');
    }
}

fn main() {
    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is not set"));
    let injection_dir = manifest_dir.join("../src/inject");
    println!("cargo:rerun-if-changed={}", injection_dir.display());

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR is not set"));
    let mut css_bundle = String::new();
    let mut js_bundle = String::new();

    collect_files(&injection_dir.join("css"), "css", &mut css_bundle);
    collect_files(&injection_dir.join("js"), "js", &mut js_bundle);

    fs::write(out_dir.join("bimbam_bundle.css"), css_bundle)
        .expect("failed to write CSS bundle");
    fs::write(out_dir.join("bimbam_bundle.js"), js_bundle)
        .expect("failed to write JavaScript bundle");

    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "open_external_url",
                "get_memory_trim_settings",
                "set_memory_trim_settings",
                "check_for_update",
                "install_update",
                "show_message_notification",
                "list_tabs",
                "create_tab",
                "switch_tab",
                "close_tab",
            ]),
        ),
    )
    .expect("failed to run tauri-build");
}
