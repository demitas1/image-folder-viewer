// トースト通知コンポーネント

import { useEffect } from "react";
import { X } from "lucide-react";
import { useToastStore, type Toast } from "../../store/toastStore";

const TOAST_DURATION_MS = 3000;

const typeStyles: Record<Toast["type"], string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-700 text-white",
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg max-w-sm pointer-events-auto ${typeStyles[toast.type]}`}
    >
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-75 hover:opacity-100 transition-opacity"
        aria-label="閉じる"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function Toast() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
