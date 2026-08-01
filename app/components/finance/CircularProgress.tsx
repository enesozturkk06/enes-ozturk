"use client";
import type { ReactNode } from "react";

interface Props {
  percent: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: ReactNode;
}

export default function CircularProgress({ percent, size = 96, strokeWidth = 8, color = "#8B5CF6", children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percent)) / 100;
  const dash = circumference * pct;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - dash} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease", filter: `drop-shadow(0 0 6px ${color}60)` }} />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          {children}
        </div>
      )}
    </div>
  );
}
