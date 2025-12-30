// アプリ共通設定関連のデータ構造

use serde::{Deserialize, Serialize};

/// 最近使用したプロファイル
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProfile {
    /// プロファイルファイルのパス
    pub path: String,
    /// ファイル名（拡張子なし）
    pub name: String,
    /// 最終使用日時（ISO 8601形式）
    pub last_opened_at: String,
}

/// アプリ共通設定
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// 設定ファイルのバージョン
    pub version: String,
    /// 最近使用したプロファイル履歴
    pub recent_profiles: Vec<RecentProfile>,
    /// 履歴の最大保持数
    pub max_recent_profiles: i32,
    /// テーマ設定 ("light" | "dark" | "system")
    pub theme: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: "1.0".to_string(),
            recent_profiles: Vec::new(),
            max_recent_profiles: 10,
            theme: "system".to_string(),
        }
    }
}
