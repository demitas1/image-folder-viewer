// ダイアログ関連コマンド

use tauri_plugin_dialog::DialogExt;

/// プロファイルファイル選択ダイアログ（開く用）
#[tauri::command]
pub async fn select_profile_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Image Viewer Profile", &["ivprofile"])
        .blocking_pick_file();

    Ok(file.map(|f| f.to_string()))
}

/// プロファイルファイル保存ダイアログ（新規作成・別名保存用）
#[tauri::command]
pub async fn select_profile_save_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Image Viewer Profile", &["ivprofile"])
        .set_file_name("profile.ivprofile")
        .blocking_save_file();

    // パスに .ivprofile 拡張子がない場合は追加
    Ok(file.map(|f| {
        let path_str = f.to_string();
        if path_str.ends_with(".ivprofile") {
            path_str
        } else {
            format!("{}.ivprofile", path_str)
        }
    }))
}
