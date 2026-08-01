"use client";

function Block({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`glass animate-pulse rounded-2xl ${className}`} style={style} />;
}

export default function PackageSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => <Block key={i} style={{ height: 260 }} />)}
    </div>
  );
}
