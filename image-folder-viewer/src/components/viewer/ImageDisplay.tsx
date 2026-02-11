// 画像表示コンポーネント

import { useState, useCallback, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Spinner } from "../common/Spinner";

interface ImageDisplayProps {
  imagePath: string;
  hFlipEnabled: boolean;
  zoomLevel: number;
  onClick: () => void;
  onImageLoad?: (fitWidth: number, fitHeight: number) => void;
}

export function ImageDisplay({
  imagePath,
  hFlipEnabled,
  zoomLevel,
  onClick,
  onImageLoad,
}: ImageDisplayProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [fitSize, setFitSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 画像読み込み完了
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);

    // フィットサイズを記録（object-containで表示された実際のサイズ）
    const img = imgRef.current;
    if (img) {
      const fw = img.clientWidth;
      const fh = img.clientHeight;
      setFitSize({ w: fw, h: fh });
      onImageLoad?.(fw, fh);
    }
  }, [onImageLoad]);

  // 画像読み込みエラー
  const handleError = useCallback(() => {
    setIsLoaded(false);
    setHasError(true);
  }, []);

  // ローカルファイルパスをWebView表示用URLに変換
  const imageUrl = convertFileSrc(imagePath);

  const isZoomed = zoomLevel > 1.0;

  // ズーム時の表示サイズ
  const zoomedStyle: React.CSSProperties | undefined =
    isZoomed && fitSize
      ? {
          width: fitSize.w * zoomLevel,
          height: fitSize.h * zoomLevel,
          maxWidth: "none",
          maxHeight: "none",
          objectFit: undefined,
          transform: hFlipEnabled ? "scaleX(-1)" : undefined,
        }
      : {
          transform: hFlipEnabled ? "scaleX(-1)" : undefined,
        };

  return (
    <div
      className={
        isZoomed
          ? "absolute inset-0 overflow-auto cursor-pointer"
          : "flex-1 flex items-center justify-center cursor-pointer overflow-hidden"
      }
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
          className={
            isZoomed
              ? "select-none"
              : "max-w-full max-h-full object-contain select-none"
          }
          style={zoomedStyle}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
        />
      )}
    </div>
  );
}
