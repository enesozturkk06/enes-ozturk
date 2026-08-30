"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RARITY_LABELS, type Badge as BadgeData, type Rarity } from "@/lib/badges";
import { GOLD_BRIGHT } from "./theme";

const RARITY_ORDER: Record<Rarity, number> = { legendary: 3, epic: 2, rare: 1, common: 0 };

interface Props { badges: BadgeData[]; limit?: number }

function BadgeShowcase({ badges, limit = 8 }: Props) {
  const earnedAll = badges.filter(b => b.earned);
  const earned = [...earnedAll].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]).slice(0, limit);

  return (
    <div className="card-gold rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>ROZET VİTRİNİ</h3>
          <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
            {earnedAll.length} / {badges.length} rozet kazanıldı
          </p>
        </div>
        <Link href="/ogrenci/rozetler"
          className="flex items-center gap-1 text-xs tracking-wider transition-colors flex-shrink-0"
          style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>
          Tümü <ChevronRight size={13} />
        </Link>
      </div>

      {earned.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-6" style={{ fontFamily: "var(--font-label)" }}>
          Henüz rozet kazanmadın — ilk dersini tamamla!
        </p>
      ) : (
        <motion.div
          initial="initial" animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-3 sm:grid-cols-4 gap-3"
        >
          {earned.map(b => (
            <motion.div key={b.id}
              variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              whileHover={{ y: -3, scale: 1.03 }}
              className="flex flex-col items-center text-center p-3 rounded-xl"
              style={{ background: `${b.color}0d`, border: `1px solid ${b.color}30` }}
              title={b.description}
            >
              <span className="text-2xl mb-1.5" style={{ filter: `drop-shadow(0 0 8px ${b.color}70)` }}>{b.icon}</span>
              <span className="text-[10px] text-white/70 leading-tight" style={{ fontFamily: "var(--font-label)" }}>{b.name}</span>
              <span className="text-[9px] mt-1 uppercase tracking-wider" style={{ color: b.color, fontFamily: "var(--font-label)" }}>
                {RARITY_LABELS[b.rarity]}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default memo(BadgeShowcase);
