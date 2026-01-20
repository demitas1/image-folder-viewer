// 画像関連コマンド

use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageReader;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::Path;
use std::sync::Mutex;

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

/// サムネイル画像を生成してBase64 DataURLで返す（キャッシュ付き）
#[tauri::command]
pub fn get_thumbnail(image_path: String, size: u32) -> Result<String, String> {
    let cache_key = (image_path.clone(), size);

    // キャッシュを確認
    {
        let cache = THUMBNAIL_CACHE
            .lock()
            .map_err(|e| format!("キャッシュロックエラー: {}", e))?;
        if let Some(cached) = cache.get(&cache_key) {
            return Ok(cached);
        }
    }

    // キャッシュにない場合は生成
    let path = Path::new(&image_path);

    if !path.exists() {
        return Err(format!("画像ファイルが見つかりません: {}", image_path));
    }

    // 画像を読み込み
    let img = ImageReader::open(path)
        .map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?
        .decode()
        .map_err(|e| format!("画像のデコードに失敗しました: {}", e))?;

    // アスペクト比を維持してリサイズ
    let thumbnail = img.thumbnail(size, size);

    // JPEGとしてエンコード（PNGより高速）
    let mut buffer = Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buffer, image::ImageFormat::Jpeg)
        .map_err(|e| format!("サムネイルのエンコードに失敗しました: {}", e))?;

    // Base64エンコードしてDataURLとして返す
    let base64_str = STANDARD.encode(buffer.into_inner());
    let result = format!("data:image/jpeg;base64,{}", base64_str);

    // キャッシュに保存
    {
        let mut cache = THUMBNAIL_CACHE
            .lock()
            .map_err(|e| format!("キャッシュロックエラー: {}", e))?;
        cache.insert(cache_key, result.clone());
    }

    Ok(result)
}

/// フォルダ内の最初の画像ファイルパスを取得
#[tauri::command]
pub fn get_first_image_in_folder(folder_path: String) -> Result<Option<String>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("フォルダが見つかりません: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("指定されたパスはフォルダではありません: {}", folder_path));
    }

    // ディレクトリ内のエントリを取得してソート
    let mut entries: Vec<_> = fs::read_dir(path)
        .map_err(|e| format!("フォルダの読み込みに失敗しました: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Some(ext) = entry.path().extension() {
                        let ext_lower = ext.to_string_lossy().to_lowercase();
                        return IMAGE_EXTENSIONS.contains(&ext_lower.as_str());
                    }
                }
            }
            false
        })
        .collect();

    // ファイル名でソート
    entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    // 最初の画像ファイルのパスを返す
    Ok(entries
        .first()
        .map(|entry| entry.path().to_string_lossy().to_string()))
}

/// フォルダパスが有効かどうかを検証
#[tauri::command]
pub fn validate_folder_path(path: String) -> Result<bool, String> {
    let folder_path = Path::new(&path);
    Ok(folder_path.exists() && folder_path.is_dir())
}
