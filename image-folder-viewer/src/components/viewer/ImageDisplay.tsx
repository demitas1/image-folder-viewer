// 画像表示コンポーネント

import { useState, useCallback, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Spinner } from "../common/Spinner";

interface ImageDisplayProps {
  imagePath: string;
  hFlipEnabled: boolean;
  zoomLevel: number;
  originalImageSize: { w: number; h: number } | null;
  onClick: () => void;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
}

export function ImageDisplay({
  imagePath,
  hFlipEnabled,
  zoomLevel,
  originalImageSize,
  onClick,
  onImageLoad,
}: ImageDisplayProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 画像読み込み完了
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);

    // 元画像サイズを通知
    const img = imgRef.current;
    if (img) {
      onImageLoad?.(img.naturalWidth, img.naturalHeight);
    }
  }, [onImageLoad]);

  // 画像読み込みエラー
  const handleError = useCallback(() => {
    setIsLoaded(false);
    setHasError(true);
  }, []);

  // ローカルファイルパスをWebView表示用URLに変換
  const imageUrl = convertFileSrc(imagePath);

  // 表示サイズ: 元画像サイズ × ズーム率
  const displaySize = originalImageSize
    ? {
        w: Math.round(originalImageSize.w * zoomLevel),
        h: Math.round(originalImageSize.h * zoomLevel),
      }
    : null;

  // スタイル計算
  const imgStyle: React.CSSProperties = {
    ...(displaySize
      ? {
          width: displaySize.w,
          height: displaySize.h,
          maxWidth: "none",
          maxHeight: "none",
        }
      : {
          // originalImageSize 未取得時（初回 onLoad 前）は object-contain でフォールバック
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain" as const,
        }),
    transform: hFlipEnabled ? "scaleX(-1)" : undefined,
  };

  return (
    <div
      className="flex-1 flex items-center justify-center cursor-pointer overflow-auto"
      onClick={onClick}
    >
      {/* 読み込み中 */}
      {!isLoaded && !hasError && (
        <Spinner size="md" text="読み込み中..." className="absolute" />
      )}

      {/* エラー */}
      {hasError && (
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">画像を読み込めません</div>
          <div className="text-gray-500 text-xs break-all max-w-md">
            {imagePath}
          </div>
        </div>
      )}

      {/* 画像 */}
      {!hasError && (
        <img
          ref={imgRef}
          key={imagePath}
          src={imageUrl}
          alt=""
          className="select-none"
          style={imgStyle}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
        />
      )}
    </div>
  );
}
