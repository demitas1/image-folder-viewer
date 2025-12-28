# Image Folder Viewer

ローカルPCの画像フォルダをサムネイル付きカードで管理し、快適に閲覧できるデスクトップアプリケーション。

## 必要環境

- Node.js 18+
- Rust 1.70+
- Tauri CLI (`cargo install tauri-cli`)

### Linux追加依存

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## ビルド

```bash
cd image-folder-viewer
npm install
npm run tauri build
```

ビルド成果物は `image-folder-viewer/src-tauri/target/release/` に出力されます。

## 開発

```bash
cd image-folder-viewer
npm install
npm run tauri dev
```

## ライセンス

MIT License
