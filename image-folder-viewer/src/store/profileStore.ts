// プロファイル状態管理

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ProfileData, AppConfig, RecentProfile } from "../types";
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
