"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, X, Trash2, Presentation, Wrench, Handshake, ShoppingBag, Video, PartyPopper, MoreHorizontal,
  Dumbbell, Users, Building2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { OtherIncome, OtherIncomeType } from "@/lib/types";

const TYPE_CFG: Record<OtherIncomeType, { label: string; icon: React.ReactNode }> = {
  ozel_ders:     { label: "Özel Ders",   icon: <Dumbbell size={14} /> },
  grup_ders:     { label: "Grup Ders",   icon: <Users size={14} /> },
  urun_satisi:   { label: "Ürün Satışı", icon: <ShoppingBag size={14} /> },
  sponsorluk:    { label: "Sponsorluk",  icon: <Handshake size={14} /> },
  salon_geliri:  { label: "Salon Geliri", icon: <Building2 size={14} /> },
  diger:         { label: "Diğer",       icon: <MoreHorizontal size={14} /> },
  seminer:       { label: "Seminer",     icon: <Presentation size={14} /> },
  workshop:      { label: "Workshop",    icon: <Wrench size={14} /> },
  online_ders:   { label: "Online Ders", icon: <Video size={14} /> },
  ozel_etkinlik: { label: "Özel Etkinlik", icon: <PartyPopper size={14} /> },
};

export default function OtherIncomeModule({
  entries, onAdd, onDelete,
}: {
  entries: OtherIncome[];
  onAdd: (data: { incomeType: OtherIncomeType; description?: string; amount: number; incomeDate: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [incomeType, setIncomeType] = useState<OtherIncomeType>("seminer");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const handleAdd = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    await onAdd({ incomeType, description: description.trim() || undefined, amount: n, incomeDate });
    setDescription(""); setAmount("");
    setSaving(false); setFormOpen(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-1 pb-2">
        <Briefcase size={13} style={{ color: "#FB923C" }} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-display)" }}>
          Diğer Gelirler
        </span>
        <span className="text-[10px] font-bold" style={{ color: "#FB923C", fontFamily: "var(--font-label)" }}>
          ₺{total.toLocaleString("tr-TR")}
        </span>
        <div className="h-px flex-1 bg-white/5" />
        <button onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)", color: "#FB923C", fontFamily: "var(--font-label)" }}>
          {formOpen ? <X size={13} /> : <Plus size={13} />} Gelir Ekle
        </button>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div initial={{ opacity: 0, y: -8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0 }}
            className="glass rounded-xl p-4 mb-3" style={{ borderColor: "rgba(251,146,60,0.25)" }}>
            <div className="grid sm:grid-cols-4 gap-2 mb-3">
              <select value={incomeType} onChange={e => setIncomeType(e.target.value as OtherIncomeType)}
                className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg">
                {(Object.keys(TYPE_CFG) as OtherIncomeType[]).map(t => (
                  <option key={t} value={t} className="bg-carbon">{TYPE_CFG[t].label}</option>
                ))}
              </select>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Açıklama"
                className="glass sm:col-span-2 text-white px-2 py-2 text-xs outline-none rounded-lg" />
              <input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)}
                className="glass text-white px-2 py-2 text-xs outline-none rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Tutar (₺)"
                className="glass flex-1 px-3 py-2 text-sm outline-none rounded-lg"
                style={{ fontFamily: "var(--font-display)", color: "#FB923C" }} />
              <button onClick={handleAdd} disabled={saving || !amount}
                className="px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 transition-transform hover:scale-[1.03] active:scale-95"
                style={{ background: "#FB923C", color: "#1a1005", fontFamily: "var(--font-label)" }}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {entries.length === 0 ? (
        <div className="glass text-center py-8 rounded-xl">
          <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>Henüz kayıt yok</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.slice(0, 15).map(e => (
            <div key={e.id} className="glass flex items-center gap-3 py-2.5 px-3 rounded-lg">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,146,60,0.15)", color: "#FB923C" }}>
                {TYPE_CFG[e.incomeType].icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>{TYPE_CFG[e.incomeType].label}</span>
                  <span className="text-[10px] text-white/25">{format(parseISO(e.incomeDate), "dd MMM yyyy", { locale: tr })}</span>
                </div>
                {e.description && <p className="text-[11px] text-white/35 truncate">{e.description}</p>}
              </div>
              <span className="text-sm font-bold text-orange-300 tabular-nums flex-shrink-0" style={{ fontFamily: "var(--font-display)" }}>
                ₺{e.amount.toLocaleString("tr-TR")}
              </span>
              <button onClick={() => onDelete(e.id)} className="text-white/20 transition-colors flex-shrink-0"
                onMouseEnter={ev => (ev.currentTarget.style.color = "var(--color-error)")}
                onMouseLeave={ev => (ev.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
