"use client";
import { useEffect, useState } from "react";

interface CircularXPProps {
  xp: number;
  maxXP?: number;
  color?: string;
  gradFrom?: string;
  gradTo?: string;
  size?: number;
}

export default function CircularXP({
  xp,
  maxXP = 10000,
  color = "#8B5CF6",
  gradFrom = "#8B5CF6",
  gradTo = "#D946EF",
  size = 140,
}: CircularXPProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  const strokeWidth = 9;
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, xp / maxXP);
  const offset = circumference - pct * circumference;

  const THRESHOLDS = [5000, 10000];
  const uid = `cxp-${size}-${Math.round(maxXP / 1000)}`;

  function markerCoords(threshold: number) {
    const tPct = Math.min(1, threshold / maxXP);
    const angle = tPct * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      reached: xp >= threshold,
    };
  }

  const fmtXP = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
    return String(v);
  };

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
      >
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradFrom} />
            <stop offset="100%" stopColor={gradTo} />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={ready ? offset : circumference}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: `${cx}px ${cy}px`,
            transition: "stroke-dashoffset 1.3s cubic-bezier(0.25,0.46,0.45,0.94)",
            filter: `drop-shadow(0 0 5px ${gradTo}99)`,
          }}
        />

        {/* Threshold markers */}
        {THRESHOLDS.map(thr => {
          const { x, y, reached } = markerCoords(thr);
          if (thr > maxXP) return null;
          return (
            <circle
              key={thr}
              cx={x} cy={y} r={4.5}
              fill={reached ? "#FBBF24" : "rgba(255,255,255,0.18)"}
              stroke={reached ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}
              strokeWidth={1.5}
              style={{
                filter: reached
                  ? "drop-shadow(0 0 5px rgba(251,191,36,0.7))"
                  : "none",
              }}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <div className="flex flex-col items-center justify-center text-center select-none">
        <span
          className="font-black tabular-nums leading-none"
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: size * 0.18,
            background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {Math.round(pct * 100)}%
        </span>
        <span
          className="tabular-nums leading-none mt-0.5"
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontSize: size * 0.1,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {xp.toLocaleString()} XP
        </span>
        <span
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontSize: size * 0.075,
            color: "rgba(255,255,255,0.25)",
          }}
        >
          / {fmtXP(maxXP)}
        </span>
      </div>
    </div>
  );
}
