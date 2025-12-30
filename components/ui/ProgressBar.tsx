interface ProgressBarProps {
  percentage: number;
  colorClass?: string;
}

export default function ProgressBar({ percentage, colorClass = 'bg-blue-600' }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}