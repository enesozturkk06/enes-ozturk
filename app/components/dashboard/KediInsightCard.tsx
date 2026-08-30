"use client";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";

const PURPLE = "#A78BFA";
const PURPLE_BORDER = "rgba(167,139,250,0.22)";
const PURPLE_BG = "rgba(167,139,250,0.07)";

/** Kompakt Kedi AI önerisi — kontrollü mor vurgu (design language: "Kedi AI
 * için controlled purple accent"). Tek en-öncelikli öneri gösterilir, tam
 * liste/sohbet /ogrenci/kedi-ai sayfasında. Yeni bir API/hesaplama YOK —
 * page.tsx'te zaten türetilmiş metinlerden ilki kullanılıyor. */
export default function KediInsightCard({ tip }: { tip: string }) {
  return (
    <Link href="/ogrenci/kedi-ai" className="block card-gold rounded-2xl p-4 sm:p-5 transition-colors"
      style={{ borderColor: PURPLE_BORDER }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}` }}>
          <Sparkles size={15} style={{ color: PURPLE }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: PURPLE, fontFamily: "var(--font-label)" }}>Kedi AI</p>
          <p className="text-sm text-white/80 truncate" style={{ fontFamily: "var(--font-label)" }}>{tip}</p>
        </div>
        <ChevronRight size={15} className="flex-shrink-0" style={{ color: PURPLE, opacity: 0.6 }} />
      </div>
    </Link>
  );
}
