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

/* className tabanlı Avatar — mobil/masaüstü responsive boyut */
function Avatar({ entry, className = "w-9 h-9 text-[13px]" }: { entry: HallEntry; className?: string }) {
  const ps = premiumStyle(entry);
  return (
    <div
      className={`relative flex items-center justify-center rounded-full flex-shrink-0 font-bold ${className}`}
      style={{
        background: `linear-gradient(135deg, ${entry.level.gradFrom}, ${entry.level.gradTo})`,
        border: `2px solid ${ps.ring}`,
        boxShadow: `0 0 14px ${ps.ring}55`,
        color: "#0a0714",
        fontFamily: "var(--font-bebas)",
        letterSpacing: "0.05em",
      }}
    >
      {initials(entry.name)}
    </div>
  );
}

function GiftBadge({ entry, className = "" }: { entry: HallEntry; className?: string }) {
  if (!entry.giftEligible && !entry.giftClaimed) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm ${className}`}
      style={{
        background: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.3)",
        color: "#F9A8D4", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.05em",
      }}
    >
      <Gift size={9} /> {entry.giftClaimed ? "Hediye ✓" : "Hediye Hakkı"}
    </span>
  );
}

/* ── Podyum kartı (ilk 3) ─────────────────────────────────────────── */

function PodiumCard({ entry, rank, value, index }: { entry: HallEntry; rank: number; value: string; index: number }) {
  const ps = premiumStyle(entry);
  const medal   = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const isFirst = rank === 1;

  /* Tüm ekran boyutlarında podyum sırası: 2. sol, 1. orta, 3. sağ */
  const orderClass = isFirst ? "order-2" : rank === 2 ? "order-1" : "order-3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      className={`relative flex flex-col items-center text-center border ${orderClass} ${isFirst ? "-translate-y-3" : ""}`}
      style={{
        /* Mobil: sıkı padding; masaüstü: geniş padding */
        padding: "20px 4px 8px",
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
          <Crown
            className="w-5 h-5 sm:w-7 sm:h-7"
            style={{ color: "#FBBF24", filter: "drop-shadow(0 0 8px rgba(251,191,36,0.7))" }}
            fill="#FBBF24"
          />
        </motion.div>
      )}

      {/* Özel etiketler — sadece masaüstünde (mobilde yer yok) */}
      {entry.studentOfMonth && (
        <span className="absolute top-1 right-1 text-[7px] sm:text-[9px] px-1 py-0.5 rounded-sm hidden sm:flex items-center gap-0.5"
          style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.35)", color: "#F9A8D4", fontFamily: "var(--font-barlow-condensed)" }}>
          <Sparkles size={7} /> Ayın Sporcusu
        </span>
      )}
      {entry.featured && !entry.studentOfMonth && (
        <span className="absolute top-1 right-1 text-[7px] sm:text-[9px] px-1 py-0.5 rounded-sm hidden sm:flex items-center gap-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", color: "#C4B5FD", fontFamily: "var(--font-barlow-condensed)" }}>
          <Award size={7} /> Öne Çıkan
        </span>
      )}

      {/* Madalya */}
      <span className="text-base sm:text-2xl mb-1.5">{medal}</span>

      {/* Avatar — mobil küçük, masaüstü büyük */}
      <Avatar
        entry={entry}
        className={
          isFirst
            ? "w-10 h-10 text-[14px] sm:w-16 sm:h-16 sm:text-[23px]"
            : "w-8 h-8 text-[11px] sm:w-[52px] sm:h-[52px] sm:text-[19px]"
        }
      />

      {/* İsim */}
      <div
        className="mt-1.5 text-[9px] sm:text-sm font-semibold w-full px-0.5 truncate"
        style={{ color: entry.isMe ? "#C4B5FD" : "#fff", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.03em" }}
      >
        {entry.name}
        {entry.isMe && <span className="ml-0.5" style={{ color: "#8B5CF6" }}>(Sen)</span>}
      </div>

      {/* Seviye — sadece masaüstünde */}
      <div className="hidden sm:flex text-[10px] mt-0.5 items-center gap-1" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.level.icon}</span><span>{entry.level.name}</span>
      </div>

      {/* Kategori değeri */}
      <div
        className="mt-1.5 text-sm sm:text-lg font-black tabular-nums"
        style={{ color: ps.ring, fontFamily: "var(--font-bebas)" }}
      >
        {value}
      </div>

      {/* İstatistikler — sadece masaüstünde */}
      <div className="hidden sm:flex mt-2 items-center gap-2 text-[9px] flex-wrap justify-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.completedLessons} ders</span>
        <span>•</span>
        <span>{entry.badgeCount} rozet</span>
        {entry.technical && <><span>•</span><span>Teknik {entry.technical.average.toFixed(1)}</span></>}
      </div>

      {/* Hediye rozeti — sadece masaüstünde */}
      <GiftBadge entry={entry} className="hidden sm:inline-flex mt-1.5" />

      {/* Mobilde sadece Ayın Sporcusu işareti — küçük simge */}
      {entry.studentOfMonth && (
        <Sparkles size={8} className="sm:hidden mt-1" style={{ color: "#F9A8D4" }} />
      )}
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
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded"
      style={{
        background: entry.isMe ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${entry.isMe ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <span className="text-xs w-5 sm:w-6 flex-shrink-0 text-center font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-bebas)" }}>
        {rank}
      </span>
      <Avatar entry={entry} className="w-8 h-8 text-[11px] sm:w-9 sm:h-9 sm:text-[13px]" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate flex items-center gap-1" style={{ color: entry.isMe ? "#C4B5FD" : "rgba(255,255,255,0.75)", fontFamily: "var(--font-barlow-condensed)" }}>
          <span className="truncate">{entry.name}</span>
          {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
          {entry.studentOfMonth && <Sparkles size={10} style={{ color: "#F9A8D4" }} />}
          {entry.featured && !entry.studentOfMonth && <Award size={10} style={{ color: "#C4B5FD" }} />}
        </div>
        <div className="text-[9px] sm:text-[10px] flex items-center gap-1" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
          <span>{entry.level.icon}</span><span>{entry.level.name}</span>
          <span className="hidden sm:inline" style={{ color: "rgba(255,255,255,0.2)" }}>• {entry.completedLessons} ders • {entry.badgeCount} rozet</span>
        </div>
      </div>
      <GiftBadge entry={entry} className="hidden sm:inline-flex" />
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
      /* pb-36 sm:pb-6: Kedi AI (bottom:88px) ve WhatsApp (bottom:20px+52px) butonlarının
         altındaki içeriği kapatmaması için mobilde yeterli boşluk bırak */
      className="p-3 sm:p-6 border space-y-3 sm:space-y-5 pb-36 sm:pb-6"
      style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.05), rgba(0,0,0,0.3))",
        borderColor: "rgba(139,92,246,0.16)",
        borderRadius: 4,
        boxShadow: "0 0 40px rgba(139,92,246,0.06), inset 0 0 60px rgba(0,0,0,0.3)",
      }}
    >
      {/* Başlık */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(251,191,36,0.3)" }}>
          <Crown size={15} style={{ color: "#FBBF24" }} />
        </div>
        <div>
          <div className="text-sm sm:text-base font-bold tracking-widest uppercase" style={{ color: "#fff", fontFamily: "var(--font-bebas)", letterSpacing: "0.16em" }}>
            Onur Listesi
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            Premium • Gerçek zamanlı sıralama
          </div>
        </div>
      </div>

      {/* Kategori sekmeleri — yatay kaydırmalı, touch-friendly */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
          touchAction: "pan-x",
        } as React.CSSProperties}
      >
        {HALL_CATEGORIES.map(c => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[10.5px] px-2 sm:px-3 py-1.5 transition-all duration-200 rounded-md whitespace-nowrap"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                letterSpacing: "0.04em",
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

      <p className="text-[10px] sm:text-[11px] -mt-1" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
        {def.description}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 sm:space-y-5"
        >
          {ranked.length === 0 ? (
            <div className="text-center py-8 sm:py-10">
              <div className="text-3xl sm:text-4xl mb-3">🏆</div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                Bu kategoride henüz sıralanacak veri yok
              </p>
            </div>
          ) : (
            <>
              {/*
                Podyum — her zaman 3 sütun (mobil + masaüstü).
                Sıra: 2. sol (order-1), 1. orta (order-2, yükseltilmiş), 3. sağ (order-3).
                Masaüstünde 1. biraz daha yükseltilir (-translate-y-3 her ikisinde de geçerli).
              */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-4 items-end mt-4 sm:mt-2">
                {top3.map((entry, i) => (
                  <PodiumCard key={entry.studentId} entry={entry} rank={i + 1} value={def.displayValue(entry)} index={i} />
                ))}
              </div>

              {/* Geri kalan sıralama */}
              {rest.length > 0 && (
                <div className="space-y-1 sm:space-y-1.5">
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
