// 画像関連コマンド

use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageReader;
use once_cell::sync::Lazy;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{AppHandle, Manager};

/// 対応する画像拡張子
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp"];

/// サムネイルキャッシュの最大エントリ数
const MAX_CACHE_ENTRIES: usize = 200;

/// サムネイルキャッシュ（パス+サイズ → Base64 DataURL）
static THUMBNAIL_CACHE: Lazy<Mutex<ThumbnailCache>> =
    Lazy::new(|| Mutex::new(ThumbnailCache::new(MAX_CACHE_ENTRIES)));

/// シンプルなLRU風キャッシュ（最大サイズ超過時は古いエントリを削除）
struct ThumbnailCache {
    map: HashMap<(String, u32), String>,
    order: Vec<(String, u32)>,
    max_size: usize,
}

impl ThumbnailCache {
    fn new(max_size: usize) -> Self {
        Self {
            map: HashMap::new(),
            order: Vec::new(),
            max_size,
        }
    }

    fn get(&self, key: &(String, u32)) -> Option<String> {
        self.map.get(key).cloned()
    }

    fn insert(&mut self, key: (String, u32), value: String) {
        // 既存のキーがある場合は更新のみ
        if self.map.contains_key(&key) {
            self.map.insert(key, value);
            return;
        }

        // 最大サイズを超える場合、古いエントリを削除
        while self.order.len() >= self.max_size {
            if let Some(old_key) = self.order.first().cloned() {
                self.map.remove(&old_key);
                self.order.remove(0);
            }
        }

        // 新しいエントリを追加
        self.order.push(key.clone());
        self.map.insert(key, value);
    }
}

/// サムネイルディスクキャッシュのサブディレクトリ名
const THUMBNAIL_CACHE_DIR: &str = "thumbnails";

/// キャッシュバージョン（フィルター変更時にインクリメントして既存キャッシュを無効化）
const THUMBNAIL_CACHE_VERSION: u32 = 2;

/// ディスクキャッシュのファイル名を計算（SHA-256ハッシュ）
fn disk_cache_filename(image_path: &str, size: u32) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}:v{}", image_path, size, THUMBNAIL_CACHE_VERSION).as_bytes());
    let hash = hasher.finalize();
    format!("{:x}.jpg", hash)
}

/// ディスクキャッシュのベースディレクトリを取得
fn get_cache_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|dir| dir.join(THUMBNAIL_CACHE_DIR))
}

/// ディスクキャッシュの有効性を判定（元画像のmtimeと比較）
fn is_disk_cache_valid(cache_path: &Path, source_path: &Path) -> bool {
    let cache_meta = match fs::metadata(cache_path) {
        Ok(m) => m,
        Err(_) => return false,
    };
    let source_meta = match fs::metadata(source_path) {
        Ok(m) => m,
        Err(_) => return false,
    };
    let source_modified = source_meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    let cache_modified = cache_meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    cache_modified >= source_modified
}

/// ディスクキャッシュからサムネイルを読み込み（Base64 DataURL）
fn try_load_from_disk(cache_path: &Path, source_path: &Path) -> Option<String> {
    if !is_disk_cache_valid(cache_path, source_path) {
        return None;
    }
    let bytes = fs::read(cache_path).ok()?;
    let base64_str = STANDARD.encode(&bytes);
    Some(format!("data:image/jpeg;base64,{}", base64_str))
}

/// サムネイルのJPEGバイト列をディスクキャッシュに保存
fn try_save_to_disk(cache_dir: &Path, cache_path: &Path, jpeg_bytes: &[u8]) {
    let _ = fs::create_dir_all(cache_dir);
    let _ = fs::write(cache_path, jpeg_bytes);
}

/// サムネイル画像を生成してBase64 DataURLで返す（メモリ+ディスクキャッシュ付き）
#[tauri::command]
pub fn get_thumbnail(app: AppHandle, image_path: String, size: u32) -> Result<String, String> {
    let cache_key = (image_path.clone(), size);

    // [1] メモリキャッシュを確認
    {
        let cache = THUMBNAIL_CACHE
            .lock()
            .map_err(|e| format!("キャッシュロックエラー: {}", e))?;
        if let Some(cached) = cache.get(&cache_key) {
            return Ok(cached);
        }
    }

    let source_path = Path::new(&image_path);

    if !source_path.exists() {
        return Err(format!("画像ファイルが見つかりません: {}", image_path));
    }

    // [2] ディスクキャッシュを確認
    let cache_dir = get_cache_dir(&app);
    let disk_cache_path = cache_dir
        .as_ref()
        .map(|dir| dir.join(disk_cache_filename(&image_path, size)));

    if let Some(ref dcp) = disk_cache_path {
        if let Some(data_url) = try_load_from_disk(dcp, source_path) {
            // ディスクキャッシュヒット → メモリキャッシュにも格納
            let mut cache = THUMBNAIL_CACHE
                .lock()
                .map_err(|e| format!("キャッシュロックエラー: {}", e))?;
            cache.insert(cache_key, data_url.clone());
            return Ok(data_url);
        }
    }

    // [3] サムネイル生成
    let img = ImageReader::open(source_path)
        .map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?
        .decode()
        .map_err(|e| format!("画像のデコードに失敗しました: {}", e))?;

    let thumbnail = img.resize(size, size, image::imageops::FilterType::Lanczos3);

    let mut buffer = Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buffer, image::ImageFormat::Jpeg)
        .map_err(|e| format!("サムネイルのエンコードに失敗しました: {}", e))?;

    let jpeg_bytes = buffer.into_inner();

    // ディスクキャッシュに保存
    if let (Some(ref dir), Some(ref dcp)) = (&cache_dir, &disk_cache_path) {
        try_save_to_disk(dir, dcp, &jpeg_bytes);
    }

    // Base64エンコードしてDataURLとして返す
    let base64_str = STANDARD.encode(&jpeg_bytes);
    let result = format!("data:image/jpeg;base64,{}", base64_str);

    // メモリキャッシュに格納
    {
        let mut cache = THUMBNAIL_CACHE
            .lock()
            .map_err(|e| format!("キャッシュロックエラー: {}", e))?;
        cache.insert(cache_key, result.clone());
    }

    Ok(result)
}

/// パスが画像ファイルかどうか判定
fn is_image_file(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    // macOS AppleDouble リソースフォークファイル（._xxx）を除外
    if let Some(name) = path.file_name() {
        if name.to_string_lossy().starts_with("._") {
            return false;
        }
    }
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        return IMAGE_EXTENSIONS.contains(&ext_lower.as_str());
    }
    false
}

/// フォルダ内の画像ファイルパスを収集（再帰オプション付き、ファイル名順）
fn collect_images(dir: &Path, recursive: bool) -> Result<Vec<PathBuf>, String> {
    let mut result: Vec<PathBuf> = Vec::new();

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("フォルダの読み込みに失敗しました: {}", e))?;

    let mut dirs: Vec<PathBuf> = Vec::new();

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if is_image_file(&path) {
            result.push(path);
        } else if recursive && path.is_dir() {
            // macOS アーティファクトディレクトリ（__MACOSX）を除外
            let skip = path
                .file_name()
                .map(|n| n == "__MACOSX")
                .unwrap_or(false);
            if !skip {
                dirs.push(path);
            }
        }
    }

    // 現在のディレクトリの画像をファイル名順にソート
    result.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    // サブディレクトリを再帰的に処理（ディレクトリ名順）
    if recursive {
        dirs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
        for sub_dir in dirs {
            let sub_images = collect_images(&sub_dir, true)?;
            result.extend(sub_images);
        }
    }

    Ok(result)
}

/// フォルダ内の最初の画像ファイルパスを取得
#[tauri::command]
pub fn get_first_image_in_folder(folder_path: String, recursive: bool) -> Result<Option<String>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("フォルダが見つかりません: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("指定されたパスはフォルダではありません: {}", folder_path));
    }

    let images = collect_images(path, recursive)?;
    Ok(images.first().map(|p| p.to_string_lossy().to_string()))
}

/// フォルダパスが有効かどうかを検証
#[tauri::command]
pub fn validate_folder_path(path: String) -> Result<bool, String> {
    let folder_path = Path::new(&path);
    Ok(folder_path.exists() && folder_path.is_dir())
}

/// 画像ファイル情報（軽量版：パスとファイル名のみ）
#[derive(Debug, Clone, Serialize)]
pub struct ImageFile {
    pub path: String,
    pub filename: String,
}

/// フォルダ内のすべての画像ファイルを取得（ファイル名順でソート、再帰オプション付き）
#[tauri::command]
pub fn get_images_in_folder(folder_path: String, recursive: bool) -> Result<Vec<ImageFile>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("フォルダが見つかりません: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!(
            "指定されたパスはフォルダではありません: {}",
            folder_path
        ));
    }

    let paths = collect_images(path, recursive)?;

    let images: Vec<ImageFile> = paths
        .into_iter()
        .map(|file_path| ImageFile {
            path: file_path.to_string_lossy().to_string(),
            filename: file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default(),
        })
        .collect();

    Ok(images)
}
