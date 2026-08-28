"use client";

import type { Student, Payment } from "@/lib/types";

/**
 * Bekleyen Tahsilatlar — sade liste, gerçekleşen gelirden TAMAMEN ayrı.
 * "Tahsilat Uyarıları" ile aynı veri, tek listede birleştirildi (kart
 * kalabalığı yaratmamak için) — gecikmiş olanlar ⚠️ ile öne çıkar.
 *
 * Kaynak KASITLI olarak `students.amountDue` (her ödeme akışının — addPayment/
 * updatePayment/öğrenci profili düzenleme — tutarlı şekilde güncellediği
 * bakiye alanı), `payments` tablosundaki tek tek "beklemede" satırları DEĞİL.
 * Sebep: bir öğrencinin borcu farklı bir akıştan (örn. öğrenci profilinden
 * "Ödenen" alanını yükselterek) kapatıldığında, o borcu oluşturan orijinal
 * "beklemede" payment satırı silinmez/güncellenmez — payments tablosundan
 * okumak eski/kapanmış borçları hayalet olarak göstermeye devam eder.
 * `amountDue` ise her akışta doğru tutulduğu için tek güvenilir kaynak.
 *
 * Desktop: Öğrenci | Tutar | Tahsil Et — tek satır.
 * Mobil: kart görünümü — isim üstte, tutar + Tahsil Et altta.
 */
export default function PendingCollections({
  students, payments, onCollect,
}: {
  students: Student[];
  payments: Payment[];
  onCollect: (studentId: string, studentName: string, amountDue: number) => void;
}) {
  const overdueStudentIds = new Set(payments.filter(p => p.status === "gecikti").map(p => p.studentId));

  const pending = students
    .filter(s => s.isActive && s.amountDue > 0)
    .map(s => ({ id: s.id, name: s.fullName, amount: s.amountDue, overdue: overdueStudentIds.has(s.id) }))
    .sort((a, b) => (a.overdue === b.overdue ? b.amount - a.amount : a.overdue ? -1 : 1));
  const total = pending.reduce((s, p) => s + p.amount, 0);

  if (pending.length === 0) {
    return (
      <div className="glass rounded-2xl border border-white/8 p-5 text-center">
        <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>Bekleyen tahsilat yok</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-[11px] uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>
          Bekleyen Tahsilatlar
        </span>
        <span className="text-xs font-semibold text-white/60 tabular-nums" style={{ fontFamily: "var(--font-label)" }}>
          ₺{total.toLocaleString("tr-TR")}
        </span>
      </div>
      <div className="divide-y divide-white/6">
        {pending.map(p => (
          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {p.overdue && <span className="text-sm flex-shrink-0" aria-hidden="true">⚠️</span>}
              <div className="min-w-0">
                <div className="text-sm text-white/85 truncate" style={{ fontFamily: "var(--font-label)" }}>{p.name}</div>
                <div className="text-[11px] text-white/35 sm:hidden" style={{ fontFamily: "var(--font-label)" }}>Bekleyen ödeme</div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
              <span className="text-base sm:text-sm font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-display)", color: p.overdue ? "var(--color-error)" : "rgba(255,255,255,0.7)" }}>
                ₺{p.amount.toLocaleString("tr-TR")}
              </span>
              <button onClick={() => onCollect(p.id, p.name, p.amount)}
                className="px-3.5 rounded-lg text-xs font-semibold uppercase transition-transform hover:scale-[1.03] active:scale-95 flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--color-success)", fontFamily: "var(--font-label)", minHeight: 44 }}>
                Tahsil Et
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
