// Tauriコマンド呼び出しラッパー

import { invoke } from "@tauri-apps/api/core";
import type { ProfileData, AppConfig } from "../types";

// ========================================
// プロファイル管理
// ========================================

/**
 * プロファイルを読み込む
 */
export async function loadProfile(path: string): Promise<ProfileData> {
  return invoke<ProfileData>("load_profile", { path });
}

/**
 * プロファイルを保存する
 */
export async function saveProfile(
  path: string,
  profile: ProfileData
): Promise<void> {
  return invoke("save_profile", { path, profile });
}

/**
 * 新規プロファイルを作成する
 */
export async function createNewProfile(path: string): Promise<ProfileData> {
  return invoke<ProfileData>("create_new_profile", { path });
}

// ========================================
// アプリ共通設定
// ========================================

/**
 * アプリ共通設定を取得（起動時に呼び出し）
 */
export async function getAppConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_app_config");
}

/**
 * アプリ共通設定を保存
 */
export async function saveAppConfig(config: AppConfig): Promise<void> {
  return invoke("save_app_config", { config });
}

/**
 * 最近使用したプロファイル履歴に追加
 */
export async function addRecentProfile(path: string): Promise<void> {
  return invoke("add_recent_profile", { path });
}

/**
 * 最近使用したプロファイル履歴から削除
 */
export async function removeRecentProfile(path: string): Promise<void> {
  return invoke("remove_recent_profile", { path });
}

// ========================================
// ダイアログ
// ========================================

/**
 * プロファイルファイル選択ダイアログを開く
 * @returns 選択されたファイルパス、キャンセル時はnull
 */
export async function selectProfileFile(): Promise<string | null> {
  return invoke<string | null>("select_profile_file");
}

/**
 * プロファイルファイル保存ダイアログを開く
 * @returns 選択されたファイルパス、キャンセル時はnull
 */
export async function selectProfileSavePath(): Promise<string | null> {
  return invoke<string | null>("select_profile_save_path");
}
