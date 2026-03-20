// カスタム画像ピッカーモーダル（仮想スクロール対応、フォルダナビゲーション付き）

import { useState, useEffect, useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, ImageIcon, Folder, FolderUp } from "lucide-react";
import { Modal, Button } from "./Modal";
import { Spinner } from "./Spinner";
import { getImagesInFolder, getSubfolders } from "../../api/tauri";
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

/**
 * 親フォルダパスを計算する（ルートフォルダの場合は null を返す）
 */
function getParentFolder(folderPath: string): string | null {
  const normalized = folderPath.replace(/[/\\]+$/, "");
  const lastSep = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (lastSep < 0) return null;
  if (lastSep === 0) return "/";
  const parent = normalized.slice(0, lastSep);
  // Windows のドライブルート（例: "C:"）の場合は "C:\" に補正
  if (/^[A-Za-z]:$/.test(parent)) return parent + "\\";
  return parent;
}

/** パスの末尾コンポーネント（ファイル名 or フォルダ名）を返す */
function getBaseName(p: string): string {
  const normalized = p.replace(/[/\\]+$/, "");
  const lastSep = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return lastSep >= 0 ? normalized.slice(lastSep + 1) : normalized;
}

/** グリッドに並べる統合アイテム型 */
type GridItem =
  | { kind: "parent"; path: string; name: string }
  | { kind: "folder"; path: string; name: string }
  | { kind: "image"; image: ImageFile };

// フォルダセルコンポーネント（親フォルダ・サブフォルダ共用）
const FolderCell = memo(
  ({
    item,
    onClick,
  }: {
    item: Extract<GridItem, { kind: "parent" | "folder" }>;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className="cursor-pointer rounded border-2 border-transparent overflow-hidden
                 flex flex-col items-center p-1 transition-colors
                 hover:border-gray-300 dark:hover:border-gray-500"
    >
      <div
        className="w-full bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0"
        style={{ height: THUMBNAIL_SIZE }}
      >
        {item.kind === "parent" ? (
          <FolderUp size={64} className="text-yellow-400" />
        ) : (
          <Folder size={64} className="text-yellow-500" />
        )}
      </div>
      <p className="w-full mt-1 text-xs text-gray-600 dark:text-gray-400 truncate text-center px-1">
        {item.kind === "parent" ? `↑ ${item.name}` : item.name}
      </p>
    </div>
  )
);

export const ImagePickerModal = ({
  isOpen,
  onClose,
  onSelect,
  folderPath,
  recursive = false,
}: ImagePickerModalProps) => {
  // モーダル内で変更可能な現在フォルダ
  const [currentFolder, setCurrentFolder] = useState(folderPath);
  const [subfolders, setSubfolders] = useState<string[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // folderPath（prop）が変わったら currentFolder をリセット
  useEffect(() => {
    setCurrentFolder(folderPath);
  }, [folderPath]);

  // 親フォルダ
  const parentFolder = getParentFolder(currentFolder);

  // 統合アイテムリスト（親フォルダ → サブフォルダ → 画像）
  const sep = currentFolder.includes("\\") ? "\\" : "/";
  const items: GridItem[] = [
    ...(parentFolder
      ? [{ kind: "parent" as const, path: parentFolder, name: getBaseName(parentFolder) }]
      : []),
    ...subfolders.map((name) => ({
      kind: "folder" as const,
      path: currentFolder + sep + name,
      name,
    })),
    ...images.map((image) => ({ kind: "image" as const, image })),
  ];

  // 行数計算
  const rowCount = Math.ceil(items.length / COLS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => CELL_HEIGHT,
    overscan: 1,
  });

  // 現在ビューポートに表示中の画像パス一覧（クローズ時は空にしてロードを停止）
  const visiblePaths = isOpen
    ? virtualizer.getVirtualItems().flatMap((vRow) => {
        const startIdx = vRow.index * COLS;
        return items
          .slice(startIdx, startIdx + COLS)
          .filter(
            (it): it is Extract<GridItem, { kind: "image" }> => it.kind === "image"
          )
          .map((it) => it.image.path);
      })
    : [];

  // フォルダ変更・モーダル再オープン時にリセットするキー
  const resetKey = `${isOpen}:${currentFolder}`;

  // 逐次ローダー：1件ずつ順番にサムネイルを取得
  const thumbnailUrls = useSequentialLoader(visiblePaths, THUMBNAIL_SIZE, resetKey);

  // モーダルが開いたら、または currentFolder が変わったら画像一覧とサブフォルダを取得
  useEffect(() => {
    if (!isOpen || !currentFolder) return;

    setImages([]);
    setSubfolders([]);
    setSelectedPath(null);
    setError(null);
    setLoading(true);

    Promise.all([
      getImagesInFolder(currentFolder, recursive),
      getSubfolders(currentFolder),
    ])
      .then(([imgs, dirs]) => {
        setImages(imgs);
        setSubfolders(dirs);
      })
      .catch((e) => {
        console.error("フォルダ読み込みエラー:", e);
        setError(`読み込みに失敗しました: ${e}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, currentFolder, recursive]);

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
            <Spinner size="lg" text="読み込み中..." />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto" ref={scrollContainerRef}>
            {/* 空フォルダ表示（フォルダも画像もない場合のみ） */}
            {items.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  このフォルダには画像がありません
                </p>
              </div>
            )}

            {/* 統合グリッド（フォルダタイル＋画像サムネイル） */}
            {items.length > 0 && (
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((vRow) => {
                  const startIdx = vRow.index * COLS;
                  const rowItems = items.slice(startIdx, startIdx + COLS);
                  return (
                    <div
                      key={vRow.key}
                      style={{
                        position: "absolute",
                        top: vRow.start,
                        left: 0,
                        right: 0,
                        height: vRow.size,
                      }}
                      className="grid grid-cols-4 gap-2 px-1"
                    >
                      {rowItems.map((item) =>
                        item.kind === "image" ? (
                          <ThumbnailCell
                            key={item.image.path}
                            image={item.image}
                            isSelected={selectedPath === item.image.path}
                            onSelect={setSelectedPath}
                            url={thumbnailUrls[item.image.path]}
                          />
                        ) : (
                          <FolderCell
                            key={item.path}
                            item={item}
                            onClick={() => setCurrentFolder(item.path)}
                          />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
