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
  const { loadImages, goToNext, goToPrev, toggleHFlip, toggleShuffle, zoomIn, zoomOut, resetZoom, reset } =
    useViewerActions();
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);
  const zoomLevel = useViewerStore((state) => state.zoomLevel);

  // コンテキストメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // 初回読み込みスキップ用フラグ
  const isInitialLoadRef = useRef(true);

  // ズーム用ref
  const mainRef = useRef<HTMLElement>(null);
  const fitImageSizeRef = useRef<{ w: number; h: number } | null>(null);
  const baseWindowSizeRef = useRef<{ w: number; h: number } | null>(null);
  const baseChromeHeightRef = useRef<number>(0);

  // 画像読み込み完了時にフィットサイズとウィンドウ基準サイズを記録
  const handleImageLoad = useCallback(async (fitWidth: number, fitHeight: number) => {
    fitImageSizeRef.current = { w: fitWidth, h: fitHeight };

    // ズーム1.0時のウィンドウサイズを基準として保存
    if (!baseWindowSizeRef.current) {
      try {
        const win = getCurrentWindow();
        const innerSize = await win.innerSize();
        const scaleFactor = await win.scaleFactor();
        const logicalW = innerSize.width / scaleFactor;
        const logicalH = innerSize.height / scaleFactor;
        baseWindowSizeRef.current = { w: logicalW, h: logicalH };

        // ヘッダー+フッター分の高さ（chrome部分）
        const mainEl = mainRef.current;
        if (mainEl) {
          baseChromeHeightRef.current = logicalH - mainEl.clientHeight;
        }
      } catch (e) {
        console.error("ウィンドウサイズ取得に失敗:", e);
      }
    }
  }, []);

  // ズームレベル変化時にウィンドウをリサイズ
  useEffect(() => {
    const fitSize = fitImageSizeRef.current;
    const baseSize = baseWindowSizeRef.current;
    if (!fitSize || !baseSize) return;

    const resizeWindow = async () => {
      try {
        const win = getCurrentWindow();

        if (zoomLevel <= 1.0) {
          // フィット表示に戻す
          await win.setSize(new LogicalSize(baseSize.w, baseSize.h));
          return;
        }

        // ズーム時のサイズ計算
        const chromeH = baseChromeHeightRef.current;
        const desiredW = fitSize.w * zoomLevel;
        const desiredH = fitSize.h * zoomLevel + chromeH;

        // モニター作業領域で上限制限
        const monitor = await currentMonitor();
        const maxW = monitor ? monitor.size.width / (monitor.scaleFactor ?? 1) : desiredW;
        const maxH = monitor ? monitor.size.height / (monitor.scaleFactor ?? 1) : desiredH;

        const cappedW = Math.round(Math.min(desiredW, maxW));
        const cappedH = Math.round(Math.min(desiredH, maxH));

        await win.setSize(new LogicalSize(cappedW, cappedH));
      } catch (e) {
        console.error("ウィンドウリサイズに失敗:", e);
      }
    };

    resizeWindow();
  }, [zoomLevel]);

  // 画像切替時にズーム基準サイズをリセット
  useEffect(() => {
    fitImageSizeRef.current = null;
    baseWindowSizeRef.current = null;
    baseChromeHeightRef.current = 0;
  }, [currentImage?.path]);

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
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
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
    zoomIn,
    zoomOut,
    resetZoom,
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
      onClick: zoomIn,
    });
    items.push({
      label: "ズームアウト",
      shortcut: "-",
      onClick: zoomOut,
    });
    if (zoomLevel > 1.0) {
      items.push({
        label: "ズームリセット",
        shortcut: "0",
        onClick: resetZoom,
      });
    }

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
  }, [imagePath, hFlipEnabled, shuffleEnabled, zoomLevel, toggleHFlip, toggleShuffle, zoomIn, zoomOut, resetZoom, handleBack]);

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
          {zoomLevel > 1.0 && (
            <span className="text-xs text-yellow-400 font-mono">
              {Math.round(zoomLevel * 100)}%
            </span>
          )}
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
