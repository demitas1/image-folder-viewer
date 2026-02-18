// アプリ共通設定管理コマンド

use crate::models::{AppConfig, RecentProfile};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 設定ファイル名
const CONFIG_FILE_NAME: &str = "app_config.json";

/// アプリ共通設定ファイルのパスを取得
fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("アプリデータディレクトリの取得に失敗しました: {}", e))?;

    // ディレクトリが存在しない場合は作成
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("アプリデータディレクトリの作成に失敗しました: {}", e))?;
    }

    Ok(app_data_dir.join(CONFIG_FILE_NAME))
}

/// アプリ共通設定をファイルから読み込む（内部処理用・setup フックから直接呼び出し可能）
pub fn load_app_config(app: &AppHandle) -> AppConfig {
    let config_path = match get_config_path(app) {
        Ok(p) => p,
        Err(_) => return AppConfig::default(),
    };

    if !config_path.exists() {
        return AppConfig::default();
    }

    let content = match fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return AppConfig::default(),
    };

    serde_json::from_str(&content).unwrap_or_else(|_| AppConfig::default())
}

/// アプリ共通設定を取得（起動時に呼び出し）
#[tauri::command]
pub fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
    Ok(load_app_config(&app))
}

/// アプリ共通設定を保存
#[tauri::command]
pub fn save_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path(&app)?;

    // JSONに変換（整形あり）
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("設定の変換に失敗しました: {}", e))?;

    // ファイルに書き込み
    fs::write(&config_path, content)
        .map_err(|e| format!("設定ファイルの保存に失敗しました: {}", e))?;

    Ok(())
}

/// 最近使用したプロファイル履歴に追加
#[tauri::command]
pub fn add_recent_profile(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_app_config(app.clone())?;

    // パスからファイル名（拡張子なし）を取得
    let name = std::path::Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    // 現在時刻
    let now = chrono::Utc::now().to_rfc3339();

    // 既存の同じパスのエントリを削除
    config.recent_profiles.retain(|p| p.path != path);

    // 先頭に追加
    config.recent_profiles.insert(
        0,
        RecentProfile {
            path,
            name,
            last_opened_at: now,
        },
    );

    // 最大数を超えた場合は古いものを削除
    let max = config.max_recent_profiles as usize;
    if config.recent_profiles.len() > max {
        config.recent_profiles.truncate(max);
    }

    // 保存
    save_app_config(app, config)?;

    Ok(())
}

/// 最近使用したプロファイル履歴から削除
#[tauri::command]
pub fn remove_recent_profile(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = get_app_config(app.clone())?;

    // 指定パスのエントリを削除
    config.recent_profiles.retain(|p| p.path != path);

    // 保存
    save_app_config(app, config)?;

    Ok(())
}
