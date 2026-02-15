// 画像ビューアページ

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "../components/common/Spinner";
import { getCurrentWindow, currentMonitor, LogicalSize } from "@tauri-apps/api/window";
import { ImageDisplay } from "../components/viewer/ImageDisplay";
import {
  ContextMenu,
  type ContextMenuItem,
} from "../components/common/ContextMenu";
import { useProfileStore } from "../store/profileStore";
import { saveProfile } from "../api/tauri";
import {
  useCurrentImage,
  useNavigationState,
  useViewerOptions,
  useViewerActions,
  useViewerStore,
} from "../store/viewerStore";
import { copyImageToClipboard, copyTextToClipboard } from "../api/tauri";

// フィットズーム率を計算
function calculateFitZoom(displayW: number, displayH: number, imageW: number, imageH: number): number {
  if (imageW <= 0 || imageH <= 0) return 1.0;
  const fit = Math.min(displayW / imageW, displayH / imageH);
  return Math.min(Math.round(fit * 100) / 100, 4.0);
}

export function ViewerPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  // プロファイルからカード情報を取得
  const currentProfile = useProfileStore((state) => state.currentProfile);
  const updateAppState = useProfileStore((state) => state.updateAppState);
  const card = currentProfile?.cards.find((c) => c.id === cardId) ?? null;

  // ビューアストア
  const currentImage = useCurrentImage();
  const { currentIndex, totalImages, actualIndex } = useNavigationState();
  const { hFlipEnabled, shuffleEnabled } = useViewerOptions();
  const { loadImages, goToNext, goToPrev, toggleHFlip, toggleShuffle, setZoomLevel, setOriginalImageSize, reset } =
    useViewerActions();
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);
  const zoomLevel = useViewerStore((state) => state.zoomLevel);
  const originalImageSize = useViewerStore((state) => state.originalImageSize);

  // コンテキストメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // 初回読み込みスキップ用フラグ
  const isInitialLoadRef = useRef(true);

  // ズーム用ref
  const mainRef = useRef<HTMLElement>(null);
  const isResizingProgrammaticallyRef = useRef(false);
  const chromeHeightRef = useRef<number>(0);

  // 画像読み込み完了時に元画像サイズを記録し、フィットズーム率を計算
  const handleImageLoad = useCallback(async (naturalWidth: number, naturalHeight: number) => {
    // 元画像サイズを store に保存
    setOriginalImageSize({ w: naturalWidth, h: naturalHeight });

    try {
      const win = getCurrentWindow();
      const innerSize = await win.innerSize();
      const scaleFactor = await win.scaleFactor();
      const logicalW = innerSize.width / scaleFactor;
      const logicalH = innerSize.height / scaleFactor;

      // chrome 高を計測して保存
      const mainEl = mainRef.current;
      if (mainEl) {
        chromeHeightRef.current = logicalH - mainEl.clientHeight;
      }

      // 表示領域サイズからフィットズーム率を計算
      const displayW = mainEl ? mainEl.clientWidth : logicalW;
      const displayH = mainEl ? mainEl.clientHeight : logicalH;
      const fitZoom = calculateFitZoom(displayW, displayH, naturalWidth, naturalHeight);
      setZoomLevel(fitZoom);
    } catch (e) {
      console.error("ウィンドウサイズ取得に失敗:", e);
    }
  }, [setOriginalImageSize, setZoomLevel]);

  // 画像切替時に元画像サイズをリセット
  useEffect(() => {
    setOriginalImageSize(null);
  }, [currentImage?.path, setOriginalImageSize]);

  // キーボードズームイン: ウィンドウリサイズ + ズーム率更新
  const handleZoomIn = useCallback(async () => {
    const imgSize = useViewerStore.getState().originalImageSize;
    const currentZoom = useViewerStore.getState().zoomLevel;
    if (!imgSize) return;

    // 希望ズーム率
    const desiredZoom = Math.min(Math.round(currentZoom * 1.2 * 100) / 100, 4.0);
    if (desiredZoom === currentZoom) return;

    try {
      const win = getCurrentWindow();
      const chromeH = chromeHeightRef.current;

      // 希望ウィンドウサイズ
      const desiredW = imgSize.w * desiredZoom;
      const desiredH = imgSize.h * desiredZoom + chromeH;

      // デスクトップサイズで上限制限
      const monitor = await currentMonitor();
      const scaleFactor = monitor?.scaleFactor ?? 1;
      const maxW = monitor ? monitor.size.width / scaleFactor : desiredW;
      const maxH = monitor ? monitor.size.height / scaleFactor : desiredH;

      const cappedW = Math.round(Math.min(desiredW, maxW));
      const cappedH = Math.round(Math.min(desiredH, maxH));

      // 上限に達した場合はズーム率を再計算
      let newZoom = desiredZoom;
      if (cappedW < desiredW || cappedH < desiredH) {
        newZoom = calculateFitZoom(cappedW, cappedH - chromeH, imgSize.w, imgSize.h);
      }

      // プログラムリサイズフラグを立ててリサイズ
      isResizingProgrammaticallyRef.current = true;
      await win.setSize(new LogicalSize(cappedW, cappedH));
      requestAnimationFrame(() => {
        isResizingProgrammaticallyRef.current = false;
      });

      setZoomLevel(newZoom);
    } catch (e) {
      console.error("ズームインに失敗:", e);
    }
  }, [setZoomLevel]);

  // キーボードズームアウト: ウィンドウリサイズ + ズーム率更新
  const handleZoomOut = useCallback(async () => {
    const imgSize = useViewerStore.getState().originalImageSize;
    const currentZoom = useViewerStore.getState().zoomLevel;
    if (!imgSize) return;

    try {
      const win = getCurrentWindow();
      const innerSize = await win.innerSize();
      const scaleFactor = await win.scaleFactor();
      const logicalW = innerSize.width / scaleFactor;
      const logicalH = innerSize.height / scaleFactor;

      // 現在のウィンドウがいずれかの辺で200pxに達していたらズームアウト無効
      if (logicalW <= 200 || logicalH <= 200) return;

      const chromeH = chromeHeightRef.current;

      // 希望ズーム率
      const desiredZoom = Math.max(Math.round(currentZoom * 0.8 * 100) / 100, 0.01);
      if (desiredZoom === currentZoom) return;

      // 希望ウィンドウサイズ
      const desiredW = imgSize.w * desiredZoom;
      const desiredH = imgSize.h * desiredZoom + chromeH;

      // 最小サイズ（200px）でクランプ
      const cappedW = Math.round(Math.max(desiredW, 200));
      const cappedH = Math.round(Math.max(desiredH, 200));

      // 下限に達した場合はズーム率を再計算
      let newZoom = desiredZoom;
      if (cappedW > desiredW || cappedH > desiredH) {
        newZoom = calculateFitZoom(cappedW, cappedH - chromeH, imgSize.w, imgSize.h);
      }

      // プログラムリサイズフラグを立ててリサイズ
      isResizingProgrammaticallyRef.current = true;
      await win.setSize(new LogicalSize(cappedW, cappedH));
      requestAnimationFrame(() => {
        isResizingProgrammaticallyRef.current = false;
      });

      setZoomLevel(newZoom);
    } catch (e) {
      console.error("ズームアウトに失敗:", e);
    }
  }, [setZoomLevel]);

  // ズームリセット: 現在のウィンドウサイズでフィットズームに戻る（ウィンドウリサイズなし）
  const handleResetZoom = useCallback(async () => {
    const imgSize = useViewerStore.getState().originalImageSize;
    if (!imgSize) return;

    try {
      const win = getCurrentWindow();
      const innerSize = await win.innerSize();
      const scaleFactor = await win.scaleFactor();
      const logicalH = innerSize.height / scaleFactor;

      const mainEl = mainRef.current;
      const displayW = mainEl ? mainEl.clientWidth : innerSize.width / scaleFactor;
      const displayH = mainEl ? mainEl.clientHeight : logicalH - chromeHeightRef.current;

      const fitZoom = calculateFitZoom(displayW, displayH, imgSize.w, imgSize.h);
      setZoomLevel(fitZoom);
    } catch (e) {
      console.error("ズームリセットに失敗:", e);
    }
  }, [setZoomLevel]);

  // ユーザーによるウィンドウ手動リサイズを監視
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      const win = getCurrentWindow();
      unlisten = await win.onResized(async () => {
        // プログラムリサイズ中はスキップ
        if (isResizingProgrammaticallyRef.current) return;

        const imgSize = useViewerStore.getState().originalImageSize;
        if (!imgSize) return;

        try {
          const innerSize = await win.innerSize();
          const scaleFactor = await win.scaleFactor();
          const logicalH = innerSize.height / scaleFactor;

          const mainEl = mainRef.current;
          // chrome 高を再計測
          if (mainEl) {
            chromeHeightRef.current = logicalH - mainEl.clientHeight;
          }

          const displayW = mainEl ? mainEl.clientWidth : innerSize.width / scaleFactor;
          const displayH = mainEl ? mainEl.clientHeight : logicalH - chromeHeightRef.current;

          const fitZoom = calculateFitZoom(displayW, displayH, imgSize.w, imgSize.h);
          useViewerStore.getState().setZoomLevel(fitZoom);
        } catch (e) {
          console.error("リサイズ時ズーム再計算に失敗:", e);
        }
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // ビューア状態をappStateに保存し、プロファイルをディスクに書き出す
  const saveViewerState = useCallback(() => {
    const viewerState = useViewerStore.getState();
    // シャッフル時は元のインデックスを保存
    const imageIndex = viewerState.shuffledIndices
      ? viewerState.shuffledIndices[viewerState.currentIndex]
      : viewerState.currentIndex;

    updateAppState({
      lastPage: "viewer",
      lastCardId: viewerState.cardId,
      lastImageIndex: imageIndex,
      hFlipEnabled: viewerState.hFlipEnabled,
      shuffleEnabled: viewerState.shuffleEnabled,
    });

    // プロファイルをディスクに保存
    const { currentProfile: profile, currentProfilePath: path } =
      useProfileStore.getState();
    if (profile && path) {
      saveProfile(path, profile).catch((e) =>
        console.error("プロファイル保存に失敗:", e)
      );
    }
  }, [updateAppState]);

  // 画像表示・オプション変更時にビューア状態を保存
  useEffect(() => {
    // 初回読み込み時（loadImages完了直後）はスキップ
    if (isInitialLoadRef.current) {
      if (totalImages > 0) {
        isInitialLoadRef.current = false;
      }
      return;
    }

    saveViewerState();
  }, [actualIndex, hFlipEnabled, shuffleEnabled, saveViewerState, totalImages]);

  // インデックスページに戻る
  const handleBack = useCallback(() => {
    // IndexPageに戻るのでlastPageをindexに設定して保存
    updateAppState({ lastPage: "index" });

    // 保存実行
    const { currentProfile: profile, currentProfilePath: path } =
      useProfileStore.getState();
    if (profile && path) {
      saveProfile(path, profile).catch((e) =>
        console.error("プロファイル保存に失敗:", e)
      );
    }

    reset();
    navigate("/");
  }, [navigate, reset, updateAppState]);

  // 画像一覧の読み込み（プリミティブ値を依存配列に使用し、不要な再読み込みを防止）
  const cardTitle = card?.title ?? "";
  const folderPath = card?.folderPath;

  useEffect(() => {
    if (!cardId || !folderPath) return;

    // appStateから前回の状態を復元
    const appState = currentProfile?.appState;
    const isRestore = appState?.lastPage === "viewer" && appState?.lastCardId === cardId;

    loadImages(
      cardId,
      cardTitle,
      folderPath,
      isRestore ? appState.lastImageIndex : 0,
      isRestore ? appState.hFlipEnabled : false,
      isRestore ? appState.shuffleEnabled : false,
    );
  }, [cardId, cardTitle, folderPath, loadImages]); // currentProfileは意図的に依存配列から除外

  // プロファイルが読み込まれていない場合はStartupPageへ
  useEffect(() => {
    if (!currentProfile) {
      navigate("/startup");
    }
  }, [currentProfile, navigate]);

  // カードが見つからない場合はIndexPageへ
  useEffect(() => {
    if (currentProfile && !card) {
      navigate("/");
    }
  }, [currentProfile, card, navigate]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // コンテキストメニュー表示中はメニュー側で処理する
      if (contextMenu) return;

      switch (e.key) {
        case "Escape":
        case "q":
        case "Q":
          handleBack();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "h":
        case "H":
          toggleHFlip();
          break;
        case "r":
        case "R":
          toggleShuffle();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleResetZoom();
          break;
        case " ":
          e.preventDefault();
          // 画面中央にコンテキストメニューを表示
          setContextMenu({
            x: Math.round(window.innerWidth / 2),
            y: Math.round(window.innerHeight / 2),
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    contextMenu,
    handleBack,
    goToNext,
    goToPrev,
    toggleHFlip,
    toggleShuffle,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  ]);

  // 右クリックでコンテキストメニュー表示
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // コンテキストメニューを閉じる
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // クリックで次の画像へ
  const handleImageClick = useCallback(() => {
    goToNext();
  }, [goToNext]);

  // コンテキストメニュー項目
  const imagePath = currentImage?.path ?? null;
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const items: ContextMenuItem[] = [];

    if (imagePath) {
      items.push({
        label: "コピー",
        shortcut: "",
        onClick: () => {
          copyImageToClipboard(imagePath).catch((e) =>
            console.error("画像コピーに失敗:", e)
          );
        },
      });
      items.push({
        label: "パスをコピー",
        shortcut: "",
        onClick: () => {
          copyTextToClipboard(imagePath).catch((e) =>
            console.error("パスコピーに失敗:", e)
          );
        },
      });
    }

    items.push({
      label: `水平反転: ${hFlipEnabled ? "OFF" : "ON"}`,
      shortcut: "H",
      separator: true,
      onClick: toggleHFlip,
    });
    items.push({
      label: `シャッフル: ${shuffleEnabled ? "OFF" : "ON"}`,
      shortcut: "R",
      onClick: toggleShuffle,
    });

    items.push({
      label: "ズームイン",
      shortcut: "+",
      separator: true,
      onClick: handleZoomIn,
    });
    items.push({
      label: "ズームアウト",
      shortcut: "-",
      onClick: handleZoomOut,
    });
    items.push({
      label: "ズームリセット",
      shortcut: "0",
      onClick: handleResetZoom,
    });

    items.push({
      label: "インデックスに戻る",
      shortcut: "ESC",
      separator: true,
      onClick: handleBack,
    });
    items.push({
      label: "終了",
      shortcut: "Q",
      onClick: () => {
        // onCloseRequestedで保存処理が実行される
        getCurrentWindow().close();
      },
    });

    return items;
  }, [imagePath, hFlipEnabled, shuffleEnabled, toggleHFlip, toggleShuffle, handleZoomIn, handleZoomOut, handleResetZoom, handleBack]);

  // カードが見つからない場合
  if (!card) {
    return null;
  }

  return (
    <div className="h-screen bg-black flex flex-col" onContextMenu={handleContextMenu}>
      {/* タイトルバー */}
      <header className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition shrink-0"
          >
            <ArrowLeft size={16} />
            戻る
          </button>
          <span className="text-sm text-gray-300 truncate">
            {card.title}
            {currentImage && (
              <span className="text-gray-500">
                {" - "}
                {currentImage.filename}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs text-yellow-400 font-mono">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={toggleHFlip}
            className={`text-xs px-2 py-0.5 rounded transition ${
              hFlipEnabled
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
            title="水平反転 (H)"
          >
            H
          </button>
          <button
            onClick={toggleShuffle}
            className={`text-xs px-2 py-0.5 rounded transition ${
              shuffleEnabled
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
            title="シャッフル (R)"
          >
            R
          </button>
        </div>
      </header>

      {/* 画像表示エリア */}
      <main ref={mainRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <Spinner size="lg" text="読み込み中..." />
        )}

        {error && (
          <div className="text-center">
            <div className="text-red-400 text-lg mb-2">{error}</div>
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              インデックスに戻る
            </button>
          </div>
        )}

        {!isLoading && !error && currentImage && (
          <ImageDisplay
            imagePath={currentImage.path}
            hFlipEnabled={hFlipEnabled}
            zoomLevel={zoomLevel}
            originalImageSize={originalImageSize}
            onClick={handleImageClick}
            onImageLoad={handleImageLoad}
          />
        )}
      </main>

      {/* フッター（ナビゲーション情報） */}
      {totalImages > 0 && (
        <footer className="bg-gray-900 text-gray-400 px-4 py-1.5 text-xs flex justify-between shrink-0">
          <span>
            {(shuffleEnabled ? currentIndex : actualIndex) + 1} / {totalImages}
            {shuffleEnabled && " (シャッフル)"}
          </span>
          <span className="text-gray-600">
            ←→: ナビゲーション | H: 反転 | R: シャッフル | +/-: ズーム | Space: メニュー |
            ESC: 戻る
          </span>
        </footer>
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
