// 開発テスト用: トースト通知UIの目視確認コンポーネント
// 確認後は git reset で削除すること

import { useToastStore } from "../../store/toastStore";

export function ToastTest() {
  const addToast = useToastStore((state) => state.addToast);

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 bg-white border border-gray-300 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-bold text-gray-500 text-xs">Toast テスト</p>
      <button
        onClick={() => addToast("画像をクリップボードにコピーしました", "success")}
        className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded"
      >
        success
      </button>
      <button
        onClick={() => addToast("プロファイルの保存に失敗しました: 書き込み権限がありません", "error")}
        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded"
      >
        error
      </button>
      <button
        onClick={() => addToast("情報メッセージのサンプルです", "info")}
        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
      >
        info
      </button>
      <button
        onClick={() => {
          addToast("メッセージ1件目", "success");
          addToast("メッセージ2件目（エラー）", "error");
          addToast("メッセージ3件目", "info");
        }}
        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
      >
        複数同時
      </button>
    </div>
  );
}
