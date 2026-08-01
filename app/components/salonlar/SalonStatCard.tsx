"use client";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}

export default function SalonStatCard({ label, value, prefix = "", suffix = "", sub, icon, color = "#A78BFA" }: Props) {
  const [hover, setHover] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
    >
      <div className="glass relative rounded-2xl p-4 sm:p-5 h-full"
        style={{ boxShadow: hover ? `0 0 28px ${color}40` : "none", transition: "box-shadow 0.25s" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase leading-tight"
            style={{ fontFamily: "var(--font-label)" }}>
            {label}
          </span>
          <div style={{ color }} className="flex-shrink-0">{icon}</div>
        </div>
        <div className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-display)", color }}>
          {prefix}{display.toLocaleString("tr-TR")}{suffix}
        </div>
        {sub && (
          <div className="text-[10px] sm:text-xs text-white/28 mt-1 leading-tight" style={{ fontFamily: "var(--font-label)" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
