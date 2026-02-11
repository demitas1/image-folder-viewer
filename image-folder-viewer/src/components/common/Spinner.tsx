// 共通スピナーコンポーネント

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export function Spinner({ size = "md", text, className = "" }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`inline-block animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size]}`}
      />
      {text && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          {text}
        </p>
      )}
    </div>
  );
}
