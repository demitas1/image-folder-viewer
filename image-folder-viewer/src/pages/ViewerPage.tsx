// 画像ビューアページ

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";

export function ViewerPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  // インデックスページに戻る
  const handleBack = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
        case "q":
        case "Q":
          handleBack();
          break;
        case "ArrowLeft":
          // Phase 4で実装予定: 前の画像
          console.log("前の画像");
          break;
        case "ArrowRight":
          // Phase 4で実装予定: 次の画像
          console.log("次の画像");
          break;
        case "h":
        case "H":
          // Phase 4で実装予定: 水平反転トグル
          console.log("H-Flip トグル");
          break;
        case "r":
        case "R":
          // Phase 4で実装予定: シャッフルトグル
          console.log("シャッフル トグル");
          break;
        case " ":
          // Phase 4で実装予定: コンテキストメニュー
          e.preventDefault();
          console.log("コンテキストメニュー");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBack]);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* タイトルバー */}
      <header className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
          >
            戻る
          </button>
          <span className="text-sm text-gray-300">
            カード: {cardId} - image_001.jpg
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Phase 4で実装予定: H-Flip/Shuffleインジケーター */}
          <span className="text-xs text-gray-500">[H] [R]</span>
        </div>
      </header>

      {/* 画像表示エリア */}
      <main
        className="flex-1 flex items-center justify-center cursor-pointer"
        onClick={() => {
          // Phase 4で実装予定: クリックで次の画像
          console.log("次の画像へ");
        }}
      >
        {/* プレースホルダー画像 */}
        <div className="text-center">
          <div className="w-96 h-64 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
            <span className="text-gray-500 text-6xl">?</span>
          </div>
          <p className="text-gray-400 text-sm">
            画像を読み込み中...（Phase 4で実装予定）
          </p>
          <p className="text-gray-600 text-xs mt-2">
            ESC/Q: 戻る | 左右キー: ナビゲーション | H: 反転 | R: シャッフル
          </p>
        </div>
      </main>

      {/* フッター（画像情報） */}
      <footer className="bg-gray-900 text-gray-400 px-4 py-2 text-xs flex justify-between">
        <span>1 / 10</span>
        <span>1920 x 1080 | 2.5 MB</span>
      </footer>
    </div>
  );
}
