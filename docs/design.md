# 画像ビューアアプリケーション設計書（ドラフト）

## 1. プロジェクト概要

### 1.1 目的
ローカルPC内の画像フォルダをサムネイル付きインデックスで管理し、快適に閲覧できるデスクトップアプリケーション。

### 1.2 主要機能
- **プロファイル管理**: 用途別に複数のプロファイルを切り替えて使用
- **インデックス管理**: フォルダをサムネイル付きカードで一覧管理
- **画像ビューア**: フォルダ内の画像を快適に閲覧
- **クロスプラットフォーム**: Windows / macOS / Linux 対応

---

## 2. 機能要件

### 2.1 インデックスページ

| 機能 | 説明 | 優先度 |
|------|------|--------|
| フォルダ追加 | フォルダを選択してインデックスに追加 | 必須 |
| サムネイル選択 | 任意の画像ファイルをサムネイルに設定 | 必須 |
| タイトル編集 | カードのタイトルを編集 | 必須 |
| 順序入れ替え | ドラッグ&ドロップでカードの順序を変更 | 必須 |
| カード削除 | インデックスからカードを削除（元フォルダは保持） | 必須 |
| 検索/フィルタ | タイトルでカードを絞り込み | 任意 |
| タグ付け | カードにタグを付与して分類 | 任意 |

### 2.2 画像ビューア

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 画像表示 | 選択フォルダ内の画像を表示 | 必須 |
| ナビゲーション | 前後の画像に移動（キーボード/クリック） | 必須 |
| ウィンドウリサイズ | ウィンドウサイズの拡大/縮小 | 必須 |
| フィット表示 | ウィンドウサイズに合わせて表示 | 必須 |
| 水平反転（H-Flip） | 画像を左右反転して表示（トグル） | 必須 |
| シャッフル再生 | 画像の表示順をランダム化（トグル） | 必須 |
| クリップボードコピー | 現在の画像をクリップボードにコピー | 必須 |
| パスコピー | 現在の画像のファイルパスをコピー | 必須 |
| コンテキストメニュー | 右クリックまたはSpaceキーでメニュー表示 | 必須 |
| 画像情報表示 | ファイル名、サイズ、解像度等 | 任意 |
| スライドショー | 自動で画像を切り替え | 任意 |

### 2.3 プロファイル機能

| 機能 | 説明 | 優先度 |
|------|------|--------|
| プロファイル選択 | 起動時に履歴リストまたはファイルダイアログから選択 | 必須 |
| プロファイル切り替え | アプリ内で別のプロファイルに切り替え | 必須 |
| 新規プロファイル作成 | 空のプロファイルを作成 | 必須 |
| 別名保存 | 現在のプロファイルを別ファイルとして保存 | 必須 |
| 最近使用した履歴 | 最近開いたプロファイルの履歴を保持 | 必須 |

### 2.4 共通機能

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 状態保存・復元 | 終了時の状態を記憶し次回起動時に復元（プロファイルごと） | 必須 |
| ダークモード | ライト/ダークテーマ切り替え | 任意 |
| 設定画面 | 各種設定の変更 | 任意 |
| キーボードショートカット | 主要操作のショートカット | 必須 |

### 2.5 状態保存・復元の詳細

状態はプロファイルファイル（.ivprofile）に保存され、プロファイルごとに独立して管理される。

**終了時の保存内容**

| 終了時の画面 | 保存内容 |
|-------------|---------|
| ViewerPage | 表示中のカードID、画像インデックス、ウィンドウ位置・サイズ、H-Flip/Shuffle状態 |
| IndexPage | ウィンドウ位置・サイズのみ |
| モーダル表示中 | ウィンドウ位置・サイズのみ（次回はIndexPageで起動） |

**起動時の復元動作**

| 保存された状態 | 起動時の動作 |
|--------------|-------------|
| ViewerPage | 同じカード・画像位置でViewerPageを開く |
| IndexPage/モーダル | IndexPageを開く |
| 保存データなし | IndexPageを開く（デフォルトウィンドウサイズ） |

### 2.6 プロファイルの詳細

**プロファイルファイル（.ivprofile）**
- JSON互換形式、任意のディレクトリに保存可能
- カード情報、タグ、ウィンドウ状態、ビューア状態を含む
- サムネイルキャッシュは含まない（再生成可能なため）

**アプリ共通設定（アプリデータディレクトリに保存）**
- 最近使用したプロファイルの履歴（パス、最終使用日時）
- アプリ全体の設定（テーマ等）

**起動時のプロファイル選択**
- 履歴に前回のプロファイルがあれば自動的に開く
- 履歴がない場合はファイルダイアログで選択
- 「新規作成」で空のプロファイルを作成可能

**エラー状態のカード**
- 参照先フォルダが存在しない場合、カードをエラー状態として表示
- エラー状態のカードは編集（パス変更）・削除のみ可能
- ビューアで開くことは不可

---

## 3. 技術スタック

### 3.1 フレームワーク
- **Tauri v2**: デスクトップアプリケーションフレームワーク
- **Rust**: バックエンド（ファイル操作、画像処理）
- **React 18 + TypeScript**: フロントエンド

### 3.2 フロントエンド
| 用途 | ライブラリ |
|------|-----------|
| UIスタイリング | Tailwind CSS |
| ルーティング | React Router v6 |
| 状態管理 | Zustand（セレクターには `useShallow` を使用） |
| ドラッグ&ドロップ | @dnd-kit/core, @dnd-kit/sortable |
| アイコン | Lucide React |
| 画像表示 | react-zoom-pan-pinch |

**Zustand 使用時の注意**: 配列やオブジェクトを返すセレクターは `useShallow` でラップしたカスタムフックとして定義する。直接セレクター関数を渡すと無限ループが発生する可能性がある。

### 3.3 バックエンド（Rust）
| 用途 | クレート |
|------|---------|
| 画像処理 | image |
| 非同期処理 | tokio |
| シリアライズ | serde, serde_json |
| ダイアログ | tauri-plugin-dialog |
| データベース | rusqlite または tauri-plugin-sql |
| クリップボード | arboard |
| ファイル監視 | notify（任意） |

---

## 4. アーキテクチャ設計

### 4.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │              Frontend (WebView)                    │  │
│  │  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │ IndexPage   │  │ ViewerPage  │                │  │
│  │  │             │  │             │                │  │
│  │  │ - Grid      │  │ - Display   │                │  │
│  │  │ - DnD       │  │ - Zoom      │                │  │
│  │  │ - Edit      │  │ - Navigate  │                │  │
│  │  └─────────────┘  └─────────────┘                │  │
│  │           │              │                        │  │
│  │           └──────┬───────┘                        │  │
│  │                  │ Tauri invoke()                 │  │
│  └──────────────────┼────────────────────────────────┘  │
│                     │                                    │
│  ┌──────────────────┴────────────────────────────────┐  │
│  │              Backend (Rust)                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│  │  │ Commands    │  │ Thumbnail   │  │ Database  │ │  │
│  │  │             │  │ Generator   │  │ (SQLite)  │ │  │
│  │  │ - get_cards │  │             │  │           │ │  │
│  │  │ - add_card  │  │ - generate  │  │ - cards   │ │  │
│  │  │ - get_images│  │ - cache     │  │ - settings│ │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 データフロー

```
[ユーザー操作]
      │
      ▼
[React Component] ──invoke()──▶ [Tauri Command]
      │                               │
      │                               ▼
      │                         [Rust処理]
      │                               │
      │                               ▼
      │                         [SQLite/FS]
      │                               │
      ◀────────Result/Event───────────┘
      │
      ▼
[State更新 → 再レンダリング]
```

---

## 5. データ構造

### 5.1 データ保存の2層構造

アプリケーションは2種類のデータを管理する：

| 種別 | 保存先 | 内容 |
|------|--------|------|
| プロファイル | 任意ディレクトリ（.ivprofile） | カード、タグ、ウィンドウ状態 |
| アプリ共通設定 | アプリデータディレクトリ | 履歴、テーマ等 |

### 5.2 プロファイルファイル形式（.ivprofile）

```json
{
  "version": "1.0",
  "updatedAt": "2024-01-15T10:30:00Z",
  "cards": [
    {
      "id": "uuid-1",
      "title": "スケッチ練習用",
      "folderPath": "/path/to/folder",
      "thumbnail": "image001.jpg",
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "tags": [],
  "cardTags": [],
  "appState": {
    "lastPage": "viewer",
    "lastCardId": "uuid-1",
    "lastImageIndex": 5,
    "hFlipEnabled": false,
    "shuffleEnabled": true,
    "window": {
      "x": 100,
      "y": 100,
      "width": 1280,
      "height": 800
    }
  }
}
```

### 5.3 アプリ共通設定（app_config.json）

アプリデータディレクトリに保存される共通設定：

```json
{
  "version": "1.0",
  "recentProfiles": [
    {
      "path": "/home/user/profiles/sketch.ivprofile",
      "name": "sketch",
      "lastOpenedAt": "2024-01-15T10:30:00Z"
    },
    {
      "path": "/home/user/profiles/dev-project.ivprofile",
      "name": "dev-project",
      "lastOpenedAt": "2024-01-14T18:00:00Z"
    }
  ],
  "maxRecentProfiles": 10,
  "theme": "system"
}
```

### 5.4 TypeScript型定義

```typescript
// カード
interface Card {
  id: string;
  title: string;
  folderPath: string;
  thumbnail: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// カード（検証結果付き）
interface CardWithStatus extends Card {
  isValid: boolean;        // フォルダが存在するか
  errorMessage?: string;   // エラーメッセージ（無効時）
}

// 画像情報
interface ImageInfo {
  path: string;
  filename: string;
  width: number;
  height: number;
  size: number;        // bytes
  modifiedAt: string;
}

// サムネイルグリッド用
interface ThumbnailItem {
  path: string;
  thumbnailDataUrl: string;  // Base64 data URL
}

// ビューア状態（ランタイム用）
interface ViewerState {
  currentCardId: string | null;
  currentIndex: number;
  images: ImageInfo[];
  shuffledIndices: number[] | null;  // シャッフル時のインデックス配列
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
}

// アプリケーション状態（プロファイル内に保存）
interface AppState {
  lastPage: 'index' | 'viewer';
  lastCardId: string | null;
  lastImageIndex: number;
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
  window: {
    x: number | null;
    y: number | null;
    width: number;
    height: number;
  };
}

// プロファイルデータ（.ivprofileファイルの内容）
interface ProfileData {
  version: string;
  updatedAt: string;
  cards: Card[];
  tags: Tag[];
  cardTags: CardTag[];
  appState: AppState;
}

// 最近使用したプロファイル
interface RecentProfile {
  path: string;           // プロファイルファイルのパス
  name: string;           // ファイル名（拡張子なし）
  lastOpenedAt: string;   // 最終使用日時
}

// アプリ共通設定
interface AppConfig {
  version: string;
  recentProfiles: RecentProfile[];
  maxRecentProfiles: number;
  theme: 'light' | 'dark' | 'system';
}
```

### 5.5 Rust構造体

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub folder_path: String,
    pub thumbnail: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CardWithStatus {
    #[serde(flatten)]
    pub card: Card,
    pub is_valid: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub path: String,
    pub filename: String,
    pub width: u32,
    pub height: u32,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowState {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub last_page: String,           // "index" | "viewer"
    pub last_card_id: Option<String>,
    pub last_image_index: i32,
    pub h_flip_enabled: bool,
    pub shuffle_enabled: bool,
    pub window: WindowState,
}

// プロファイルデータ（.ivprofileファイルの内容）
#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileData {
    pub version: String,
    pub updated_at: String,
    pub cards: Vec<Card>,
    pub tags: Vec<Tag>,
    pub card_tags: Vec<CardTag>,
    pub app_state: AppState,
}

// 最近使用したプロファイル
#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProfile {
    pub path: String,
    pub name: String,
    pub last_opened_at: String,
}

// アプリ共通設定
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: String,
    pub recent_profiles: Vec<RecentProfile>,
    pub max_recent_profiles: i32,
    pub theme: String,  // "light" | "dark" | "system"
}
```

---

## 6. 画面設計

### 6.1 画面遷移

```
                                    ┌──────────────┐
                                    │              │
                  ┌────────────────▶│  IndexPage   │
                  │                 │              │
┌──────────────┐  │                 └──────┬───────┘
│              │  │                        │ カードクリック
│  起動時      │──┤                        ▼
│  プロファイル │  │                 ┌──────────────┐
│  選択        │  │                 │              │
│              │  │                 │  ViewerPage  │
└──────────────┘  │                 │              │
                  │                 └──────┬───────┘
                  │                        │ 戻るボタン/ESC
                  └────────────────────────┘

※ 前回のプロファイルがあれば自動的にIndexPageまたはViewerPageへ
※ アプリ内からもプロファイル切り替え可能（IndexPageヘッダー）
```

### 6.2 ユーザー操作フロー: カード追加（正常系）

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. カード追加を開始                                              │
├─────────────────────────────────────────────────────────────────┤
│   IndexPage で以下のいずれかを実行:                               │
│   - ヘッダーの [＋追加] ボタンをクリック                          │
│   - 空白部分を右クリック → 「Add New Card」を選択                 │
│   - キーボードで Ctrl+N を押下                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. フォルダ選択ダイアログ                                        │
├─────────────────────────────────────────────────────────────────┤
│   OS標準のフォルダ選択ダイアログが表示される                       │
│   → ユーザーが画像フォルダを選択して「選択」をクリック             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. カード情報入力モーダル                                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  新規カード作成                              [✕]          │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  フォルダ: /path/to/selected/folder                       │  │
│  │                                                           │  │
│  │  タイトル: [folder_name        ]  ← デフォルトはフォルダ名  │  │
│  │                                                           │  │
│  │  サムネイル:                                               │  │
│  │  ┌─────────┐                                              │  │
│  │  │ ▓▓▓▓▓▓▓ │  ← フォルダ内最初の画像が自動選択            │  │
│  │  │ ▓▓▓▓▓▓▓ │                                              │  │
│  │  │ ▓▓▓▓▓▓▓ │                                              │  │
│  │  └─────────┘  [変更...]                                   │  │
│  │                                                           │  │
│  │                           [キャンセル] [作成]             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ※ [変更...] → OS標準のファイル選択ダイアログを表示             │
│     （フォルダ内外を問わず任意の画像ファイルを選択可能）          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ [作成] クリック
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. カード作成完了                                                │
├─────────────────────────────────────────────────────────────────┤
│   - 新しいカードがグリッドの末尾に追加される                      │
│   - モーダルが閉じ、IndexPage に戻る                             │
│   - 新しいカードが選択状態（ハイライト）になる                    │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 IndexPage レイアウト

```
┌─────────────────────────────────────────────────────┐
│  📁 sketch.ivprofile ▼   [＋追加]  [検索: ____]  [⚙] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │  │ ⚠ ERROR │ ← エラー状態 │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │  │ ─────── │   （赤枠等で │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │  │  Path   │    視覚的に  │
│  ├─────────┤  ├─────────┤  │  not    │    区別）    │
│  │タイトル1 │  │タイトル2 │  │  found  │            │
│  │ [✎][🗑] │  │ [✎][🗑] │  ├─────────┤            │
│  └─────────┘  └─────────┘  │タイトル3 │            │
│                            │ [✎][🗑] │            │
│  ┌─────────┐  ┌─────────┐  └─────────┘            │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │                         │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │                         │
│  │ ▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓ │                         │
│  ├─────────┤  ├─────────┤                         │
│  │タイトル4 │  │タイトル5 │                         │
│  │ [✎][🗑] │  │ [✎][🗑] │                         │
│  └─────────┘  └─────────┘                         │
│                                                     │
└─────────────────────────────────────────────────────┘

※ エラー状態のカード:
  - クリックしてもビューアを開けない
  - ツールチップでエラー詳細を表示
  - 編集でパス変更可能、削除も可能

※ プロファイル名クリック時のメニュー:
  - 最近使用したプロファイル一覧
  - 「別のプロファイルを開く...」→ ファイルダイアログ
  - 「新規プロファイル作成」→ ファイル保存ダイアログ
  - 「別名で保存...」→ ファイル保存ダイアログ
```

### 6.4 ViewerPage レイアウト

```
┌─────────────────────────────────────────────────────┐
│  [← 戻る]  タイトル - image_003.jpg   [H][R]  [⛶] │  ← タイトルバー
├─────────────────────────────────────────────────────┤     [H]: H-Flip有効時に表示
│                                                     │     [R]: Shuffle有効時に表示
│                                                     │
│                                                     │
│                                                     │
│              画像表示エリア                          │
│           （H-Flip時は反転表示）                     │
│          （クリックで次の画像へ）                    │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘

※ ナビゲーションはキーボード（←/→）またはクリックで操作
```

### 6.5 サムネイル画像の選択と保存

サムネイル画像の変更はOS標準のファイル選択ダイアログを使用します。

**操作方法**
- カード追加モーダル → [変更...] ボタン
- IndexPage → カード右クリック → 「Change Thumbnail」

**サムネイル画像の保存について**

| 選択元 | 保存方法 |
|-------|---------|
| フォルダ内画像 | 相対パスで参照（コピーしない） |
| フォルダ外画像 | サムネイルキャッシュディレクトリにコピーして保存 |

---

## 7. API設計（Tauri Commands）

### 7.1 カード管理

```rust
// カード一覧取得
#[tauri::command]
async fn get_cards() -> Result<Vec<Card>, String>;

// カード追加（フォルダ選択ダイアログを開く）
#[tauri::command]
async fn add_card(title: String) -> Result<Card, String>;

// カード更新
#[tauri::command]
async fn update_card(card: Card) -> Result<Card, String>;

// カード削除
#[tauri::command]
async fn delete_card(id: String) -> Result<(), String>;

// カード順序更新
#[tauri::command]
async fn reorder_cards(card_ids: Vec<String>) -> Result<(), String>;

// サムネイル設定
#[tauri::command]
async fn set_card_thumbnail(card_id: String, image_path: String) -> Result<Card, String>;
```

### 7.2 画像操作

```rust
// フォルダ内の画像一覧取得
#[tauri::command]
async fn get_images(folder_path: String) -> Result<Vec<ImageInfo>, String>;

// サムネイル取得（キャッシュ付き）
#[tauri::command]
async fn get_thumbnail(image_path: String, size: u32) -> Result<String, String>;
// 戻り値: Base64 data URL

// 画像の詳細情報取得
#[tauri::command]
async fn get_image_detail(path: String) -> Result<ImageInfo, String>;

// 画像をクリップボードにコピー
#[tauri::command]
async fn copy_image_to_clipboard(path: String) -> Result<(), String>;

// テキストをクリップボードにコピー（パスコピー用）
#[tauri::command]
async fn copy_text_to_clipboard(text: String) -> Result<(), String>;
```

### 7.3 ダイアログ

```rust
// フォルダ選択ダイアログ
#[tauri::command]
async fn select_folder() -> Result<Option<String>, String>;

// 画像ファイル選択ダイアログ（サムネイル選択用）
// 初期ディレクトリを指定可能（カードのフォルダを開くため）
#[tauri::command]
async fn select_image_file(initial_dir: Option<String>) -> Result<Option<String>, String>;
```

### 7.4 設定

```rust
// 設定取得
#[tauri::command]
async fn get_setting(key: String) -> Result<Option<String>, String>;

// 設定保存
#[tauri::command]
async fn set_setting(key: String, value: String) -> Result<(), String>;
```

### 7.5 プロファイル管理

```rust
// プロファイル読み込み
#[tauri::command]
async fn load_profile(path: String) -> Result<ProfileData, String>;

// プロファイル保存（現在のプロファイルを上書き保存）
#[tauri::command]
async fn save_profile() -> Result<(), String>;

// プロファイル別名保存
#[tauri::command]
async fn save_profile_as(path: String) -> Result<(), String>;

// 新規プロファイル作成
#[tauri::command]
async fn create_new_profile(path: String) -> Result<ProfileData, String>;

// プロファイル選択ダイアログ（.ivprofileファイル）
#[tauri::command]
async fn select_profile_file() -> Result<Option<String>, String>;

// プロファイル保存ダイアログ（.ivprofileファイル）
#[tauri::command]
async fn select_profile_save_path() -> Result<Option<String>, String>;

// カードのフォルダパス検証（プロファイル読み込み時に実行）
#[tauri::command]
async fn validate_card_paths() -> Result<Vec<CardWithStatus>, String>;

// カードのフォルダパス更新（エラー状態のカード修正用）
#[tauri::command]
async fn update_card_path(card_id: String, new_path: String) -> Result<Card, String>;
```

### 7.6 アプリ共通設定

```rust
// アプリ共通設定取得（起動時に呼び出し）
#[tauri::command]
async fn get_app_config() -> Result<AppConfig, String>;

// アプリ共通設定保存
#[tauri::command]
async fn save_app_config(config: AppConfig) -> Result<(), String>;

// 最近使用したプロファイル履歴に追加
#[tauri::command]
async fn add_recent_profile(path: String) -> Result<(), String>;

// 最近使用したプロファイル履歴から削除（ファイルが存在しない場合等）
#[tauri::command]
async fn remove_recent_profile(path: String) -> Result<(), String>;
```

---

## 8. ファイル構成

```
image-folder-viewer/               # リポジトリルート
├── docs/
│   └── design.md                  # 設計書
├── image-folder-viewer/           # Tauriアプリケーション
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs            # エントリーポイント
│   │   │   ├── lib.rs             # ライブラリルート
│   │   │   ├── commands/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── cards.rs       # カード管理コマンド
│   │   │   │   ├── images.rs      # 画像操作コマンド
│   │   │   │   ├── clipboard.rs   # クリップボード操作
│   │   │   │   ├── profile.rs     # プロファイル管理コマンド
│   │   │   │   └── app_config.rs  # アプリ共通設定コマンド
│   │   │   ├── services/
│   │   │   │   ├── mod.rs
│   │   │   │   └── thumbnail.rs   # サムネイル生成
│   │   │   └── models/
│   │   │       ├── mod.rs
│   │   │       ├── card.rs
│   │   │       └── image.rs
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   └── icons/
│   ├── src/
│   │   ├── main.tsx               # Reactエントリーポイント
│   │   ├── App.tsx                # ルーティング設定
│   │   ├── index.css              # Tailwind設定
│   │   ├── pages/
│   │   │   ├── IndexPage.tsx      # インデックスページ
│   │   │   └── ViewerPage.tsx     # 画像ビューア
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   │   ├── CardGrid.tsx   # カードグリッド
│   │   │   │   ├── CardItem.tsx   # 個別カード
│   │   │   │   └── CardForm.tsx   # 追加/編集フォーム
│   │   │   ├── viewer/
│   │   │   │   ├── ImageDisplay.tsx # 画像表示（H-Flip対応）
│   │   │   │   └── ImageInfo.tsx  # 画像情報パネル
│   │   │   ├── common/
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── ContextMenu.tsx # コンテキストメニュー
│   │   │   └── layout/
│   │   │       └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useCards.ts        # カード操作フック
│   │   │   ├── useImages.ts       # 画像操作フック
│   │   │   ├── useKeyboard.ts     # キーボードショートカット
│   │   │   └── useContextMenu.ts  # コンテキストメニュー制御
│   │   ├── store/
│   │   │   ├── cardStore.ts       # カード状態管理
│   │   │   ├── viewerStore.ts     # ビューア状態管理
│   │   │   └── appStore.ts        # アプリ状態管理（永続化）
│   │   ├── api/
│   │   │   └── tauri.ts           # Tauriコマンド呼び出し
│   │   └── types/
│   │       └── index.ts           # 型定義
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── CLAUDE.md
├── README.md
└── LICENSE
```

---

## 9. 開発フェーズ

### Phase 1: 基盤構築 ✅ 完了
- [x] Tauriプロジェクト初期化
- [x] フロントエンド環境構築（React + TypeScript + Tailwind）
- [x] プロファイルファイル（.ivprofile）の読み書き
- [x] アプリ共通設定（app_config.json）の読み書き
- [x] 基本的なルーティング

### Phase 2: プロファイル管理 ✅ 完了
- [x] 起動時のプロファイル選択フロー
- [x] 最近使用したプロファイル履歴
- [x] 新規プロファイル作成
- [x] プロファイル切り替え（IndexPageヘッダー）
- [x] 別名保存

### Phase 3: インデックスページ ✅ 完了
- [x] カードの追加・削除・編集
- [x] サムネイルグリッド表示
- [x] ドラッグ&ドロップ並べ替え
- [x] サムネイル画像選択（OSファイルダイアログ使用）
- [x] エラー状態カードの表示・編集
- [x] サムネイルパフォーマンス最適化（JPEG出力、メモリキャッシュ）

#### Phase 3 実装ステップ

**Step 1: Rustバックエンド - ダイアログ・画像コマンド追加 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/Cargo.toml` | `image`, `base64` クレート追加 |
| `src-tauri/src/commands/dialog.rs` | `select_folder`, `select_image_file` 追加 |
| `src-tauri/src/commands/images.rs` | 新規: `get_thumbnail`, `get_first_image_in_folder`, `validate_folder_path` |
| `src-tauri/src/commands/mod.rs` | images モジュール追加 |
| `src-tauri/src/lib.rs` | 新規コマンド登録 |

**Step 2: フロントエンドAPI層の拡張 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/api/tauri.ts` | `selectFolder`, `selectImageFile`, `getThumbnail`, `getFirstImageInFolder`, `validateFolderPath` 追加 |

**Step 3: Zustandストア - カード操作メソッド追加 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/store/profileStore.ts` | `addCard`, `updateCard`, `deleteCard`, `reorderCards` メソッド追加、`useCards()` カスタムフック追加 |

**Step 4: 共通コンポーネント - モーダル ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/components/common/Modal.tsx` | 新規: 汎用モーダルコンポーネント、Buttonコンポーネント |

**Step 5: カードコンポーネント群 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/components/cards/CardItem.tsx` | 新規: カード表示（サムネイル、タイトル、エラー状態） |
| `src/components/cards/CardAddModal.tsx` | 新規: カード追加モーダル |
| `src/components/cards/CardEditModal.tsx` | 新規: カード編集モーダル |
| `src/components/cards/CardGrid.tsx` | 新規: グリッドレイアウト |

**Step 6: @dnd-kit によるドラッグ&ドロップ実装 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable` 追加 |
| `src/components/cards/CardGrid.tsx` | DndContext, SortableContext 統合 |
| `src/components/cards/SortableCardItem.tsx` | 新規: ドラッグ可能カード（useSortable フック使用） |

**Step 7: IndexPage の統合 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/pages/IndexPage.tsx` | 全コンポーネント統合、キーボードショートカット追加（Ctrl+N, Delete, 矢印キー, Enter） |

**Step 8: エラー状態カードの表示・編集 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/components/cards/CardItem.tsx` | エラー状態スタイル（赤枠、アイコン） |
| `src/components/cards/CardEditModal.tsx` | フォルダパス変更機能 |

#### Phase 3 新規ファイル一覧

```
src/components/
├── common/
│   └── Modal.tsx
└── cards/
    ├── CardGrid.tsx
    ├── CardItem.tsx
    ├── SortableCardItem.tsx
    ├── CardAddModal.tsx
    └── CardEditModal.tsx

src-tauri/src/commands/
└── images.rs
```

#### Phase 3 実装時の注意事項

1. **Zustand useShallow**: 配列を返すセレクターは必ず `useShallow` でラップ
2. **サムネイル**: image クレートでリサイズ → Base64 DataURL で返却
3. **@dnd-kit**: `rectSortingStrategy` でグリッド対応、`arrayMove` で並べ替え
4. **エラー状態**: `isValid === false` のカードは赤枠表示、クリック無効

### Phase 4: 画像ビューア（実装中）
- [x] 画像表示（H-Flip対応）
- [x] ナビゲーション（前後移動、シャッフル）
- [x] キーボードショートカット
- [x] コンテキストメニュー
- [ ] 終了時の状態保存（プロファイルに保存）

#### Phase 4 実装ステップ

**Step 1: Rustバックエンド - 画像一覧・クリップボードコマンド追加 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/Cargo.toml` | `arboard` クレート追加（クリップボード用） |
| `src-tauri/src/commands/images.rs` | `get_images_in_folder` 追加（画像一覧取得、軽量版：path/filenameのみ） |
| `src-tauri/src/commands/clipboard.rs` | 新規: `copy_image_to_clipboard`, `copy_text_to_clipboard` |
| `src-tauri/src/commands/mod.rs` | clipboard モジュール追加 |
| `src-tauri/src/lib.rs` | 新規コマンド登録 |

**Step 2: フロントエンドAPI層・型定義の拡張 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/types/index.ts` | `ImageFile` 型追加（軽量版）、`ViewerState.images` を `ImageFile[]` に変更 |
| `src/api/tauri.ts` | `getImagesInFolder`, `copyImageToClipboard`, `copyTextToClipboard` 追加 |

**Step 3: Zustandストア - ビューア状態管理 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/store/viewerStore.ts` | 新規: ビューア状態管理（currentIndex, images, hFlip, shuffle等） |

ビューアストアの状態:
```typescript
interface ViewerState {
  cardId: string | null;           // 表示中のカードID
  cardTitle: string;               // カードタイトル
  folderPath: string | null;       // フォルダパス
  images: ImageFile[];             // フォルダ内の画像一覧（軽量版）
  currentIndex: number;            // 現在の画像インデックス
  shuffledIndices: number[] | null; // シャッフル時のインデックス配列
  hFlipEnabled: boolean;           // H-Flip有効
  shuffleEnabled: boolean;         // シャッフル有効
  isLoading: boolean;              // 読み込み中
  error: string | null;            // エラー
}
```

カスタムフック:
- `useCurrentImage()` - 現在の画像情報
- `useImages()` - 画像一覧
- `useNavigationState()` - ナビゲーション状態
- `useViewerOptions()` - 表示オプション（hFlip, shuffle）
- `useViewerActions()` - ビューアアクション

**Step 4: ViewerPage基本実装 - 画像表示・ナビゲーション ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src-tauri/tauri.conf.json` | `assetProtocol` 有効化（ローカル画像のWebView表示用） |
| `src/pages/ViewerPage.tsx` | スケルトンから本実装に更新（画像表示、ナビゲーション、ヘッダー/フッター） |
| `src/components/viewer/ImageDisplay.tsx` | 新規: 画像表示コンポーネント（`convertFileSrc`でローカルファイル表示、H-Flip対応） |

機能:
- カードIDからフォルダパスを取得し、画像一覧を読み込み
- `convertFileSrc`（Tauri asset protocol）でローカル画像をWebViewに表示
- 画像のフィット表示（`object-contain`でウィンドウサイズに合わせる）
- クリックで次の画像へ、←→キーで前後ナビゲーション
- 戻るボタン / ESC / Q でIndexPageへ（ビューアストアをリセット）
- ヘッダー: カードタイトル + ファイル名、H-Flip/Shuffleインジケーター
- フッター: 現在位置/総枚数表示
- エラーハンドリング: プロファイル未読み込み・カード不存在時のリダイレクト、画像読み込みエラー表示

**Step 5: H-Flip・シャッフル機能 ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/pages/ViewerPage.tsx` | ヘッダーにH-Flip/Shuffleのインタラクティブなトグルボタン追加（有効時: 青背景、無効時: グレー） |

※ ImageDisplay.tsxのH-Flip（CSS `scaleX(-1)`）、viewerStore.tsのシャッフルロジック（Fisher-Yatesアルゴリズム）はStep 3-4で実装済み

**Step 6: キーボードショートカット ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/pages/ViewerPage.tsx` | useEffectでキーボードイベント処理（H, Rキー追加、Spaceキー追加） |

| キー | 機能 |
|------|------|
| `←` / `→` | 前後の画像 |
| `H` | H-Flipトグル |
| `R` | シャッフルトグル |
| `Space` | コンテキストメニュー表示（画面中央） |
| `Q` / `Escape` | IndexPageに戻る |

**Step 7: コンテキストメニュー ✅ 完了**
| ファイル | 変更内容 |
|---------|---------|
| `src/components/common/ContextMenu.tsx` | 新規: 汎用コンテキストメニュー（createPortal、画面端自動調整、ESCで閉じる） |
| `src/pages/ViewerPage.tsx` | コンテキストメニュー統合（右クリック + Spaceキー） |
| `src-tauri/src/commands/clipboard.rs` | グローバルClipboardインスタンスに変更（Linux/X11対策） |

メニュー項目:
- コピー（画像をクリップボードにコピー）
- パスをコピー（ファイルパスをコピー）
- 水平反転: ON/OFF
- シャッフル: ON/OFF
- インデックスに戻る
- 終了（`getCurrentWindow().close()`）

Linux/X11対策:
- `arboard::Clipboard` を `once_cell::sync::Lazy<Mutex<Clipboard>>` でグローバルに保持
- 関数終了時のClipboardドロップによるクリップボード内容消失を防止

**Step 8: 状態保存・復元**
| ファイル | 変更内容 |
|---------|---------|
| `src/store/profileStore.ts` | `updateAppState` メソッド追加 |
| `src/pages/ViewerPage.tsx` | 終了時にappStateを更新して保存 |
| `src/pages/IndexPage.tsx` | 起動時にappState.lastPageを確認してViewerPageへ遷移 |

保存する状態:
- `lastPage: "viewer"`
- `lastCardId`: 表示中のカードID
- `lastImageIndex`: 現在の画像インデックス
- `hFlipEnabled`, `shuffleEnabled`

#### Phase 4 新規ファイル一覧

```
src/components/
├── common/
│   └── ContextMenu.tsx
└── viewer/
    └── ImageDisplay.tsx

src/store/
└── viewerStore.ts

src-tauri/src/commands/
└── clipboard.rs
```

#### Phase 4 実装時の注意事項

1. **画像読み込み**: 大きな画像はメモリを消費するため、表示サイズに応じた最適化を検討
2. **シャッフル状態**: シャッフルインデックスはセッション中のみ保持（プロファイルには保存しない）
3. **H-Flip**: CSSのtransformで実装、画像データ自体は変更しない
4. **コンテキストメニュー**: 右クリックとSpaceキーの両方で表示
5. **状態保存タイミング**: IndexPageへ戻る時、アプリ終了時に保存

### Phase 5: 仕上げ
- [ ] エラーハンドリング
- [ ] パフォーマンス最適化（サムネイルキャッシュ等）
- [ ] UI/UXの調整
- [ ] クロスプラットフォームビルド・テスト

---

## 10. 検討事項・未決定項目

### 10.1 要検討
- [ ] タグ機能のスコープ（Phase 1では見送り？）
- [ ] サムネイルキャッシュの保存場所（アプリデータディレクトリ？）
- [ ] 対応画像フォーマット（JPEG, PNG, GIF, WebP, AVIF?）
- [ ] 大量画像フォルダのパフォーマンス対策（仮想スクロール等）
- [ ] プロファイルファイルのバージョン互換性（マイグレーション戦略）
- [ ] 履歴の最大保持数（デフォルト10件）

### 10.2 将来的な拡張案
- 複数ウィンドウ対応
- 画像のお気に入り機能
- 外部サービス連携（クラウドストレージ等）
- プラグインシステム
- プロファイルの自動バックアップ機能

---

## 付録A: キーボードショートカット

### ViewerPage

| キー | 機能 |
|------|------|
| `←` | 前の画像 |
| `→` | 次の画像 |
| `+` / `=` | ウィンドウサイズ拡大 |
| `-` | ウィンドウサイズ縮小 |
| `H` | 水平反転トグル |
| `R` | シャッフルトグル |
| `Space` | コンテキストメニュー表示 |
| `Q` | インデックスに戻る / アプリ終了 |
| `Escape` | インデックスに戻る |
| `I` | 画像情報表示（任意） |
| `F` | フルスクリーン（任意） |

### IndexPage

| キー | 機能 |
|------|------|
| `↑` / `↓` / `←` / `→` | カード選択移動 |
| `Enter` | 選択カードを開く |
| `Delete` | 選択カードを削除 |
| `Ctrl+N` | 新規カード追加 |
| `Ctrl+O` | 別のプロファイルを開く |
| `Ctrl+S` | プロファイル保存 |
| `Ctrl+Shift+S` | 別名で保存 |
| `Q` | アプリ終了 |

---

## 付録B: コンテキストメニュー

### ViewerPage コンテキストメニュー

```
┌─────────────────────┐
│ Open Files          │  ← 別のファイルを開く
│ Open Directory      │  ← 別のディレクトリを開く
├─────────────────────┤
│ Copy                │  ← 画像をクリップボードにコピー
│ Copy Path           │  ← ファイルパスをコピー
├─────────────────────┤
│ H-Flip ON/OFF       │  ← 水平反転トグル（状態表示）
│ Shuffle ON/OFF      │  ← シャッフルトグル（状態表示）
├─────────────────────┤
│ Back to Index       │  ← インデックスページに戻る
│ Quit                │  ← アプリ終了
└─────────────────────┘
```

### IndexPage コンテキストメニュー（カード上で右クリック）

```
┌─────────────────────┐
│ Open                │  ← カードを開く
│ Edit Title          │  ← タイトル編集
│ Change Thumbnail    │  ← サムネイル変更
├─────────────────────┤
│ Delete              │  ← カード削除
└─────────────────────┘
```

### IndexPage コンテキストメニュー（空白部分で右クリック）

```
┌─────────────────────┐
│ Add New Card        │  ← 新規カード追加
├─────────────────────┤
│ Open Profile...     │  ← 別のプロファイルを開く
│ New Profile...      │  ← 新規プロファイル作成
│ Save As...          │  ← 別名で保存
├─────────────────────┤
│ Quit                │  ← アプリ終了
└─────────────────────┘
```

### IndexPage コンテキストメニュー（エラー状態カード上で右クリック）

```
┌─────────────────────┐
│ Edit Path           │  ← フォルダパス変更
│ Edit Title          │  ← タイトル編集
├─────────────────────┤
│ Delete              │  ← カード削除
└─────────────────────┘

※ 「Open」は表示されない（開けないため）
```

---

## 付録C: サムネイルパフォーマンス分析

### C.1 現状の問題

Phase 3実装後の動作確認において、以下のパフォーマンス問題が確認された：

- IndexPage表示時のサムネイル読み込みが遅い
- カード追加モーダルでのサムネイルプレビュー表示が遅い
- カードが増えるほど初期表示が遅くなる

### C.2 原因分析

#### Rust側（`src-tauri/src/commands/images.rs`）

| 問題 | 詳細 | 影響度 |
|------|------|--------|
| **キャッシュなし** | `get_thumbnail`は毎回画像をフルデコード・リサイズしている | 高 |
| **PNGエンコード** | サムネイル出力にPNG形式を使用。PNGはロスレス圧縮のためエンコードが遅い | 高 |
| **同期処理** | コマンドが同期実行のため、重い処理がメインスレッドをブロック | 中 |

```rust
// 現在の実装（問題箇所）
let thumbnail = img.thumbnail(size, size);
thumbnail.write_to(&mut buffer, image::ImageFormat::Png)  // PNGは遅い
```

#### フロントエンド側（`src/components/cards/CardItem.tsx`）

| 問題 | 詳細 | 影響度 |
|------|------|--------|
| **個別取得** | 各CardItemコンポーネントがuseEffect内で個別にサムネイルをリクエスト | 中 |
| **キャッシュなし** | コンポーネント再マウント時に毎回Rust側へリクエスト | 高 |
| **同時リクエスト** | カードが多い場合、大量の同時リクエストが発生 | 中 |

```typescript
// 現在の実装（各カードが個別に取得）
useEffect(() => {
  getThumbnail(card.thumbnail, THUMBNAIL_SIZE).then(...)
}, [card.thumbnail, isValid]);
```

### C.3 改善策

#### 改善1: JPEG出力に変更（優先度: 高、難易度: 低）✅ 実装済み

PNGからJPEGに変更することで、エンコード速度が約5-10倍向上する。

```rust
// 実装済み（src-tauri/src/commands/images.rs）
thumbnail.write_to(&mut buffer, image::ImageFormat::Jpeg)
```

| 項目 | PNG | JPEG |
|------|-----|------|
| 圧縮方式 | ロスレス | 非可逆 |
| エンコード速度 | 遅い | 速い |
| ファイルサイズ | 大きい | 小さい |
| 画質 | 完全 | 十分（サムネイル用途） |

#### 改善2: Rust側メモリキャッシュ（優先度: 高、難易度: 中）✅ 実装済み

同じ画像パス・サイズの組み合わせに対して、生成済みサムネイルをメモリにキャッシュする。

```rust
// 実装済み（src-tauri/src/commands/images.rs）
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;

const MAX_CACHE_ENTRIES: usize = 200;

static THUMBNAIL_CACHE: Lazy<Mutex<ThumbnailCache>> =
    Lazy::new(|| Mutex::new(ThumbnailCache::new(MAX_CACHE_ENTRIES)));

// LRU風キャッシュ（最大200エントリ、古いものから削除）
struct ThumbnailCache {
    map: HashMap<(String, u32), String>,
    order: Vec<(String, u32)>,
    max_size: usize,
}
```

**実装済みの機能**:
- 最大200エントリのLRU風キャッシュ
- キャッシュヒット時は即座に返却（画像処理をスキップ）

**未実装（将来検討）**:
- ファイル更新時のキャッシュ無効化

#### 改善3: フロントエンドキャッシュ（優先度: 中、難易度: 中）

サムネイルURLをグローバルなMapで管理し、再取得を防止する。

```typescript
// thumbnailCache.ts
const cache = new Map<string, string>();

export async function getCachedThumbnail(
  imagePath: string,
  size: number
): Promise<string | null> {
  const key = `${imagePath}:${size}`;

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const url = await getThumbnail(imagePath, size);
  cache.set(key, url);
  return url;
}
```

#### 改善4: ディスクキャッシュ（優先度: 低、難易度: 高）

アプリデータディレクトリにサムネイルファイルを保存し、アプリ再起動後も高速に読み込む。

```
<app_data>/thumbnails/
├── <hash1>.jpg
├── <hash2>.jpg
└── ...
```

- ファイル名はパス+サイズのハッシュ値
- 元画像の更新日時でキャッシュ有効性を判定
- 定期的な古いキャッシュの削除が必要

#### 改善5: 並列処理の制御（優先度: 低、難易度: 中）

同時リクエスト数を制限し、システムリソースの過負荷を防止する。

```typescript
// 同時実行数を制限するキュー
class ThumbnailQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private maxConcurrent = 4;

  async add<T>(task: () => Promise<T>): Promise<T> {
    // キュー管理ロジック...
  }
}
```

### C.4 実装状況

| 順位 | 改善策 | 期待効果 | 工数 | 状態 |
|------|--------|----------|------|------|
| 1 | JPEG出力に変更 | エンコード5-10倍高速化 | 小 | ✅ 実装済み |
| 2 | Rust側メモリキャッシュ | 同一画像の再処理防止 | 中 | ✅ 実装済み |
| 3 | フロントエンドキャッシュ | 再レンダリング時の再取得防止 | 中 | 未実装 |
| 4 | ディスクキャッシュ | アプリ再起動後も高速 | 大 | 未実装 |
| 5 | 並列処理の制御 | 大量カード時の安定性向上 | 中 | 未実装 |

### C.5 実装ステップ案

**Step 1: 即効性のある改善** ✅ 完了
- [x] JPEG出力に変更
- [x] Rust側メモリキャッシュ（LRU風、最大200エントリ）

**Step 2: フロントエンド改善**（未実装・必要に応じて実施）
- [ ] フロントエンドキャッシュの実装
- [ ] ローディング状態の最適化

**Step 3: 永続化**（未実装・Phase 5で検討）
- [ ] ディスクキャッシュの実装
- [ ] キャッシュ管理機能（サイズ上限、有効期限）
