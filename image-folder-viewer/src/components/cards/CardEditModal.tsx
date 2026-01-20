// カード編集モーダル

import { useState, useEffect } from "react";
import { ImageIcon, FolderOpen, AlertTriangle } from "lucide-react";
import { Modal, Button } from "../common/Modal";
import {
  selectFolder,
  selectImageFile,
  getThumbnail,
  getFirstImageInFolder,
} from "../../api/tauri";
import type { Card } from "../../types";
import type { UpdateCardInput } from "../../store/profileStore";

interface CardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  isValid: boolean;
  onSave: (cardId: string, input: UpdateCardInput) => void;
}

// サムネイルプレビューサイズ
const PREVIEW_SIZE = 150;

export const CardEditModal = ({
  isOpen,
  onClose,
  card,
  isValid,
  onSave,
}: CardEditModalProps) => {
  // フォーム状態
  const [title, setTitle] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // 編集状態追跡
  const [isFolderChanged, setIsFolderChanged] = useState(false);

  // ローディング状態
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  // カードが変わったらフォーム値をリセット
  useEffect(() => {
    if (card && isOpen) {
      setTitle(card.title);
      setFolderPath(card.folderPath);
      setThumbnailPath(card.thumbnail);
      setIsFolderChanged(false);
    }
  }, [card, isOpen]);

  // サムネイルパスが変わったらプレビューを更新
  useEffect(() => {
    // フォルダが無効でフォルダ変更されていない場合はプレビューを表示しない
    if (!thumbnailPath || (!isValid && !isFolderChanged)) {
      setThumbnailUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoadingThumbnail(true);

    getThumbnail(thumbnailPath, PREVIEW_SIZE)
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
  }, [thumbnailPath, isValid, isFolderChanged]);

  // フォルダ変更（エラー状態のカード用）
  const handleChangeFolder = async () => {
    try {
      const path = await selectFolder();
      if (path) {
        setFolderPath(path);
        setIsFolderChanged(true);

        // フォルダ内最初の画像をサムネイルに設定
        const firstImage = await getFirstImageInFolder(path);
        setThumbnailPath(firstImage);
      }
    } catch (e) {
      console.error("フォルダ選択エラー:", e);
    }
  };

  // サムネイル変更
  const handleChangeThumbnail = async () => {
    try {
      const path = await selectImageFile(folderPath);
      if (path) {
        setThumbnailPath(path);
      }
    } catch (e) {
      console.error("画像選択エラー:", e);
    }
  };

  // 保存
  const handleSave = () => {
    if (!card || !title.trim()) return;

    const input: UpdateCardInput = {
      title: title.trim(),
    };

    // フォルダが変更された場合
    if (isFolderChanged) {
      input.folderPath = folderPath;
    }

    // サムネイルが変更された場合
    if (thumbnailPath !== card.thumbnail) {
      input.thumbnail = thumbnailPath;
    }

    onSave(card.id, input);
    onClose();
  };

  if (!card) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="カードを編集"
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* エラー状態の警告 */}
        {!isValid && !isFolderChanged && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <AlertTriangle size={18} />
            <span>フォルダが見つかりません。パスを変更してください。</span>
          </div>
        )}

        {/* フォルダパス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            フォルダ
          </label>
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 text-sm px-3 py-2 rounded border truncate ${
                !isValid && !isFolderChanged
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              {folderPath}
            </div>
            {/* エラー状態の場合のみフォルダ変更ボタンを表示 */}
            {!isValid && (
              <button
                type="button"
                onClick={handleChangeFolder}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="フォルダを変更"
              >
                <FolderOpen size={20} />
              </button>
            )}
          </div>
          {isFolderChanged && (
            <p className="mt-1 text-xs text-green-600">
              フォルダが変更されました
            </p>
          )}
        </div>

        {/* タイトル */}
        <div>
          <label
            htmlFor="edit-card-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            タイトル
          </label>
          <input
            id="edit-card-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="カードのタイトル"
            autoFocus
          />
        </div>

        {/* サムネイル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            サムネイル
          </label>
          <div className="flex items-start gap-4">
            {/* プレビュー */}
            <div className="w-24 h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {isLoadingThumbnail ? (
                <div className="animate-pulse bg-gray-200 w-full h-full" />
              ) : thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="サムネイルプレビュー"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon size={32} className="text-gray-300" />
              )}
            </div>

            {/* 変更ボタン（フォルダが有効な場合のみ） */}
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={handleChangeThumbnail}
                disabled={!isValid && !isFolderChanged}
              >
                変更...
              </Button>
              <p className="text-xs text-gray-500">
                任意の画像ファイルを選択できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
