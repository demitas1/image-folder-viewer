// プロファイル関連のデータ構造

use serde::{Deserialize, Serialize};

/// カード情報
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub title: String,
    pub folder_path: String,
    pub thumbnail: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// カード（検証結果付き）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardWithStatus {
    #[serde(flatten)]
    pub card: Card,
    pub is_valid: bool,
    pub error_message: Option<String>,
}

/// タグ情報（将来の拡張用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

/// カードとタグの関連（将来の拡張用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardTag {
    pub card_id: String,
    pub tag_id: String,
}

/// ウィンドウ状態
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: i32,
    pub height: i32,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: 1280,
            height: 800,
        }
    }
}

/// アプリケーション状態（プロファイル内に保存）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub last_page: String, // "index" | "viewer"
    pub last_card_id: Option<String>,
    pub last_image_index: i32,
    pub h_flip_enabled: bool,
    pub shuffle_enabled: bool,
    pub window: WindowState,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            last_page: "index".to_string(),
            last_card_id: None,
            last_image_index: 0,
            h_flip_enabled: false,
            shuffle_enabled: false,
            window: WindowState::default(),
        }
    }
}

/// プロファイルデータ（.ivprofileファイルの内容）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileData {
    pub version: String,
    pub updated_at: String,
    pub cards: Vec<Card>,
    pub tags: Vec<Tag>,
    pub card_tags: Vec<CardTag>,
    pub app_state: AppState,
}

impl Default for ProfileData {
    fn default() -> Self {
        Self {
            version: "1.0".to_string(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            cards: Vec::new(),
            tags: Vec::new(),
            card_tags: Vec::new(),
            app_state: AppState::default(),
        }
    }
}
