// Image Folder Viewer - Tauriバックエンド

mod commands;
mod models;

use std::sync::Mutex;
use tauri::Manager;
use commands::{
    load_app_config,
    load_profile_from_path,
    // プロファイル管理
    create_new_profile,
    load_profile,
    save_profile,
    // アプリ共通設定
    add_recent_profile,
    get_app_config,
    get_initial_state,
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
            // app_config.json を読み込む
            let config = load_app_config(app.handle());

            // focus_on_startup が有効な場合、フォーカス取得後に always_on_top を解除
            // ウィンドウは非表示で起動し、フロントエンドの window.show() 後にフォーカスが当たる
            if config.focus_on_startup {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_always_on_top(true);
                    let w = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::Focused(true) = event {
                            let _ = w.set_always_on_top(false);
                        }
                    });
                }
            }

            // 最近使用したプロファイルを先読み（ファイル IO をここで完了させる）
            let (profile, profile_path) = if let Some(recent) = config.recent_profiles.first() {
                let path = recent.path.clone();
                match load_profile_from_path(&path) {
                    Ok(p) => (Some(p), Some(path)),
                    Err(_) => (None, None),
                }
            } else {
                (None, None)
            };

            // InitialState を管理状態として保持（get_initial_state コマンドで取得）
            app.manage(Mutex::new(models::InitialState {
                app_config: config,
                profile,
                profile_path,
            }));

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // 起動時初期状態
            get_initial_state,
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
