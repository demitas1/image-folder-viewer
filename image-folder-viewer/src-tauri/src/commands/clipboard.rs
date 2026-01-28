// クリップボード操作コマンド
//
// Linux/X11ではClipboardインスタンスがドロップされるとクリップボードの内容が
// 失われるため、グローバルなインスタンスをアプリケーションのライフタイム全体で保持する。

use arboard::Clipboard;
use image::ImageReader;
use once_cell::sync::Lazy;
use std::path::Path;
use std::sync::Mutex;

/// グローバルClipboardインスタンス（Linux/X11対策）
static CLIPBOARD: Lazy<Mutex<Clipboard>> = Lazy::new(|| {
    Mutex::new(Clipboard::new().expect("クリップボードの初期化に失敗しました"))
});

/// 画像をクリップボードにコピー
#[tauri::command]
pub fn copy_image_to_clipboard(image_path: String) -> Result<(), String> {
    let path = Path::new(&image_path);

    if !path.exists() {
        return Err(format!("画像ファイルが見つかりません: {}", image_path));
    }

    // 画像を読み込み
    let img = ImageReader::open(path)
        .map_err(|e| format!("画像の読み込みに失敗しました: {}", e))?
        .decode()
        .map_err(|e| format!("画像のデコードに失敗しました: {}", e))?;

    // RGBAに変換
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // クリップボードに設定
    let mut clipboard = CLIPBOARD
        .lock()
        .map_err(|e| format!("クリップボードのロックに失敗しました: {}", e))?;

    let image_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: rgba.into_raw().into(),
    };

    clipboard
        .set_image(image_data)
        .map_err(|e| format!("クリップボードへのコピーに失敗しました: {}", e))?;

    Ok(())
}

/// テキストをクリップボードにコピー（パスコピー用）
#[tauri::command]
pub fn copy_text_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard = CLIPBOARD
        .lock()
        .map_err(|e| format!("クリップボードのロックに失敗しました: {}", e))?;

    clipboard
        .set_text(text)
        .map_err(|e| format!("クリップボードへのコピーに失敗しました: {}", e))?;

    Ok(())
}
