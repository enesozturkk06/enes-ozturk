"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Zap, TrendingUp, BookOpen, Award, Target, Star, Flame, Users,
  Upload, Trash2, Palette, Camera, Crown, Shield,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Avatar renk seçenekleri ───────────────────────────────────── */
const AVATAR_COLORS = [
  { id: "violet",  hex: "#8B5CF6", label: "Mor"     },
  { id: "magenta", hex: "#D946EF", label: "Pembe"   },
  { id: "indigo",  hex: "#6366F1", label: "İndigo"  },
  { id: "rose",    hex: "#F43F5E", label: "Kırmızı" },
  { id: "amber",   hex: "#F59E0B", label: "Altın"   },
  { id: "teal",    hex: "#14B8A6", label: "Teal"    },
  { id: "sky",     hex: "#38BDF8", label: "Mavi"    },
  { id: "lime",    hex: "#84CC16", label: "Yeşil"   },
];

/* ── Level tema helper ──────────────────────────────────────────── */
function levelTheme(levelId: string, gradFrom: string, gradTo: string, levelColor: string) {
  const isLegend  = levelId === "legend";
  const isDiamond = levelId === "diamond";
  const isGold    = levelId === "gold";
  return {
    isLegend, isDiamond, isGold,
    ring1: levelColor,
    ring2: isLegend  ? "#F0ABFC" :
           isDiamond ? "#A5F3FC" :
           isGold    ? "#FDE68A" : gradTo,
    bgFrom: isLegend  ? "rgba(124,58,237,0.18)" :
            isDiamond ? "rgba(14,116,163,0.14)" :
            isGold    ? "rgba(217,119,6,0.14)"  : `${gradFrom}14`,
    bgTo:   isLegend  ? "rgba(192,132,252,0.08)" :
            isDiamond ? "rgba(103,232,249,0.06)" :
            isGold    ? "rgba(251,191,36,0.06)"  : `${gradTo}06`,
    glow:   isLegend  ? "rgba(192,132,252,0.35)" :
            isDiamond ? "rgba(103,232,249,0.28)" :
            isGold    ? "rgba(251,191,36,0.28)"  : `${levelColor}28`,
    border: isLegend  ? "rgba(192,132,252,0.55)" :
            isDiamond ? "rgba(103,232,249,0.45)" :
            isGold    ? "rgba(251,191,36,0.45)"  : `${levelColor}38`,
  };
}

/* ── Haftalık seri ──────────────────────────────────────────────── */
function computeWeekStreak(records: LessonRecord[]): number {
  if (!records.length) return 0;
  const startOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(d).setDate(diff));
  };
  let weekStart = startOfWeek(new Date());
  let streak = 0;
  for (let i = 0; i < 12; i++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const ws = weekStart.toISOString().split("T")[0];
    const we = weekEnd.toISOString().split("T")[0];
    const has = records.some(r => r.date >= ws && r.date <= we);
    if (!has) break;
    streak++;
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() - 7);
  }
  return streak;
}

/* ── Canvas görsel sıkıştırıcı ──────────────────────────────────── */
async function compressImage(file: File, maxPx = 400): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob!), "image/jpeg", 0.88);
    };
    img.src = URL.createObjectURL(file);
  });
}

/* ── roundRect helper ───────────────────────────────────────────── */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | [number, number, number, number],
) {
  const [tl, tr2, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr2, y);
  ctx.arcTo(x + w, y,     x + w, y + h, tr2);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x,     y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x,     y + h, x,     y,     bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x,     y,     x + w, y,     tl);
  ctx.closePath();
}

function fmtXPCanvas(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
}

/* ── Story Card Canvas ──────────────────────────────────────────── */
function drawStoryCard(
  canvas: HTMLCanvasElement,
  opts: {
    name: string; initials: string; avatarColor: string;
    levelIcon: string; levelName: string; levelId: string;
    levelGradFrom: string; levelGradTo: string; levelColor: string;
    lifetimeXP: number; seasonXP: number; completedLessons: number;
    badgeCount: number; techAvg: string; bestScore: string;
    weekStreak: number; duetCount: number; hofRank: number;
  }
) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const isLegend = opts.levelId === "legend";

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   isLegend ? "#0d0818" : "#09090B");
  bg.addColorStop(0.5, isLegend ? "#110b1f" : "#0f0f18");
  bg.addColorStop(1,   isLegend ? "#160d1e" : "#12091a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Level glow orbs
  const gc = opts.levelColor;
  const g1 = ctx.createRadialGradient(W * 0.85, H * 0.2, 0, W * 0.85, H * 0.2, 480);
  g1.addColorStop(0, gc + "30"); g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.1, H * 0.65, 0, W * 0.1, H * 0.65, 380);
  g2.addColorStop(0, gc + "20"); g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // Top accent line
  const topLine = ctx.createLinearGradient(0, 0, W, 0);
  topLine.addColorStop(0, "transparent");
  topLine.addColorStop(0.3, opts.levelGradFrom);
  topLine.addColorStop(0.7, opts.levelGradTo);
  topLine.addColorStop(1, "transparent");
  ctx.strokeStyle = topLine; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(W, 3); ctx.stroke();

  // Brand header
  const hx = 108, hy = 140, hr = 60;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    const px = hx + hr * Math.cos(a), py = hy + hr * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(220,38,38,0.8)"; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = "rgba(220,38,38,0.1)"; ctx.fill();
  ctx.fillStyle = "rgba(220,38,38,0.9)";
  ctx.font = "bold 38px Impact,Arial Black,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("EÖ", hx, hy);

  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 42px Impact,Arial Black,sans-serif";
  ctx.fillText("ANTRENÖR ENES ÖZTÜRK", 208, 128);
  ctx.fillStyle = "rgba(220,38,38,0.85)";
  ctx.font = "28px Arial,sans-serif";
  ctx.fillText("KİŞİSEL ANTRENÖR  ·  @p.t.enesozturk", 210, 172);

  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 230); ctx.lineTo(W - 80, 230); ctx.stroke();

  // Avatar
  const avCx = W / 2, avCy = 520, avR = 190;
  // Outer glow
  for (let r = avR + 50; r > avR; r -= 10) {
    const alpha = ((avR + 50 - r) / 50) * 0.15;
    ctx.beginPath(); ctx.arc(avCx, avCy, r, 0, Math.PI * 2);
    ctx.strokeStyle = gc + Math.round(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1; ctx.stroke();
  }
  // Double ring
  ctx.beginPath(); ctx.arc(avCx, avCy, avR + 14, 0, Math.PI * 2);
  ctx.strokeStyle = gc + "40"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(avCx, avCy, avR + 4, 0, Math.PI * 2);
  ctx.strokeStyle = gc; ctx.lineWidth = 4; ctx.stroke();
  // Fill
  const avG = ctx.createRadialGradient(avCx - 60, avCy - 60, 0, avCx, avCy, avR);
  avG.addColorStop(0, gc + "33"); avG.addColorStop(1, gc + "0d");
  ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
  ctx.fillStyle = avG; ctx.fill();
  // Initials
  ctx.fillStyle = gc;
  ctx.font = `bold 120px Impact,Arial Black,sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(opts.initials, avCx, avCy + 6);

  // Legend crown
  if (isLegend) {
    ctx.font = "100px serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("👑", avCx - 50, avCy - avR - 20);
  }

  // Name
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = "bold 86px Impact,Arial Black,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.name.toUpperCase(), W / 2, 800);

  // Level pill
  const lbY = 840;
  ctx.fillStyle = gc + "22";
  roundRect(ctx, W / 2 - 240, lbY, 480, 80, 40);
  ctx.fill();
  ctx.strokeStyle = gc + "66"; ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 240, lbY, 480, 80, 40);
  ctx.stroke();
  ctx.fillStyle = gc;
  ctx.font = "bold 44px Impact,Arial Black,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.levelIcon}  ${opts.levelName.toUpperCase()}`, W / 2, lbY + 52);

  // HoF rank badge
  if (opts.hofRank > 0) {
    const rankX = W - 240, rankY = 840;
    ctx.fillStyle = "rgba(251,191,36,0.15)";
    roundRect(ctx, rankX, rankY, 180, 80, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(251,191,36,0.5)"; ctx.lineWidth = 2;
    roundRect(ctx, rankX, rankY, 180, 80, 12);
    ctx.stroke();
    ctx.fillStyle = "#FBBF24";
    ctx.font = "bold 42px Impact,Arial Black,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`#${opts.hofRank}`, rankX + 90, rankY + 52);
  }

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 980); ctx.lineTo(W - 80, 980); ctx.stroke();

  // Stats grid
  const statsData = [
    { label: "ÖMÜR BOYU XP",  value: fmtXPCanvas(opts.lifetimeXP),    color: "#8B5CF6" },
    { label: "SEZON XP",       value: fmtXPCanvas(opts.seasonXP),       color: "#D946EF" },
    { label: "TAMAMLANAN DERS",value: String(opts.completedLessons),    color: "#FBBF24" },
    { label: "ROZET SAYISI",   value: String(opts.badgeCount),          color: "#34D399" },
    { label: "TEKNİK ORT.",    value: opts.techAvg,                     color: "#60A5FA" },
    { label: "EN İYİ SKOR",   value: opts.bestScore,                   color: "#F87171" },
    { label: "HAFTALIK SERİ", value: `${opts.weekStreak}HFT`,          color: "#A78BFA" },
    { label: "DÜET DERS",     value: String(opts.duetCount),           color: "#FB923C" },
  ];
  const gx = 80, gy = 1020, cw = (W - 200) / 2, ch = 175, gap = 20;
  statsData.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * (cw + gap), y = gy + row * (ch + gap);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    roundRect(ctx, x, y, cw, ch, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    roundRect(ctx, x, y, cw, ch, 10); ctx.stroke();
    ctx.fillStyle = s.color + "55";
    roundRect(ctx, x, y, cw, 6, [10, 10, 0, 0]); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "22px Arial,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(s.label, x + 28, y + 52);
    ctx.fillStyle = s.color;
    ctx.font = "bold 64px Impact,Arial Black,sans-serif";
    ctx.fillText(s.value, x + 28, y + 136);
  });

  // Footer
  const footY = gy + 4 * (ch + gap) + 40;
  ctx.strokeStyle = gc + "40"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, footY); ctx.lineTo(W - 80, footY); ctx.stroke();
  ctx.fillStyle = gc;
  ctx.font = "bold 52px Arial,sans-serif"; ctx.textAlign = "center";
  ctx.fillText("@p.t.enesozturk", W / 2, footY + 80);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "30px Arial,sans-serif";
  ctx.fillText(format(new Date(), "dd MMMM yyyy", { locale: tr }), W / 2, footY + 130);

  // Bottom accent line
  const botLine = ctx.createLinearGradient(0, 0, W, 0);
  botLine.addColorStop(0, "transparent");
  botLine.addColorStop(0.3, opts.levelGradFrom);
  botLine.addColorStop(0.7, opts.levelGradTo);
  botLine.addColorStop(1, "transparent");
  ctx.strokeStyle = botLine; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, H - 3); ctx.lineTo(W, H - 3); ctx.stroke();
}

/* ── Stat Icon Box ──────────────────────────────────────────────── */
function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ duration: 0.18 }}
      className="relative flex flex-col gap-2 p-4 overflow-hidden cursor-default"
      style={{
        background: `linear-gradient(135deg, ${accent}0d, rgba(0,0,0,0))`,
        border: `1px solid ${accent}22`,
        borderRadius: 8,
      }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
        style={{ background: `linear-gradient(90deg, ${accent}88, ${accent}22)` }} />
      {/* Glow on hover — CSS-only */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"
        style={{ boxShadow: `inset 0 0 40px ${accent}12` }} />

      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest leading-none"
          style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}
        >
          {label}
        </span>
        <div style={{ color: accent, opacity: 0.6 }}>{icon}</div>
      </div>
      <div
        className="text-2xl sm:text-3xl font-black tabular-nums leading-none"
        style={{ fontFamily: "var(--font-bebas)", color: accent, letterSpacing: "0.04em" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] leading-none truncate"
          style={{ color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-barlow-condensed)" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

/* ── Ana Sayfa ──────────────────────────────────────────────────── */
export default function ProfilPage() {
  const { student } = useAuth();
  const [loading, setLoading]              = useState(true);
  const [avatarColor, setAvatarColor]      = useState("#8B5CF6");
  const [photoUrl, setPhotoUrl]            = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [generating, setGenerating]        = useState(false);
  const [uploading, setUploading]          = useState(false);
  const [uploadErr, setUploadErr]          = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);

  const [stats, setStats] = useState<{
    lifetimeXP:       number;
    seasonXP:         number;
    levelId:          string;
    levelIcon:        string;
    levelName:        string;
    levelColor:       string;
    levelGradFrom:    string;
    levelGradTo:      string;
    completedLessons: number;
    badgeCount:       number;
    techAvg:          string;
    bestScore:        string;
    weekStreak:       number;
    duetCount:        number;
    seasonLabel:      string;
    hofRank:          number;
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
      const xpSummary = computeFullXP(student.completedLessons, apts, sorted, season, xpAdj);
      const lifetimeXP = xpSummary.lifetimeResult.breakdown.total;
      const seasonXP   = xpSummary.seasonResult.breakdown.total;
      const level      = xpSummary.lifetimeResult.level.current;
      const manualXP   = sumManualXP(xpAdj);
      const badges     = computeBadges(student, apts, sorted, {}, manualXP);
      const tech       = computeTechnicalAverages(sorted);
      const avgNum     = tech ? (tech.punch + tech.kick + tech.defense + tech.conditioning) / 4 : null;

      // HoF rank: sıralama completedLessons'a göre (en hızlı proxy)
      const hofRank = allStudents
        .filter(s => s.isActive && s.showInHallOfFame)
        .sort((a, b) => b.completedLessons - a.completedLessons)
        .findIndex(s => s.id === student.id) + 1;

      setStats({
        lifetimeXP,
        seasonXP,
        levelId:          level.id,
        levelIcon:        level.icon,
        levelName:        level.name,
        levelColor:       level.colorPrimary,
        levelGradFrom:    level.gradFrom,
        levelGradTo:      level.gradTo,
        completedLessons: student.completedLessons,
        badgeCount:       countEarnedBadges(badges),
        techAvg:          avgNum !== null ? `${avgNum.toFixed(1)}/10` : "—",
        bestScore:        sorted.length ? `${Math.max(...sorted.map(r => r.overall))}/10` : "—",
        weekStreak:       computeWeekStreak(sorted),
        duetCount:        apts.filter(a => a.lessonType === "duet" && a.status === "onaylandi").length,
        seasonLabel:      getSeasonLabel(season),
        hofRank:          hofRank > 0 ? hofRank : 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student]);

  const handleColorSelect = (hex: string) => {
    setAvatarColor(hex);
    localStorage.setItem("avatar_color", hex);
    setShowColorPicker(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    if (!file.type.startsWith("image/")) {
      setUploadErr("Sadece görsel dosyalar kabul edilir.");
      return;
    }
    setUploading(true); setUploadErr(null);
    try {
      const compressed = await compressImage(file, 400);
      const url = await uploadStudentAvatar(student.id, compressed, "image/jpeg");
      if (url) setPhotoUrl(url);
      else setUploadErr("Yükleme başarısız. Supabase Storage ayarlarını kontrol edin.");
    } catch {
      setUploadErr("Beklenmedik bir hata oluştu.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    if (!student) return;
    setUploading(true);
    await deleteStudentAvatar(student.id).catch(() => {});
    setPhotoUrl(null);
    setUploading(false);
  };

  const handleGenerateCard = useCallback(async () => {
    if (!student || !stats || !canvasRef.current) return;
    setGenerating(true);
    const parts    = student.fullName.trim().split(" ");
    const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
    try {
      drawStoryCard(canvasRef.current, {
        name: student.fullName, initials, avatarColor,
        levelId: stats.levelId, levelIcon: stats.levelIcon, levelName: stats.levelName,
        levelGradFrom: stats.levelGradFrom, levelGradTo: stats.levelGradTo,
        levelColor: stats.levelColor,
        lifetimeXP: stats.lifetimeXP, seasonXP: stats.seasonXP,
        completedLessons: stats.completedLessons, badgeCount: stats.badgeCount,
        techAvg: stats.techAvg, bestScore: stats.bestScore,
        weekStreak: stats.weekStreak, duetCount: stats.duetCount,
        hofRank: stats.hofRank,
      });
      const link = document.createElement("a");
      link.download = `${student.fullName.replace(/\s+/g, "_")}_fight_card.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } finally {
      setGenerating(false);
    }
  }, [student, stats, avatarColor]);

  /* ── Loading ── */
  if (!student || loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2"
          style={{ borderColor: "rgba(139,92,246,0.4)", borderTopColor: "#8B5CF6" }}
        />
      </div>
    );
  }

  const parts     = student.fullName.trim().split(" ");
  const initials  = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const theme     = stats
    ? levelTheme(stats.levelId, stats.levelGradFrom, stats.levelGradTo, stats.levelColor)
    : null;

  const fmtXP = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : String(v);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input ref={fileInputRef} type="file" accept="image/*"
        className="hidden" onChange={handlePhotoUpload} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto pb-28 space-y-3"
      >

        {/* ═══════════════════════════════════════════════════════
            HERO SECTION — tam genişlik, seviye teması
        ══════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            background: theme
              ? `linear-gradient(160deg, ${theme.bgFrom} 0%, ${theme.bgTo} 60%, rgba(0,0,0,0) 100%), rgba(255,255,255,0.02)`
              : "rgba(255,255,255,0.02)",
            border: `1px solid ${theme ? theme.border : "rgba(255,255,255,0.08)"}`,
            boxShadow: theme ? `0 0 60px ${theme.glow}, 0 0 120px ${theme.glow}55` : "none",
          }}
        >
          {/* Top accent line */}
          {theme && (
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${stats!.levelGradFrom} 30%, ${stats!.levelGradTo} 70%, transparent 100%)`,
              }} />
          )}

          {/* Efsane: arka plan efekti */}
          {theme?.isLegend && (
            <>
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 0%, rgba(192,132,252,0.12) 0%, transparent 70%)",
                }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 20% 80%, rgba(124,58,237,0.1) 0%, transparent 60%)",
                }} />
            </>
          )}

          {/* ── İçerik ── */}
          <div className="relative z-10 flex flex-col items-center pt-8 pb-7 px-4 sm:px-8">

            {/* Efsane seviye: animasyonlu taç */}
            {theme?.isLegend && (
              <motion.div
                animate={{ y: [0, -4, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-1 text-4xl select-none"
                style={{ filter: "drop-shadow(0 0 12px rgba(251,191,36,0.8))" }}
              >
                👑
              </motion.div>
            )}

            {/* Seviye rozeti (üstte) */}
            {stats && (
              <div
                className="mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2"
                style={{
                  background: `${stats.levelColor}18`,
                  border: `1px solid ${stats.levelColor}44`,
                  color: stats.levelColor,
                  fontFamily: "var(--font-barlow-condensed)",
                  letterSpacing: "0.15em",
                  boxShadow: `0 0 16px ${stats.levelColor}22`,
                }}
              >
                <span>{stats.levelIcon}</span>
                <span>{stats.levelName.toUpperCase()}</span>
              </div>
            )}

            {/* ── Avatar ── */}
            <div className="relative mb-5">
              {/* Outer glow rings */}
              {theme && (
                <>
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${theme.ring2}22`,
                      borderRadius: "50%",
                      transform: "scale(1.22)",
                    }} />
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${theme.ring1}44`,
                      borderRadius: "50%",
                      transform: "scale(1.12)",
                    }} />
                </>
              )}

              {/* Avatar circle */}
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden flex items-center justify-center relative"
                style={{
                  background: photoUrl
                    ? "transparent"
                    : `radial-gradient(circle at 35% 35%, ${avatarColor}44, ${avatarColor}11)`,
                  border: `3px solid ${theme ? theme.ring1 : avatarColor}`,
                  boxShadow: `0 0 0 1px ${theme ? theme.ring2 + "33" : avatarColor + "22"}, 0 0 40px ${theme ? theme.glow : avatarColor + "44"}`,
                  fontSize: 52,
                  fontFamily: "var(--font-bebas)",
                  color: avatarColor,
                  letterSpacing: "0.05em",
                }}
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  initials
                )}
              </div>

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                style={{
                  background: "rgba(109,40,217,0.85)",
                  border: "1px solid rgba(139,92,246,0.6)",
                  color: "white",
                  fontFamily: "var(--font-barlow-condensed)",
                  boxShadow: "0 0 12px rgba(109,40,217,0.5)",
                }}
              >
                <Upload size={10} />
                {uploading ? "Yükleniyor…" : photoUrl ? "Değiştir" : "Fotoğraf"}
              </button>

              {/* Delete button */}
              {photoUrl && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={uploading}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-90"
                  style={{
                    background: "rgba(239,68,68,0.85)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    boxShadow: "0 0 8px rgba(239,68,68,0.4)",
                  }}
                >
                  <Trash2 size={11} className="text-white" />
                </button>
              )}
            </div>

            {/* ── İsim ── */}
            <div
              className="text-3xl sm:text-4xl font-black tracking-wide text-center leading-none mb-1"
              style={{
                fontFamily: "var(--font-bebas)",
                letterSpacing: "0.1em",
                background: theme
                  ? `linear-gradient(90deg, ${stats!.levelGradFrom}, ${stats!.levelGradTo})`
                  : "white",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: theme ? `drop-shadow(0 0 12px ${stats!.levelColor}66)` : "none",
              }}
            >
              {student.fullName.toUpperCase()}
            </div>
            <div
              className="text-[11px] mb-4"
              style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.12em" }}
            >
              {student.code}
            </div>

            {/* ── Kimlik şeridi ── */}
            {stats && (
              <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                {/* XP */}
                <div className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg"
                  style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Zap size={14} color="#8B5CF6" />
                  <div className="text-lg font-black tabular-nums leading-none"
                    style={{ fontFamily: "var(--font-bebas)", color: "#8B5CF6", letterSpacing: "0.05em" }}>
                    {fmtXP(stats.lifetimeXP)}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                    Toplam XP
                  </div>
                </div>

                {/* HoF Sırası */}
                <div className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)" }}>
                  <Crown size={14} color="#FBBF24" />
                  <div className="text-lg font-black leading-none"
                    style={{ fontFamily: "var(--font-bebas)", color: "#FBBF24", letterSpacing: "0.05em" }}>
                    {stats.hofRank > 0 ? `#${stats.hofRank}` : "—"}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                    HoF Sırası
                  </div>
                </div>

                {/* Seri */}
                <div className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  <Flame size={14} color="#FB923C" />
                  <div className="text-lg font-black leading-none"
                    style={{ fontFamily: "var(--font-bebas)", color: "#FB923C", letterSpacing: "0.05em" }}>
                    {stats.weekStreak}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                    Haftalık Seri
                  </div>
                </div>
              </div>
            )}

            {/* ── Alt butonlar ── */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {/* Renk seçici */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all active:scale-95"
                  style={{
                    background: avatarColor + "22",
                    border: `1px solid ${avatarColor}55`,
                    color: avatarColor,
                    fontFamily: "var(--font-barlow-condensed)",
                  }}
                >
                  <Palette size={12} />
                  Renk
                </button>

                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.88, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.88, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 p-3 rounded-2xl"
                      style={{
                        background: "rgba(12,12,16,0.97)",
                        border: "1px solid rgba(139,92,246,0.3)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                        minWidth: 160,
                      }}
                    >
                      <div className="text-[9px] uppercase tracking-widest mb-2 text-center"
                        style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                        Avatar Rengi
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {AVATAR_COLORS.map(c => (
                          <button key={c.id} onClick={() => handleColorSelect(c.hex)}
                            className="w-8 h-8 rounded-full transition-all active:scale-90"
                            style={{
                              background: c.hex,
                              boxShadow: avatarColor === c.hex
                                ? `0 0 0 2px white, 0 0 12px ${c.hex}`
                                : `0 0 6px ${c.hex}55`,
                              transform: avatarColor === c.hex ? "scale(1.18)" : "scale(1)",
                            }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hikaye paylaş */}
              <button
                onClick={handleGenerateCard}
                disabled={!stats || generating}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(90deg, rgba(139,92,246,0.75), rgba(217,70,239,0.65))",
                  border: "1px solid rgba(139,92,246,0.5)",
                  color: "white",
                  fontFamily: "var(--font-barlow-condensed)",
                  boxShadow: "0 0 16px rgba(139,92,246,0.3)",
                }}
              >
                <Camera size={12} />
                {generating ? "Oluşturuluyor…" : "Hikaye Olarak Paylaş"}
              </button>
            </div>

            {/* Upload error */}
            {uploadErr && (
              <div className="mt-3 text-[10px] px-3 py-1.5 rounded-lg text-center"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", fontFamily: "var(--font-barlow-condensed)" }}>
                {uploadErr}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            STATİSTİK KARTLARI
        ══════════════════════════════════════════════════════════ */}
        {stats && (
          <>
            {/* Bölüm başlığı */}
            <div className="flex items-center gap-2 px-1 pt-2">
              <Shield size={13} style={{ color: "rgba(255,255,255,0.15)" }} />
              <span
                className="text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-bebas)" }}
              >
                Savaşçı İstatistikleri
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatCard icon={<Zap size={14} />}      label="Ömür Boyu XP"     accent="#8B5CF6"
                value={fmtXP(stats.lifetimeXP)} sub="toplam puan" />
              <StatCard icon={<TrendingUp size={14} />} label="Sezon XP"        accent="#D946EF"
                value={fmtXP(stats.seasonXP)} sub={stats.seasonLabel} />
              <StatCard icon={<BookOpen size={14} />}  label="Tamamlanan Ders"  accent="#FBBF24"
                value={stats.completedLessons} sub="ders birimi" />
              <StatCard icon={<Award size={14} />}     label="Rozet Sayısı"     accent="#34D399"
                value={stats.badgeCount} sub="kazanılan rozet" />
              <StatCard icon={<Target size={14} />}    label="Teknik Ortalama"  accent="#60A5FA"
                value={stats.techAvg} sub="yumruk · tekme · savunma · kondisyon" />
              <StatCard icon={<Star size={14} />}      label="En İyi Skor"      accent="#F87171"
                value={stats.bestScore} sub="genel değerlendirme" />
              <StatCard icon={<Flame size={14} />}     label="Haftalık Seri"    accent="#A78BFA"
                value={`${stats.weekStreak} hafta`} sub="üst üste devam" />
              <StatCard icon={<Users size={14} />}     label="Düet Ders"        accent="#FB923C"
                value={stats.duetCount} sub="partner egzersizi" />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            Efsane Sporcu özel banner
        ══════════════════════════════════════════════════════════ */}
        {theme?.isLegend && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(192,132,252,0.08))",
              border: "1px solid rgba(192,132,252,0.4)",
              boxShadow: "0 0 40px rgba(192,132,252,0.15), inset 0 0 40px rgba(192,132,252,0.04)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: "linear-gradient(90deg, transparent, #C084FC, #F0ABFC, transparent)" }} />
            <div className="text-2xl mb-1">👑</div>
            <div className="text-sm font-black tracking-widest uppercase mb-1"
              style={{ fontFamily: "var(--font-bebas)", color: "#C084FC", letterSpacing: "0.2em" }}>
              Efsane Sporcu
            </div>
            <div className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
              Bu seviye sadece en disiplinli sporcular içindir. Artık Onur Listesi&apos;ndesin.
            </div>
          </motion.div>
        )}

        {/* Footer hint */}
        <p className="text-center text-[10px] pb-2"
          style={{ color: "rgba(255,255,255,0.12)", fontFamily: "var(--font-barlow-condensed)" }}>
          Avatar rengi yalnızca bu cihazda kaydedilir.
        </p>
      </motion.div>
    </>
  );
}
