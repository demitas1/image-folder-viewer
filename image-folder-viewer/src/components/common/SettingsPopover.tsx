// 設定ポップオーバー（テーマ・サムネイルアスペクト比切替）

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sun, Moon } from "lucide-react";
import type { ThumbnailAspectRatio } from "../../types";
import type { Theme } from "../../utils/theme";

interface SettingsPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  aspectRatio: ThumbnailAspectRatio;
  onThemeChange: (theme: Theme) => void;
  onAspectRatioChange: (ratio: ThumbnailAspectRatio) => void;
}

export function SettingsPopover({
  anchorRef,
  isOpen,
  onClose,
  theme,
  aspectRatio,
  onThemeChange,
  onAspectRatioChange,
}: SettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Escape で閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  // ポップオーバーの位置をアンカー直下に設定
  useEffect(() => {
    if (!isOpen || !anchorRef.current || !popoverRef.current) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    const popover = popoverRef.current;

    let left = anchor.right - popover.offsetWidth;
    let top = anchor.bottom + 4;

    // 画面端調整
    if (left < 4) left = 4;
    if (top + popover.offsetHeight > window.innerHeight - 4) {
      top = anchor.top - popover.offsetHeight - 4;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={popoverRef}
        className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-4 min-w-[200px]"
      >
        {/* テーマ */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">テーマ</p>
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => onThemeChange("light")}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                theme === "light"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600",
              ].join(" ")}
            >
              <Sun size={14} />
              ライト
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("dark")}
              className={[
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-300 dark:border-gray-600",
                theme === "dark"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600",
              ].join(" ")}
            >
              <Moon size={14} />
              ダーク
            </button>
          </div>
        </div>

        {/* サムネイルアスペクト比 */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">サムネイル比率</p>
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            {(["16:9", "4:3", "1:1"] as ThumbnailAspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onAspectRatioChange(ratio)}
                className={[
                  "flex-1 px-2 py-1.5 transition-colors",
                  ratio !== "16:9" ? "border-l border-gray-300 dark:border-gray-600" : "",
                  aspectRatio === ratio
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600",
                ].join(" ")}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
