// インデックスページ - フォルダカードのグリッド表示

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileSelector } from "../components/profile/ProfileSelector";
import { useProfileStore } from "../store/profileStore";
import type { Card } from "../types";

export function IndexPage() {
  const navigate = useNavigate();
  const { currentProfile, saveCurrentProfile, error, clearError } =
    useProfileStore();

  // プロファイルが読み込まれていない場合はStartupPageへ
  useEffect(() => {
    if (!currentProfile) {
      navigate("/startup");
    }
  }, [currentProfile, navigate]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveCurrentProfile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveCurrentProfile]);

  // 仮のカードクリック処理（Phase 3で実装予定）
  const handleCardClick = (cardId: string) => {
    navigate(`/viewer/${cardId}`);
  };

  // プロファイルが未読み込みの場合は何も表示しない
  if (!currentProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ProfileSelector />
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => {
                // Phase 3で実装予定
                console.log("カード追加");
              }}
            >
              + 追加
            </button>
          </div>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カードグリッド */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* カードがある場合 */}
        {currentProfile.cards.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentProfile.cards.map((card: Card) => (
              <div
                key={card.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition"
                onClick={() => handleCardClick(card.id)}
              >
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-4xl">
                    ?
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {card.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* カードがない場合 */
          <div className="text-center py-16">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full">
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              まだカードがありません
            </p>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              onClick={() => {
                // Phase 3で実装予定
                console.log("カード追加");
              }}
            >
              最初のフォルダを追加
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
