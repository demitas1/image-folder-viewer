// カスタム画像ピッカーモーダル（仮想スクロール対応）

import { useState, useEffect, useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ImageIcon } from "lucide-react";
import { Modal, Button } from "./Modal";
import { Spinner } from "./Spinner";
import { getImagesInFolder } from "../../api/tauri";
import { fetchThumbnail } from "../../utils/thumbnailCache";
import type { ImageFile } from "../../types";

export interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imagePath: string) => void;
  folderPath: string;
  recursive?: boolean;
}

// グリッド列数
const COLS = 4;
// セル高さ（サムネイル + ファイル名）
const CELL_HEIGHT = 152;
// サムネイルサイズ
const THUMBNAIL_SIZE = 120;

/**
 * 逐次サムネイルローダーフック
 * visiblePaths を 1 件ずつ順番にロードし、各完了後にイベントループへ制御を返す。
 * resetKey が変わるとキャッシュをクリアして最初からやり直す。
 */
function useSequentialLoader(
  visiblePaths: string[],
  size: number,
  resetKey: string
): Record<string, string | null | undefined> {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const loadingRef = useRef(false);
  const processedRef = useRef<Set<string>>(new Set());
  const visibleRef = useRef<string[]>(visiblePaths);

  // 最新の可視パスを非同期処理から参照できるよう毎レンダーで同期
  visibleRef.current = visiblePaths;

  // resetKey 変更時（フォルダ変更・モーダル再オープン）に状態リセット
  // loadingRef もリセットすることで、前セッションのfetch待ち中でも新セッションが即開始できる
  useEffect(() => {
    loadingRef.current = false;
    processedRef.current = new Set();
    setUrls({});
  }, [resetKey]);

  useEffect(() => {
    const processNext = async () => {
      // 多重起動防止
      if (loadingRef.current) return;

      // 可視リストから未処理のパスを1件取得
      const path = visibleRef.current.find(
        (p) => !processedRef.current.has(p)
      );
      if (!path) return;

      loadingRef.current = true;
      processedRef.current.add(path);

      try {
        const url = await fetchThumbnail(path, size);
        setUrls((prev) => ({ ...prev, [path]: url }));
      } catch {
        setUrls((prev) => ({ ...prev, [path]: null }));
      }

      // ブラウザのアイドル時間に次を処理（スクロール中は自動的に停止）
      // timeout: スクロールし続けても最大 200ms 以内には実行する（thumbnails の表示遅延上限）
      // NOTE: idle 待機の前に false にすると setUrls() による再レンダーで useEffect が再発火し
      //       loadingRef.current === false のまま次の processNext() が起動してしまうため、
      //       必ず待機完了後に false にすること。
      await new Promise<void>((r) => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => r(), { timeout: 200 });
        } else {
          setTimeout(r, 16);
        }
      });
      loadingRef.current = false;
      processNext();
    };

    processNext();
  }, [visiblePaths, resetKey, size]);

  return urls;
}

// 各サムネイルセルコンポーネント
interface ThumbnailCellProps {
  image: ImageFile;
  isSelected: boolean;
  onSelect: (path: string) => void;
  url: string | null | undefined;
}

const ThumbnailCell = memo(({ image, isSelected, onSelect, url }: ThumbnailCellProps) => {
  // undefined = 未ロード、null = エラー、string = DataURL
  const loading = url === undefined;

  return (
    <div
      onClick={() => onSelect(image.path)}
      className={`relative cursor-pointer rounded border-2 overflow-hidden flex flex-col items-center p-1 transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
          : "border-transparent hover:border-gray-300 dark:hover:border-gray-500"
      }`}
    >
      {/* サムネイル部分 */}
      <div
        className="w-full bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ height: THUMBNAIL_SIZE }}
      >
        {loading ? (
          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 w-full h-full" />
        ) : url ? (
          <img
            src={url}
            alt={image.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon size={32} className="text-gray-300 dark:text-gray-600" />
        )}
      </div>

      {/* ファイル名 */}
      <p className="w-full mt-1 text-xs text-gray-600 dark:text-gray-400 truncate text-center px-1">
        {image.filename}
      </p>

      {/* 選択チェックアイコン */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5">
          <Check size={12} className="text-white" />
        </div>
      )}
    </div>
  );
});

export const ImagePickerModal = ({
  isOpen,
  onClose,
  onSelect,
  folderPath,
  recursive = false,
}: ImagePickerModalProps) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 行数計算
  const rowCount = Math.ceil(images.length / COLS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => CELL_HEIGHT,
    overscan: 1,
  });

  // 現在ビューポートに表示中のパス一覧
  const visiblePaths = virtualizer.getVirtualItems().flatMap((virtualRow) => {
    const startIdx = virtualRow.index * COLS;
    return images.slice(startIdx, startIdx + COLS).map((img) => img.path);
  });

  // フォルダ変更・モーダル再オープン時にリセットするキー
  const resetKey = `${isOpen}:${folderPath}`;

  // 逐次ローダー：1件ずつ順番にサムネイルを取得
  const thumbnailUrls = useSequentialLoader(visiblePaths, THUMBNAIL_SIZE, resetKey);

  // モーダルが開いたら画像一覧を取得
  useEffect(() => {
    if (!isOpen || !folderPath) return;

    setImages([]);
    setSelectedPath(null);
    setError(null);
    setLoading(true);

    getImagesInFolder(folderPath, recursive)
      .then((imgs) => {
        setImages(imgs);
      })
      .catch((e) => {
        console.error("画像一覧取得エラー:", e);
        setError(`画像の読み込みに失敗しました: ${e}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, folderPath, recursive]);

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="画像を選択"
      width="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedPath}
          >
            選択
          </Button>
        </>
      }
    >
      {/* スクロールエリア（高さ固定） */}
      <div className="h-96">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spinner size="lg" text="画像を読み込み中..." />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : images.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              このフォルダには画像がありません
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="h-full overflow-y-auto">
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * COLS;
                const rowImages = images.slice(startIdx, startIdx + COLS);
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: virtualRow.start,
                      left: 0,
                      right: 0,
                      height: virtualRow.size,
                    }}
                    className="grid grid-cols-4 gap-2 px-1"
                  >
                    {rowImages.map((image) => (
                      <ThumbnailCell
                        key={image.path}
                        image={image}
                        isSelected={selectedPath === image.path}
                        onSelect={setSelectedPath}
                        url={thumbnailUrls[image.path]}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 画像数表示 */}
      {!loading && !error && images.length > 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
          {images.length} 枚の画像
        </p>
      )}
    </Modal>
  );
};
