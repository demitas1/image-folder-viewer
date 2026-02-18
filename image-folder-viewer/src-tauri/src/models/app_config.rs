// アプリ共通設定関連のデータ構造

use serde::{Deserialize, Serialize};

fn default_version() -> String {
    "1.0".to_string()
}
fn default_max_recent_profiles() -> i32 {
    10
}
fn default_theme() -> String {
    "system".to_string()
}
fn default_true() -> bool {
    true
}

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
/// 各フィールドに default を設定しており、部分的な JSON ファイルでも正しく読み込める
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// 設定ファイルのバージョン
    #[serde(default = "default_version")]
    pub version: String,
    /// 最近使用したプロファイル履歴
    #[serde(default)]
    pub recent_profiles: Vec<RecentProfile>,
    /// 履歴の最大保持数
    #[serde(default = "default_max_recent_profiles")]
    pub max_recent_profiles: i32,
    /// テーマ設定 ("light" | "dark" | "system")
    #[serde(default = "default_theme")]
    pub theme: String,
    /// 起動時にウィンドウを最前面に表示する（Linux のフォーカス盗み防止対策）
    #[serde(default = "default_true")]
    pub focus_on_startup: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: default_version(),
            recent_profiles: Vec::new(),
            max_recent_profiles: default_max_recent_profiles(),
            theme: default_theme(),
            focus_on_startup: default_true(),
        }
    }
}
