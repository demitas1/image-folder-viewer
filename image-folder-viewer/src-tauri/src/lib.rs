// Image Folder Viewer - Tauriバックエンド

mod commands;
mod models;

use commands::{
    // プロファイル管理
    create_new_profile,
    load_profile,
    save_profile,
    // アプリ共通設定
    add_recent_profile,
    get_app_config,
    remove_recent_profile,
    save_app_config,
    // ダイアログ
    select_profile_file,
    select_profile_save_path,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // プロファイル管理
            load_profile,
            save_profile,
            create_new_profile,
            // アプリ共通設定
            get_app_config,
            save_app_config,
            add_recent_profile,
            remove_recent_profile,
            // ダイアログ
            select_profile_file,
            select_profile_save_path,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの実行中にエラーが発生しました");
}
