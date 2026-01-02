// プロファイル選択ドロップダウン

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProfileStore,
  useRecentProfiles,
  useCurrentProfileName,
} from "../../store/profileStore";

export function ProfileSelector() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    openProfile,
    openProfileWithDialog,
    createProfile,
    saveProfileAs,
    closeProfile,
    isLoading,
  } = useProfileStore();

  const recentProfiles = useRecentProfiles();
  const currentProfileName = useCurrentProfileName();

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // プロファイルを開く（履歴から）
  const handleOpenRecent = async (path: string) => {
    setIsOpen(false);
    try {
      await openProfile(path);
    } catch {
      // エラーは既にstoreで処理されている
    }
  };

  // ダイアログでプロファイルを開く
  const handleOpenWithDialog = async () => {
    setIsOpen(false);
    await openProfileWithDialog();
  };

  // 新規プロファイル作成
  const handleCreateNew = async () => {
    setIsOpen(false);
    await createProfile();
  };

  // 別名で保存
  const handleSaveAs = async () => {
    setIsOpen(false);
    await saveProfileAs();
  };

  // プロファイル選択画面に戻る
  const handleBackToStartup = () => {
    setIsOpen(false);
    closeProfile();
    navigate("/startup");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* トリガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {currentProfileName || "プロファイル"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* 最近使用したプロファイル */}
          {recentProfiles.length > 0 && (
            <div className="py-2">
              <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                最近使用したプロファイル
              </p>
              <div className="max-h-48 overflow-y-auto">
                {recentProfiles.map((profile) => (
                  <button
                    key={profile.path}
                    onClick={() => handleOpenRecent(profile.path)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {profile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {profile.path}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 区切り線 */}
          {recentProfiles.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700" />
          )}

          {/* アクションメニュー */}
          <div className="py-2">
            <button
              onClick={handleOpenWithDialog}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
            >
              <span className="mr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </span>
              別のプロファイルを開く...
            </button>
            <button
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
            >
              <span className="mr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              新規プロファイル作成
            </button>
            <button
              onClick={handleSaveAs}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
            >
              <span className="mr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </span>
              別名で保存...
            </button>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* 戻るボタン */}
          <div className="py-2">
            <button
              onClick={handleBackToStartup}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center"
            >
              <span className="mr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
              </span>
              プロファイル選択に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
