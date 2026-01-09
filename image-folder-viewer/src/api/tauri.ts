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

/**
 * フォルダ選択ダイアログを開く（カード追加用）
 * @returns 選択されたフォルダパス、キャンセル時はnull
 */
export async function selectFolder(): Promise<string | null> {
  return invoke<string | null>("select_folder");
}

/**
 * 画像ファイル選択ダイアログを開く（サムネイル選択用）
 * @param initialDir 初期ディレクトリ（省略可能）
 * @returns 選択されたファイルパス、キャンセル時はnull
 */
export async function selectImageFile(
  initialDir?: string
): Promise<string | null> {
  return invoke<string | null>("select_image_file", { initialDir });
}

// ========================================
// 画像
// ========================================

/**
 * サムネイル画像を取得（Base64 DataURL）
 * @param imagePath 画像ファイルパス
 * @param size サムネイルサイズ（デフォルト: 200）
 * @returns Base64 DataURL
 */
export async function getThumbnail(
  imagePath: string,
  size: number = 200
): Promise<string> {
  return invoke<string>("get_thumbnail", { imagePath, size });
}

/**
 * フォルダ内の最初の画像ファイルパスを取得
 * @param folderPath フォルダパス
 * @returns 最初の画像ファイルパス、画像がない場合はnull
 */
export async function getFirstImageInFolder(
  folderPath: string
): Promise<string | null> {
  return invoke<string | null>("get_first_image_in_folder", { folderPath });
}

/**
 * フォルダパスが有効かどうかを検証
 * @param path 検証するパス
 * @returns フォルダが存在すればtrue
 */
export async function validateFolderPath(path: string): Promise<boolean> {
  return invoke<boolean>("validate_folder_path", { path });
}
