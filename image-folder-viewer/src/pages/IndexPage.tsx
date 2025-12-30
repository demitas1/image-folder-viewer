// インデックスページ - フォルダカードのグリッド表示

import { useNavigate } from "react-router-dom";

export function IndexPage() {
  const navigate = useNavigate();

  // 仮のカードクリック処理（Phase 3で実装予定）
  const handleCardClick = (cardId: string) => {
    navigate(`/viewer/${cardId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Image Folder Viewer
            </span>
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

      {/* カードグリッド（プレースホルダー） */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* サンプルカード（Phase 3で実際のカードコンポーネントに置き換え） */}
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition"
            onClick={() => handleCardClick("sample-1")}
          >
            <div className="aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500 text-4xl">
                ?
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                サンプルフォルダ
              </h3>
            </div>
          </div>

          {/* 空状態のプレースホルダー */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg aspect-square flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-500 text-sm">
              フォルダを追加
            </span>
          </div>
        </div>

        {/* 空状態メッセージ */}
        {false && (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              まだカードがありません
            </p>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              最初のフォルダを追加
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
