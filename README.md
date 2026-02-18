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

## 設定ファイル

アプリ共通設定は以下のパスに保存されます。

| OS | パス |
|----|------|
| Linux | `~/.local/share/org.example.image-folder-viewer/app_config.json` |
| macOS | `~/Library/Application Support/org.example.image-folder-viewer/app_config.json` |
| Windows | `%APPDATA%\org.example.image-folder-viewer\app_config.json` |

### 設定項目

| キー | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `focusOnStartup` | boolean | `true` | 起動時にウィンドウを最前面に表示する。Linux でフォーカスが当たらない場合に無効化する |
| `theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` | テーマ設定 |
| `maxRecentProfiles` | number | `10` | 最近使用したプロファイル履歴の最大保持数 |

設定ファイルは部分的な記述が可能です（未記載項目はデフォルト値が使用されます）。

例: 起動時前面表示を無効化する

```json
{
  "focusOnStartup": false
}
```

## ライセンス

MIT License
