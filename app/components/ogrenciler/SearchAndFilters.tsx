"use client";
import { Search, X } from "lucide-react";

const FILTERS: [string, string][] = [
  ["all", "Hepsi"], ["active", "Aktif"], ["inactive", "Pasif"],
  ["payment", "Borçlu"], ["expired", "Süresi Dolan"], ["low", "Dersi Az Kalan"],
];

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
}

export default function SearchAndFilters({ search, onSearchChange, filter, onFilterChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="glass relative flex-1 rounded-xl overflow-hidden transition-shadow focus-within:shadow-[0_0_0_2px_rgba(139,92,246,0.4)]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
        <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Ad, kod veya telefon ara..."
          className="w-full bg-transparent text-white placeholder-white/25 pl-10 pr-9 py-3 text-sm outline-none"
          style={{ fontFamily: "var(--font-label)" }} />
        {search && (
          <button onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            aria-label="Temizle">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => onFilterChange(v)}
            className={`px-3.5 py-2.5 text-xs tracking-wider rounded-xl transition-all whitespace-nowrap ${
              filter === v ? "gradient-animated gradient-violet-blue text-white" : "glass text-white/40 hover:text-white/70"
            }`}
            style={{ fontFamily: "var(--font-label)" }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
