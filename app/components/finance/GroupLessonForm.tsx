"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { Gym, GroupLesson, GroupShareType } from "@/lib/types";

export interface GroupLessonFormData {
  name: string; gymId?: string; trainerName?: string; feePerStudent: number;
  shareType: GroupShareType; gymPercentage?: number; fixedFeePerLesson?: number;
  fixedMonthlyRent?: number; maxCapacity?: number;
  startDate: string; endDate?: string; description?: string; isActive: boolean;
}

const EMPTY: GroupLessonFormData = {
  name: "", gymId: "", trainerName: "", feePerStudent: 0,
  shareType: "percentage", gymPercentage: 50, fixedFeePerLesson: 0, fixedMonthlyRent: 0,
  maxCapacity: undefined, startDate: format(new Date(), "yyyy-MM-dd"), endDate: "", description: "", isActive: true,
};

export default function GroupLessonForm({
  open, onClose, gyms, editing, onSave,
}: {
  open: boolean; onClose: () => void; gyms: Gym[];
  editing?: GroupLesson | null;
  onSave: (data: GroupLessonFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<GroupLessonFormData>(EMPTY);
  const [saving, setSaving] = useState(false);

  // Modal her açılışta formu editing'e göre sıfırlar. Bu component AnimatePresence
  // içinde görsel olarak gizlenip gösterildiği için hiç unmount olmuyor — bu yüzden
  // useEffect yerine React'in "prop değişince state'i render sırasında ayarla"
  // deseni kullanılıyor (bkz. react.dev/learn/you-might-not-need-an-effect).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setForm(editing ? {
      name: editing.name, gymId: editing.gymId ?? "", trainerName: editing.trainerName ?? "",
      feePerStudent: editing.feePerStudent, shareType: editing.shareType,
      gymPercentage: editing.gymPercentage ?? 50, fixedFeePerLesson: editing.fixedFeePerLesson ?? 0,
      fixedMonthlyRent: editing.fixedMonthlyRent ?? 0, maxCapacity: editing.maxCapacity,
      startDate: editing.startDate, endDate: editing.endDate ?? "",
      description: editing.description ?? "", isActive: editing.isActive,
    } : EMPTY);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const set = <K extends keyof GroupLessonFormData>(key: K, value: GroupLessonFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || form.feePerStudent <= 0) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => !saving && onClose()}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
          <motion.div initial={{ scale: 0.94, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full max-w-md sm:max-w-lg mx-auto rounded-2xl overflow-hidden max-h-[85dvh] flex flex-col"
            style={{ borderColor: "rgba(74,222,128,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-green-teal" />

            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2.5 sm:pb-3 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                {editing ? "GRUBU DÜZENLE" : "YENİ GRUP DERSİ"}
              </h3>
              <button onClick={onClose} className="text-white/25 hover:text-white flex-shrink-0"><X size={18} /></button>
            </div>

            <div className="px-4 sm:px-5 pb-4 overflow-y-auto overflow-x-hidden space-y-2.5 sm:space-y-3" style={{ flex: "1 1 auto", minHeight: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Grup Adı *</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Salon</label>
                  <select value={form.gymId} onChange={e => set("gymId", e.target.value)}
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="" className="bg-carbon">Salon seç (ops.)</option>
                    {gyms.filter(g => g.isActive).map(g => <option key={g.id} value={g.id} className="bg-carbon">{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Eğitmen</label>
                  <input value={form.trainerName} onChange={e => set("trainerName", e.target.value)}
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Aidat — Kişi Başı (₺) *</label>
                  <input type="number" min="0" value={form.feePerStudent || ""} onChange={e => set("feePerStudent", Number(e.target.value))}
                    className="glass w-full px-3 py-2 sm:py-2.5 text-base sm:text-lg outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-success)", borderColor: "rgba(34,197,94,0.35)" }} />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Paylaşım Modeli</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  {([
                    { v: "percentage", l: "Yüzdelik" },
                    { v: "fixed_per_lesson", l: "Ders Başı Sabit" },
                    { v: "fixed_monthly_rent", l: "Aylık Sabit Kira" },
                  ] as const).map(opt => (
                    <button key={opt.v} onClick={() => set("shareType", opt.v)}
                      className="py-2.5 sm:py-2 text-[11px] font-semibold rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
                      style={{
                        background: form.shareType === opt.v ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.shareType === opt.v ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.shareType === opt.v ? "var(--color-success)" : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-label)",
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>

                {form.shareType === "percentage" && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <input type="range" min={0} max={100} step={5} value={form.gymPercentage ?? 50}
                      onChange={e => set("gymPercentage", Number(e.target.value))} className="w-full sm:flex-1" />
                    <span className="text-sm font-bold text-white w-full sm:w-32 text-center sm:text-right flex-shrink-0" style={{ fontFamily: "var(--font-display)" }}>
                      Salon %{form.gymPercentage ?? 50} / Ben %{100 - (form.gymPercentage ?? 50)}
                    </span>
                  </div>
                )}
                {form.shareType === "fixed_per_lesson" && (
                  <input type="number" min="0" value={form.fixedFeePerLesson || ""} onChange={e => set("fixedFeePerLesson", Number(e.target.value))}
                    placeholder="Ders başı salona ödenecek tutar (₺)"
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                )}
                {form.shareType === "fixed_monthly_rent" && (
                  <input type="number" min="0" value={form.fixedMonthlyRent || ""} onChange={e => set("fixedMonthlyRent", Number(e.target.value))}
                    placeholder="Aylık sabit salon kirası (₺)"
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Kapasite (ops.)</label>
                  <input type="number" min="0" value={form.maxCapacity ?? ""} onChange={e => set("maxCapacity", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Doluluk için"
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Başlangıç *</label>
                  <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg" />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Bitiş (ops.)</label>
                  <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                    className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg" />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Açıklama</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
                  className="glass w-full text-white px-3 py-2 sm:py-2.5 text-sm outline-none rounded-lg resize-none"
                  style={{ fontFamily: "var(--font-label)" }} />
              </div>
            </div>

            <div className="flex gap-3 px-4 sm:px-5 pt-4 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
              <button onClick={onClose} className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-all"
                style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || form.feePerStudent <= 0}
                className="gradient-animated gradient-slow gradient-green-teal flex-1 disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
                style={{ fontFamily: "var(--font-label)" }}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
