"use client";

function Block({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse rounded-2xl ${className}`}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-iron)", ...style }} />
  );
}

export default function FinanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Block key={i} style={{ height: 120 }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Block className="lg:col-span-2" style={{ height: 300 }} />
        <Block style={{ height: 300 }} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Block key={i} style={{ height: 140 }} />)}
      </div>
    </div>
  );
}
