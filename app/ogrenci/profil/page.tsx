"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments,
  uploadStudentAvatar, deleteStudentAvatar, getStudents,
} from "@/lib/db";
import type { LessonRecord, Appointment } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getSeasonLabel, sumManualXP,
} from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeTechnicalAverages, countEarnedBadges } from "@/lib/hallOfFame";
import CircularXP from "@/app/components/shared/CircularXP";
import Link from "next/link";
import {
  Zap, TrendingUp, BookOpen, Award, Target, Star, Flame, Users,
  Upload, Trash2, Palette, CreditCard, Crown, Sparkles, Shield, ChevronRight,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   AVATAR RENK SEÇENEKLERİ
══════════════════════════════════════════════════════════ */
const AVATAR_COLORS = [
  { id: "violet",  hex: "#8B5CF6" }, { id: "magenta", hex: "#D946EF" },
  { id: "indigo",  hex: "#6366F1" }, { id: "rose",    hex: "#F43F5E" },
  { id: "amber",   hex: "#F59E0B" }, { id: "teal",    hex: "#14B8A6" },
  { id: "sky",     hex: "#38BDF8" }, { id: "lime",    hex: "#84CC16" },
];

/* ══════════════════════════════════════════════════════════
   XP RING — avatar etrafında seviye ilerlemesi
══════════════════════════════════════════════════════════ */
function AvatarRing({
  sizePx, pct, gradFrom, gradTo,
  children,
}: {
  sizePx: number; pct: number; gradFrom: string; gradTo: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 450); return () => clearTimeout(t); }, []);
  const sw = 7, gap = 9;
  const total = sizePx + 2 * (gap + sw);
  const cx = total / 2;
  const r  = total / 2 - sw / 2 - 3;
  const C  = 2 * Math.PI * r;
  const off = C * (1 - Math.min(1, pct / 100));
  const id  = `ar-${sizePx}`;
  return (
    <div style={{ position: "relative", width: total, height: total }} className="flex-shrink-0">
      <svg width={total} height={total} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradFrom} />
            <stop offset="100%" stopColor={gradTo} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={`url(#${id})`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={ready ? off : C}
          style={{
            transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px`,
            transition: "stroke-dashoffset 1.6s cubic-bezier(.25,.46,.45,.94)",
            filter: `drop-shadow(0 0 8px ${gradTo}bb)`,
          }}
        />
        {/* progress % label bottom */}
        <text x={cx} y={total - 1} textAnchor="middle" fontSize={9}
          fill={gradTo} opacity={0.75} fontFamily="var(--font-barlow-condensed)">
          {Math.round(Math.min(100, pct))}%
        </text>
      </svg>
      <div style={{ position: "absolute", top: gap + sw, left: gap + sw, width: sizePx, height: sizePx }}>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STAT KARTI
══════════════════════════════════════════════════════════ */
function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.035, y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative flex flex-col p-3.5 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${accent}0f 0%, rgba(0,0,0,0) 100%)`,
        border: `1px solid ${accent}22`,
        borderRadius: 10,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[10px]"
        style={{ background: `linear-gradient(90deg, ${accent}99, ${accent}22)` }} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-[0.18em] leading-none"
          style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)" }}>
          {label}
        </span>
        <span style={{ color: accent, opacity: 0.55 }}>{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none"
        style={{ fontFamily: "var(--font-bebas)", color: accent, letterSpacing: "0.04em",
          textShadow: `0 0 20px ${accent}55` }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[9px] leading-none truncate"
          style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   HAFTALIK SERİ
══════════════════════════════════════════════════════════ */
function computeWeekStreak(records: LessonRecord[]): number {
  if (!records.length) return 0;
  const sow = (d: Date) => {
    const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(d).setDate(diff));
  };
  let ws = sow(new Date()); let streak = 0;
  for (let i = 0; i < 12; i++) {
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    if (!records.some(r => r.date >= ws.toISOString().split("T")[0] && r.date <= we.toISOString().split("T")[0])) break;
    streak++; ws = new Date(ws); ws.setDate(ws.getDate() - 7);
  }
  return streak;
}

/* ══════════════════════════════════════════════════════════
   GÖRSEL SIKIŞTIRICISI
══════════════════════════════════════════════════════════ */
async function compressImage(file: File, maxPx = 400): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(blob => resolve(blob!), "image/jpeg", 0.88);
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ══════════════════════════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════════════════════════ */
export default function ProfilPage() {
  const { student } = useAuth();
  const [loading, setLoading]               = useState(true);
  const [avatarColor, setAvatarColor]       = useState("#8B5CF6");
  const [photoUrl, setPhotoUrl]             = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadErr, setUploadErr]           = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<{
    lifetimeXP: number; seasonXP: number;
    levelId: string; levelIcon: string; levelName: string;
    levelColor: string; levelGradFrom: string; levelGradTo: string;
    progressPct: number; xpInLevel: number; xpToNext: number;
    nextLevelName: string | null; nextLevelThreshold: number;
    levelRangeXP: number;
    completedLessons: number; badgeCount: number;
    techAvg: string; bestScore: string; weekStreak: number;
    duetCount: number; seasonLabel: string; hofRank: number;
    firstName: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("avatar_color");
    if (saved) setAvatarColor(saved);
  }, []);

  useEffect(() => {
    if (student?.avatarUrl) setPhotoUrl(student.avatarUrl);
  }, [student]);

  useEffect(() => {
    if (!student) return;
    const season = getCurrentSeason();
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id),
      getStudents().catch(() => []),
    ]).then(([apts, recs, xpAdj, allStudents]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      // XP FIX: kullan appointments'tan hesaplanan değeri de karşılaştır
      const allCompleted = apts.filter(a => a.status === "tamamlandi").length;
      const effectiveLessons = Math.max(student.completedLessons, allCompleted);
      const xpSummary = computeFullXP(effectiveLessons, apts, sorted, season, xpAdj);
      const lifetimeXP = xpSummary.lifetimeResult.breakdown.total;
      // XP FIX: sezon XP, ömür boyu XP'yi aşamaz
      const rawSeasonXP = xpSummary.seasonResult.breakdown.total;
      const seasonXP    = Math.min(rawSeasonXP, lifetimeXP);
      const lv          = xpSummary.lifetimeResult.level;
      const manualXP    = sumManualXP(xpAdj);
      const badges      = computeBadges(student, apts, sorted, {}, manualXP);
      const tech        = computeTechnicalAverages(sorted);
      const avgNum      = tech ? (tech.punch+tech.kick+tech.defense+tech.conditioning)/4 : null;
      const levelRange  = lv.next ? lv.next.threshold - lv.current.threshold : 5000;

      const hofRank = allStudents
        .filter(s => s.isActive && s.showInHallOfFame)
        .sort((a, b) => b.completedLessons - a.completedLessons)
        .findIndex(s => s.id === student.id) + 1;

      setStats({
        lifetimeXP, seasonXP,
        levelId:         lv.current.id,
        levelIcon:       lv.current.icon,
        levelName:       lv.current.name,
        levelColor:      lv.current.colorPrimary,
        levelGradFrom:   lv.current.gradFrom,
        levelGradTo:     lv.current.gradTo,
        progressPct:     lv.progressPct,
        xpInLevel:       lv.xpInLevel,
        xpToNext:        lv.xpToNext,
        nextLevelName:   lv.next?.name ?? null,
        nextLevelThreshold: lv.next?.threshold ?? 0,
        levelRangeXP:    levelRange,
        completedLessons:student.completedLessons,
        badgeCount:      countEarnedBadges(badges),
        techAvg:         avgNum !== null ? `${avgNum.toFixed(1)}/10` : "—",
        bestScore:       sorted.length ? `${Math.max(...sorted.map(r => r.overall))}/10` : "—",
        weekStreak:      computeWeekStreak(sorted),
        duetCount:       apts.filter(a => a.lessonType==="duet"&&a.status==="onaylandi").length,
        seasonLabel:     getSeasonLabel(season),
        hofRank:         hofRank > 0 ? hofRank : 0,
        firstName:       student.fullName.trim().split(" ")[0],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student]);

  const handleColorSelect = (hex: string) => {
    setAvatarColor(hex); localStorage.setItem("avatar_color", hex); setShowColorPicker(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    if (!file.type.startsWith("image/")) { setUploadErr("Sadece görsel dosyalar."); return; }
    setUploading(true); setUploadErr(null);
    try {
      const compressed = await compressImage(file, 400);
      const url = await uploadStudentAvatar(student.id, compressed, "image/jpeg");
      if (url) setPhotoUrl(url);
      else setUploadErr("Yükleme başarısız — Supabase Storage ayarlarını kontrol et.");
    } catch { setUploadErr("Beklenmedik hata."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handlePhotoDelete = async () => {
    if (!student) return; setUploading(true);
    await deleteStudentAvatar(student.id).catch(() => {});
    setPhotoUrl(null); setUploading(false);
  };

  /* ── Loading ── */
  if (!student || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2"
          style={{ borderColor: "rgba(139,92,246,.35)", borderTopColor: "#8B5CF6" }} />
        <p style={{ color: "rgba(255,255,255,.2)", fontFamily: "var(--font-barlow-condensed)", fontSize: 12, letterSpacing: "0.1em" }}>
          SPORCU KİMLİĞİ YÜKLENİYOR…
        </p>
      </div>
    );
  }

  const parts    = student.fullName.trim().split(" ");
  const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const isLegend = stats?.levelId === "legend";
  const gc = stats?.levelColor ?? "#8B5CF6";
  const gf = stats?.levelGradFrom ?? "#8B5CF6";
  const gt = stats?.levelGradTo ?? "#D946EF";
  // Membership tier overrides avatar border color for sampiyon/efsane
  const memberColor = student.packageType === "efsane" ? "#C084FC"
    : student.packageType === "sampiyon" ? "#FBBF24" : null;

  const fmtXP = (v: number) => v >= 1000 ? `${(v/1000).toFixed(v%1000===0?0:1)}K` : String(v);

  /* ── Kedi AI analiz metni ── */
  const kediText = stats ? (() => {
    const lines: string[] = [];
    lines.push(`${stats.firstName} bu sezon ${fmtXP(stats.seasonXP)} XP topladı.`);
    if (stats.techAvg !== "—") lines.push(`Teknik ortalaması ${stats.techAvg}.`);
    if (stats.xpToNext > 0 && stats.nextLevelName) {
      lines.push(`${stats.nextLevelName} seviyesine ${fmtXP(stats.xpToNext)} XP kaldı.`);
    } else if (!stats.nextLevelName) {
      lines.push("Maksimum seviyeye ulaştı — tam efsane!");
    }
    if (stats.weekStreak >= 3) lines.push(`${stats.weekStreak} haftalık antrenman serisi var — harika momentum!`);
    else if (stats.weekStreak === 0) lines.push("Bu hafta antrenman kaydı yok — harekete geç!");
    else lines.push("Bu hafta 2 ders daha yaparsa ekstra seri bonusu kazanabilir.");
    return lines.join(" ");
  })() : "";

  /* ── Fight Wednesday meydan okuması ── */
  const today = new Date().getDay(); // 0=Pazar, 3=Çarşamba
  const daysToWed = today <= 3 ? 3 - today : 10 - today;
  const isWednesday = today === 3;
  const fwChallenge = stats
    ? (stats.techAvg !== "—" && parseFloat(stats.techAvg) < 7)
      ? { text: "Antrenmanında 7+ teknik skor al", xp: 150 }
      : stats.weekStreak === 0
      ? { text: "Bu hafta ilk dersini tamamla — seriyi başlat", xp: 100 }
      : { text: `${stats.weekStreak + 1} haftalık seriyi koru — bu hafta antrenmanını yap`, xp: 200 }
    : null;

  /* ── Mini ticker items ── */
  const tickerItems = stats ? [
    `⚡ ${stats.firstName} bu sezon ${fmtXP(stats.seasonXP)} XP topladı`,
    stats.weekStreak > 0 ? `🔥 ${stats.weekStreak} haftalık antrenman serisi devam ediyor` : `🎯 ${stats.completedLessons} ders tamamlandı`,
    stats.hofRank > 0 ? `🏆 Onur listesinde #${stats.hofRank}. sırada` : `📈 Onur listesine ilerle`,
    stats.xpToNext > 0 ? `⬆️ ${stats.nextLevelName} için ${fmtXP(stats.xpToNext)} XP kaldı` : `👑 Maksimum seviyeye ulaştı!`,
    `🎖️ ${stats.badgeCount} rozet kazanıldı`,
  ] : [];
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="max-w-lg mx-auto pb-28 space-y-3">

        {/* ═══════════════════════════════════════════════
            HERO CARD
        ═══════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl"
          style={{
            background: `linear-gradient(160deg, ${gf}18 0%, ${gt}06 50%, rgba(0,0,0,0) 100%), rgba(255,255,255,0.02)`,
            border: `1px solid ${gc}${isLegend ? "88" : "44"}`,
            boxShadow: `0 0 60px ${gc}${isLegend ? "44" : "22"}, 0 0 120px ${gc}${isLegend ? "22" : "11"}`,
          }}>
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${gf} 30%, ${gt} 70%, transparent)` }} />
          {/* Legend bg effects */}
          {isLegend && (
            <>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(192,132,252,0.15), transparent 70%)" }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 15% 85%, rgba(124,58,237,0.12), transparent 60%)" }} />
            </>
          )}

          <div className="relative z-10 flex flex-col items-center px-5 pt-7 pb-6">
            {/* Legend crown */}
            {isLegend && (
              <motion.div animate={{ y: [0,-5,0], scale: [1,1.1,1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-4xl mb-1 select-none"
                style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,0.9))" }}>
                👑
              </motion.div>
            )}

            {/* Level pill */}
            {stats && (
              <div className="mb-5 px-5 py-1.5 rounded-full flex items-center gap-2"
                style={{
                  background: `${gc}18`, border: `1px solid ${gc}44`,
                  fontFamily: "var(--font-barlow-condensed)",
                  fontSize: 11, letterSpacing: "0.18em",
                  color: gc, textTransform: "uppercase" as const,
                  boxShadow: `0 0 18px ${gc}22`,
                  /* mobile overflow fix */
                  maxWidth: "calc(100vw - 64px)",
                  overflow: "hidden",
                  whiteSpace: "nowrap" as const,
                  textOverflow: "ellipsis",
                  flexShrink: 0,
                }}>
                <span className="text-base flex-shrink-0">{stats.levelIcon}</span>
                <span className="font-bold truncate">{stats.levelName}</span>
              </div>
            )}

            {/* Avatar with XP ring */}
            <div className="relative mb-4">
              <AvatarRing sizePx={140} pct={stats?.progressPct ?? 0} gradFrom={gf} gradTo={gt}>
                {/* Avatar circle */}
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative"
                  style={{
                    background: photoUrl ? "transparent"
                      : `radial-gradient(circle at 35% 30%, ${gc}44, ${gc}0d)`,
                    border: `3px solid ${memberColor ?? gc}`,
                    boxShadow: memberColor
                      ? `0 0 30px ${memberColor}77, 0 0 60px ${memberColor}33, inset 0 0 30px ${memberColor}22`
                      : `0 0 30px ${gc}55, 0 0 60px ${gc}22, inset 0 0 30px ${gc}11`,
                    fontSize: 52, fontFamily: "var(--font-bebas)", color: gc,
                    letterSpacing: "0.05em",
                    textShadow: `0 0 20px ${gc}88`,
                  }}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                  ) : uploading ? (
                    <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : initials}
                </div>
              </AvatarRing>

              {/* Upload overlay button */}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "rgba(109,40,217,0.9)", border: "1px solid rgba(139,92,246,0.6)",
                  color: "white", fontFamily: "var(--font-barlow-condensed)",
                  boxShadow: "0 0 14px rgba(109,40,217,0.55)",
                }}>
                <Upload size={10} />
                {uploading ? "Yükleniyor…" : photoUrl ? "Değiştir" : "Fotoğraf"}
              </button>

              {photoUrl && (
                <button onClick={handlePhotoDelete} disabled={uploading}
                  className="absolute -top-1 right-0 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.9)", border: "1px solid rgba(239,68,68,0.5)", boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
                  <Trash2 size={11} className="text-white" />
                </button>
              )}
            </div>

            {/* Name */}
            <div className="text-[2.4rem] sm:text-5xl font-black text-center leading-none mb-1 mt-3"
              style={{
                fontFamily: "var(--font-bebas)", letterSpacing: "0.08em",
                background: `linear-gradient(90deg, ${gf}, ${gt})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 16px ${gc}77)`,
              }}>
              {student.fullName.toUpperCase()}
            </div>
            <div className="text-[10px] mb-4"
              style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.14em" }}>
              {student.code}
            </div>

            {/* Badge strip: HoF | Streak | Badges */}
            {stats && (
              <div
                className="flex items-center gap-2 mb-5 flex-wrap justify-center"
                style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
              >
                {stats.hofRank > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)",
                      flexShrink: 0, minWidth: 0,
                      maxWidth: "calc(100vw - 80px)",
                      overflow: "hidden",
                    }}>
                    <Crown size={12} color="#FBBF24" className="flex-shrink-0" />
                    <span className="text-[11px] font-bold truncate"
                      style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                      #{stats.hofRank} Onur Listesi
                    </span>
                  </div>
                )}
                {stats.weekStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.35)",
                      flexShrink: 0, minWidth: 0,
                    }}>
                    <Flame size={12} color="#FB923C" className="flex-shrink-0" />
                    <span className="text-[11px] font-bold"
                      style={{ color: "#FB923C", fontFamily: "var(--font-barlow-condensed)" }}>
                      {stats.weekStreak} Hafta Serisi
                    </span>
                  </div>
                )}
                {stats.badgeCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)",
                      flexShrink: 0, minWidth: 0,
                    }}>
                    <Award size={12} color="#34D399" className="flex-shrink-0" />
                    <span className="text-[11px] font-bold"
                      style={{ color: "#34D399", fontFamily: "var(--font-barlow-condensed)" }}>
                      {stats.badgeCount} Rozet
                    </span>
                  </div>
                )}
                {student.packageType === "sampiyon" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.55)", flexShrink: 0, minWidth: 0,
                      boxShadow: "0 0 10px rgba(251,191,36,0.25)" }}>
                    <span style={{ fontSize: 11 }}>👑</span>
                    <span className="text-[11px] font-bold"
                      style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.05em" }}>
                      ALTIN ÜYE
                    </span>
                  </div>
                )}
                {student.packageType === "efsane" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.55)", flexShrink: 0, minWidth: 0,
                      boxShadow: "0 0 10px rgba(192,132,252,0.25)" }}>
                    <span style={{ fontSize: 11 }}>💎</span>
                    <span className="text-[11px] font-bold"
                      style={{ color: "#E9D5FF", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.05em" }}>
                      PLATİNUM ÜYE
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <div className="relative">
                <button onClick={() => setShowColorPicker(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all active:scale-95"
                  style={{ background: avatarColor+"1a", border: `1px solid ${avatarColor}44`, color: avatarColor, fontFamily: "var(--font-barlow-condensed)" }}>
                  <Palette size={12} /> Renk
                </button>
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div initial={{ opacity: 0, scale: 0.88, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.88, y: 6 }} transition={{ duration: 0.14 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-3 rounded-2xl"
                      style={{ background: "rgba(10,10,14,0.98)", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", minWidth: 156 }}>
                      <div className="text-[9px] uppercase tracking-widest mb-2 text-center"
                        style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                        Avatar Rengi
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {AVATAR_COLORS.map(c => (
                          <button key={c.id} onClick={() => handleColorSelect(c.hex)}
                            className="w-8 h-8 rounded-full transition-all active:scale-90"
                            style={{ background: c.hex, boxShadow: avatarColor===c.hex ? `0 0 0 2px white, 0 0 12px ${c.hex}` : `0 0 6px ${c.hex}44`,
                              transform: avatarColor===c.hex ? "scale(1.2)" : "scale(1)" }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/ogrenci/fight-card"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                style={{ background: "linear-gradient(90deg,rgba(139,92,246,.8),rgba(217,70,239,.7))", border: "1px solid rgba(139,92,246,.5)",
                  color: "white", fontFamily: "var(--font-barlow-condensed)", boxShadow: "0 0 18px rgba(139,92,246,.35)" }}>
                <CreditCard size={12} />
                Fight Card
              </Link>
            </div>

            {uploadErr && (
              <div className="mt-3 text-[10px] px-3 py-1.5 rounded-lg text-center"
                style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#FCA5A5", fontFamily: "var(--font-barlow-condensed)" }}>
                {uploadErr}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            FIGHTER RECORD ŞERİDİ
        ═══════════════════════════════════════════════ */}
        {stats && (
          <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-xl"
            style={{ border: `1px solid ${gc}22` }}>
            {[
              { label: "ÖMÜR BOYU XP", value: fmtXP(stats.lifetimeXP), color: gc },
              { label: "SEZON XP",     value: fmtXP(stats.seasonXP),   color: "#D946EF" },
              { label: "DERS",         value: String(stats.completedLessons), color: "#FBBF24" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center py-4 px-2"
                style={{
                  background: i===1 ? `${gc}08` : "rgba(255,255,255,0.02)",
                  borderRight: i<2 ? `1px solid ${gc}14` : "none",
                }}>
                <div className="text-2xl font-black tabular-nums leading-none"
                  style={{ fontFamily: "var(--font-bebas)", color: item.color, textShadow: `0 0 16px ${item.color}55` }}>
                  {item.value}
                </div>
                <div className="mt-1 text-[8px] uppercase tracking-[0.16em]"
                  style={{ color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-barlow-condensed)" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            SEVİYE İLERLEME KARTI
        ═══════════════════════════════════════════════ */}
        {stats && (
          <div className="rounded-xl overflow-hidden p-4 sm:p-5"
            style={{
              background: `linear-gradient(135deg, ${gf}12, rgba(0,0,0,0))`,
              border: `1px solid ${gc}28`,
            }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={13} style={{ color: gc }} />
              <span className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)" }}>
                Seviye İlerlemesi
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <CircularXP
                xp={stats.xpInLevel}
                maxXP={stats.levelRangeXP}
                color={gc}
                gradFrom={gf}
                gradTo={gt}
                size={110}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-black leading-none"
                    style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em",
                      background: `linear-gradient(90deg,${gf},${gt})`,
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {stats.levelIcon} {stats.levelName}
                  </span>
                </div>
                <div className="text-[11px] mb-2.5"
                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                  {stats.xpInLevel.toLocaleString()} / {stats.levelRangeXP.toLocaleString()} XP
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-2"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPct}%` }}
                    transition={{ duration: 1.4, ease: [0.25,0.46,0.45,0.94] }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg,${gf},${gt})`,
                      boxShadow: `0 0 8px ${gt}88`,
                    }}
                  />
                </div>
                {stats.nextLevelName ? (
                  <div className="flex items-center gap-1"
                    style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)", fontSize: 10 }}>
                    <ChevronRight size={10} />
                    <span>{stats.nextLevelName} için</span>
                    <span className="font-bold" style={{ color: gc }}>{fmtXP(stats.xpToNext)} XP</span>
                    <span>kaldı</span>
                  </div>
                ) : (
                  <div className="text-[10px] font-bold"
                    style={{ color: gc, fontFamily: "var(--font-barlow-condensed)" }}>
                    👑 Maksimum seviye — Efsane Sporcu!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            İSTATİSTİK KARTLARI
        ═══════════════════════════════════════════════ */}
        {stats && (
          <>
            <div className="flex items-center gap-2 px-1 pt-1">
              <Shield size={12} style={{ color: "rgba(255,255,255,0.14)" }} />
              <span className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.16)", fontFamily: "var(--font-bebas)" }}>
                Savaşçı İstatistikleri
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <StatCard icon={<BookOpen size={13}/>}   label="Tamamlanan Ders"   accent="#FBBF24"
                value={stats.completedLessons} sub="ders birimi" />
              <StatCard icon={<Award size={13}/>}      label="Rozet Sayısı"      accent="#34D399"
                value={stats.badgeCount} sub="kazanılan rozet" />
              <StatCard icon={<Target size={13}/>}     label="Teknik Ortalama"   accent="#60A5FA"
                value={stats.techAvg} sub="yumruk · tekme · savunma · kondisyon" />
              <StatCard icon={<Star size={13}/>}       label="En İyi Skor"       accent="#F87171"
                value={stats.bestScore} sub="genel değerlendirme" />
              <StatCard icon={<Flame size={13}/>}      label="Haftalık Seri"     accent="#A78BFA"
                value={`${stats.weekStreak}W`} sub="üst üste hafta" />
              <StatCard icon={<Users size={13}/>}      label="Düet Ders"         accent="#FB923C"
                value={stats.duetCount} sub="partner egzersizi" />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════
            MİNİ AKTİVİTE TICKER
        ═══════════════════════════════════════════════ */}
        {tickerItems.length > 0 && (
          <div className="relative overflow-hidden rounded-lg"
            style={{ height: 36, background: `${gc}08`, border: `1px solid ${gc}18` }}>
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{ background: "linear-gradient(90deg,rgba(10,10,14,.98),transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{ background: "linear-gradient(270deg,rgba(10,10,14,.98),transparent)" }} />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-1.5 h-1.5 rounded-full"
              style={{ background: gc, boxShadow: `0 0 8px ${gc}` }} />
            <div className="flex items-center h-full pl-6 animate-marquee whitespace-nowrap will-change-transform">
              {doubled.map((item, i) => (
                <span key={i} className="inline-flex items-center mr-12"
                  style={{
                    fontFamily: "var(--font-barlow-condensed)", fontSize: 11,
                    letterSpacing: "0.04em",
                    color: i%2===0 ? "rgba(255,255,255,0.45)" : "rgba(196,181,253,0.5)",
                  }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            KEDİ AI ANALİZ KARTI
        ═══════════════════════════════════════════════ */}
        {stats && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-xl p-4 sm:p-5"
            style={{
              background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,132,252,0.05))",
              border: "1px solid rgba(139,92,246,0.28)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
              style={{ background: "linear-gradient(90deg,transparent,#8B5CF6,#D946EF,transparent)" }} />
            <div className="flex items-start gap-3">
              <div className="text-2xl select-none flex-shrink-0 mt-0.5">🐱</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold mb-1.5 tracking-wide"
                  style={{ fontFamily: "var(--font-barlow-condensed)", color: "#C4B5FD", letterSpacing: "0.12em" }}>
                  KEDİ AI ANALİZİ
                </div>
                <p className="text-[11px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-barlow-condensed)" }}>
                  {kediText}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            FIGHT WEDNESDAY KARTI
        ═══════════════════════════════════════════════ */}
        {fwChallenge && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-xl"
            style={{
              background: "linear-gradient(135deg,rgba(220,38,38,0.14),rgba(239,68,68,0.05))",
              border: `1px solid rgba(220,38,38,0.${isWednesday?"5":"3"})`,
              boxShadow: isWednesday ? "0 0 30px rgba(220,38,38,0.2)" : "none",
            }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
              style={{ background: "linear-gradient(90deg,transparent,#DC2626,#F97316,transparent)" }} />
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3"
              style={{ borderBottom: "1px solid rgba(220,38,38,0.15)" }}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} color="#F97316" />
                <span className="text-xs font-black tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-bebas)", color: "#F97316", letterSpacing: "0.2em", fontSize: 13 }}>
                  {isWednesday ? "⚔️ BUGÜN ÇARŞAMBA SAVAŞI" : `ÇARŞAMBA MİSYONU — ${daysToWed} GÜN KALDI`}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)" }}>
                <Zap size={10} color="#FBBF24" />
                <span className="text-[10px] font-bold" style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                  +{fwChallenge.xp} XP
                </span>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <p className="text-[12px] leading-snug"
                style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-barlow-condensed)" }}>
                {fwChallenge.text}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5"
                style={{ color: "rgba(220,38,38,0.6)", fontFamily: "var(--font-barlow-condensed)", fontSize: 10 }}>
                <TrendingUp size={10} />
                <span>Görevi tamamla, XP kazan</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════
            EFSANE SPORCU BANNER
        ═══════════════════════════════════════════════ */}
        {isLegend && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg,rgba(124,58,237,0.22),rgba(192,132,252,0.08))",
              border: "1px solid rgba(192,132,252,0.45)",
              boxShadow: "0 0 40px rgba(192,132,252,0.14), inset 0 0 40px rgba(192,132,252,0.04)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,transparent,#C084FC,#F0ABFC,transparent)" }} />
            <div className="text-2xl mb-1">👑</div>
            <div className="text-sm font-black tracking-[0.2em] uppercase mb-1"
              style={{ fontFamily: "var(--font-bebas)", color: "#C084FC" }}>
              Efsane Sporcu
            </div>
            <div className="text-[10px]"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
              Bu seviye sadece en disiplinli sporcular içindir. Onur Listesi&apos;nde zirvede.
            </div>
          </motion.div>
        )}

        <p className="text-center text-[9px] pb-2"
          style={{ color: "rgba(255,255,255,0.1)", fontFamily: "var(--font-barlow-condensed)" }}>
          Avatar rengi yalnızca bu cihazda kaydedilir.
        </p>
      </motion.div>
    </>
  );
}
