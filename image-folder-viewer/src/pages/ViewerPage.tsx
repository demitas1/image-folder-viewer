// 画像ビューアページ

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ImageDisplay } from "../components/viewer/ImageDisplay";
import {
  ContextMenu,
  type ContextMenuItem,
} from "../components/common/ContextMenu";
import { useProfileStore } from "../store/profileStore";
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
  const card = currentProfile?.cards.find((c) => c.id === cardId) ?? null;

  // ビューアストア
  const currentImage = useCurrentImage();
  const { currentIndex, totalImages, actualIndex } = useNavigationState();
  const { hFlipEnabled, shuffleEnabled } = useViewerOptions();
  const { loadImages, goToNext, goToPrev, toggleHFlip, toggleShuffle, reset } =
    useViewerActions();
  const isLoading = useViewerStore((state) => state.isLoading);
  const error = useViewerStore((state) => state.error);

  // コンテキストメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // インデックスページに戻る
  const handleBack = useCallback(() => {
    reset();
    navigate("/");
  }, [navigate, reset]);

  // 画像一覧の読み込み（プリミティブ値を依存配列に使用し、不要な再読み込みを防止）
  const cardTitle = card?.title ?? "";
  const folderPath = card?.folderPath;

  useEffect(() => {
    if (!cardId || !folderPath) return;

    loadImages(cardId, cardTitle, folderPath);
  }, [cardId, cardTitle, folderPath, loadImages]);

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
      label: "インデックスに戻る",
      shortcut: "ESC",
      separator: true,
      onClick: handleBack,
    });
    items.push({
      label: "終了",
      shortcut: "Q",
      onClick: () => {
        getCurrentWindow().close();
      },
    });

    return items;
  }, [imagePath, hFlipEnabled, shuffleEnabled, toggleHFlip, toggleShuffle, handleBack]);

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
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <div className="text-gray-400 text-sm">読み込み中...</div>
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
            onClick={handleImageClick}
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
            ←→: ナビゲーション | H: 反転 | R: シャッフル | Space: メニュー |
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
