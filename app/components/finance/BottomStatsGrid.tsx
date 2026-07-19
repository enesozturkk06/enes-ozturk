"use client";

import { motion } from "framer-motion";
import {
  CalendarDays, Clock, Banknote, Building2, Trophy, CheckCircle2, XCircle, TrendingUp,
} from "lucide-react";
import type { BottomStats } from "@/lib/financeCenter";

export default function BottomStatsGrid({ stats }: { stats: BottomStats }) {
  const tiles = [
    { label: "En Yoğun Gün", value: stats.busiestDay, sub: `${stats.busiestDayCount} randevu`, icon: <CalendarDays size={16} />, color: "#A855F7" },
    { label: "En Yoğun Saat", value: stats.busiestHour, sub: `${stats.busiestHourCount} randevu`, icon: <Clock size={16} />, color: "#60A5FA" },
    { label: "Ortalama Ders Ücreti", value: `₺${Math.round(stats.avgLessonPrice).toLocaleString("tr-TR")}`, sub: "tamamlanan ders başı", icon: <Banknote size={16} />, color: "#FBBF24" },
    { label: "En Çok Kazandıran Salon", value: stats.topGymName, sub: `₺${stats.topGymRevenue.toLocaleString("tr-TR")}`, icon: <Building2 size={16} />, color: "#F472B6" },
    { label: "En Çok Kazandıran Öğrenci", value: stats.topStudentName, sub: `₺${stats.topStudentPaid.toLocaleString("tr-TR")}`, icon: <Trophy size={16} />, color: "#FBBF24" },
    { label: "Tamamlanan Ders", value: String(stats.totalCompleted), sub: "tüm zamanlar", icon: <CheckCircle2 size={16} />, color: "#4ADE80" },
    { label: "İptal Edilen Ders", value: String(stats.totalCancelled), sub: "tüm zamanlar", icon: <XCircle size={16} />, color: "#F87171" },
    { label: "Ortalama Aylık Gelir", value: `₺${Math.round(stats.avgMonthlyRevenue).toLocaleString("tr-TR")}`, sub: "aktif ay başına", icon: <TrendingUp size={16} />, color: "#22D3EE" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 px-1 pb-2">
        <TrendingUp size={13} style={{ color: "#22D3EE" }} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
          İstatistikler
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t, i) => (
          <motion.div key={t.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="stat-card-glass rounded-xl p-3.5"
            style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-white/30 uppercase tracking-widest leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {t.label}
              </span>
              <span style={{ color: t.color }} className="flex-shrink-0">{t.icon}</span>
            </div>
            <div className="text-base font-display truncate" style={{ fontFamily: "var(--font-bebas)", color: t.color }} title={t.value}>
              {t.value}
            </div>
            <div className="text-[10px] text-white/25 mt-0.5 truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {t.sub}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
