"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Layers, Briefcase, Wallet, ChevronDown } from "lucide-react";
import type { CategoryTotals } from "@/lib/groupLessonFinance";

function CategoryCard({
  label, value, color, icon, index, detail,
}: {
  label: string; value: number; color: string; icon: React.ReactNode; index: number; detail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      className="stat-card-glass rounded-2xl overflow-hidden"
      style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {label}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span style={{ color }}>{icon}</span>
            <ChevronDown size={13} className="text-white/25 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-display" style={{ fontFamily: "var(--font-bebas)", color }}>
          ₺{value.toLocaleString("tr-TR")}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 sm:px-5 pb-4 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs py-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
      <span className="text-white/40">{label}</span>
      <span className="font-semibold" style={{ color: color ?? "#fff" }}>{value}</span>
    </div>
  );
}

export default function CategoryBreakdownCards({
  totals, activeGroupCount, activeGroupMemberCount, otherIncomeCount,
}: {
  totals: CategoryTotals; activeGroupCount: number; activeGroupMemberCount: number; otherIncomeCount: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <CategoryCard label="🥊 Özel Ders Geliri" value={totals.ozelDersi} color="#A855F7" icon={<Swords size={16} />} index={0}
        detail={<DetailRow label="Bu ay tahsil edilen" value={`₺${totals.ozelDersi.toLocaleString("tr-TR")}`} color="#A855F7" />} />
      <CategoryCard label="👥 Grup Dersi Geliri" value={totals.grupDersi} color="#4ADE80" icon={<Layers size={16} />} index={1}
        detail={<>
          <DetailRow label="Aktif Grup" value={String(activeGroupCount)} />
          <DetailRow label="Toplam Öğrenci" value={String(activeGroupMemberCount)} />
        </>} />
      <CategoryCard label="💼 Diğer Gelirler" value={totals.digerGelirler} color="#FB923C" icon={<Briefcase size={16} />} index={2}
        detail={<DetailRow label="Bu ay kayıt sayısı" value={String(otherIncomeCount)} />} />
      <CategoryCard label="💰 Toplam Gelir" value={totals.toplamGelir} color="#60A5FA" icon={<Wallet size={16} />} index={3}
        detail={<>
          <DetailRow label="Özel Ders" value={`₺${totals.ozelDersi.toLocaleString("tr-TR")}`} color="#A855F7" />
          <DetailRow label="Grup Dersi" value={`₺${totals.grupDersi.toLocaleString("tr-TR")}`} color="#4ADE80" />
          <DetailRow label="Diğer Gelirler" value={`₺${totals.digerGelirler.toLocaleString("tr-TR")}`} color="#FB923C" />
          <DetailRow label="Toplam Salon Payı" value={`₺${totals.toplamSalonPayi.toLocaleString("tr-TR")}`} color="#F87171" />
          <DetailRow label="Net Kazanç" value={`₺${totals.netKazanc.toLocaleString("tr-TR")}`} color="#4ADE80" />
        </>} />
    </div>
  );
}
