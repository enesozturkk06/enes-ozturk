"use client";

import { motion } from "framer-motion";
import { TrendingUp, Building2, Target, CalendarDays, Trophy } from "lucide-react";
import { CatIcon } from "@/app/components/shared/BlackCatAI";
import type { AiInsight } from "@/lib/financeCenter";

const ICONS: Record<AiInsight["icon"], React.ReactNode> = {
  trend:    <TrendingUp size={14} />,
  gym:      <Building2 size={14} />,
  forecast: <Target size={14} />,
  calendar: <CalendarDays size={14} />,
  student:  <Trophy size={14} />,
};

export default function FinanceAiCard({ insights }: { insights: AiInsight[] }) {
  return (
    <div className="stat-card-glass rounded-2xl overflow-hidden h-full"
      style={{ background: "rgba(15,15,22,0.95)", border: "1px solid rgba(139,92,246,0.25)" }}>
      <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5" style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <CatIcon size={22} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-wider" style={{ color: "#C4B5FD", fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}>
            KEDİ AI
          </div>
          <div className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Otomatik Finans Analizi
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {insights.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-6" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Analiz için yeterli veri henüz yok
          </p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#A78BFA" }}>{ICONS[insight.icon]}</span>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {insight.text}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
