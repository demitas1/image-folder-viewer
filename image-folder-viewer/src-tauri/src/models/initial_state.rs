// 起動時初期状態

use serde::{Deserialize, Serialize};
use super::app_config::AppConfig;
use super::profile::ProfileData;

/// 起動時初期状態（setup フックで事前読み込み、get_initial_state コマンドで返す）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitialState {
    /// アプリ共通設定
    pub app_config: AppConfig,
    /// 前回使用したプロファイル（存在する場合）
    pub profile: Option<ProfileData>,
    /// 前回使用したプロファイルのパス（存在する場合）
    pub profile_path: Option<String>,
}
