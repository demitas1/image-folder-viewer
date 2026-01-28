// 汎用コンテキストメニューコンポーネント

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  shortcut?: string;
  separator?: boolean; // trueの場合、この項目の前にセパレーターを表示
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー位置を画面内に収める
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const adjustedX =
      x + rect.width > window.innerWidth
        ? window.innerWidth - rect.width - 4
        : x;
    const adjustedY =
      y + rect.height > window.innerHeight
        ? window.innerHeight - rect.height - 4
        : y;

    menu.style.left = `${Math.max(4, adjustedX)}px`;
    menu.style.top = `${Math.max(4, adjustedY)}px`;
  }, [x, y]);

  // ESCキーで閉じる
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
    // キャプチャフェーズでEscapeを処理（ViewerPageのhandlerより先に処理する）
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  // メニュー外クリックで閉じる
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // メニュー項目クリック
  const handleItemClick = (item: ContextMenuItem) => {
    item.onClick();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={handleOverlayClick}>
      <div
        ref={menuRef}
        className="absolute bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[180px]"
        style={{ left: x, top: y }}
      >
        {items.map((item, index) => (
          <div key={index}>
            {item.separator && (
              <div className="border-t border-gray-600 my-1" />
            )}
            <button
              className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 flex justify-between items-center"
              onClick={() => handleItemClick(item)}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="text-gray-500 text-xs ml-4">
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
