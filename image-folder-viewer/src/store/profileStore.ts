// プロファイル状態管理

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ProfileData, AppConfig, RecentProfile, Card, AppState } from "../types";
import {
  loadProfile,
  saveProfile,
  createNewProfile,
  getAppConfig,
  addRecentProfile,
  removeRecentProfile,
  selectProfileFile,
  selectProfileSavePath,
} from "../api/tauri";

// 空配列の定数（参照の安定性のため）
const EMPTY_RECENT_PROFILES: RecentProfile[] = [];
const EMPTY_CARDS: Card[] = [];

// カード追加時の入力データ
interface AddCardInput {
  folderPath: string;
  title: string;
  thumbnail: string | null;
}

// カード更新時の入力データ（部分更新）
interface UpdateCardInput {
  title?: string;
  folderPath?: string;
  thumbnail?: string | null;
}

interface ProfileState {
  // 現在のプロファイル
  currentProfile: ProfileData | null;
  currentProfilePath: string | null;

  // アプリ共通設定
  appConfig: AppConfig | null;

  // 読み込み状態
  isLoading: boolean;
  error: string | null;

  // 初期化済みフラグ
  initialized: boolean;
}

interface ProfileActions {
  // 初期化（起動時に呼び出し）
  initialize: () => Promise<void>;

  // プロファイル操作
  openProfile: (path: string) => Promise<void>;
  openProfileWithDialog: () => Promise<boolean>;
  createProfile: () => Promise<boolean>;
  saveCurrentProfile: () => Promise<void>;
  saveProfileAs: () => Promise<boolean>;
  closeProfile: () => void;

  // カード操作
  addCard: (input: AddCardInput) => Card | null;
  updateCard: (cardId: string, input: UpdateCardInput) => Card | null;
  deleteCard: (cardId: string) => boolean;
  reorderCards: (cardIds: string[]) => void;

  // appState更新
  updateAppState: (partial: Partial<AppState>) => void;

  // 履歴操作
  removeFromHistory: (path: string) => Promise<void>;

  // エラークリア
  clearError: () => void;
}

export const useProfileStore = create<ProfileState & ProfileActions>(
  (set, get) => ({
    // 初期状態
    currentProfile: null,
    currentProfilePath: null,
    appConfig: null,
    isLoading: false,
    error: null,
    initialized: false,

    // 初期化
    initialize: async () => {
      if (get().initialized) return;

      set({ isLoading: true, error: null });
      try {
        const config = await getAppConfig();
        set({ appConfig: config, initialized: true, isLoading: false });
      } catch (e) {
        set({
          error: `設定の読み込みに失敗しました: ${e}`,
          isLoading: false,
          initialized: true,
        });
      }
    },

    // プロファイルを開く
    openProfile: async (path: string) => {
      set({ isLoading: true, error: null });
      try {
        const profile = await loadProfile(path);
        await addRecentProfile(path);
        const config = await getAppConfig();
        set({
          currentProfile: profile,
          currentProfilePath: path,
          appConfig: config,
          isLoading: false,
        });
      } catch (e) {
        set({
          error: `プロファイルを開けませんでした: ${e}`,
          isLoading: false,
        });
        throw e;
      }
    },

    // ダイアログでプロファイルを開く
    openProfileWithDialog: async () => {
      try {
        const path = await selectProfileFile();
        if (path) {
          await get().openProfile(path);
          return true;
        }
        return false;
      } catch (e) {
        set({ error: `プロファイルを開けませんでした: ${e}` });
        return false;
      }
    },

    // 新規プロファイル作成
    createProfile: async () => {
      try {
        const path = await selectProfileSavePath();
        if (path) {
          set({ isLoading: true, error: null });
          const profile = await createNewProfile(path);
          await addRecentProfile(path);
          const config = await getAppConfig();
          set({
            currentProfile: profile,
            currentProfilePath: path,
            appConfig: config,
            isLoading: false,
          });
          return true;
        }
        return false;
      } catch (e) {
        set({
          error: `プロファイルの作成に失敗しました: ${e}`,
          isLoading: false,
        });
        return false;
      }
    },

    // 現在のプロファイルを保存
    saveCurrentProfile: async () => {
      const { currentProfile, currentProfilePath } = get();
      if (!currentProfile || !currentProfilePath) {
        set({ error: "保存するプロファイルがありません" });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        await saveProfile(currentProfilePath, currentProfile);
        set({ isLoading: false });
      } catch (e) {
        set({
          error: `プロファイルの保存に失敗しました: ${e}`,
          isLoading: false,
        });
      }
    },

    // 別名で保存
    saveProfileAs: async () => {
      const { currentProfile } = get();
      if (!currentProfile) {
        set({ error: "保存するプロファイルがありません" });
        return false;
      }

      try {
        const path = await selectProfileSavePath();
        if (path) {
          set({ isLoading: true, error: null });
          await saveProfile(path, currentProfile);
          await addRecentProfile(path);
          const config = await getAppConfig();
          set({
            currentProfilePath: path,
            appConfig: config,
            isLoading: false,
          });
          return true;
        }
        return false;
      } catch (e) {
        set({
          error: `プロファイルの保存に失敗しました: ${e}`,
          isLoading: false,
        });
        return false;
      }
    },

    // プロファイルを閉じる
    closeProfile: () => {
      set({
        currentProfile: null,
        currentProfilePath: null,
        error: null,
      });
    },

    // カードを追加
    addCard: (input: AddCardInput) => {
      const { currentProfile } = get();
      if (!currentProfile) {
        set({ error: "プロファイルが開かれていません" });
        return null;
      }

      const now = new Date().toISOString();
      const maxSortOrder = currentProfile.cards.reduce(
        (max, card) => Math.max(max, card.sortOrder),
        -1
      );

      const newCard: Card = {
        id: crypto.randomUUID(),
        title: input.title,
        folderPath: input.folderPath,
        thumbnail: input.thumbnail,
        sortOrder: maxSortOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      set({
        currentProfile: {
          ...currentProfile,
          cards: [...currentProfile.cards, newCard],
          updatedAt: now,
        },
      });

      return newCard;
    },

    // カードを更新
    updateCard: (cardId: string, input: UpdateCardInput) => {
      const { currentProfile } = get();
      if (!currentProfile) {
        set({ error: "プロファイルが開かれていません" });
        return null;
      }

      const cardIndex = currentProfile.cards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        set({ error: "指定されたカードが見つかりません" });
        return null;
      }

      const now = new Date().toISOString();
      const updatedCard: Card = {
        ...currentProfile.cards[cardIndex],
        ...input,
        updatedAt: now,
      };

      const newCards = [...currentProfile.cards];
      newCards[cardIndex] = updatedCard;

      set({
        currentProfile: {
          ...currentProfile,
          cards: newCards,
          updatedAt: now,
        },
      });

      return updatedCard;
    },

    // カードを削除
    deleteCard: (cardId: string) => {
      const { currentProfile } = get();
      if (!currentProfile) {
        set({ error: "プロファイルが開かれていません" });
        return false;
      }

      const cardExists = currentProfile.cards.some((c) => c.id === cardId);
      if (!cardExists) {
        set({ error: "指定されたカードが見つかりません" });
        return false;
      }

      const now = new Date().toISOString();
      const newCards = currentProfile.cards.filter((c) => c.id !== cardId);

      // cardTagsからも関連を削除
      const newCardTags = currentProfile.cardTags.filter(
        (ct) => ct.cardId !== cardId
      );

      set({
        currentProfile: {
          ...currentProfile,
          cards: newCards,
          cardTags: newCardTags,
          updatedAt: now,
        },
      });

      return true;
    },

    // カードの順序を変更
    reorderCards: (cardIds: string[]) => {
      const { currentProfile } = get();
      if (!currentProfile) {
        set({ error: "プロファイルが開かれていません" });
        return;
      }

      const now = new Date().toISOString();

      // cardIdsの順序に基づいてsortOrderを更新
      const cardMap = new Map(currentProfile.cards.map((c) => [c.id, c]));
      const reorderedCards = cardIds
        .map((id, index) => {
          const card = cardMap.get(id);
          if (!card) return null;
          return { ...card, sortOrder: index, updatedAt: now };
        })
        .filter((c): c is Card => c !== null);

      // cardIdsに含まれないカード（あれば）を末尾に追加
      const remainingCards = currentProfile.cards
        .filter((c) => !cardIds.includes(c.id))
        .map((c, index) => ({
          ...c,
          sortOrder: reorderedCards.length + index,
          updatedAt: now,
        }));

      set({
        currentProfile: {
          ...currentProfile,
          cards: [...reorderedCards, ...remainingCards],
          updatedAt: now,
        },
      });
    },

    // appState更新
    updateAppState: (partial: Partial<AppState>) => {
      const { currentProfile } = get();
      if (!currentProfile) return;

      const now = new Date().toISOString();
      set({
        currentProfile: {
          ...currentProfile,
          appState: {
            ...currentProfile.appState,
            ...partial,
          },
          updatedAt: now,
        },
      });
    },

    // 履歴から削除
    removeFromHistory: async (path: string) => {
      try {
        await removeRecentProfile(path);
        const config = await getAppConfig();
        set({ appConfig: config });
      } catch (e) {
        set({ error: `履歴の削除に失敗しました: ${e}` });
      }
    },

    // エラークリア
    clearError: () => {
      set({ error: null });
    },
  })
);

// カスタムフック: 最近使用したプロファイル一覧
export const useRecentProfiles = (): RecentProfile[] => {
  return useProfileStore(
    useShallow((state) => state.appConfig?.recentProfiles ?? EMPTY_RECENT_PROFILES)
  );
};

// カスタムフック: 現在のプロファイル名
export const useCurrentProfileName = (): string => {
  return useProfileStore((state) => {
    if (!state.currentProfilePath) return "";
    const parts = state.currentProfilePath.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.replace(".ivprofile", "");
  });
};

// カスタムフック: カード一覧（sortOrder順にソート済み）
export const useCards = (): Card[] => {
  return useProfileStore(
    useShallow((state) => {
      const cards = state.currentProfile?.cards ?? EMPTY_CARDS;
      // sortOrder順にソートして返す
      return [...cards].sort((a, b) => a.sortOrder - b.sortOrder);
    })
  );
};

// カスタムフック: カード操作アクション
export const useCardActions = () => {
  return useProfileStore(
    useShallow((state) => ({
      addCard: state.addCard,
      updateCard: state.updateCard,
      deleteCard: state.deleteCard,
      reorderCards: state.reorderCards,
    }))
  );
};

// 型のエクスポート
export type { AddCardInput, UpdateCardInput };
