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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
            className="relative z-10 w-full max-w-lg rounded-2xl overflow-hidden max-h-[85dvh] flex flex-col"
            style={{ background: "rgba(15,15,22,0.99)", border: "1px solid rgba(74,222,128,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg,transparent,#4ADE80,transparent)" }} />

            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                {editing ? "GRUBU DÜZENLE" : "YENİ GRUP DERSİ"}
              </h3>
              <button onClick={onClose} className="text-white/25 hover:text-white"><X size={18} /></button>
            </div>

            <div className="px-5 pb-4 overflow-y-auto space-y-3" style={{ flex: "1 1 auto", minHeight: 0 }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Grup Adı *</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-green-500/50 text-white px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Salon</label>
                  <select value={form.gymId} onChange={e => set("gymId", e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="" className="bg-carbon">Salon seç (ops.)</option>
                    {gyms.filter(g => g.isActive).map(g => <option key={g.id} value={g.id} className="bg-carbon">{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Eğitmen</label>
                  <input value={form.trainerName} onChange={e => set("trainerName", e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Aidat — Kişi Başı (₺) *</label>
                  <input type="number" min="0" value={form.feePerStudent || ""} onChange={e => set("feePerStudent", Number(e.target.value))}
                    className="w-full bg-steel/60 border-2 border-green-500/30 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Paylaşım Modeli</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {([
                    { v: "percentage", l: "Yüzdelik" },
                    { v: "fixed_per_lesson", l: "Ders Başı Sabit" },
                    { v: "fixed_monthly_rent", l: "Aylık Sabit Kira" },
                  ] as const).map(opt => (
                    <button key={opt.v} onClick={() => set("shareType", opt.v)}
                      className="py-2 text-[11px] font-semibold rounded-lg transition-all"
                      style={{
                        background: form.shareType === opt.v ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.shareType === opt.v ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: form.shareType === opt.v ? "#4ADE80" : "rgba(255,255,255,0.4)",
                        fontFamily: "var(--font-barlow-condensed)",
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>

                {form.shareType === "percentage" && (
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} step={5} value={form.gymPercentage ?? 50}
                      onChange={e => set("gymPercentage", Number(e.target.value))} className="flex-1" />
                    <span className="text-sm font-bold text-white w-32 text-right" style={{ fontFamily: "var(--font-bebas)" }}>
                      Salon %{form.gymPercentage ?? 50} / Ben %{100 - (form.gymPercentage ?? 50)}
                    </span>
                  </div>
                )}
                {form.shareType === "fixed_per_lesson" && (
                  <input type="number" min="0" value={form.fixedFeePerLesson || ""} onChange={e => set("fixedFeePerLesson", Number(e.target.value))}
                    placeholder="Ders başı salona ödenecek tutar (₺)"
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }} />
                )}
                {form.shareType === "fixed_monthly_rent" && (
                  <input type="number" min="0" value={form.fixedMonthlyRent || ""} onChange={e => set("fixedMonthlyRent", Number(e.target.value))}
                    placeholder="Aylık sabit salon kirası (₺)"
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }} />
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kapasite (ops.)</label>
                  <input type="number" min="0" value={form.maxCapacity ?? ""} onChange={e => set("maxCapacity", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Doluluk için"
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Başlangıç *</label>
                  <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bitiş (ops.)</label>
                  <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Açıklama</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
                  className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none rounded-lg resize-none"
                  style={{ fontFamily: "var(--font-inter)" }} />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={onClose} className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || form.feePerStudent <= 0}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
