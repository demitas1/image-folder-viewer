// Image Folder Viewer - Tauriバックエンド

mod commands;
mod models;

use commands::{create_new_profile, load_profile, save_profile};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_profile,
            save_profile,
            create_new_profile,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの実行中にエラーが発生しました");
}
