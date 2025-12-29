// プロファイル管理コマンド

use crate::models::ProfileData;
use std::fs;
use std::path::Path;

/// プロファイルを読み込む
#[tauri::command]
pub fn load_profile(path: String) -> Result<ProfileData, String> {
    let path = Path::new(&path);

    // ファイルの存在確認
    if !path.exists() {
        return Err(format!("プロファイルが見つかりません: {}", path.display()));
    }

    // ファイル読み込み
    let content = fs::read_to_string(path)
        .map_err(|e| format!("ファイルの読み込みに失敗しました: {}", e))?;

    // JSONパース
    let profile: ProfileData = serde_json::from_str(&content)
        .map_err(|e| format!("プロファイルの解析に失敗しました: {}", e))?;

    Ok(profile)
}

/// プロファイルを保存する
#[tauri::command]
pub fn save_profile(path: String, profile: ProfileData) -> Result<(), String> {
    // 更新日時を現在時刻に更新
    let mut profile = profile;
    profile.updated_at = chrono::Utc::now().to_rfc3339();

    // JSONに変換（整形あり）
    let content = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("プロファイルの変換に失敗しました: {}", e))?;

    // ファイルに書き込み
    fs::write(&path, content)
        .map_err(|e| format!("ファイルの保存に失敗しました: {}", e))?;

    Ok(())
}

/// 新規プロファイルを作成する
#[tauri::command]
pub fn create_new_profile(path: String) -> Result<ProfileData, String> {
    let path_obj = Path::new(&path);

    // 既存ファイルがあれば警告
    if path_obj.exists() {
        return Err(format!("ファイルが既に存在します: {}", path));
    }

    // 親ディレクトリの存在確認
    if let Some(parent) = path_obj.parent() {
        if !parent.exists() {
            return Err(format!("親ディレクトリが存在しません: {}", parent.display()));
        }
    }

    // デフォルトのプロファイルを作成
    let profile = ProfileData::default();

    // 保存
    save_profile(path, profile.clone())?;

    Ok(profile)
}
