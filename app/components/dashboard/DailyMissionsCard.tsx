"use client";
import { memo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ChevronDown } from "lucide-react";
import type { StudentMission } from "@/lib/types";
import { GOLD_BRIGHT, GOLD_BG_SOFT, GOLD_BORDER_SOFT } from "./theme";

interface Props {
  missions: StudentMission[];
  /** Verilirse sadece ilk N görev gösterilir + "Tümü" ile açılıp kapanır
   * (ayrı bir görevler sayfası olmadığı için "Tümü" harici bir sayfaya değil,
   * kart içinde genişletmeye bağlanır). */
  limit?: number;
}

function DailyMissionsCard({ missions, limit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = missions.filter(m => m.completed).length;
  const showAll = !limit || expanded;
  const visible = showAll ? missions : missions.slice(0, limit);

  return (
    <div className="card-gold rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>GÜNLÜK GÖREVLER</h3>
        {missions.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: GOLD_BG_SOFT, color: GOLD_BRIGHT, border: `1px solid ${GOLD_BORDER_SOFT}`, fontFamily: "var(--font-label)" }}>
            {completedCount} / {missions.length} tamamlandı
          </span>
        )}
      </div>

      {missions.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-6" style={{ fontFamily: "var(--font-label)" }}>
          Bu hafta için görev bulunmuyor.
        </p>
      ) : (
        <>
          <motion.div
            initial="initial" animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-2"
          >
            {visible.map(m => (
              <motion.div key={m.key}
                variants={{ initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: m.completed ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${m.completed ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {m.completed
                  ? <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} className="flex-shrink-0" />
                  : <Circle size={18} className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />}
                <span className="text-lg flex-shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/85 truncate" style={{ fontFamily: "var(--font-label)" }}>{m.title}</div>
                  {!m.completed && m.target > 1 && (
                    <div className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
                      {m.progress} / {m.target}
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ background: GOLD_BG_SOFT, color: GOLD_BRIGHT, border: `1px solid ${GOLD_BORDER_SOFT}`, fontFamily: "var(--font-label)" }}>
                  +{m.xpReward} XP
                </span>
              </motion.div>
            ))}
          </motion.div>

          {limit && missions.length > limit && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs tracking-wider transition-colors"
              style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>
              {expanded ? "Daralt" : `Tümü (${missions.length})`}
              <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default memo(DailyMissionsCard);
