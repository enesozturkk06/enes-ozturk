"use client";

import type { NetSummary } from "@/lib/financeUnified";

/**
 * Kedi AI finans yorumu — kural tabanlı, YENİ bir LLM/API çağrısı YAPMAZ.
 * Sadece zaten hesaplanmış NetSummary'den kısa, insan diliyle 2-3 cümle
 * üretir. Desktop'ta grafiğin yanında, mobilde grafiğin altında ayrı bir
 * kart olarak gösterilir (asla üstüne binmez).
 */
export default function FinanceAiInsight({ summary, rangeLabel }: { summary: NetSummary; rangeLabel: string }) {
  const lines: string[] = [];

  if (summary.deltaPositive !== null) {
    lines.push(`${rangeLabel} net kazanç önceki döneme göre ${summary.deltaPositive ? "arttı" : "azaldı"}: ${summary.deltaLabel}.`);
  } else {
    lines.push(`${rangeLabel} için henüz karşılaştırılacak önceki dönem verisi yok.`);
  }

  if (summary.pending > 0) {
    lines.push(`Bekleyen tahsilatların toplamı ₺${summary.pending.toLocaleString("tr-TR")} — gerçek gelire dahil edilmedi.`);
  } else {
    lines.push("Şu an bekleyen tahsilat yok, tüm ödemeler güncel.");
  }

  if (summary.expense > 0 && summary.income > 0) {
    const ratio = Math.round((summary.expense / summary.income) * 100);
    lines.push(`Giderler bu dönem gelirin yaklaşık %${ratio}'i.`);
  }

  return (
    <div className="glass rounded-2xl border border-white/8 p-4 sm:p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base" aria-hidden="true">🐱</span>
        <span className="text-[11px] uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>Kedi AI</span>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-white/70 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>{line}</p>
        ))}
      </div>
    </div>
  );
}
