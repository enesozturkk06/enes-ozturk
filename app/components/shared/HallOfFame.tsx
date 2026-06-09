"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Gift, Award, Sparkles, ChevronDown, Check } from "lucide-react";
import {
  HALL_CATEGORIES, rankByCategory,
  type HallEntry, type HallCategory, type CategoryDef,
} from "@/lib/hallOfFame";

/* ── Yardımcılar ──────────────────────────────────────────────────── */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatXPShort(xp: number): string {
  if (xp >= 1_000_000) {
    const m = xp / 1_000_000;
    const str = m % 1 === 0 ? m.toFixed(0) : parseFloat(m.toFixed(2)).toString();
    return `${str}M XP`;
  }
  if (xp >= 10_000) {
    const k = xp / 1_000;
    const str = k % 1 === 0 ? k.toFixed(0) : parseFloat(k.toFixed(1)).toString();
    return `${str}K XP`;
  }
  return `${xp.toLocaleString()} XP`;
}

function getDisplayValue(entry: HallEntry, def: CategoryDef): string {
  if (def.id === "xp" || def.id === "legends") return formatXPShort(entry.xp);
  return def.displayValue(entry);
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

/* Üyelik paketi rozet rengi/etiketi */
function membershipBadge(packageType?: string): { label: string; color: string; border: string } | null {
  if (packageType === "sampiyon") return { label: "ALTIN ÜYE",    color: "#FBBF24", border: "rgba(251,191,36,0.7)" };
  if (packageType === "efsane")   return { label: "PLATİNUM ÜYE", color: "#E9D5FF", border: "rgba(192,132,252,0.7)" };
  return null;
}

/* Sıra bazlı madalya rengi — altın / gümüş / bronz */
function rankStyle(rank: number) {
  if (rank === 1) return { border: "rgba(251,191,36,0.65)", glow: "0 0 36px rgba(251,191,36,0.4), 0 0 70px rgba(0,0,0,0.5)", ring: "#FBBF24" };
  if (rank === 2) return { border: "rgba(148,163,184,0.5)",  glow: "0 0 24px rgba(148,163,184,0.25)", ring: "#94A3B8" };
  return          { border: "rgba(180,113,60,0.48)",          glow: "0 0 20px rgba(180,113,60,0.22)", ring: "#B4713C" };
}

/* Avatar */
function Avatar({ entry, className = "w-9 h-9 text-[13px]", ringColor }: {
  entry: HallEntry; className?: string; ringColor?: string;
}) {
  const ps  = premiumStyle(entry);
  const mb  = membershipBadge(entry.packageType);
  const ring = ringColor ?? (mb ? mb.border : ps.ring);
  const glow = mb ? `0 0 14px ${mb.color}55` : `0 0 12px ${ring}55`;

  const inner = entry.avatarUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.avatarUrl}
        alt={entry.name}
        className="w-full h-full object-cover"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </>
  ) : (
    <span style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.05em", color: "#0a0714" }}>
      {initials(entry.name)}
    </span>
  );

  if (entry.avatarUrl) {
    return (
      <div className={`relative rounded-full flex-shrink-0 overflow-hidden ${className}`}
        style={{ border: `2px solid ${ring}`, boxShadow: glow }}>
        {inner}
        {mb && (
          <div className="absolute bottom-0 left-0 right-0 text-center py-px"
            style={{ background: `${mb.color}cc`, fontSize: 6, fontFamily: "var(--font-barlow-condensed)", color: "#000", letterSpacing: "0.05em", fontWeight: 700 }}>
            {mb.label === "ALTIN ÜYE" ? "ALTIN" : "PLAT"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-full flex-shrink-0 font-bold ${className}`}
      style={{
        background:  `linear-gradient(135deg, ${entry.level.gradFrom}, ${entry.level.gradTo})`,
        border:      `2px solid ${ring}`,
        boxShadow:   glow,
        color:       "#0a0714",
        fontFamily:  "var(--font-bebas)",
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

/* ── Podyum kartı (ilk 3) — rank-based gold/silver/bronze ────────── */

function PodiumCard({ entry, rank, value, index }: {
  entry: HallEntry; rank: number; value: string; index: number;
}) {
  const ps      = premiumStyle(entry);
  const rs      = rankStyle(rank);
  const medal   = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const isFirst = rank === 1;
  const orderClass = isFirst ? "order-2" : rank === 2 ? "order-1" : "order-3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      className={`relative flex flex-col items-center text-center border ${orderClass} ${isFirst ? "-translate-y-3" : ""}`}
      style={{
        padding:      "18px 4px 8px",
        background:   ps.background,
        borderColor:  rs.border,
        boxShadow:    isFirst ? rs.glow : `0 0 16px ${rs.ring}22`,
        borderRadius: 4,
      }}
    >
      {/* Taç — 1. sıra */}
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

      {/* Özel etiketler — yalnızca masaüstünde */}
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

      {/* Avatar — rank rengiyle */}
      <Avatar
        entry={entry}
        ringColor={rs.ring}
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

      {/* Seviye — mobilde kısa isim */}
      <div className="flex text-[9px] sm:text-[10px] mt-0.5 items-center gap-0.5 sm:gap-1"
        style={{ color: rs.ring, fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.level.icon}</span>
        <span className="hidden sm:inline">{entry.level.name}</span>
        <span className="sm:hidden">{entry.level.shortName}</span>
      </div>

      {/* Kategori değeri */}
      <div
        className="mt-1 text-xs sm:text-lg font-black tabular-nums leading-tight"
        style={{ color: rs.ring, fontFamily: "var(--font-bebas)" }}
      >
        {value}
      </div>

      {/* İstatistikler — yalnızca masaüstünde */}
      <div className="hidden sm:flex mt-2 items-center gap-2 text-[9px] flex-wrap justify-center"
        style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{entry.completedLessons} ders</span>
        <span>•</span>
        <span>{entry.badgeCount} rozet</span>
        {entry.technical && <><span>•</span><span>Teknik {entry.technical.average.toFixed(1)}</span></>}
      </div>

      <GiftBadge entry={entry} className="hidden sm:inline-flex mt-1.5" />
      {entry.studentOfMonth && <Sparkles size={8} className="sm:hidden mt-0.5" style={{ color: "#F9A8D4" }} />}
    </motion.div>
  );
}

/* ── Sıralama satırı (4. ve sonrası) ──────────────────────────────── */

function LeaderboardRow({ entry, rank, value, index }: {
  entry: HallEntry; rank: number; value: string; index: number;
}) {
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
      {/* Sıra */}
      <span className="text-xs w-5 sm:w-6 flex-shrink-0 text-center font-bold tabular-nums"
        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-bebas)" }}>
        {rank}
      </span>

      {/* Avatar */}
      <Avatar entry={entry} className="w-7 h-7 text-[10px] sm:w-9 sm:h-9 sm:text-[13px] flex-shrink-0" />

      {/* İsim + stats */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate flex items-center gap-1"
          style={{ color: entry.isMe ? "#C4B5FD" : "rgba(255,255,255,0.75)", fontFamily: "var(--font-barlow-condensed)" }}>
          <span className="truncate">{entry.name}</span>
          {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
          {entry.studentOfMonth && <Sparkles size={9} style={{ color: "#F9A8D4", flexShrink: 0 }} />}
          {entry.featured && !entry.studentOfMonth && <Award size={9} style={{ color: "#C4B5FD", flexShrink: 0 }} />}
        </div>
        {/* Stat satırı — mobil + masaüstü */}
        <div className="flex items-center gap-1 flex-wrap text-[9px] mt-0.5"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          <span style={{ color: entry.level.colorPrimary }}>{entry.level.icon} {entry.level.shortName}</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>{entry.completedLessons} ders</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>{entry.badgeCount} 🏅</span>
          {entry.technical && (
            <><span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>⚡{entry.technical.average.toFixed(1)}</span></>
          )}
        </div>
      </div>

      <GiftBadge entry={entry} className="hidden sm:inline-flex flex-shrink-0" />

      {/* Değer */}
      <span className="text-xs sm:text-sm font-black tabular-nums flex-shrink-0"
        style={{ color: ps.ring, fontFamily: "var(--font-bebas)" }}>
        {value}
      </span>
    </motion.div>
  );
}

/* ── Ana premium Onur Listesi bileşeni ────────────────────────────── */

export function HallOfFamePremium({ entries }: { entries: HallEntry[] }) {
  const [category, setCategory]     = useState<HallCategory>("xp");
  const [dropdownOpen, setDropdown] = useState(false);

  const def    = HALL_CATEGORIES.find(c => c.id === category)!;
  const ranked = rankByCategory(entries, category);
  const top3   = ranked.slice(0, 3);
  const rest   = ranked.slice(3, 15);

  return (
    <div
      className="p-3 sm:p-6 border space-y-3 sm:space-y-5"
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
          <div className="text-sm sm:text-base font-bold tracking-widest uppercase"
            style={{ color: "#fff", fontFamily: "var(--font-bebas)", letterSpacing: "0.16em" }}>
            Onur Listesi
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            Premium · Gerçek zamanlı sıralama
          </div>
        </div>
      </div>

      {/* ── Mobil: Dropdown kategori seçici ────────────────────── */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setDropdown(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-all"
          style={{
            background:   "rgba(255,255,255,0.04)",
            borderColor:  dropdownOpen ? "rgba(251,191,36,0.5)" : "rgba(139,92,246,0.2)",
            boxShadow:    dropdownOpen ? "0 0 12px rgba(251,191,36,0.12)" : "none",
          }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
            <span>{def.icon}</span>
            <span>{def.label}</span>
          </span>
          <ChevronDown
            size={16}
            style={{
              color:     "#FBBF24",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border overflow-hidden"
            style={{
              background: "#0e0a1a",
              borderColor: "rgba(139,92,246,0.25)",
              boxShadow:   "0 8px 32px rgba(0,0,0,0.7)",
            }}
          >
            {HALL_CATEGORIES.map((c, idx) => {
              const active = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCategory(c.id); setDropdown(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background:   active ? "rgba(251,191,36,0.08)" : "transparent",
                    borderBottom: idx < HALL_CATEGORIES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    color:        active ? "#FBBF24" : "rgba(255,255,255,0.55)",
                    fontFamily:   "var(--font-barlow-condensed)",
                    fontSize:     13,
                  }}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="flex-1">{c.label}</span>
                  {active && <Check size={12} style={{ color: "#FBBF24", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Masaüstü: Yatay kaydırmalı sekmeler ─────────────── */}
      <div
        className="hidden sm:flex gap-1.5 overflow-x-auto pb-1"
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
                fontFamily:  "var(--font-barlow-condensed)",
                letterSpacing: "0.04em",
                background:  active ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.03)",
                border:      `1px solid ${active ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}`,
                color:       active ? "#FBBF24" : "rgba(255,255,255,0.4)",
              }}
            >
              <span>{c.icon}</span><span>{c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] sm:text-[11px] -mt-1"
        style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
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
              {/* Podyum — 2. sol, 1. orta, 3. sağ */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-4 items-end mt-4 sm:mt-2">
                {top3.map((entry, i) => (
                  <PodiumCard
                    key={entry.studentId}
                    entry={entry}
                    rank={i + 1}
                    value={getDisplayValue(entry, def)}
                    index={i}
                  />
                ))}
              </div>

              {/* Geri kalan sıralama */}
              {rest.length > 0 && (
                <div className="space-y-1 sm:space-y-1.5">
                  {rest.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.studentId}
                      entry={entry}
                      rank={i + 4}
                      value={getDisplayValue(entry, def)}
                      index={i}
                    />
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
