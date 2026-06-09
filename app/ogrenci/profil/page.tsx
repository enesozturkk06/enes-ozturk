"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments,
  uploadStudentAvatar, deleteStudentAvatar,
} from "@/lib/db";
import type { LessonRecord, Appointment } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getSeasonLabel, sumManualXP,
} from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeTechnicalAverages, countEarnedBadges } from "@/lib/hallOfFame";
import { PageHeader } from "@/app/components/ui";
import { Palette, Camera, Upload, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Avatar renk seçenekleri ─────────────────────────────── */
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

/* ── Haftalık seri hesapla ───────────────────────────────── */
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

/* ── Görsel sıkıştırıcı (canvas) ────────────────────────── */
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

/* ── Stat kart bileşeni ──────────────────────────────────── */
function StatBox({ label, value, sub, accent = "#8B5CF6" }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 p-3 sm:p-4"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 4,
      }}
    >
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}
      >
        {label}
      </span>
      <span
        className="text-xl font-black tabular-nums leading-tight"
        style={{ fontFamily: "var(--font-bebas)", color: accent, letterSpacing: "0.05em" }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-[10px]"
          style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

/* ── Story card canvas generator ─────────────────────────── */
function drawStoryCard(
  canvas: HTMLCanvasElement,
  opts: {
    name: string;
    initials: string;
    avatarColor: string;
    levelIcon: string;
    levelName: string;
    lifetimeXP: number;
    seasonXP: number;
    completedLessons: number;
    badgeCount: number;
    techAvg: string;
    bestScore: string;
    weekStreak: number;
    duetCount: number;
  }
) {
  const W = 1080, H = 1920;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#09090B");
  bg.addColorStop(0.4, "#0f0f18");
  bg.addColorStop(1,   "#12091a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow orbs
  const glow1 = ctx.createRadialGradient(W * 0.8, H * 0.25, 0, W * 0.8, H * 0.25, 400);
  glow1.addColorStop(0, "rgba(139,92,246,0.18)");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.15, H * 0.7, 0, W * 0.15, H * 0.7, 320);
  glow2.addColorStop(0, "rgba(217,70,239,0.14)");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Top border line
  ctx.strokeStyle = "rgba(139,92,246,0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.stroke();

  // Hexagon logo (simplified)
  const hx = 100, hy = 130, hr = 52;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    const px = hx + hr * Math.cos(a);
    const py = hy + hr * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(220,38,38,0.7)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(220,38,38,0.08)";
  ctx.fill();

  ctx.fillStyle = "rgba(220,38,38,0.85)";
  ctx.font = "bold 30px Impact, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("EÖ", hx, hy + 11);

  // Brand text
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 36px Impact, Arial Black, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ANTRENÖR ENES ÖZTÜRK", 180, 120);
  ctx.fillStyle = "rgba(220,38,38,0.8)";
  ctx.font = "22px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("KİŞİSEL ANTRENÖR", 182, 158);

  // Divider
  ctx.strokeStyle = "rgba(139,92,246,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 210);
  ctx.lineTo(W - 80, 210);
  ctx.stroke();

  // Avatar circle
  const avCx = W / 2, avCy = 450, avR = 160;
  const avGrad = ctx.createRadialGradient(avCx - 40, avCy - 40, 0, avCx, avCy, avR);
  avGrad.addColorStop(0, opts.avatarColor + "44");
  avGrad.addColorStop(1, opts.avatarColor + "11");
  ctx.beginPath();
  ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
  ctx.fillStyle = avGrad;
  ctx.fill();
  ctx.strokeStyle = opts.avatarColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  // Outer glow ring
  ctx.beginPath();
  ctx.arc(avCx, avCy, avR + 12, 0, Math.PI * 2);
  ctx.strokeStyle = opts.avatarColor + "40";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Initials
  ctx.fillStyle = opts.avatarColor;
  ctx.font = "bold 100px Impact, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.initials, avCx, avCy);

  // Name
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "bold 68px Impact, Arial Black, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.fillText(opts.name.toUpperCase(), W / 2, 680);

  // Level badge
  const levelBadgeY = 730;
  ctx.fillStyle = "rgba(139,92,246,0.25)";
  roundRect(ctx, W / 2 - 200, levelBadgeY, 400, 70, 35);
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.5)";
  ctx.lineWidth = 2;
  roundRect(ctx, W / 2 - 200, levelBadgeY, 400, 70, 35);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 36px Impact, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.levelIcon}  ${opts.levelName.toUpperCase()}`, W / 2, levelBadgeY + 44);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 850);
  ctx.lineTo(W - 80, 850);
  ctx.stroke();

  // Stats grid: 2 cols × 4 rows
  const statsData = [
    { label: "ÖMÜR BOYU XP",    value: fmtXPCanvas(opts.lifetimeXP), color: "#8B5CF6" },
    { label: "SEZON XP",         value: fmtXPCanvas(opts.seasonXP),   color: "#D946EF" },
    { label: "TAMAMLANAN DERS",  value: String(opts.completedLessons), color: "#FBBF24" },
    { label: "ROZET SAYISI",     value: String(opts.badgeCount),       color: "#34D399" },
    { label: "TEKNİK ORTALAMA",  value: opts.techAvg,                  color: "#60A5FA" },
    { label: "EN İYİ SKOR",     value: opts.bestScore,                color: "#F87171" },
    { label: "HAFTALIK SERİ",   value: `${opts.weekStreak} HAFTA`,    color: "#A78BFA" },
    { label: "DÜET DERS",       value: String(opts.duetCount),        color: "#FB923C" },
  ];

  const gridX = 80, gridY = 900;
  const cellW = (W - 180) / 2, cellH = 170;
  const gap = 20;

  statsData.forEach((stat, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gridX + col * (cellW + gap);
    const y = gridY + row * (cellH + gap);

    // Cell bg
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    roundRect(ctx, x, y, cellW, cellH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, cellW, cellH, 8);
    ctx.stroke();

    // Accent top bar
    ctx.fillStyle = stat.color + "44";
    roundRect(ctx, x, y, cellW, 5, [8, 8, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "18px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(stat.label, x + 24, y + 44);

    // Value
    ctx.fillStyle = stat.color;
    ctx.font = "bold 52px Impact, Arial Black, sans-serif";
    ctx.fillText(stat.value, x + 24, y + 120);
  });

  // Bottom divider
  const footerY = gridY + 4 * (cellH + gap) + 30;
  ctx.strokeStyle = "rgba(139,92,246,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, footerY);
  ctx.lineTo(W - 80, footerY);
  ctx.stroke();

  // Footer
  ctx.fillStyle = "rgba(139,92,246,0.7)";
  ctx.font = "bold 42px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("@p.t.enesozturk", W / 2, footerY + 70);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "26px Arial, sans-serif";
  ctx.fillText(
    format(new Date(), "dd MMMM yyyy", { locale: tr }),
    W / 2,
    footerY + 120,
  );

  // Bottom border
  ctx.strokeStyle = "rgba(217,70,239,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(W, H);
  ctx.stroke();
}

function fmtXPCanvas(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | [number, number, number, number],
) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y,     x + w, y + h,  tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x,     y + h,  br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x,     y + h, x,     y,      bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x,     y,     x + w, y,      tl);
  ctx.closePath();
}

/* ── Ana sayfa bileşeni ──────────────────────────────────── */

export default function ProfilPage() {
  const { student } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [avatarColor, setAvatarColor]  = useState("#8B5CF6");
  const [photoUrl, setPhotoUrl]        = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [generating, setGenerating]    = useState(false);
  const [uploading, setUploading]      = useState(false);
  const [uploadErr, setUploadErr]      = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Computed stats
  const [stats, setStats] = useState<{
    lifetimeXP:      number;
    seasonXP:        number;
    levelIcon:       string;
    levelName:       string;
    levelColor:      string;
    levelGradFrom:   string;
    levelGradTo:     string;
    completedLessons:number;
    badgeCount:      number;
    techAvg:         string;
    bestScore:       string;
    weekStreak:      number;
    duetCount:       number;
    trainingHours:   number;
    seasonLabel:     string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("avatar_color");
    if (saved) setAvatarColor(saved);
  }, []);

  // Supabase'den kayıtlı fotoğrafı yükle
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
    ]).then(([apts, recs, xpAdj]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const xpSummary = computeFullXP(
        student.completedLessons, apts, sorted, season, xpAdj,
      );
      const lifetimeXP = xpSummary.lifetimeResult.breakdown.total;
      const seasonXP   = xpSummary.seasonResult.breakdown.total;
      const level      = xpSummary.lifetimeResult.level.current;
      const manualXP   = sumManualXP(xpAdj);
      const badges     = computeBadges(student, apts, sorted, {}, manualXP);
      const tech       = computeTechnicalAverages(sorted);

      const avgNum = tech
        ? ((tech.punch + tech.kick + tech.defense + tech.conditioning) / 4)
        : null;
      const techAvg   = avgNum !== null ? `${avgNum.toFixed(1)}/10` : "—";
      const bestScore = sorted.length
        ? `${Math.max(...sorted.map(r => r.overall))}/10`
        : "—";
      const weekStreak = computeWeekStreak(sorted);
      const duetCount  = apts.filter(
        a => a.lessonType === "duet" && a.status === "onaylandi",
      ).length;

      setStats({
        lifetimeXP,
        seasonXP,
        levelIcon:       level.icon,
        levelName:       level.name,
        levelColor:      level.colorPrimary,
        levelGradFrom:   level.gradFrom,
        levelGradTo:     level.gradTo,
        completedLessons:student.completedLessons,
        badgeCount:      countEarnedBadges(badges),
        techAvg,
        bestScore,
        weekStreak,
        duetCount,
        trainingHours:   student.completedLessons,
        seasonLabel:     getSeasonLabel(season),
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
    setUploading(true);
    setUploadErr(null);
    try {
      const compressed = await compressImage(file, 400);
      const url = await uploadStudentAvatar(student.id, compressed, "image/jpeg");
      if (url) {
        setPhotoUrl(url);
      } else {
        setUploadErr("Yükleme başarısız. Supabase Storage ayarlarını kontrol edin.");
      }
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
    const parts = student.fullName.trim().split(" ");
    const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();

    try {
      drawStoryCard(canvasRef.current, {
        name:             student.fullName,
        initials,
        avatarColor,
        levelIcon:        stats.levelIcon,
        levelName:        stats.levelName,
        lifetimeXP:       stats.lifetimeXP,
        seasonXP:         stats.seasonXP,
        completedLessons: stats.completedLessons,
        badgeCount:       stats.badgeCount,
        techAvg:          stats.techAvg,
        bestScore:        stats.bestScore,
        weekStreak:       stats.weekStreak,
        duetCount:        stats.duetCount,
      });
      const link = document.createElement("a");
      link.download = `${student.fullName.replace(/\s+/g, "_")}_story.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } finally {
      setGenerating(false);
    }
  }, [student, stats, avatarColor]);

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(139,92,246,0.4)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const parts    = student.fullName.trim().split(" ");
  const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const firstName = parts[0];

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-2xl mx-auto space-y-5 pb-24"
      >
        <PageHeader
          title="Savaşçı Profili"
          subtitle="Kimliğini oluştur, istatistiklerini paylaş"
        />

        {/* ── Avatar + isim ────────────────────────────────── */}
        <div
          className="p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden"
          style={{
            background: stats
              ? `linear-gradient(135deg, ${stats.levelGradFrom}18, rgba(0,0,0,0) 60%), rgba(255,255,255,0.025)`
              : "rgba(255,255,255,0.025)",
            border: `1px solid ${stats ? stats.levelGradFrom + "44" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 4,
            boxShadow: stats
              ? `0 0 40px ${stats.levelGradFrom}22`
              : "none",
          }}
        >
          {stats && (
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, transparent, ${stats.levelGradFrom}, ${stats.levelGradTo}, transparent)`,
              }}
            />
          )}

          {/* Gizli dosya input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {/* Fotoğraf ya da initials */}
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center text-3xl font-black select-none"
              style={{
                background: photoUrl ? "transparent" : `radial-gradient(circle, ${avatarColor}33, ${avatarColor}11)`,
                border: `3px solid ${photoUrl ? "rgba(255,255,255,0.3)" : avatarColor}`,
                boxShadow: `0 0 24px ${photoUrl ? "rgba(255,255,255,0.15)" : avatarColor + "55"}, 0 0 8px ${avatarColor}33`,
                fontFamily: "var(--font-bebas)",
                color: avatarColor,
                fontSize: 36,
                letterSpacing: "0.05em",
              }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                uploading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : initials
              )}
            </div>

            {/* Fotoğraf yükle butonu */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              style={{
                background: "#6D28D9",
                boxShadow: "0 0 10px rgba(109,40,217,0.7)",
              }}
              title="Fotoğraf yükle"
            >
              <Upload size={13} className="text-white" />
            </button>

            {/* Fotoğraf sil butonu */}
            {photoUrl && (
              <button
                onClick={handlePhotoDelete}
                disabled={uploading}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                style={{
                  background: "rgba(239,68,68,0.8)",
                  boxShadow: "0 0 8px rgba(239,68,68,0.4)",
                }}
                title="Fotoğrafı sil"
              >
                <X size={10} className="text-white" />
              </button>
            )}

            {/* Color picker button */}
            <button
              onClick={() => setShowColorPicker(p => !p)}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: avatarColor,
                boxShadow: `0 0 12px ${avatarColor}88`,
              }}
              title="Renk seç"
            >
              <Palette size={14} className="text-white" />
            </button>
          </div>

          {/* Color picker popover */}
          {showColorPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute left-4 top-28 sm:top-auto sm:left-40 z-30 p-3 rounded-2xl"
              style={{
                background: "rgba(17,17,20,0.97)",
                border: "1px solid rgba(139,92,246,0.3)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-2.5 text-center"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                Avatar Rengi
              </div>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleColorSelect(c.hex)}
                    className="w-9 h-9 rounded-full transition-transform active:scale-90"
                    style={{
                      background: c.hex,
                      boxShadow: avatarColor === c.hex
                        ? `0 0 0 2px white, 0 0 12px ${c.hex}`
                        : `0 0 8px ${c.hex}55`,
                      transform: avatarColor === c.hex ? "scale(1.15)" : "scale(1)",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Yükleme hatası */}
          {uploadErr && (
            <div className="absolute bottom-2 left-2 right-2 text-[10px] px-2 py-1 rounded text-center"
              style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", color:"#FCA5A5", fontFamily:"var(--font-barlow-condensed)" }}>
              {uploadErr}
            </div>
          )}

          {/* Name + level */}
          <div className="text-center sm:text-left">
            <div
              className="text-2xl sm:text-3xl font-black tracking-wide"
              style={{
                fontFamily: "var(--font-bebas)",
                letterSpacing: "0.1em",
                background: stats
                  ? `linear-gradient(90deg, ${stats.levelGradFrom}, ${stats.levelGradTo})`
                  : "white",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {student.fullName.toUpperCase()}
            </div>
            {stats && (
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{
                    background: `${stats.levelGradFrom}22`,
                    border: `1px solid ${stats.levelGradFrom}55`,
                    color: stats.levelColor,
                    fontFamily: "var(--font-barlow-condensed)",
                  }}
                >
                  {stats.levelIcon} {stats.levelName}
                </span>
              </div>
            )}
            <div
              className="text-xs mt-2"
              style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}
            >
              {student.code}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 active:scale-95"
                style={{
                  background: "rgba(109,40,217,0.2)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  color: "#C4B5FD",
                  fontFamily: "var(--font-barlow-condensed)",
                }}
              >
                <Upload size={12} />
                {uploading ? "Yükleniyor…" : photoUrl ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
              </button>
              {photoUrl && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 active:scale-95"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#FCA5A5",
                    fontFamily: "var(--font-barlow-condensed)",
                  }}
                >
                  <Trash2 size={12} />
                  Sil
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────────────── */}
        {stats && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span
                className="text-[11px] uppercase tracking-widest px-3"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)", letterSpacing: "0.22em" }}
              >
                Savaşçı İstatistikleri
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatBox
                label="Ömür Boyu XP"
                value={stats.lifetimeXP >= 1000
                  ? `${(stats.lifetimeXP / 1000).toFixed(stats.lifetimeXP % 1000 === 0 ? 0 : 1)}K`
                  : stats.lifetimeXP}
                sub="toplam puan"
                accent="#8B5CF6"
              />
              <StatBox
                label="Sezon XP"
                value={stats.seasonXP >= 1000
                  ? `${(stats.seasonXP / 1000).toFixed(1)}K`
                  : stats.seasonXP}
                sub={stats.seasonLabel}
                accent="#D946EF"
              />
              <StatBox
                label="Tamamlanan Ders"
                value={stats.completedLessons}
                sub={`${stats.trainingHours} saat antrenman`}
                accent="#FBBF24"
              />
              <StatBox
                label="Rozet Sayısı"
                value={stats.badgeCount}
                sub="kazanılan"
                accent="#34D399"
              />
              <StatBox
                label="Teknik Ortalama"
                value={stats.techAvg}
                sub="yumruk+tekme+savunma+kondisyon"
                accent="#60A5FA"
              />
              <StatBox
                label="En İyi Skor"
                value={stats.bestScore}
                sub="genel değerlendirme"
                accent="#F87171"
              />
              <StatBox
                label="Haftalık Seri"
                value={`${stats.weekStreak} hafta`}
                sub="üst üste devam"
                accent="#A78BFA"
              />
              <StatBox
                label="Düet Ders"
                value={stats.duetCount}
                sub="partner egzersizi"
                accent="#FB923C"
              />
            </div>
          </div>
        )}

        {/* ── Instagram Story Card ─────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span
              className="text-[11px] uppercase tracking-widest px-3"
              style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)", letterSpacing: "0.22em" }}
            >
              Paylaş
            </span>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div
            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              background: "rgba(139,92,246,0.05)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 4,
            }}
          >
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold text-white mb-1"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Instagram Story Kartı
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}
              >
                Tüm istatistiklerini içeren 1080×1920 PNG kartını oluştur ve Instagram Story&apos;nde paylaş.
              </p>
            </div>
            <button
              onClick={handleGenerateCard}
              disabled={!stats || generating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all active:scale-95 flex-shrink-0"
              style={{
                background: "linear-gradient(90deg, rgba(139,92,246,0.7), rgba(217,70,239,0.6))",
                border: "1px solid rgba(139,92,246,0.5)",
                color: "white",
                fontFamily: "var(--font-barlow-condensed)",
                letterSpacing: "0.04em",
              }}
            >
              <Camera size={16} />
              {generating ? "Oluşturuluyor…" : "PNG İndir"}
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <p
          className="text-center text-[10px] pb-2"
          style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-barlow-condensed)" }}
        >
          Avatar rengi yalnızca bu cihazda kaydedilir.
        </p>
      </motion.div>
    </>
  );
}
