"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color?: "violet" | "red" | "gold" | "green";
  pulse?: boolean;
  href?: string;
  onClick?: () => void;
}

const COLOR_MAP: Record<NonNullable<Props["color"]>, { text: string; glow: string }> = {
  violet: { text: "#A78BFA", glow: "rgba(139,92,246,0.28)" },
  red:    { text: "#F87171", glow: "rgba(239,68,68,0.28)" },
  gold:   { text: "#FBBF24", glow: "rgba(245,158,11,0.28)" },
  green:  { text: "#4ADE80", glow: "rgba(34,197,94,0.28)" },
};

export default function AdminStatCard({ label, value, sub, icon, color = "violet", pulse, href, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const c = COLOR_MAP[color];
  const isClickable = !!(href || onClick);

  const inner = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <div className="glass relative rounded-2xl p-4 sm:p-5 h-full"
        style={{ boxShadow: hover ? `0 0 28px ${c.glow}` : "none", transition: "box-shadow 0.25s" }}>
        {pulse && (
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full animate-neon-pulse" style={{ background: c.text }} />
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase leading-tight"
            style={{ fontFamily: "var(--font-label)" }}>
            {label}
          </span>
          <div style={{ color: c.text }} className="flex-shrink-0">{icon}</div>
        </div>
        <div className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-display)", color: c.text }}>
          {value}
        </div>
        {sub && (
          <div className="text-[10px] sm:text-xs text-white/28 mt-1 leading-tight" style={{ fontFamily: "var(--font-label)" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block w-full">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}
