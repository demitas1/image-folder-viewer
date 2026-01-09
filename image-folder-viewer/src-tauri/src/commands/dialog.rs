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

/// フォルダ選択ダイアログ（カード追加用）
#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();

    Ok(folder.map(|f| f.to_string()))
}

/// 画像ファイル選択ダイアログ（サムネイル選択用）
#[tauri::command]
pub async fn select_image_file(
    app: tauri::AppHandle,
    initial_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("画像ファイル", &["jpg", "jpeg", "png", "gif", "webp", "bmp"]);

    // 初期ディレクトリが指定されている場合は設定
    if let Some(dir) = initial_dir {
        dialog = dialog.set_directory(dir);
    }

    let file = dialog.blocking_pick_file();

    Ok(file.map(|f| f.to_string()))
}
