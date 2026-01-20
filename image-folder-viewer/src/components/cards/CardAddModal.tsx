// カード追加モーダル

import { useState, useEffect } from "react";
import { FolderOpen, ImageIcon } from "lucide-react";
import { Modal, Button } from "../common/Modal";
import {
  selectFolder,
  selectImageFile,
  getFirstImageInFolder,
  getThumbnail,
} from "../../api/tauri";
import type { AddCardInput } from "../../store/profileStore";

interface CardAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: AddCardInput) => void;
}

// サムネイルプレビューサイズ
const PREVIEW_SIZE = 150;

// フォルダパスからフォルダ名を取得
const getFolderName = (path: string): string => {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
};

export const CardAddModal = ({ isOpen, onClose, onAdd }: CardAddModalProps) => {
  // フォルダ選択フェーズか情報入力フェーズか
  const [phase, setPhase] = useState<"folder" | "info">("folder");

  // フォーム状態
  const [folderPath, setFolderPath] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // ローディング状態
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  // モーダルを閉じる時にリセット
  useEffect(() => {
    if (!isOpen) {
      setPhase("folder");
      setFolderPath("");
      setTitle("");
      setThumbnailPath(null);
      setThumbnailUrl(null);
    }
  }, [isOpen]);

  // モーダルを開いた時に自動的にフォルダ選択を開始
  useEffect(() => {
    if (isOpen && phase === "folder") {
      handleSelectFolder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // サムネイルパスが変わったらプレビューを更新
  useEffect(() => {
    if (!thumbnailPath) {
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
  }, [thumbnailPath]);

  // フォルダ選択
  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    try {
      const path = await selectFolder();
      if (path) {
        setFolderPath(path);
        setTitle(getFolderName(path));

        // フォルダ内最初の画像をサムネイルに設定
        const firstImage = await getFirstImageInFolder(path);
        setThumbnailPath(firstImage);

        setPhase("info");
      } else {
        // キャンセルされた場合はモーダルを閉じる
        onClose();
      }
    } catch (e) {
      console.error("フォルダ選択エラー:", e);
      onClose();
    } finally {
      setIsSelectingFolder(false);
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

  // 作成
  const handleCreate = () => {
    if (!folderPath || !title.trim()) return;

    onAdd({
      folderPath,
      title: title.trim(),
      thumbnail: thumbnailPath,
    });
    onClose();
  };

  // フォルダ選択フェーズ
  if (phase === "folder") {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="新規カード作成" width="sm">
        <div className="flex flex-col items-center justify-center py-8">
          {isSelectingFolder ? (
            <div className="text-gray-500">フォルダを選択してください...</div>
          ) : (
            <>
              <FolderOpen size={48} className="text-gray-300 mb-4" />
              <Button variant="primary" onClick={handleSelectFolder}>
                フォルダを選択
              </Button>
            </>
          )}
        </div>
      </Modal>
    );
  }

  // 情報入力フェーズ
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新規カード作成"
      width="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            作成
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* フォルダパス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            フォルダ
          </label>
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200 truncate">
            {folderPath}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label
            htmlFor="card-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            タイトル
          </label>
          <input
            id="card-title"
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

            {/* 変更ボタン */}
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={handleChangeThumbnail}>
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
