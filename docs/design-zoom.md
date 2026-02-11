# ビューアズーム機能 設計・動作仕様

## 概要

ViewerPage で画像をフィット表示（100%）から最大400%まで拡大表示する機能。ズーム操作に連動してウィンドウサイズをリサイズし、画像がウィンドウに収まらない場合はスクロールバーを表示する。

## 仕様

| 項目 | 値 |
|------|-----|
| ズーム基準 | フィット表示 = 100%（`zoomLevel: 1.0`） |
| ズーム単位 | +20%加算（100→120→140→...→400） |
| 最小倍率 | 100%（フィット表示） |
| 最大倍率 | 400% |
| 画像切替時 | フィット表示にリセット、ウィンドウサイズも復元 |
| ウィンドウ連動 | ズームに合わせてリサイズ。モニターサイズの上限で停止 |
| はみ出し時 | `overflow-auto` でスクロールバー表示 |
| 状態保存 | しない（画像切替・ビューア終了でリセット） |

## 操作方法

### キーボードショートカット

| キー | 動作 |
|------|------|
| `+` / `=` | ズームイン（+20%） |
| `-` | ズームアウト（-20%） |
| `0` | ズームリセット（100%に戻す） |

### コンテキストメニュー

右クリック / Spaceキーで表示されるメニューにズーム項目を表示:

- ズームイン（+）
- ズームアウト（-）
- ズームリセット（0） ※ ズーム中のみ表示

### ヘッダー表示

100%以外の時、ヘッダー右側にズーム倍率（例: `120%`）を黄色テキストで表示。

### フッター表示

ショートカットヘルプに `+/-: ズーム` を表示。

## 内部設計

### 表示モード（isZoomed）

ImageDisplay 内で `zoomLevel` から派生する判定フラグ:

```typescript
const isZoomed = zoomLevel > 1.0;
```

| `isZoomed` | 条件 | 表示モード |
|------------|------|-----------|
| `false` | `zoomLevel === 1.0` | フィット表示。画像をウィンドウに収まるよう `object-contain` で表示。クリックで次の画像。 |
| `true` | `zoomLevel > 1.0`（1.2〜4.0） | ズーム表示。画像を `fitSize * zoomLevel` の明示サイズで表示。はみ出し時スクロール。クリックで次の画像。 |

`zoomLevel` の最小値は 1.0（`zoomOut` で下限制限）のため、1.0 未満にはならない。

このフラグにより以下の動作が切り替わる:
- **コンテナレイアウト**: フィット時は `flex items-center justify-center`、ズーム時は `absolute inset-0 overflow-auto`
- **img 要素のスタイル**: フィット時は `max-w-full max-h-full object-contain`、ズーム時は明示的な width/height
- **ウィンドウリサイズ**: ズーム時のみ実行（フィット時は baseWindowSize に復元）
- **ヘッダー倍率表示**: ズーム時のみ表示
- **コンテキストメニュー「ズームリセット」**: ズーム時のみ表示

### 状態管理（viewerStore.ts）

```
ViewerState:
  zoomLevel: number  // 1.0〜4.0、初期値 1.0

ViewerActions:
  zoomIn()     // zoomLevel = min(zoomLevel + 0.2, 4.0)
  zoomOut()    // zoomLevel = max(zoomLevel - 0.2, 1.0)
  resetZoom()  // zoomLevel = 1.0
```

- `goToNext` / `goToPrev` / `goToIndex` 実行時に `zoomLevel` を 1.0 にリセット
- `reset` 時に initialState（`zoomLevel: 1.0`）に戻る

### 基準値の管理（ViewerPage refs）

ViewerPage で以下の基準値を ref で管理（ストアには入れない）:

| ref | 用途 |
|-----|------|
| `fitImageSizeRef` | zoom 1.0 時の画像表示サイズ（px） |
| `baseWindowSizeRef` | zoom 1.0 時のウィンドウ内部サイズ（logical px） |
| `baseChromeHeightRef` | ヘッダー+フッターの高さ（logical px） |
| `mainRef` | `<main>` 要素への参照（chrome高さ計測用） |

これらは `handleImageLoad` コールバック（ImageDisplay の `onLoad` 時）で初回のみ記録し、画像切替時（`currentImage.path` 変化時）にリセットする。

### フィットサイズの取得

ImageDisplay コンポーネントの `onLoad` イベントで `img.clientWidth` / `img.clientHeight` を読み取り、`onImageLoad` コールバック経由で ViewerPage に伝達する。これが `fitImageSize`（zoom 1.0 時の画像ピクセルサイズ）となる。

### ウィンドウリサイズの流れ

`zoomLevel` の変化を `useEffect` で監視:

```
zoomLevel変化時:
  fitSize, baseSize が未取得なら何もしない

  isZoomed = false (zoomLevel <= 1.0):
    → setSize(baseWindowSize) でフィット時のサイズに復元

  isZoomed = true (zoomLevel > 1.0):
    1. desiredW = fitImageSize.w * zoomLevel
    2. desiredH = fitImageSize.h * zoomLevel + chromeHeight
    3. monitor = await currentMonitor()
    4. maxW = monitor.size.width / scaleFactor
    5. maxH = monitor.size.height / scaleFactor
    6. cappedW = min(desiredW, maxW)
    7. cappedH = min(desiredH, maxH)
    8. await setSize(LogicalSize(cappedW, cappedH))
```

ウィンドウがモニターサイズ上限に達した場合、画像はウィンドウからはみ出す。この時 ImageDisplay の `overflow-auto`（`isZoomed: true` 時のみ有効）によりスクロールバーが表示される。

### ユーザーによるウィンドウ手動リサイズ時の動作

基準値 ref（`fitImageSizeRef`, `baseWindowSizeRef`, `baseChromeHeightRef`）は画像の `onLoad` 時に一度だけ記録され、ユーザーのウィンドウ手動リサイズでは更新されない。このため以下の動作になる。

#### フィット表示中（isZoomed = false）に手動リサイズ

- 画像は `object-contain` により新しいウィンドウサイズに自動再フィットする（表示上は問題なし）
- `fitImageSizeRef` は更新されない（画像ロード時の値のまま）
- `baseWindowSizeRef` は更新されない（画像ロード時の値のまま）
- その後ズーム操作を行うと、**手動リサイズ前の fitSize を基準**にズーム倍率が計算される
- `resetZoom`（0キー）を押すと、**手動リサイズ前のウィンドウサイズに復元**される（手動リサイズは上書きされる）

#### ズーム中（isZoomed = true）に手動リサイズ

- 画像サイズは変わらない（明示的な width/height 指定のため）
- コンテナは `absolute inset-0` でウィンドウに追従するため、スクロール領域が変わる
- 基準値 ref は更新されない
- さらにズーム操作を行うと、元の fitSize 基準でウィンドウサイズが再計算される（手動リサイズは上書きされる）
- `resetZoom` は手動リサイズを無視して `baseWindowSizeRef` に復元する

#### 画像切替時のウィンドウサイズ復元

画像切替（`goToNext` / `goToPrev`）時、`zoomLevel` と `currentIndex` が同時に更新される。React の effect 実行順序により:

1. `zoomLevel` effect が先に実行 → 古い `baseWindowSizeRef` を使ってウィンドウを元のサイズに復元
2. `currentImage.path` effect が実行 → 全 ref をリセット（null）
3. 新画像の `onLoad` → 復元後の現在のウィンドウサイズで新しい基準値を記録

このため、ズーム中に画像を切り替えるとウィンドウはズーム前のサイズに正しく復元される。ただし、フィット表示中に手動リサイズした後に画像を切り替えた場合は、ref が更新されていないため復元は発生せず、手動リサイズ後のサイズがそのまま新しい基準値として記録される。

### 画像表示の切り替え（ImageDisplay.tsx）

`isZoomed` の値によりコンテナと img 要素のスタイルを切り替える:

| `isZoomed` | コンテナ | img要素 |
|------------|---------|---------|
| `false` | `flex-1 flex items-center justify-center overflow-hidden` | `max-w-full max-h-full object-contain` |
| `true` | `absolute inset-0 overflow-auto` | `width: fitW*zoom, height: fitH*zoom`（明示指定） |

**`isZoomed: false`（フィット表示）**: flex センタリングで画像をコンテナ中央に配置。`object-contain` でアスペクト比を維持しつつコンテナに収める。

**`isZoomed: true`（ズーム表示）**: `absolute inset-0` でコンテナを `<main>` のサイズに固定し、`overflow-auto` でスクロールバーを表示する。`absolute inset-0` を使う理由は、親の `<main>` が flex レイアウトのため `flex-1` だとコンテナの高さがコンテンツ（画像）サイズに追従してしまい、`overflow-auto` が機能しないため。

H-Flip は両モード共通で `transform: scaleX(-1)` を適用（ズームと干渉しない）。

### Tauri パーミッション

`src-tauri/capabilities/default.json` に以下を追加:

```json
"core:window:allow-set-size",
"core:window:allow-inner-size",
"core:window:allow-scale-factor",
"core:window:allow-current-monitor"
```

## 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/store/viewerStore.ts` | `zoomLevel` 状態、`zoomIn`/`zoomOut`/`resetZoom` アクション |
| `src/components/viewer/ImageDisplay.tsx` | `zoomLevel`/`onImageLoad` props、ズーム時レイアウト切替 |
| `src/pages/ViewerPage.tsx` | キーボードショートカット、ウィンドウリサイズ、基準値管理、UI表示 |
| `src-tauri/capabilities/default.json` | ウィンドウ操作パーミッション追加 |
