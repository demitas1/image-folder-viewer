// 画像関連コマンド

use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageReader;
use std::fs;
use std::io::Cursor;
use std::path::Path;

/// 対応する画像拡張子
const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp"];

/// サムネイル画像を生成してBase64 DataURLで返す
#[tauri::command]
pub fn get_thumbnail(image_path: String, size: u32) -> Result<String, String> {
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

    // JPEGとしてエンコード（品質85%、PNGより高速）
    let mut buffer = Cursor::new(Vec::new());
    thumbnail
        .write_to(&mut buffer, image::ImageFormat::Jpeg)
        .map_err(|e| format!("サムネイルのエンコードに失敗しました: {}", e))?;

    // Base64エンコードしてDataURLとして返す
    let base64_str = STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
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
