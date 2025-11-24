import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  status: "safe" | "warning" | "danger";
  label: string;
  unit?: string;
}

const CircularProgress = ({
  value,
  maxValue = 100,
  size = 200,
  strokeWidth = 16,
  status,
  label,
  unit = "%",
}: CircularProgressProps) => {
  const percentage = (value / maxValue) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const statusColors = {
    safe: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  const statusStroke = {
    safe: "stroke-success",
    warning: "stroke-warning",
    danger: "stroke-destructive",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(statusStroke[status], "transition-all duration-1000 ease-out drop-shadow-glow")}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold", statusColors[status])}>
          {value.toFixed(1)}
          <span className="text-2xl">{unit}</span>
        </span>
        <span className="text-sm text-muted-foreground mt-1 font-medium">
          {label}
        </span>
      </div>
    </div>
  );
};

export default CircularProgress;
