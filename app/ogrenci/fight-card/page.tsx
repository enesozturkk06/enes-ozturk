"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments, getStudents,
} from "@/lib/db";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeTechnicalAverages, countEarnedBadges } from "@/lib/hallOfFame";
import { PageHeader } from "@/app/components/ui";
import {
  Camera, Crown, Award, Share2, CheckCircle2, AlertTriangle, Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/* ══════════════════════════════════════════════════════════
   SEVİYE TEMALARI — Amatör · Bronz · Gümüş · Altın · Elmas · Efsane
══════════════════════════════════════════════════════════ */
interface FightCardTheme {
  cardBg:    string;
  frameFrom: string;
  frameTo:   string;
  glow:      string;
  nameFrom:  string;
  nameTo:    string;
  accent:    string;
  statBg:    string;
}

const FIGHT_CARD_THEMES: Record<string, FightCardTheme> = {
  starter: {
    cardBg:    "linear-gradient(165deg, #1f2128 0%, #101218 60%, #06070a 100%)",
    frameFrom: "#4B5563", frameTo: "#E5E7EB",
    glow:      "rgba(156,163,175,0.4)",
    nameFrom:  "#9CA3AF", nameTo: "#F3F4F6",
    accent:    "#D1D5DB",
    statBg:    "rgba(156,163,175,0.08)",
  },
  bronze: {
    cardBg:    "linear-gradient(165deg, #2b1c0d 0%, #170f06 60%, #0a0603 100%)",
    frameFrom: "#7C4A1E", frameTo: "#F0B27A",
    glow:      "rgba(205,127,50,0.45)",
    nameFrom:  "#CD7F32", nameTo: "#FDE3B8",
    accent:    "#E8A35C",
    statBg:    "rgba(205,127,50,0.10)",
  },
  silver: {
    cardBg:    "linear-gradient(165deg, #2b2e36 0%, #15171c 60%, #090a0d 100%)",
    frameFrom: "#6B7280", frameTo: "#FFFFFF",
    glow:      "rgba(226,232,240,0.45)",
    nameFrom:  "#CBD5E1", nameTo: "#FFFFFF",
    accent:    "#E5E7EB",
    statBg:    "rgba(226,232,240,0.08)",
  },
  gold: {
    cardBg:    "linear-gradient(165deg, #2b2007 0%, #171204 60%, #0a0700 100%)",
    frameFrom: "#B45309", frameTo: "#FDE68A",
    glow:      "rgba(251,191,36,0.5)",
    nameFrom:  "#FBBF24", nameTo: "#FEF9C3",
    accent:    "#FBBF24",
    statBg:    "rgba(251,191,36,0.10)",
  },
  diamond: {
    cardBg:    "linear-gradient(165deg, #131a30 0%, #0a0e1c 60%, #05060d 100%)",
    frameFrom: "#4338CA", frameTo: "#67E8F9",
    glow:      "rgba(99,179,237,0.5)",
    nameFrom:  "#818CF8", nameTo: "#67E8F9",
    accent:    "#A5B4FC",
    statBg:    "rgba(99,102,241,0.10)",
  },
  legend: {
    cardBg:    "linear-gradient(165deg, #170c28 0%, #0b0512 55%, #040207 100%)",
    frameFrom: "#7C3AED", frameTo: "#FBBF24",
    glow:      "rgba(192,132,252,0.6)",
    nameFrom:  "#FBBF24", nameTo: "#C084FC",
    accent:    "#FBBF24",
    statBg:    "rgba(124,58,237,0.14)",
  },
};

/* ══════════════════════════════════════════════════════════
   YARDIMCI FONKSİYONLAR
══════════════════════════════════════════════════════════ */
/** 0-10 teknik puanı 1-99 FIFA tarzı stata çevirir */
function statVal(score: number): number {
  return Math.max(1, Math.min(99, Math.round(score * 10)));
}
function fmtXP(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : String(v);
}
function fmtC(v: number): string {
  return v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number) {
  const size = r * 2;
  const ratio = img.width / img.height;
  let sx: number, sy: number, sw: number, sh: number;
  if (ratio > 1) { sh = img.height; sw = sh; sy = 0; sx = (img.width - sw) / 2; }
  else { sw = img.width; sh = sw; sx = 0; sy = (img.height - sh) / 2; }
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, cx - r, cy - r, size, size);
  ctx.restore();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  const [tl, tr2, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y); ctx.lineTo(x + w - tr2, y); ctx.arcTo(x + w, y, x + w, y + h, tr2);
  ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y, bl);
  ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + w, y, tl); ctx.closePath();
}

/* ══════════════════════════════════════════════════════════
   STORY CARD CANVAS — 1080x1920 (Instagram Hikaye)
══════════════════════════════════════════════════════════ */
interface StoryCardData {
  name: string; initials: string; avatarImg: HTMLImageElement | null;
  levelIcon: string; levelName: string; levelId: string;
  levelGradFrom: string; levelGradTo: string; levelColor: string;
  lifetimeXP: number; seasonXP: number; completedLessons: number;
  badgeCount: number; hofRank: number;
  yum: number; tek: number; sav: number; kon: number;
}

function drawFightStoryCard(canvas: HTMLCanvasElement, o: StoryCardData) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const isL = o.levelId === "legend";
  const gc  = o.levelColor;

  // BG
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, isL ? "#0c0818" : "#09090B");
  bg.addColorStop(1, isL ? "#150d20" : "#12091a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Glow orbs
  [[W * .85, H * .2, 500], [W * .1, H * .65, 360]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, gc + "28"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  if (isL) {
    const g2 = ctx.createRadialGradient(W * .15, H * .85, 0, W * .15, H * .85, 420);
    g2.addColorStop(0, "#FBBF2422"); g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  // Top accent
  const tlg = ctx.createLinearGradient(0, 0, W, 0);
  tlg.addColorStop(0, "transparent"); tlg.addColorStop(.3, o.levelGradFrom);
  tlg.addColorStop(.7, o.levelGradTo); tlg.addColorStop(1, "transparent");
  ctx.strokeStyle = tlg; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(W, 3); ctx.stroke();

  // Brand
  const hx = 108, hy = 140, hr = 60;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 - Math.PI / 6; const px = hx + hr * Math.cos(a), py = hy + hr * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.strokeStyle = "rgba(220,38,38,.8)"; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = "rgba(220,38,38,.1)"; ctx.fill();
  ctx.fillStyle = "rgba(220,38,38,.9)"; ctx.font = "bold 38px Impact,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("EÖ", hx, hy);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = "bold 42px Impact,sans-serif";
  ctx.fillText("ANTRENÖR ENES ÖZTÜRK", 208, 128);
  ctx.fillStyle = "rgba(220,38,38,.8)"; ctx.font = "26px Arial,sans-serif";
  ctx.fillText("KİŞİSEL ANTRENÖR  ·  @p.t.enesozturk", 210, 170);
  ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 225); ctx.lineTo(W - 80, 225); ctx.stroke();

  // Legend crown
  if (isL) { ctx.font = "90px serif"; ctx.textAlign = "center"; ctx.fillText("👑", W / 2, 340); }

  // Avatar
  const avCx = W / 2, avCy = isL ? 580 : 540, avR = 185;
  // Outer glow rings
  for (let ri = avR + 60; ri > avR; ri -= 12) {
    const a = ((avR + 60 - ri) / 60) * .14;
    ctx.beginPath(); ctx.arc(avCx, avCy, ri, 0, Math.PI * 2);
    ctx.strokeStyle = gc + Math.round(a * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(avCx, avCy, avR + 16, 0, Math.PI * 2);
  ctx.strokeStyle = gc + "33"; ctx.lineWidth = 3; ctx.stroke();

  if (o.avatarImg) {
    drawImageCover(ctx, o.avatarImg, avCx, avCy, avR);
  } else {
    const avG = ctx.createRadialGradient(avCx - 60, avCy - 60, 0, avCx, avCy, avR);
    avG.addColorStop(0, gc + "44"); avG.addColorStop(1, gc + "0d");
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
    ctx.fillStyle = avG; ctx.fill();
    ctx.fillStyle = gc; ctx.font = "bold 120px Impact,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(o.initials, avCx, avCy + 6);
  }
  ctx.beginPath(); ctx.arc(avCx, avCy, avR + 4, 0, Math.PI * 2);
  ctx.strokeStyle = gc; ctx.lineWidth = 6; ctx.stroke();

  // Name
  const nameY = isL ? 850 : 810;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.font = "bold 86px Impact,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(o.name.toUpperCase(), W / 2, nameY);

  // Level + HoF pills
  const plY = nameY + 38;
  ctx.fillStyle = gc + "22"; rr(ctx, W / 2 - 240, plY, 480, 78, 39); ctx.fill();
  ctx.strokeStyle = gc + "66"; ctx.lineWidth = 2; rr(ctx, W / 2 - 240, plY, 480, 78, 39); ctx.stroke();
  ctx.fillStyle = gc; ctx.font = "bold 44px Impact,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${o.levelIcon}  ${o.levelName.toUpperCase()}`, W / 2, plY + 50);
  if (o.hofRank > 0) {
    ctx.fillStyle = "rgba(251,191,36,.15)"; rr(ctx, W - 270, plY, 190, 78, 12); ctx.fill();
    ctx.strokeStyle = "rgba(251,191,36,.5)"; ctx.lineWidth = 2; rr(ctx, W - 270, plY, 190, 78, 12); ctx.stroke();
    ctx.fillStyle = "#FBBF24"; ctx.font = "bold 44px Impact,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`#${o.hofRank}`, W - 175, plY + 50);
  }

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, nameY + 140); ctx.lineTo(W - 80, nameY + 140); ctx.stroke();

  // Stats grid — ÖMÜR BOYU XP / SEZON XP / YUM / TEK / SAV / KON / ROZET / DERS
  const sd = [
    { l: "ÖMÜR BOYU XP", v: fmtC(o.lifetimeXP), c: gc },
    { l: "SEZON XP",     v: fmtC(o.seasonXP),   c: "#D946EF" },
    { l: "YUM · YUMRUK", v: String(o.yum),      c: "#F87171" },
    { l: "TEK · TEKME",  v: String(o.tek),      c: "#FB923C" },
    { l: "SAV · SAVUNMA",v: String(o.sav),      c: "#60A5FA" },
    { l: "KON · KONDİSYON", v: String(o.kon),   c: "#34D399" },
    { l: "ROZET",        v: String(o.badgeCount), c: "#FBBF24" },
    { l: "DERS (DRS)",   v: String(o.completedLessons), c: "#A78BFA" },
  ];
  const gy = nameY + 180, cw = (W - 200) / 2, ch = 150, gap2 = 16;
  sd.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 80 + col * (cw + gap2), y = gy + row * (ch + gap2);
    ctx.fillStyle = "rgba(255,255,255,.03)"; rr(ctx, x, y, cw, ch, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1; rr(ctx, x, y, cw, ch, 10); ctx.stroke();
    ctx.fillStyle = s.c + "55"; rr(ctx, x, y, cw, 6, [10, 10, 0, 0]); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.font = "20px Arial,sans-serif"; ctx.textAlign = "left";
    ctx.fillText(s.l, x + 28, y + 48);
    ctx.fillStyle = s.c; ctx.font = "bold 60px Impact,sans-serif"; ctx.fillText(s.v, x + 28, y + 128);
  });

  // Footer
  const fy = gy + 4 * (ch + gap2) + 40;
  ctx.strokeStyle = gc + "44"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, fy); ctx.lineTo(W - 80, fy); ctx.stroke();
  ctx.fillStyle = gc; ctx.font = "bold 52px Arial,sans-serif"; ctx.textAlign = "center";
  ctx.fillText("@p.t.enesozturk", W / 2, fy + 78);
  ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.font = "30px Arial,sans-serif";
  ctx.fillText(format(new Date(), "dd MMMM yyyy", { locale: tr }), W / 2, fy + 128);
  const bl2 = ctx.createLinearGradient(0, 0, W, 0);
  bl2.addColorStop(0, "transparent"); bl2.addColorStop(.3, o.levelGradFrom);
  bl2.addColorStop(.7, o.levelGradTo); bl2.addColorStop(1, "transparent");
  ctx.strokeStyle = bl2; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, H - 3); ctx.lineTo(W, H - 3); ctx.stroke();
}

/* ══════════════════════════════════════════════════════════
   STAT HÜCRESİ — kart alt satırı
══════════════════════════════════════════════════════════ */
function CardStat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}28` }}>
      <div className="font-black tabular-nums leading-none" style={{ fontFamily: "var(--font-bebas)", fontSize: 20, color: accent, textShadow: `0 0 12px ${accent}66` }}>
        {value}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
        {label}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════════════════════════ */
type ShareState = "idle" | "generating" | "ready" | "shared" | "downloaded" | "error";

export default function FightCardPage() {
  const { student } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading]   = useState(true);
  const [shareState, setShareState] = useState<ShareState>("idle");

  const [stats, setStats] = useState<{
    lifetimeXP: number; seasonXP: number;
    levelId: string; levelIcon: string; levelName: string; levelShortName: string;
    levelColor: string; levelGradFrom: string; levelGradTo: string;
    completedLessons: number; badgeCount: number; hofRank: number;
    ovr: number; yum: number; tek: number; sav: number; kon: number;
  } | null>(null);

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
      const allCompleted = apts.filter(a => a.status === "tamamlandi").length;
      const effectiveLessons = Math.max(student.completedLessons, allCompleted);
      const xpSummary = computeFullXP(effectiveLessons, apts, sorted, season, xpAdj);
      const lifetimeXP = xpSummary.lifetimeResult.breakdown.total;
      const rawSeasonXP = xpSummary.seasonResult.breakdown.total;
      const seasonXP = Math.min(rawSeasonXP, lifetimeXP);
      const lv = xpSummary.lifetimeResult.level;
      const manualXP = sumManualXP(xpAdj);
      const badges = computeBadges(student, apts, sorted, {}, manualXP);
      const tech = computeTechnicalAverages(sorted) ?? { punch: 4, kick: 4, defense: 4, conditioning: 4, average: 4, sampleSize: 0 };

      const hofRank = allStudents
        .filter(s => s.isActive && s.showInHallOfFame)
        .sort((a, b) => b.completedLessons - a.completedLessons)
        .findIndex(s => s.id === student.id) + 1;

      setStats({
        lifetimeXP, seasonXP,
        levelId:        lv.current.id,
        levelIcon:      lv.current.icon,
        levelName:      lv.current.name,
        levelShortName: lv.current.shortName,
        levelColor:     lv.current.colorPrimary,
        levelGradFrom:  lv.current.gradFrom,
        levelGradTo:    lv.current.gradTo,
        completedLessons: student.completedLessons,
        badgeCount:     countEarnedBadges(badges),
        hofRank:        hofRank > 0 ? hofRank : 0,
        ovr:            statVal(tech.average),
        yum:            statVal(tech.punch),
        tek:            statVal(tech.kick),
        sav:            statVal(tech.defense),
        kon:            statVal(tech.conditioning),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student]);

  const photoUrl = student?.avatarUrl ?? null;

  /* ── Hikaye kartını otomatik oluştur ── */
  useEffect(() => {
    if (!stats || !photoUrl || !student || !canvasRef.current) return;
    let cancelled = false;
    setShareState("generating");
    const parts = student.fullName.trim().split(" ");
    const initials = parts.map(p => p[0]).join("").slice(0, 2).toUpperCase();
    (async () => {
      const img = await loadImage(photoUrl);
      if (cancelled || !canvasRef.current) return;
      drawFightStoryCard(canvasRef.current, {
        name: student.fullName, initials, avatarImg: img,
        levelIcon: stats.levelIcon, levelName: stats.levelName, levelId: stats.levelId,
        levelGradFrom: stats.levelGradFrom, levelGradTo: stats.levelGradTo, levelColor: stats.levelColor,
        lifetimeXP: stats.lifetimeXP, seasonXP: stats.seasonXP, completedLessons: stats.completedLessons,
        badgeCount: stats.badgeCount, hofRank: stats.hofRank,
        yum: stats.yum, tek: stats.tek, sav: stats.sav, kon: stats.kon,
      });
      setShareState("ready");
    })();
    return () => { cancelled = true; };
  }, [stats, photoUrl, student]);

  /* ── Paylaş / indir ── */
  const handleShare = useCallback(async () => {
    if (!canvasRef.current || !student) return;
    const canvas = canvasRef.current;
    const fileName = `${student.fullName.replace(/\s+/g, "_")}_fight_card.png`;
    let blob: Blob | null = null;
    try {
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), "image/png"));
    } catch { blob = null; }
    if (!blob) { setShareState("error"); return; }

    const file = new File([blob], fileName, { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Fight Card", text: "Fight Card'ım! @p.t.enesozturk" });
        setShareState("shared");
        return;
      } catch {
        // kullanıcı paylaşımı iptal etti — indirme akışına düşmeden bırak
        return;
      }
    }

    // Fallback: görseli indir
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    setShareState("downloaded");

    // Mobilde Instagram uygulamasını açmayı dene (en iyi çaba)
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setTimeout(() => { window.location.href = "instagram://story-camera"; }, 800);
    }
  }, [student]);

  /* ── Loading ── */
  if (!student || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2"
          style={{ borderColor: "rgba(139,92,246,.35)", borderTopColor: "#8B5CF6" }} />
        <p style={{ color: "rgba(255,255,255,.2)", fontFamily: "var(--font-barlow-condensed)", fontSize: 12, letterSpacing: "0.1em" }}>
          FIGHT CARD YÜKLENİYOR…
        </p>
      </div>
    );
  }

  /* ── Fotoğraf zorunluluğu ── */
  if (!photoUrl) {
    return (
      <div className="max-w-md mx-auto pb-20">
        <PageHeader title="Fight Card" subtitle="Premium dövüşçü kartın" accent="Fight Card" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-8 rounded-2xl text-center"
          style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.22)" }}>
          <div className="text-5xl mb-4 select-none">🥊</div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
            Fight Card oluşturmak için önce profil fotoğrafı eklemelisin.
          </p>
          <button onClick={() => router.push("/ogrenci/profil")}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all active:scale-95"
            style={{ background: "linear-gradient(90deg,#8B5CF6,#D946EF)", color: "white", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em", boxShadow: "0 0 24px rgba(139,92,246,0.35)" }}>
            <Camera size={15} /> Fotoğraf Ekle
          </button>
        </motion.div>
      </div>
    );
  }

  const theme = FIGHT_CARD_THEMES[stats!.levelId] ?? FIGHT_CARD_THEMES.starter;
  const isLegend = stats!.levelId === "legend";

  return (
    <>
      <canvas ref={canvasRef} className="rounded-2xl"
        style={{
          display: shareState === "idle" || shareState === "generating" ? "none" : "block",
          width: "100%", maxWidth: 240, margin: "0 auto",
          border: `1px solid ${theme.accent}33`, boxShadow: `0 0 30px ${theme.glow}`,
        }} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="max-w-md mx-auto pb-28 space-y-5">

        <PageHeader title="Fight Card" subtitle="Premium dövüşçü kartın — Instagram'da paylaş" accent="Fight Card" />

        {/* ═══════════════════════════════════════════════
            EA FC TARZI DÖVÜŞÇÜ KARTI
        ═══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="relative mx-auto" style={{ maxWidth: 380 }}>
          <div className="relative rounded-[28px] p-[3px]"
            style={{
              background: `linear-gradient(160deg, ${theme.frameFrom}, ${theme.frameTo})`,
              boxShadow: `0 0 50px ${theme.glow}, 0 0 100px ${theme.glow}`,
            }}>
            <div className="relative overflow-hidden rounded-[26px]" style={{ background: theme.cardBg }}>
              {/* Glow orbs */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at 80% 10%, ${theme.glow} 0%, transparent 45%)` }} />
              {isLegend && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(circle at 12% 90%, rgba(251,191,36,0.18) 0%, transparent 50%)" }} />
              )}

              {/* Foto bloğu */}
              <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={student.fullName} className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                  }} />

                {/* OVR rozeti */}
                <div className="absolute top-3 left-3 z-10 flex flex-col items-center px-3 py-2 rounded-2xl backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${theme.accent}55` }}>
                  <div className="font-black leading-none" style={{ fontFamily: "var(--font-bebas)", fontSize: 34, color: theme.accent, textShadow: `0 0 16px ${theme.glow}` }}>
                    {stats!.ovr}
                  </div>
                  <div className="text-[8px] uppercase tracking-widest opacity-70 mt-0.5" style={{ color: theme.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                    OVR
                  </div>
                  <div className="mt-1.5 text-lg leading-none">{stats!.levelIcon}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5" style={{ color: theme.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                    {stats!.levelShortName}
                  </div>
                </div>

                {/* Efsane tacı */}
                {isLegend && (
                  <motion.div animate={{ y: [0, -5, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-3 right-3 z-10 text-3xl select-none"
                    style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,0.9))" }}>
                    👑
                  </motion.div>
                )}
              </div>

              {/* İsim + seviye */}
              <div className="relative px-4 flex flex-col items-center text-center" style={{ marginTop: -28 }}>
                <div className="font-black uppercase leading-[1.05]"
                  style={{
                    fontFamily: "var(--font-bebas)", fontSize: "clamp(1.5rem, 7vw, 2.2rem)",
                    background: `linear-gradient(90deg, ${theme.nameFrom}, ${theme.nameTo})`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    filter: `drop-shadow(0 0 16px ${theme.glow})`, letterSpacing: "0.04em",
                  }}>
                  {student.fullName}
                </div>
                <div className="mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ background: `${theme.accent}1a`, border: `1px solid ${theme.accent}55`, color: theme.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                  {stats!.levelIcon} {stats!.levelName}
                </div>
              </div>

              {/* İstatistik satırı */}
              <div className="px-3 sm:px-4 pt-4 grid grid-cols-3 gap-2">
                <CardStat label="YUM" value={stats!.yum} accent="#F87171" />
                <CardStat label="TEK" value={stats!.tek} accent="#FB923C" />
                <CardStat label="SAV" value={stats!.sav} accent="#60A5FA" />
                <CardStat label="KON" value={stats!.kon} accent="#34D399" />
                <CardStat label="XP" value={fmtXP(stats!.lifetimeXP)} accent={theme.accent} />
                <CardStat label="DRS" value={stats!.completedLessons} accent="#A78BFA" />
              </div>

              {/* Marka altlığı */}
              <div className="mt-4 pt-3 pb-4 text-center border-t" style={{ borderColor: `${theme.accent}22` }}>
                <div className="text-[11px] font-black uppercase tracking-[0.25em]"
                  style={{ fontFamily: "var(--font-bebas)", color: theme.accent, textShadow: `0 0 12px ${theme.glow}` }}>
                  ANTRENÖR ENES ÖZTÜRK
                </div>
                <div className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                  @p.t.enesozturk
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            ROZET / ONUR LİSTESİ ŞERİDİ
        ═══════════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {stats!.hofRank > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)" }}>
              <Trophy size={12} color="#FBBF24" />
              <span className="text-[11px] font-bold" style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                #{stats!.hofRank} Onur Listesi
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
            <Award size={12} color="#34D399" />
            <span className="text-[11px] font-bold" style={{ color: "#34D399", fontFamily: "var(--font-barlow-condensed)" }}>
              {stats!.badgeCount} Rozet
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            PAYLAŞ BÖLÜMÜ
        ═══════════════════════════════════════════════ */}
        <div className="rounded-2xl p-4 sm:p-5 space-y-3"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,0,0,0))", border: "1px solid rgba(139,92,246,0.2)" }}>
          <div className="flex items-center gap-2">
            <Camera size={13} style={{ color: "#A78BFA" }} />
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-bebas)" }}>
              Hikaye Kartı
            </span>
          </div>

          <button onClick={handleShare} disabled={shareState === "generating" || shareState === "idle"}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(90deg, #8B5CF6, #D946EF, #F59E0B)", color: "white",
              fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em",
              boxShadow: "0 0 24px rgba(217,70,239,0.35)",
            }}>
            <Share2 size={16} />
            {shareState === "generating" || shareState === "idle" ? "Hazırlanıyor…" : "Instagram'da Paylaş"}
          </button>

          <AnimatePresence>
            {shareState === "shared" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <CheckCircle2 size={15} color="#34D399" />
                <span className="text-xs" style={{ color: "#86EFAC", fontFamily: "var(--font-barlow-condensed)" }}>
                  Paylaşım penceresi açıldı — Instagram&apos;ı seçebilirsin!
                </span>
              </motion.div>
            )}

            {shareState === "downloaded" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3.5 rounded-xl space-y-2"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} color="#A78BFA" />
                  <span className="text-xs font-bold" style={{ color: "#C4B5FD", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em" }}>
                    GÖRSEL İNDİRİLDİ
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-barlow-condensed)" }}>
                  Web&apos;den Instagram hikayesine otomatik paylaşım yapılamıyor. Şimdi:
                </p>
                <ol className="text-[11px] space-y-1 list-decimal list-inside" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-barlow-condensed)" }}>
                  <li>Görsel cihazına indirildi</li>
                  <li>Instagram uygulamasını aç</li>
                  <li>Hikaye (Story) oluştur, galeriden bu görseli seç ve paylaş</li>
                </ol>
              </motion.div>
            )}

            {shareState === "error" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={15} color="#FCA5A5" />
                <span className="text-xs" style={{ color: "#FCA5A5", fontFamily: "var(--font-barlow-condensed)" }}>
                  Görsel oluşturulamadı. Lütfen tekrar dene.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
