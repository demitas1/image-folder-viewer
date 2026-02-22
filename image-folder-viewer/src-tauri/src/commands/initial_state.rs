// 起動時初期状態取得コマンド

use crate::models::InitialState;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// 起動時初期状態を取得する
/// setup フックで事前読み込み済みのため、ファイル IO なしで即座に返す
#[tauri::command]
pub fn get_initial_state(app: AppHandle) -> Result<InitialState, String> {
    let state = app.state::<Mutex<InitialState>>();
    let locked = state
        .lock()
        .map_err(|e| format!("初期状態のロックに失敗しました: {}", e))?;
    Ok(locked.clone())
}
