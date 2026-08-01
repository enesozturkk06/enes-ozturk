"use client";

interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  unlimited?: boolean;
}

export default function ProgressRing({ value, max, size = 56, strokeWidth = 5, color = "#8B5CF6", unlimited }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = unlimited ? 1 : max > 0 ? Math.min(1, value / max) : 0;
  const dash = circumference * pct;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - dash} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>
          {unlimited ? "∞" : value}
        </span>
      </div>
    </div>
  );
}
