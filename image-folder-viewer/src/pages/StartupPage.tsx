// 起動時プロファイル選択ページ

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProfileStore,
  useRecentProfiles,
} from "../store/profileStore";

export function StartupPage() {
  const navigate = useNavigate();
  const {
    initialize,
    openProfile,
    openProfileWithDialog,
    createProfile,
    removeFromHistory,
    isLoading,
    error,
    clearError,
    currentProfile,
  } = useProfileStore();

  const recentProfiles = useRecentProfiles();

  // 初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // プロファイルが読み込まれたらIndexPageへ遷移
  useEffect(() => {
    if (currentProfile) {
      navigate("/");
    }
  }, [currentProfile, navigate]);

  // 履歴からプロファイルを開く
  const handleOpenRecent = async (path: string) => {
    try {
      await openProfile(path);
    } catch {
      // エラーは既にstoreで処理されている
    }
  };

  // ダイアログでプロファイルを開く
  const handleOpenWithDialog = async () => {
    await openProfileWithDialog();
  };

  // 新規プロファイル作成
  const handleCreateNew = async () => {
    await createProfile();
  };

  // 履歴から削除
  const handleRemoveFromHistory = async (
    e: React.MouseEvent,
    path: string
  ) => {
    e.stopPropagation();
    await removeFromHistory(path);
  };

  // 日付フォーマット
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Image Folder Viewer
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              プロファイルを選択してください
            </p>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start justify-between">
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {error}
                </p>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div className="mb-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                読み込み中...
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleOpenWithDialog}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              プロファイルを開く
            </button>
            <button
              onClick={handleCreateNew}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              新規作成
            </button>
          </div>

          {/* 最近使用したプロファイル */}
          {recentProfiles.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                最近使用したプロファイル
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentProfiles.map((profile) => (
                  <div
                    key={profile.path}
                    onClick={() => handleOpenRecent(profile.path)}
                    className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                        {profile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {profile.path}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(profile.lastOpenedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) =>
                        handleRemoveFromHistory(e, profile.path)
                      }
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-500 transition"
                      title="履歴から削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 履歴がない場合のメッセージ */}
          {recentProfiles.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                最近使用したプロファイルはありません
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
