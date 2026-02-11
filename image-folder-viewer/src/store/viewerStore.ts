// ビューア状態管理

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ImageFile } from "../types";
import { getImagesInFolder } from "../api/tauri";

// 空配列の定数（参照の安定性のため）
const EMPTY_IMAGES: ImageFile[] = [];

interface ViewerState {
  // 表示中のカード情報
  cardId: string | null;
  cardTitle: string;
  folderPath: string | null;

  // 画像一覧
  images: ImageFile[];

  // ナビゲーション状態
  currentIndex: number;
  shuffledIndices: number[] | null;

  // 表示オプション
  hFlipEnabled: boolean;
  shuffleEnabled: boolean;
  zoomLevel: number;

  // 読み込み状態
  isLoading: boolean;
  error: string | null;
}

interface ViewerActions {
  // 画像一覧を読み込む
  loadImages: (
    cardId: string,
    cardTitle: string,
    folderPath: string,
    initialIndex?: number,
    hFlip?: boolean,
    shuffle?: boolean
  ) => Promise<void>;

  // ナビゲーション
  goToNext: () => void;
  goToPrev: () => void;
  goToIndex: (index: number) => void;

  // 表示オプション
  toggleHFlip: () => void;
  toggleShuffle: () => void;
  setHFlip: (enabled: boolean) => void;
  setShuffle: (enabled: boolean) => void;

  // ズーム
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // リセット
  reset: () => void;

  // エラークリア
  clearError: () => void;
}

// 初期状態
const initialState: ViewerState = {
  cardId: null,
  cardTitle: "",
  folderPath: null,
  images: [],
  currentIndex: 0,
  shuffledIndices: null,
  hFlipEnabled: false,
  shuffleEnabled: false,
  zoomLevel: 1.0,
  isLoading: false,
  error: null,
};

// シャッフルされたインデックス配列を生成（Fisher-Yatesアルゴリズム）
function generateShuffledIndices(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);

  // Fisher-Yates シャッフル
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // 現在の画像を先頭に移動
  const currentPos = indices.indexOf(currentIndex);
  if (currentPos !== -1 && currentPos !== 0) {
    [indices[0], indices[currentPos]] = [indices[currentPos], indices[0]];
  }

  return indices;
}

export const useViewerStore = create<ViewerState & ViewerActions>((set, get) => ({
  ...initialState,

  // 画像一覧を読み込む
  loadImages: async (cardId, cardTitle, folderPath, initialIndex = 0, hFlip = false, shuffle = false) => {
    set({ isLoading: true, error: null });

    try {
      const images = await getImagesInFolder(folderPath);

      if (images.length === 0) {
        set({
          ...initialState,
          cardId,
          cardTitle,
          folderPath,
          error: "フォルダ内に画像がありません",
          isLoading: false,
        });
        return;
      }

      // 初期インデックスを範囲内に収める
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1));

      // シャッフルが有効な場合はインデックス配列を生成
      const shuffledIndices = shuffle
        ? generateShuffledIndices(images.length, validIndex)
        : null;

      set({
        cardId,
        cardTitle,
        folderPath,
        images,
        currentIndex: shuffle ? 0 : validIndex, // シャッフル時は0から開始（先頭が元の位置）
        shuffledIndices,
        hFlipEnabled: hFlip,
        shuffleEnabled: shuffle,
        isLoading: false,
        error: null,
      });
    } catch (e) {
      set({
        ...initialState,
        cardId,
        cardTitle,
        folderPath,
        error: `画像の読み込みに失敗しました: ${e}`,
        isLoading: false,
      });
    }
  },

  // 次の画像へ
  goToNext: () => {
    const { images, currentIndex } = get();
    if (images.length === 0) return;

    const nextIndex = (currentIndex + 1) % images.length;
    set({ currentIndex: nextIndex, zoomLevel: 1.0 });
  },

  // 前の画像へ
  goToPrev: () => {
    const { images, currentIndex } = get();
    if (images.length === 0) return;

    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    set({ currentIndex: prevIndex, zoomLevel: 1.0 });
  },

  // 指定インデックスへ
  goToIndex: (index: number) => {
    const { images } = get();
    if (images.length === 0) return;

    const validIndex = Math.max(0, Math.min(index, images.length - 1));
    set({ currentIndex: validIndex, zoomLevel: 1.0 });
  },

  // H-Flipトグル
  toggleHFlip: () => {
    set((state) => ({ hFlipEnabled: !state.hFlipEnabled }));
  },

  // シャッフルトグル
  toggleShuffle: () => {
    const { shuffleEnabled, images, currentIndex, shuffledIndices } = get();

    if (shuffleEnabled) {
      // シャッフル解除: 現在表示中の画像の元のインデックスに戻る
      const actualIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
      set({
        shuffleEnabled: false,
        shuffledIndices: null,
        currentIndex: actualIndex,
      });
    } else {
      // シャッフル有効化: 新しいシャッフル配列を生成
      if (images.length === 0) return;
      const newShuffledIndices = generateShuffledIndices(images.length, currentIndex);
      set({
        shuffleEnabled: true,
        shuffledIndices: newShuffledIndices,
        currentIndex: 0, // シャッフル配列の先頭から開始
      });
    }
  },

  // H-Flip設定
  setHFlip: (enabled: boolean) => {
    set({ hFlipEnabled: enabled });
  },

  // シャッフル設定
  setShuffle: (enabled: boolean) => {
    const { shuffleEnabled, images, currentIndex, shuffledIndices } = get();

    if (enabled === shuffleEnabled) return;

    if (enabled) {
      // シャッフル有効化
      if (images.length === 0) return;
      const newShuffledIndices = generateShuffledIndices(images.length, currentIndex);
      set({
        shuffleEnabled: true,
        shuffledIndices: newShuffledIndices,
        currentIndex: 0,
      });
    } else {
      // シャッフル解除
      const actualIndex = shuffledIndices ? shuffledIndices[currentIndex] : currentIndex;
      set({
        shuffleEnabled: false,
        shuffledIndices: null,
        currentIndex: actualIndex,
      });
    }
  },

  // ズームイン（+20%、最大400%）
  zoomIn: () => {
    const { zoomLevel } = get();
    const next = Math.min(Math.round((zoomLevel + 0.2) * 10) / 10, 4.0);
    set({ zoomLevel: next });
  },

  // ズームアウト（-20%、最小100%=フィット）
  zoomOut: () => {
    const { zoomLevel } = get();
    const next = Math.max(Math.round((zoomLevel - 0.2) * 10) / 10, 1.0);
    set({ zoomLevel: next });
  },

  // ズームリセット（フィット表示に戻す）
  resetZoom: () => {
    set({ zoomLevel: 1.0 });
  },

  // リセット
  reset: () => {
    set(initialState);
  },

  // エラークリア
  clearError: () => {
    set({ error: null });
  },
}));

// カスタムフック: 現在の画像情報
export const useCurrentImage = (): ImageFile | null => {
  return useViewerStore((state) => {
    if (state.images.length === 0) return null;

    // シャッフル時は shuffledIndices を使って実際のインデックスを取得
    const actualIndex = state.shuffledIndices
      ? state.shuffledIndices[state.currentIndex]
      : state.currentIndex;

    return state.images[actualIndex] ?? null;
  });
};

// カスタムフック: 画像一覧
export const useImages = (): ImageFile[] => {
  return useViewerStore(useShallow((state) => state.images ?? EMPTY_IMAGES));
};

// カスタムフック: ナビゲーション状態
export const useNavigationState = () => {
  return useViewerStore(
    useShallow((state) => ({
      currentIndex: state.currentIndex,
      totalImages: state.images.length,
      // シャッフル時の実際のインデックス
      actualIndex: state.shuffledIndices
        ? state.shuffledIndices[state.currentIndex]
        : state.currentIndex,
    }))
  );
};

// カスタムフック: 表示オプション
export const useViewerOptions = () => {
  return useViewerStore(
    useShallow((state) => ({
      hFlipEnabled: state.hFlipEnabled,
      shuffleEnabled: state.shuffleEnabled,
    }))
  );
};

// カスタムフック: ビューアアクション
export const useViewerActions = () => {
  return useViewerStore(
    useShallow((state) => ({
      loadImages: state.loadImages,
      goToNext: state.goToNext,
      goToPrev: state.goToPrev,
      goToIndex: state.goToIndex,
      toggleHFlip: state.toggleHFlip,
      toggleShuffle: state.toggleShuffle,
      setHFlip: state.setHFlip,
      setShuffle: state.setShuffle,
      zoomIn: state.zoomIn,
      zoomOut: state.zoomOut,
      resetZoom: state.resetZoom,
      reset: state.reset,
      clearError: state.clearError,
    }))
  );
};
