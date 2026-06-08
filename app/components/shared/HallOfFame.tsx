"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Gift, Award, Sparkles } from "lucide-react";
import {
  HALL_CATEGORIES, rankByCategory,
  type HallEntry, type HallCategory,
} from "@/lib/hallOfFame";

/* ── Yardımcılar ──────────────────────────────────────────────────── */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Seviyeye göre özel premium glow/arka plan — Elmas: mavi/mor, Efsane: altın-siyah */
function premiumStyle(entry: HallEntry): { background: string; border: string; glow: string; ring: string } {
  if (entry.level.id === "legend") {
    return {
      background: "linear-gradient(160deg, rgba(251,191,36,0.14), rgba(0,0,0,0.55))",
      border:     "rgba(251,191,36,0.5)",
      glow:       "0 0 40px rgba(251,191,36,0.3), 0 0 80px rgba(0,0,0,0.6), inset 0 0 30px rgba(251,191,36,0.06)",
      ring:       "#FBBF24",
    };
  }
  if (entry.level.id === "diamond") {
    return {
      background: "linear-gradient(160deg, rgba(103,232,249,0.12), rgba(167,139,250,0.10))",
      border:     "rgba(103,232,249,0.4)",
      glow:       "0 0 32px rgba(103,232,249,0.3), 0 0 50px rgba(167,139,250,0.2)",
      ring:       "#67E8F9",
    };
  }
  return {
    background: `linear-gradient(160deg, ${entry.level.gradFrom}1c, ${entry.level.gradTo}0c)`,
    border:     entry.level.colorPrimary + "44",
    glow:       `0 0 20px ${entry.level.glowColor}`,
    ring:       entry.level.colorPrimary,
  };
}

function Avatar({ entry, size = 44 }: { entry: HallEntry; size?: number }) {
  const ps = premiumStyle(entry);
  return (
    <div
      className="relative flex items-center justify-center rounded-full flex-shrink-0 font-bold"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${entry.level.gradFrom}, ${entry.level.gradTo})`,
        border: `2px solid ${ps.ring}`,
        boxShadow: `0 0 14px ${ps.ring}55`,
        color: "#0a0714",
        fontFamily: "var(--font-bebas)",
        fontSize: size * 0.36,
        letterSpacing: "0.05em",
      }}
    >
      {initials(entry.name)}
    </div>
  );
}

function GiftBadge({ entry }: { entry: HallEntry }) {
  if (!entry.giftEligible && !entry.giftClaimed) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm"
      style={{
        background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.3)",
        color: "#F9A8D4", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.05em",
      }}
      title={entry.giftClaimed ? "Hediye ders talep edildi" : "Hediye ders eşiğine ulaştı"}
    >
      <Gift size={9} /> {entry.giftClaimed ? "Hediye Ders ✓" : "Hediye Ders Hakkı"}
    </span>
  );
}

/* ── Podyum kartı (ilk 3) ─────────────────────────────────────────── */

function PodiumCard({ entry, rank, value, index }: { entry: HallEntry; rank: number; value: string; index: number }) {
  const ps = premiumStyle(entry);
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const isFirst = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      className={`relative flex flex-col items-center text-center px-4 pt-8 pb-5 border ${isFirst ? "sm:order-2 sm:-translate-y-3" : rank === 2 ? "sm:order-1" : "sm:order-3"}`}
      style={{
        background: ps.background,
        borderColor: ps.border,
        boxShadow: isFirst ? ps.glow : `0 0 16px ${ps.ring}22`,
        borderRadius: 4,
      }}
    >
      {/* Taç efekti — 1. sıra */}
      {isFirst && (
        <motion.div
          className="absolute -top-5 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -3, 0], rotate: [-4, 4, -4] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Crown size={28} style={{ color: "#FBBF24", filter: "drop-shadow(0 0 10px rgba(251,191,36,0.7))" }} fill="#FBBF24" />
        </motion.div>
      )}

      {entry.studentOfMonth && (
        <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"
          style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.35)", color: "#F9A8D4", fontFamily: "var(--font-barlow-condensed)" }}>
          <Sparkles size={9} /> Ayın Sporcusu
        </span>
      )}
      {entry.featured && !entry.studentOfMonth && (
        <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", color: "#C4B5FD", fontFamily: "var(--font-barlow-condensed)" }}>
          <Award size={9} /> Öne Çıkan
        </span>
      )}

      <span className="text-2xl mb-2">{medal}</span>
      <Avatar entry={entry} size={isFirst ? 64 : 52} />

      <div className="mt-3 text-sm font-semibold truncate max-w-full"
        style={{ color: entry.isMe ? "#C4B5FD" : "#fff", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.04em" }}>
        {entry.name} {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
      </div>
      <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.level.icon}</span><span>{entry.level.name}</span>
      </div>

      <div className="mt-2.5 text-lg font-black tabular-nums" style={{ color: ps.ring, fontFamily: "var(--font-bebas)" }}>
        {value}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[9px] flex-wrap justify-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.completedLessons} ders</span>
        <span>•</span>
        <span>{entry.badgeCount} rozet</span>
        {entry.technical && <><span>•</span><span>Teknik {entry.technical.average.toFixed(1)}</span></>}
      </div>
      <div className="mt-1.5"><GiftBadge entry={entry} /></div>
    </motion.div>
  );
}

/* ── Sıralama satırı (4. ve sonrası) ──────────────────────────────── */

function LeaderboardRow({ entry, rank, value, index }: { entry: HallEntry; rank: number; value: string; index: number }) {
  const ps = premiumStyle(entry);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded"
      style={{
        background: entry.isMe ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${entry.isMe ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span className="text-xs w-6 flex-shrink-0 text-center font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-bebas)" }}>
        {rank}
      </span>
      <Avatar entry={entry} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate flex items-center gap-1.5" style={{ color: entry.isMe ? "#C4B5FD" : "rgba(255,255,255,0.75)", fontFamily: "var(--font-barlow-condensed)" }}>
          <span className="truncate">{entry.name}</span>
          {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
          {entry.studentOfMonth && <Sparkles size={10} style={{ color: "#F9A8D4" }} />}
          {entry.featured && !entry.studentOfMonth && <Award size={10} style={{ color: "#C4B5FD" }} />}
        </div>
        <div className="text-[10px] flex items-center gap-1" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
          <span>{entry.level.icon}</span><span>{entry.level.name}</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>• {entry.completedLessons} ders • {entry.badgeCount} rozet</span>
        </div>
      </div>
      <GiftBadge entry={entry} />
      <span className="text-sm font-black tabular-nums flex-shrink-0" style={{ color: ps.ring, fontFamily: "var(--font-bebas)" }}>
        {value}
      </span>
    </motion.div>
  );
}

/* ── Ana premium Onur Listesi bileşeni ────────────────────────────── */

export function HallOfFamePremium({ entries }: { entries: HallEntry[] }) {
  const [category, setCategory] = useState<HallCategory>("xp");
  const def    = HALL_CATEGORIES.find(c => c.id === category)!;
  const ranked = rankByCategory(entries, category);
  const top3   = ranked.slice(0, 3);
  const rest   = ranked.slice(3, 15);

  return (
    <div
      className="p-4 sm:p-6 border space-y-5"
      style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.05), rgba(0,0,0,0.3))",
        borderColor: "rgba(139,92,246,0.16)",
        borderRadius: 4,
        boxShadow: "0 0 40px rgba(139,92,246,0.06), inset 0 0 60px rgba(0,0,0,0.3)",
      }}
    >
      {/* Başlık */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(251,191,36,0.3)" }}>
          <Crown size={17} style={{ color: "#FBBF24" }} />
        </div>
        <div>
          <div className="text-base font-bold tracking-widest uppercase" style={{ color: "#fff", fontFamily: "var(--font-bebas)", letterSpacing: "0.16em" }}>
            Onur Listesi
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            Premium • Gerçek zamanlı sıralama
          </div>
        </div>
      </div>

      {/* Kategori sekmeleri */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5" style={{ scrollbarWidth: "none" }}>
        {HALL_CATEGORIES.map(c => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="flex-shrink-0 flex items-center gap-1.5 text-[10.5px] px-3 py-1.5 transition-all duration-200 rounded-md whitespace-nowrap"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                letterSpacing: "0.05em",
                background: active ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "#FBBF24" : "rgba(255,255,255,0.4)",
              }}
            >
              <span>{c.icon}</span><span>{c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] -mt-2" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
        {def.description}
      </p>

      <AnimatePresence mode="wait">
        <motion.div key={category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
          {ranked.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                Bu kategoride henüz sıralanacak veri yok
              </p>
            </div>
          ) : (
            <>
              {/* Podyum — ilk 3 (mobilde alt alta, masaüstünde 1. ortada yükseltilmiş) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 sm:items-end">
                {top3.map((entry, i) => (
                  <PodiumCard key={entry.studentId} entry={entry} rank={i + 1} value={def.displayValue(entry)} index={i} />
                ))}
              </div>

              {/* Geri kalan sıralama */}
              {rest.length > 0 && (
                <div className="space-y-1.5">
                  {rest.map((entry, i) => (
                    <LeaderboardRow key={entry.studentId} entry={entry} rank={i + 4} value={def.displayValue(entry)} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
