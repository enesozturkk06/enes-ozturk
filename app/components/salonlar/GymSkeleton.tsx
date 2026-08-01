"use client";

function Block({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`glass animate-pulse rounded-2xl ${className}`} style={style} />;
}

export default function GymSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <Block key={i} style={{ height: 240 }} />)}
    </div>
  );
}
