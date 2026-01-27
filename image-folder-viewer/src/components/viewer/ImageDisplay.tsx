// 画像表示コンポーネント

import { useState, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ImageDisplayProps {
  imagePath: string;
  hFlipEnabled: boolean;
  onClick: () => void;
}

export function ImageDisplay({
  imagePath,
  hFlipEnabled,
  onClick,
}: ImageDisplayProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 画像読み込み完了
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  // 画像読み込みエラー
  const handleError = useCallback(() => {
    setIsLoaded(false);
    setHasError(true);
  }, []);

  // ローカルファイルパスをWebView表示用URLに変換
  const imageUrl = convertFileSrc(imagePath);

  return (
    <div
      className="flex-1 flex items-center justify-center cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* 読み込み中 */}
      {!isLoaded && !hasError && (
        <div className="absolute text-gray-500 text-sm">読み込み中...</div>
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
          key={imagePath}
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: hFlipEnabled ? "scaleX(-1)" : undefined,
          }}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
        />
      )}
    </div>
  );
}
