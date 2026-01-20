// カード表示コンポーネント

import { useState, useEffect } from "react";
import { Pencil, Trash2, AlertTriangle, ImageIcon } from "lucide-react";
import { getThumbnail } from "../../api/tauri";
import type { Card } from "../../types";

interface CardItemProps {
  card: Card;
  isValid: boolean;
  errorMessage?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  // ドラッグ&ドロップ用（Step 6で使用）
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

// サムネイルサイズ
const THUMBNAIL_SIZE = 200;

export const CardItem = ({
  card,
  isValid,
  errorMessage,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  dragHandleProps,
  isDragging = false,
}: CardItemProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  // サムネイル読み込み
  useEffect(() => {
    if (!card.thumbnail || !isValid) {
      setThumbnailUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoadingThumbnail(true);

    getThumbnail(card.thumbnail, THUMBNAIL_SIZE)
      .then((url) => {
        if (!cancelled) {
          setThumbnailUrl(url);
        }
      })
      .catch((e) => {
        console.error("サムネイル読み込みエラー:", e);
        if (!cancelled) {
          setThumbnailUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingThumbnail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [card.thumbnail, isValid]);

  // カードクリック
  const handleClick = () => {
    if (isValid && onClick) {
      onClick();
    }
  };

  // 編集ボタンクリック
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  // 削除ボタンクリック
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  // スタイルクラス
  const containerClasses = [
    "group relative flex flex-col rounded-lg overflow-hidden bg-white shadow transition-all",
    isSelected ? "ring-2 ring-blue-500" : "",
    isValid ? "cursor-pointer hover:shadow-lg" : "cursor-not-allowed",
    !isValid ? "ring-2 ring-red-400" : "",
    isDragging ? "opacity-50 shadow-2xl" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClasses}
      onClick={handleClick}
      title={!isValid ? errorMessage : card.title}
      {...dragHandleProps}
    >
      {/* サムネイル領域 */}
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {isValid ? (
          isLoadingThumbnail ? (
            // ローディング
            <div className="animate-pulse bg-gray-200 w-full h-full" />
          ) : thumbnailUrl ? (
            // サムネイル画像
            <img
              src={thumbnailUrl}
              alt={card.title}
              className="w-full h-full object-cover"
            />
          ) : (
            // 画像なし
            <ImageIcon size={48} className="text-gray-300" />
          )
        ) : (
          // エラー状態
          <div className="flex flex-col items-center justify-center text-red-400 p-4">
            <AlertTriangle size={48} />
            <span className="mt-2 text-xs text-center">フォルダが見つかりません</span>
          </div>
        )}
      </div>

      {/* タイトル・操作ボタン領域 */}
      <div className="p-2 border-t border-gray-100">
        <div className="flex items-center justify-between gap-2">
          {/* タイトル */}
          <span className="text-sm font-medium text-gray-700 truncate flex-1">
            {card.title}
          </span>

          {/* 操作ボタン（ホバー時に表示） */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="編集"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="削除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
