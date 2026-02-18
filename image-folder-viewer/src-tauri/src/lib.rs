// Image Folder Viewer - Tauriバックエンド

mod commands;
mod models;

use tauri::Manager;
use commands::{
    load_app_config,
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
    select_folder,
    select_image_file,
    select_profile_file,
    select_profile_save_path,
    // 画像
    get_first_image_in_folder,
    get_images_in_folder,
    get_thumbnail,
    validate_folder_path,
    // クリップボード
    copy_image_to_clipboard,
    copy_text_to_clipboard,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 起動時にウィンドウをフォアグラウンドに表示（設定で制御可能）
            let config = load_app_config(app.handle());
            if config.focus_on_startup {
                // Linux のフォーカス盗み防止対策：always_on_top で前面に出し、
                // フォーカスを得た時点で解除する
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_always_on_top(true);
                    let _ = window.set_focus();
                    let w = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::Focused(true) = event {
                            let _ = w.set_always_on_top(false);
                        }
                    });
                }
            }
            Ok(())
        })
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
            select_folder,
            select_image_file,
            select_profile_file,
            select_profile_save_path,
            // 画像
            get_thumbnail,
            get_first_image_in_folder,
            get_images_in_folder,
            validate_folder_path,
            // クリップボード
            copy_image_to_clipboard,
            copy_text_to_clipboard,
        ])
        .run(tauri::generate_context!())
        .expect("Tauriアプリケーションの実行中にエラーが発生しました");
}
