# ビューアズーム機能 設計・動作仕様

## 概要

ViewerPage で画像の拡大・縮小表示を行う機能。ズーム率は元画像に対するスケールとして定義し、ウィンドウサイズと常に連動する。ウィンドウは画像のアスペクト比を維持し、ズーム操作・手動リサイズの両方でズーム率が更新される。

## ズーム率の定義

```
ズーム率 = 表示サイズ / 元画像サイズ
```

例: 2000×1500px の画像を 800×600px で表示 → ズーム率 40%

| 項目 | 値 |
|------|-----|
| 最大ズーム率 | 400% |
| 最小ズーム率 | ウィンドウ最小サイズ（200px）でのフィットズーム率 |
| 端数処理 | 1%未満を四捨五入 |
| ウィンドウ最小サイズ | 縦・横いずれも 200px 未満にならない |

## 動作仕様

### 初期表示

ViewerPage に遷移した時、現在のウィンドウサイズを基準にフィット表示する。

```
displayW = ウィンドウ幅
displayH = ウィンドウ高 - chrome高（ヘッダー+フッター）
fitZoom = min(displayW / imageW, displayH / imageH)
zoomLevel = min(round(fitZoom * 100) / 100, 4.0)
```

- 大きい画像: 縮小してフィット（例: 4000px → 40%）
- 小さい画像: 拡大してフィット（例: 200px → 400%）、ただし 400% を超えない
- 400% でもウィンドウより小さい場合: 400% で中央に表示

### キーボードズーム操作

| キー | 動作 |
|------|------|
| `+` / `=` | ズームイン（×1.2）— ウィンドウを拡大 |
| `-` | ズームアウト（×0.8）— ウィンドウを縮小 |
| `0` | フィット表示にリセット — ウィンドウサイズは変更しない |

#### ズームイン / ズームアウトのフロー

```
1. 希望ズーム率 = round(現在のズーム率 × 倍率)  ← 1%未満四捨五入
2. クランプ: [最小ズーム率, 400%]
   - ウィンドウがいずれかの辺で200pxに達している場合、ズームアウト無効
3. 希望ウィンドウサイズを計算:
   windowW = imageW × 希望ズーム率
   windowH = imageH × 希望ズーム率 + chrome高
4. ウィンドウサイズをクランプ:
   下限: 各辺 200px（Tauri ウィンドウ制約）
   上限: デスクトップサイズ
5. 上限/下限に達した場合:
   → クランプ後のウィンドウサイズからズーム率を再計算:
     zoomLevel = round(min(cappedW / imageW, (cappedH - chrome高) / imageH) * 100) / 100
6. プログラムリサイズフラグを立ててウィンドウをリサイズ
7. ズーム率を確定
8. requestAnimationFrame でフラグを解除
```

#### ズームリセットのフロー

```
1. 現在のウィンドウサイズから表示領域サイズを取得
2. フィットズーム率を計算: min(displayW / imageW, displayH / imageH)
3. setZoomLevel() でズーム率を更新
4. ウィンドウリサイズはしない
```

ズームリセットは「現在のウィンドウサイズはそのまま維持し、そのサイズに画像がフィットするズーム率に戻す」動作。キーボードズームでウィンドウが拡大した状態でリセットすると、大きいウィンドウのまま画像がフィット表示される。

### ユーザーによるウィンドウ手動リサイズ

ユーザーがウィンドウサイズを手動で変更した場合:

1. 新しいウィンドウサイズからフィットするズーム率を計算
2. 現在のズーム率として更新
3. 画像は元のアスペクト比を維持し、ウィンドウ内で中央に表示

ウィンドウの最小サイズ（200px）は Tauri のウィンドウ制約で保証する。

### ウィンドウのアスペクト比

- **キーボードズーム時**: ウィンドウは常に画像のアスペクト比に合わせてリサイズされる（余白なし、chrome 高を加算）
- **ユーザー手動リサイズ時**: 任意のアスペクト比を許容。画像は `object-contain` 相当で中央に表示（上下または左右に余白が発生しうる）
- **手動リサイズ後のキーボードズーム**: 画像のアスペクト比に復帰する

### 画像切替

- ウィンドウサイズは変更しない
- 現在のウィンドウサイズを基準にフィット表示し、ズーム率を再計算
- 新しい画像のアスペクト比が異なる場合、中央にフィット表示（余白あり）

### 小さい画像の扱い

元画像がウィンドウ表示領域より小さい場合:

- 初期表示: 拡大してフィット（最大 400%）
- 400% でもウィンドウ表示領域より小さい場合: 400% のサイズで中央に表示
- ズームアウト: ウィンドウが最小サイズ（200px）に達している場合、ズームアウト無効

## 操作UI

### コンテキストメニュー

右クリック / Spaceキーで表示されるメニューにズーム項目を常に表示:

- ズームイン（+）
- ズームアウト（-）
- ズームリセット（0）

### ヘッダー表示

ヘッダー右側にズーム倍率（例: `40%`、`120%`）を常に表示。

### フッター表示

ショートカットヘルプに `+/-: ズーム` を表示。

## 内部設計

### 状態管理（viewerStore.ts）

```
ViewerState:
  zoomLevel: number       // 元画像に対するスケール（0.01〜4.0）
  originalImageSize: { w: number, h: number } | null  // 元画像のピクセルサイズ

ViewerActions:
  zoomIn()                    // zoomLevel = min(round(zoomLevel * 1.2 * 100) / 100, 4.0)
  zoomOut()                   // zoomLevel = max(round(zoomLevel * 0.8 * 100) / 100, 0.01)
  setZoomLevel(level)         // 直接設定（フィット計算・手動リサイズ時に使用）
  setOriginalImageSize(size)  // 元画像サイズを設定（onLoad 時）
```

- `resetZoom` は store ではなく ViewerPage のローカルハンドラ `handleResetZoom` として実装。理由: 現在のウィンドウサイズを Tauri API で取得する必要があり、store 内で完結できないため。
- `goToNext` / `goToPrev` / `goToIndex` 実行時: ズーム率はリセットしない（画像切替後に `handleImageLoad` でフィット再計算）
- `reset` 時: initialState に戻る

### ウィンドウリサイズ制御（ViewerPage）

| 値 | 取得元 |
|----|-------|
| 元画像サイズ | `img.naturalWidth` / `img.naturalHeight`（onLoad 時、viewerStore に保存） |
| chrome 高 | ウィンドウ高 − 表示領域高（`main` 要素の clientHeight、`chromeHeightRef` に保存） |
| デスクトップサイズ | `currentMonitor()` API |
| ウィンドウ最小サイズ | `tauri.conf.json` で 200×200 を設定済み |

#### ref 構成

| ref | 用途 |
|-----|------|
| `mainRef` | 表示領域の DOM 要素（chrome 高の計算に使用） |
| `isResizingProgrammaticallyRef` | プログラムリサイズ中フラグ |
| `chromeHeightRef` | ヘッダー+フッターの高さ（画像 onLoad 時に計測） |

#### ヘルパー関数

```typescript
function calculateFitZoom(displayW: number, displayH: number, imageW: number, imageH: number): number
  // min(displayW/imageW, displayH/imageH) を計算し、1%未満を四捨五入、400%上限でクランプ
```

#### handleImageLoad

1. `naturalWidth`/`naturalHeight` を受け取り `setOriginalImageSize()` で store に保存
2. chrome 高を計測して `chromeHeightRef` に保存
3. 現在のウィンドウサイズからフィットズーム率を計算 → `setZoomLevel()`
4. ウィンドウリサイズはしない（画像切替仕様: ウィンドウ維持）

#### キーボードズームハンドラ

`handleZoomIn` / `handleZoomOut` / `handleResetZoom` を ViewerPage 内で定義。store の `zoomIn`/`zoomOut` は使用せず、ウィンドウリサイズとセットで実行する。

- `handleZoomIn`: ×1.2 → ウィンドウリサイズ → デスクトップ上限クランプ → ズーム率確定
- `handleZoomOut`: 200px チェック → ×0.8 → ウィンドウリサイズ → 200px 下限クランプ → ズーム率確定
- `handleResetZoom`: 現在のウィンドウサイズからフィットズーム率を計算（リサイズなし）

#### プログラムリサイズ vs ユーザーリサイズの区別

キーボードズームによる `setSize()` 呼び出しは resize イベントを発生させる。ユーザー手動リサイズとの区別のため、プログラムリサイズ中はフラグを立てて resize イベントハンドラ内でのズーム率再計算をスキップする。

```
isResizingProgrammaticallyRef.current = true
await window.setSize(...)
requestAnimationFrame(() => { isResizingProgrammaticallyRef.current = false })
```

#### ウィンドウリサイズリスナー

`getCurrentWindow().onResized()` で手動リサイズを監視。`isResizingProgrammaticallyRef` が false の場合のみ、新ウィンドウサイズからフィットズーム率を再計算して `setZoomLevel()` を呼ぶ。

### 画像表示（ImageDisplay.tsx）

props に `originalImageSize: { w: number; h: number } | null` を追加。`onImageLoad` は `(naturalWidth, naturalHeight)` を通知するシグネチャ。

表示サイズは常に `元画像サイズ × ズーム率` で計算する。

```
displayW = originalW × zoomLevel
displayH = originalH × zoomLevel
```

- `originalImageSize` 未取得時: `object-contain` でフォールバック表示
- 画像がコンテナより小さい場合: 中央に配置
- 画像がコンテナより大きい場合: `overflow-auto`（通常は発生しないが実装を残す）
- コンテナ: 常に `flex items-center justify-center overflow-auto`（ズーム状態による切替なし）
- H-Flip: `transform: scaleX(-1)` で適用（ズームと干渉しない）

### スクロールバー

ズーム率がウィンドウサイズと常に連動するため、画像がウィンドウからはみ出すケースは通常発生しない。ただし、将来の仕様変更を考慮して `overflow-auto` の実装は維持する。

### Tauri パーミッション

`src-tauri/capabilities/default.json` に以下を設定済み:

```json
"core:window:allow-set-size",
"core:window:allow-inner-size",
"core:window:allow-scale-factor",
"core:window:allow-current-monitor"
```

### Tauri ウィンドウ最小サイズ設定

`tauri.conf.json` で最小サイズを設定済み:

```json
{
  "windows": [{
    "minWidth": 200,
    "minHeight": 200
  }]
}
```
