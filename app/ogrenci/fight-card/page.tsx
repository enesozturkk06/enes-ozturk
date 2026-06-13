"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments, getStudents,
} from "@/lib/db";
import type { LessonRecord } from "@/lib/types";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeTechnicalAverages, countEarnedBadges } from "@/lib/hallOfFame";
import { PageHeader } from "@/app/components/ui";
import {
  Camera, Award, Trophy, Flame, Share2, CheckCircle2, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/* ══════════════════════════════════════════════════════════
   SEVİYE TEMALARI — Amatör · Bronz · Gümüş · Altın · Elmas · Efsane
   EA FC Ultimate Team kart renkleri
══════════════════════════════════════════════════════════ */
interface FightCardTheme {
  bgFrom: string; bgVia: string; bgTo: string;   // kart arkaplanı
  frameFrom: string; frameTo: string;             // dış çerçeve
  ringFrom: string; ringTo: string;               // foto çerçevesi
  glow: string;                                   // ışık efekti rengi
  textFrom: string; textTo: string;               // OVR / isim gradyanı
  accent: string;
  effect?: "gold" | "neon" | "legend";
}

const FIGHT_CARD_THEMES: Record<string, FightCardTheme> = {
  starter: {
    bgFrom: "#1f2128", bgVia: "#101218", bgTo: "#06070a",
    frameFrom: "#4B5563", frameTo: "#E5E7EB",
    ringFrom: "#6B7280", ringTo: "#E5E7EB",
    glow: "#9CA3AF",
    textFrom: "#D1D5DB", textTo: "#FFFFFF",
    accent: "#D1D5DB",
  },
  bronze: {
    bgFrom: "#2b1c0d", bgVia: "#170f06", bgTo: "#0a0603",
    frameFrom: "#7C4A1E", frameTo: "#F0B27A",
    ringFrom: "#92400E", ringTo: "#F0B27A",
    glow: "#CD7F32",
    textFrom: "#CD7F32", textTo: "#FDE3B8",
    accent: "#E8A35C",
  },
  silver: {
    bgFrom: "#2b2e36", bgVia: "#15171c", bgTo: "#090a0d",
    frameFrom: "#6B7280", frameTo: "#FFFFFF",
    ringFrom: "#9CA3AF", ringTo: "#FFFFFF",
    glow: "#E2E8F0",
    textFrom: "#CBD5E1", textTo: "#FFFFFF",
    accent: "#E5E7EB",
  },
  gold: {
    bgFrom: "#2b2007", bgVia: "#171204", bgTo: "#0a0700",
    frameFrom: "#B45309", frameTo: "#FDE68A",
    ringFrom: "#B45309", ringTo: "#FFD700",
    glow: "#FBBF24",
    textFrom: "#FBBF24", textTo: "#FEF9C3",
    accent: "#FBBF24",
    effect: "gold",
  },
  diamond: {
    bgFrom: "#0a1628", bgVia: "#071122", bgTo: "#020611",
    frameFrom: "#0EA5E9", frameTo: "#67E8F9",
    ringFrom: "#0EA5E9", ringTo: "#67E8F9",
    glow: "#38BDF8",
    textFrom: "#38BDF8", textTo: "#BAE6FD",
    accent: "#67E8F9",
    effect: "neon",
  },
  legend: {
    bgFrom: "#170c28", bgVia: "#0b0512", bgTo: "#040207",
    frameFrom: "#7C3AED", frameTo: "#FBBF24",
    ringFrom: "#7C3AED", ringTo: "#FBBF24",
    glow: "#C084FC",
    textFrom: "#FBBF24", textTo: "#C084FC",
    accent: "#FBBF24",
    effect: "legend",
  },
};

/* ══════════════════════════════════════════════════════════
   YARDIMCI FONKSİYONLAR
══════════════════════════════════════════════════════════ */
/** 0-10 teknik puanı 1-99 FIFA tarzı stata çevirir */
function statVal(score: number): number {
  return Math.max(1, Math.min(99, Math.round(score * 10)));
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

/** Hafif kickboks dövüşçüsü silüeti — yüksek tekme pozisyonu */
function drawFighterSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, color: string, alpha: number) {
  const pts = (arr: [number, number][]) => arr.map(([x, y]) => [cx + x * scale, cy + y * scale] as [number, number]);
  const stroke = (arr: [number, number][]) => {
    const p = pts(arr);
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.lineWidth = 0.16 * scale;
  const head = pts([[0, -1]])[0];
  ctx.beginPath(); ctx.arc(head[0], head[1], 0.14 * scale, 0, Math.PI * 2); ctx.fill();
  stroke([[0, -0.86], [0.05, -0.35]]);                      // gövde
  stroke([[-0.05, -0.8], [-0.28, -0.6], [-0.18, -0.4]]);     // sol kol (gard)
  stroke([[0.05, -0.8], [0.3, -0.55], [0.4, -0.32]]);        // sağ kol
  stroke([[0.08, -0.35], [0.12, 0.05], [0.06, 0.5]]);        // destek bacağı
  stroke([[-0.02, -0.35], [-0.35, -0.55], [-0.7, -0.78]]);   // tekme bacağı
  ctx.restore();
}

/** Son 12 haftada art arda en az 1 ders kaydı olan hafta sayısı */
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
   STORY CARD CANVAS — 1080x1920 (Instagram Hikaye)
   EA FC Ultimate Team tarzı premium dövüşçü kartı
══════════════════════════════════════════════════════════ */
interface StoryCardData {
  name: string; initials: string; avatarImg: HTMLImageElement | null;
  levelId: string; levelShortName: string; levelIcon: string;
  ovr: number; yum: number; tek: number; sav: number; kon: number;
  xp: number; drs: number;
  hofRank: number; badgeCount: number; weekStreak: number;
}

function drawFightStoryCard(canvas: HTMLCanvasElement, o: StoryCardData) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const theme = FIGHT_CARD_THEMES[o.levelId] ?? FIGHT_CARD_THEMES.starter;
  const isLegend  = o.levelId === "legend";
  const isDiamond = o.levelId === "diamond";
  const isGold    = o.levelId === "gold";

  /* ── Arkaplan ── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, theme.bgFrom); bg.addColorStop(0.55, theme.bgVia); bg.addColorStop(1, theme.bgTo);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Işık efektleri (glow orblar)
  [[W * .88, H * .12, 520], [W * .06, H * .55, 420], [W * .85, H * .94, 460]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, theme.glow + "33"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  if (isLegend) {
    const g2 = ctx.createRadialGradient(W * .15, H * .85, 0, W * .15, H * .85, 460);
    g2.addColorStop(0, "#FBBF2426"); g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }

  // Üst aksan çizgisi
  const tlg = ctx.createLinearGradient(0, 0, W, 0);
  tlg.addColorStop(0, "transparent"); tlg.addColorStop(.3, theme.frameFrom);
  tlg.addColorStop(.7, theme.frameTo); tlg.addColorStop(1, "transparent");
  ctx.strokeStyle = tlg; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(W, 3); ctx.stroke();

  /* ── Marka başlığı ── */
  const hx = 108, hy = 128, hr = 56;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 - Math.PI / 6; const px = hx + hr * Math.cos(a), py = hy + hr * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.strokeStyle = "rgba(220,38,38,.8)"; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = "rgba(220,38,38,.1)"; ctx.fill();
  ctx.fillStyle = "rgba(220,38,38,.9)"; ctx.font = "bold 36px Impact,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("EÖ", hx, hy);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = "bold 40px Impact,sans-serif";
  ctx.fillText("ANTRENÖR ENES ÖZTÜRK", 196, 120);
  ctx.fillStyle = "rgba(220,38,38,.8)"; ctx.font = "26px Arial,sans-serif";
  ctx.fillText("@p.t.enesozturk", 196, 160);

  // ANKARA FIGHT LEAGUE + KEDİ AI VERIFIED (sağ üst)
  ctx.textAlign = "right";
  ctx.fillStyle = theme.accent; ctx.font = "bold 30px Arial,sans-serif";
  ctx.fillText("ANKARA FIGHT LEAGUE", W - 70, 116);

  const kaiText = "KEDİ AI VERIFIED";
  ctx.font = "bold 24px Arial,sans-serif";
  const kaiW = ctx.measureText(kaiText).width;
  const badgeW = kaiW + 76, badgeH = 46, badgeX = W - 70 - badgeW, badgeY = 134;
  rr(ctx, badgeX, badgeY, badgeW, badgeH, 23);
  ctx.fillStyle = "rgba(56,189,248,0.12)"; ctx.fill();
  ctx.strokeStyle = "rgba(56,189,248,0.5)"; ctx.lineWidth = 2;
  rr(ctx, badgeX, badgeY, badgeW, badgeH, 23); ctx.stroke();
  ctx.beginPath(); ctx.arc(badgeX + 27, badgeY + 23, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#38BDF8"; ctx.fill();
  ctx.strokeStyle = "#0a1628"; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(badgeX + 20, badgeY + 23); ctx.lineTo(badgeX + 26, badgeY + 29); ctx.lineTo(badgeX + 35, badgeY + 16); ctx.stroke();
  ctx.fillStyle = "#7DD3FC"; ctx.textAlign = "left"; ctx.font = "bold 24px Arial,sans-serif";
  ctx.fillText(kaiText, badgeX + 48, badgeY + 31);

  ctx.textAlign = "left";
  ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(70, 208); ctx.lineTo(W - 70, 208); ctx.stroke();

  if (isLegend) {
    ctx.font = "100px serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText("👑", W / 2, 240);
  }

  /* ── Kart paneli (EA FC tarzı) ── */
  const cardX = 60, cardY = 250, cardW = W - 120, cardH = 1530;
  const bw = 5; // çerçeve kalınlığı

  // Dış çerçeve (gradyan)
  let frameGrad: CanvasGradient;
  if (isLegend) {
    frameGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    frameGrad.addColorStop(0, "#7C3AED"); frameGrad.addColorStop(.5, "#FBBF24"); frameGrad.addColorStop(1, "#C084FC");
  } else if (isGold) {
    frameGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    frameGrad.addColorStop(0, "#B45309"); frameGrad.addColorStop(.35, "#FFD700"); frameGrad.addColorStop(.65, "#FDE68A"); frameGrad.addColorStop(1, "#B45309");
  } else {
    frameGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    frameGrad.addColorStop(0, theme.frameFrom); frameGrad.addColorStop(1, theme.frameTo);
  }
  if (isDiamond || isLegend || isGold) {
    ctx.save(); ctx.shadowColor = theme.glow; ctx.shadowBlur = 70;
    rr(ctx, cardX, cardY, cardW, cardH, 36); ctx.fillStyle = frameGrad; ctx.fill();
    ctx.restore();
  }
  rr(ctx, cardX, cardY, cardW, cardH, 36); ctx.fillStyle = frameGrad; ctx.fill();

  // İç kart gövdesi
  const ix = cardX + bw, iy = cardY + bw, iw = cardW - bw * 2, ih = cardH - bw * 2;
  const innerBg = ctx.createLinearGradient(ix, iy, ix, iy + ih);
  innerBg.addColorStop(0, theme.bgFrom); innerBg.addColorStop(0.6, theme.bgVia); innerBg.addColorStop(1, theme.bgTo);
  rr(ctx, ix, iy, iw, ih, 32); ctx.fillStyle = innerBg; ctx.fill();

  // İç ışık efekti
  ctx.save();
  rr(ctx, ix, iy, iw, ih, 32); ctx.clip();
  const ig = ctx.createRadialGradient(ix + iw * .85, iy + ih * .04, 0, ix + iw * .85, iy + ih * .04, 620);
  ig.addColorStop(0, theme.glow + "22"); ig.addColorStop(1, "transparent");
  ctx.fillStyle = ig; ctx.fillRect(ix, iy, iw, ih);

  // Hafif kickboks dövüşçüsü silüeti (arka plan)
  drawFighterSilhouette(ctx, ix + iw * 0.5, iy + ih * 0.56, ih * 0.62, "#ffffff", (isDiamond || isLegend || theme.effect === "gold") ? 0.05 : 0.035);
  ctx.restore();

  const pad = 50;
  const cx0 = ix + pad, cy0 = iy + pad, innerW = iw - pad * 2;

  // OVR (çok büyük) + seviye adı (sol üst)
  const ovrGrad = ctx.createLinearGradient(cx0, cy0, cx0 + 280, cy0 + 280);
  ovrGrad.addColorStop(0, theme.textFrom); ovrGrad.addColorStop(1, theme.textTo);
  ctx.fillStyle = ovrGrad; ctx.font = "bold 195px Impact,sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.shadowColor = theme.glow + "aa"; ctx.shadowBlur = 36;
  ctx.fillText(String(o.ovr), cx0, cy0 + 165);
  ctx.shadowBlur = 0;
  ctx.fillStyle = theme.accent; ctx.font = "bold 46px Arial,sans-serif";
  ctx.fillText(`${o.levelIcon}  ${o.levelShortName.toUpperCase()}`, cx0, cy0 + 222);

  // Sağ sütun: Onur Listesi sırası (büyük) / Rozet / Haftalık seri
  const riX = cx0 + innerW;
  let riY = cy0 + 45;
  if (o.hofRank > 0) {
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#FBBF24"; ctx.font = "bold 78px Impact,sans-serif";
    ctx.shadowColor = "#FBBF2499"; ctx.shadowBlur = 28;
    ctx.fillText(`#${o.hofRank}`, riX, riY + 70);
    ctx.shadowBlur = 0;
    ctx.font = "bold 26px Arial,sans-serif"; ctx.fillStyle = "rgba(251,191,36,.85)";
    ctx.fillText("🏆 ONUR LİSTESİ", riX, riY + 102);
    riY += 130;
  }
  const sideItems: [string, string, string][] = [
    ["🎖️", String(o.badgeCount), "#34D399"],
    ["🔥", String(o.weekStreak), "#FB923C"],
  ];
  sideItems.forEach(([icon, val, color], i) => {
    const y = riY + 30 + i * 88;
    ctx.font = "bold 54px Arial,sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillStyle = color; ctx.fillText(val, riX, y);
    const valW = ctx.measureText(val).width;
    ctx.font = "48px Arial,sans-serif"; ctx.fillStyle = "#ffffff";
    ctx.fillText(icon, riX - valW - 18, y);
  });
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";

  // Profil fotoğrafı + seviyeye göre çerçeve — kartın baskın merkez öğesi
  const avR = 235;
  const avCx = ix + iw / 2;
  const avCy = cy0 + 310 + avR;

  for (let ri = avR + 50; ri > avR + 8; ri -= 10) {
    const a = ((avR + 50 - ri) / 50) * .15;
    ctx.beginPath(); ctx.arc(avCx, avCy, ri, 0, Math.PI * 2);
    ctx.strokeStyle = theme.glow + Math.round(a * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 2; ctx.stroke();
  }

  let ringGrad: CanvasGradient;
  if (isLegend) {
    ringGrad = ctx.createLinearGradient(avCx - avR, avCy - avR, avCx + avR, avCy + avR);
    ringGrad.addColorStop(0, "#7C3AED"); ringGrad.addColorStop(.5, "#FBBF24"); ringGrad.addColorStop(1, "#7C3AED");
  } else if (isGold) {
    ringGrad = ctx.createLinearGradient(avCx - avR, avCy - avR, avCx + avR, avCy + avR);
    ringGrad.addColorStop(0, "#B45309"); ringGrad.addColorStop(.5, "#FFD700"); ringGrad.addColorStop(1, "#FDE68A");
  } else {
    ringGrad = ctx.createLinearGradient(avCx - avR, avCy - avR, avCx + avR, avCy + avR);
    ringGrad.addColorStop(0, theme.ringFrom); ringGrad.addColorStop(1, theme.ringTo);
  }
  ctx.save();
  if (isDiamond || isLegend || isGold) { ctx.shadowColor = theme.glow; ctx.shadowBlur = 45; }
  ctx.beginPath(); ctx.arc(avCx, avCy, avR + 10, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad; ctx.lineWidth = 14; ctx.stroke();
  ctx.restore();

  if (o.avatarImg) {
    drawImageCover(ctx, o.avatarImg, avCx, avCy, avR);
  } else {
    const avG = ctx.createRadialGradient(avCx - avR * .3, avCy - avR * .3, 0, avCx, avCy, avR);
    avG.addColorStop(0, theme.glow + "44"); avG.addColorStop(1, theme.glow + "0d");
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2);
    ctx.fillStyle = avG; ctx.fill();
    ctx.fillStyle = theme.accent; ctx.font = "bold 140px Impact,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(o.initials, avCx, avCy + 6);
    ctx.textBaseline = "alphabetic";
  }

  // İsim
  const nameY = avCy + avR + 80;
  const nameGrad = ctx.createLinearGradient(ix + pad, nameY - 70, ix + iw - pad, nameY);
  nameGrad.addColorStop(0, theme.textFrom); nameGrad.addColorStop(1, theme.textTo);
  ctx.fillStyle = nameGrad; ctx.font = "bold 78px Impact,sans-serif"; ctx.textAlign = "center";
  ctx.shadowColor = theme.glow + "99"; ctx.shadowBlur = 22;
  ctx.fillText(o.name.toUpperCase(), avCx, nameY);
  ctx.shadowBlur = 0;

  // "Antrenör Enes Öztürk Resmi Sporcusu" etiketi
  const tagY = nameY + 55;
  ctx.font = "bold 28px Arial,sans-serif";
  const tagText = "ANTRENÖR ENES ÖZTÜRK RESMİ SPORCUSU";
  const tagTextW = ctx.measureText(tagText).width;
  const tagW = tagTextW + 64, tagH = 50, tagX = avCx - tagW / 2, tagYTop = tagY - 34;
  rr(ctx, tagX, tagYTop, tagW, tagH, 25);
  ctx.fillStyle = theme.accent + "1a"; ctx.fill();
  ctx.strokeStyle = theme.accent + "55"; ctx.lineWidth = 2; rr(ctx, tagX, tagYTop, tagW, tagH, 25); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.textAlign = "center";
  ctx.fillText(tagText, avCx, tagY);

  // İstatistik ızgarası — YUM · TEK · SAV / KON · XP · DRS (profesyonel oyuncu kartı stilinde, ilerleme çubuklu)
  const sd = [
    { l: "YUM", v: String(o.yum), c: "#F87171", pct: o.yum / 99 },
    { l: "TEK", v: String(o.tek), c: "#FB923C", pct: o.tek / 99 },
    { l: "SAV", v: String(o.sav), c: "#60A5FA", pct: o.sav / 99 },
    { l: "KON", v: String(o.kon), c: "#34D399", pct: o.kon / 99 },
    { l: "XP",  v: String(o.xp),  c: theme.accent, pct: Math.min(1, o.xp / 10000) },
    { l: "DRS", v: String(o.drs), c: "#A78BFA", pct: Math.min(1, o.drs / 100) },
  ];
  const gridY = tagY + 55, gap = 16, cols = 3;
  const cellW = (innerW - gap * (cols - 1)) / cols, cellH = 175;
  sd.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = cx0 + col * (cellW + gap), y = gridY + row * (cellH + gap);
    ctx.fillStyle = "rgba(255,255,255,.03)"; rr(ctx, x, y, cellW, cellH, 14); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1; rr(ctx, x, y, cellW, cellH, 14); ctx.stroke();
    ctx.fillStyle = s.c + "55"; rr(ctx, x, y, cellW, 6, [14, 14, 0, 0]); ctx.fill();
    ctx.fillStyle = s.c; ctx.font = "bold 62px Impact,sans-serif"; ctx.textAlign = "center";
    ctx.fillText(s.v, x + cellW / 2, y + 92);
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "bold 26px Arial,sans-serif";
    ctx.fillText(s.l, x + cellW / 2, y + 135);
    // ilerleme çubuğu
    const barX = x + 24, barW = cellW - 48, barY = y + cellH - 26, barH = 10;
    ctx.fillStyle = "rgba(255,255,255,.08)"; rr(ctx, barX, barY, barW, barH, 5); ctx.fill();
    ctx.fillStyle = s.c; rr(ctx, barX, barY, Math.max(8, barW * s.pct), barH, 5); ctx.fill();
  });

  // Kart içi marka altlığı
  const gridBottom = gridY + 2 * cellH + gap;
  const footY = gridBottom + 64;
  ctx.strokeStyle = theme.accent + "33"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx0, footY - 34); ctx.lineTo(cx0 + innerW, footY - 34); ctx.stroke();
  ctx.fillStyle = theme.accent; ctx.font = "bold 34px Impact,sans-serif"; ctx.textAlign = "center";
  ctx.fillText("ANTRENÖR ENES ÖZTÜRK", avCx, footY);
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "24px Arial,sans-serif";
  ctx.fillText("@p.t.enesozturk", avCx, footY + 38);

  /* ── Alt bilgi ── */
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.font = "28px Arial,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(format(new Date(), "dd MMMM yyyy", { locale: tr }), W / 2, cardY + cardH + 60);
  const bl = ctx.createLinearGradient(0, 0, W, 0);
  bl.addColorStop(0, "transparent"); bl.addColorStop(.3, theme.frameFrom);
  bl.addColorStop(.7, theme.frameTo); bl.addColorStop(1, "transparent");
  ctx.strokeStyle = bl; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, H - 3); ctx.lineTo(W, H - 3); ctx.stroke();
}

/* ══════════════════════════════════════════════════════════
   UI YARDIMCI BİLEŞENLER
══════════════════════════════════════════════════════════ */
type IconType = React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;

function SideStat({ icon: Icon, value, color }: { icon: IconType; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${color}1a`, border: `1px solid ${color}40` }}>
      <Icon size={12} style={{ color }} />
      <span className="text-xs font-bold tabular-nums" style={{ color, fontFamily: "var(--font-barlow-condensed)" }}>{value}</span>
    </div>
  );
}

function StatCell({ label, value, color, pct, divider }: { label: string; value: string | number; color: string; pct: number; divider?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-3.5 gap-1.5" style={divider ? { borderRight: `1px solid ${color}1a` } : undefined}>
      <div className="font-black tabular-nums leading-none" style={{ fontFamily: "var(--font-bebas)", fontSize: 26, color, textShadow: `0 0 10px ${color}55` }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
        {label}
      </div>
      <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, pct * 100))}%`, background: color }} />
      </div>
    </div>
  );
}

/** Kart arka planındaki hafif kickboks dövüşçüsü silüeti (yüksek tekme pozisyonu) */
function FighterSilhouette({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-1 -1.1 2 2.2" className={className} style={style} preserveAspectRatio="xMidYMid slice"
      fill="none" stroke="white" strokeWidth={0.16} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-1" r="0.14" fill="white" stroke="none" />
      <path d="M0,-0.86 L0.05,-0.35" />
      <path d="M-0.05,-0.8 L-0.28,-0.6 L-0.18,-0.4" />
      <path d="M0.05,-0.8 L0.3,-0.55 L0.4,-0.32" />
      <path d="M0.08,-0.35 L0.12,0.05 L0.06,0.5" />
      <path d="M-0.02,-0.35 L-0.35,-0.55 L-0.7,-0.78" />
    </svg>
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
    lifetimeXP: number;
    levelId: string; levelIcon: string; levelShortName: string;
    completedLessons: number; badgeCount: number; hofRank: number; weekStreak: number;
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
      const lv = xpSummary.lifetimeResult.level;
      const manualXP = sumManualXP(xpAdj);
      const badges = computeBadges(student, apts, sorted, {}, manualXP);
      const tech = computeTechnicalAverages(sorted) ?? { punch: 4, kick: 4, defense: 4, conditioning: 4, average: 4, sampleSize: 0 };

      const hofRank = allStudents
        .filter(s => s.isActive && s.showInHallOfFame)
        .sort((a, b) => b.completedLessons - a.completedLessons)
        .findIndex(s => s.id === student.id) + 1;

      setStats({
        lifetimeXP,
        levelId:        lv.current.id,
        levelIcon:      lv.current.icon,
        levelShortName: lv.current.shortName,
        completedLessons: student.completedLessons,
        badgeCount:     countEarnedBadges(badges),
        hofRank:        hofRank > 0 ? hofRank : 0,
        weekStreak:     computeWeekStreak(sorted),
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
        levelId: stats.levelId, levelShortName: stats.levelShortName, levelIcon: stats.levelIcon,
        ovr: stats.ovr, yum: stats.yum, tek: stats.tek, sav: stats.sav, kon: stats.kon,
        xp: stats.lifetimeXP, drs: stats.completedLessons,
        hofRank: stats.hofRank, badgeCount: stats.badgeCount, weekStreak: stats.weekStreak,
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
          <div className="text-lg font-black uppercase tracking-wide mb-2" style={{ color: "#fff", fontFamily: "var(--font-bebas)" }}>
            Önce profil fotoğrafı yüklemelisin
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
            Fight Card oluşturulabilmesi için profil fotoğrafın gerekiyor. Fotoğraf eklemeden premium dövüşçü kartın oluşturulamaz.
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

  /* ── EA FC Ultimate Team tarzı kart gövdesi ── */
  const cardBody = (
    <div className="relative overflow-hidden rounded-[26px] p-4 sm:p-5"
      style={{ background: `linear-gradient(165deg, ${theme.bgFrom} 0%, ${theme.bgVia} 55%, ${theme.bgTo} 100%)` }}>
      {/* Işık efektleri */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 85% 6%, ${theme.glow}33, transparent 45%)` }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 8% 96%, ${theme.glow}22, transparent 50%)` }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ background: "linear-gradient(115deg, transparent 35%, #fff 50%, transparent 65%)" }} />
      {/* Hafif kickboks dövüşçüsü silüeti */}
      <FighterSilhouette className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: theme.effect ? 0.06 : 0.04 }} />

      {/* Üst bant: ANKARA FIGHT LEAGUE + KEDİ AI VERIFIED */}
      <div className="relative z-10 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: theme.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: theme.accent, boxShadow: `0 0 6px ${theme.glow}` }} />
          Ankara Fight League
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)" }}>
          <ShieldCheck size={11} style={{ color: "#38BDF8" }} />
          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "#7DD3FC", fontFamily: "var(--font-barlow-condensed)" }}>
            Kedi AI Verified
          </span>
        </div>
      </div>

      {/* OVR (çok büyük, sol üst) + Onur Listesi / Rozet / Seri (sağ) */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col items-start leading-none">
          <div className="font-black tabular-nums" style={{
            fontFamily: "var(--font-bebas)", fontSize: "clamp(3.5rem,17vw,5.5rem)",
            backgroundImage: `linear-gradient(135deg, ${theme.textFrom}, ${theme.textTo})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: `drop-shadow(0 0 22px ${theme.glow}99)`,
          }}>
            {stats!.ovr}
          </div>
          <div className="mt-1 text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em]" style={{ color: theme.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            {stats!.levelIcon} {stats!.levelShortName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 pt-1">
          {stats!.hofRank > 0 && (
            <div className="flex flex-col items-end gap-0.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.45)", boxShadow: "0 0 16px rgba(251,191,36,0.25)" }}>
              <div className="flex items-center gap-1.5">
                <Trophy size={14} style={{ color: "#FBBF24" }} />
                <span className="text-lg font-black tabular-nums leading-none" style={{ color: "#FBBF24", fontFamily: "var(--font-bebas)" }}>
                  #{stats!.hofRank}
                </span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(251,191,36,.8)", fontFamily: "var(--font-barlow-condensed)" }}>
                Onur Listesi
              </span>
            </div>
          )}
          <SideStat icon={Award} value={stats!.badgeCount} color="#34D399" />
          <SideStat icon={Flame} value={stats!.weekStreak} color="#FB923C" />
        </div>
      </div>

      {/* Profil fotoğrafı + seviyeye göre premium çerçeve */}
      <div className="relative flex justify-center mt-3 mb-1">
        {theme.effect === "legend" ? (
          <motion.div className="rounded-full p-[6px]"
            style={{ backgroundImage: "linear-gradient(115deg, #7C3AED, #FBBF24, #C084FC, #7C3AED)", backgroundSize: "300% 300%" }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}>
            <div className="rounded-full overflow-hidden bg-black" style={{ width: "min(240px,58vw)", height: "min(240px,58vw)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        ) : theme.effect === "neon" ? (
          <motion.div className="rounded-full p-[6px]"
            style={{ background: `linear-gradient(135deg, ${theme.ringFrom}, ${theme.ringTo})` }}
            animate={{ boxShadow: [`0 0 20px ${theme.glow}88`, `0 0 48px ${theme.glow}`, `0 0 20px ${theme.glow}88`] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
            <div className="rounded-full overflow-hidden bg-black" style={{ width: "min(240px,58vw)", height: "min(240px,58vw)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        ) : theme.effect === "gold" ? (
          <motion.div className="rounded-full p-[6px]"
            style={{ backgroundImage: "linear-gradient(115deg, #B45309, #FFD700, #FDE68A, #FFD700, #B45309)", backgroundSize: "300% 300%" }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
            <div className="rounded-full overflow-hidden bg-black" style={{ width: "min(240px,58vw)", height: "min(240px,58vw)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        ) : (
          <div className="rounded-full p-[6px]" style={{ background: `linear-gradient(135deg, ${theme.ringFrom}, ${theme.ringTo})`, boxShadow: `0 0 24px ${theme.glow}66` }}>
            <div className="rounded-full overflow-hidden bg-black" style={{ width: "min(240px,58vw)", height: "min(240px,58vw)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        {isLegend && (
          <motion.div animate={{ y: [0, -6, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-3 text-4xl select-none" style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,.9))" }}>
            👑
          </motion.div>
        )}
      </div>

      {/* İsim */}
      <div className="text-center px-2">
        <div className="font-black uppercase leading-[1.05]" style={{
          fontFamily: "var(--font-bebas)", fontSize: "clamp(1.5rem,7.5vw,2.4rem)",
          backgroundImage: `linear-gradient(90deg, ${theme.textFrom}, ${theme.textTo})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: `drop-shadow(0 0 16px ${theme.glow}88)`, letterSpacing: "0.04em",
        }}>
          {student.fullName}
        </div>
      </div>

      {/* "Antrenör Enes Öztürk Resmi Sporcusu" etiketi */}
      <div className="relative z-10 flex justify-center mt-2">
        <div className="px-3 py-1 rounded-full text-center text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: theme.accent, border: `1px solid ${theme.accent}40`, background: `${theme.accent}14`, fontFamily: "var(--font-barlow-condensed)" }}>
          Antrenör Enes Öztürk Resmi Sporcusu
        </div>
      </div>

      {/* İstatistik ızgarası — YUM · TEK · SAV / KON · XP · DRS (profesyonel oyuncu kartı stili) */}
      <div className="relative z-10 mt-4 rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.accent}22`, background: "rgba(255,255,255,0.02)" }}>
        <div className="grid grid-cols-3">
          <StatCell label="YUM" value={stats!.yum} color="#F87171" pct={stats!.yum / 99} divider />
          <StatCell label="TEK" value={stats!.tek} color="#FB923C" pct={stats!.tek / 99} divider />
          <StatCell label="SAV" value={stats!.sav} color="#60A5FA" pct={stats!.sav / 99} />
        </div>
        <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${theme.accent}1a` }}>
          <StatCell label="KON" value={stats!.kon} color="#34D399" pct={stats!.kon / 99} divider />
          <StatCell label="XP" value={stats!.lifetimeXP} color={theme.accent} pct={Math.min(1, stats!.lifetimeXP / 10000)} divider />
          <StatCell label="DRS" value={stats!.completedLessons} color="#A78BFA" pct={Math.min(1, stats!.completedLessons / 100)} />
        </div>
      </div>

      {/* Marka altlığı */}
      <div className="relative z-10 mt-3 pt-2.5 text-center border-t" style={{ borderColor: `${theme.accent}22` }}>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
          @p.t.enesozturk
        </div>
      </div>
    </div>
  );

  return (
    <>
      <canvas ref={canvasRef} className="rounded-2xl"
        style={{
          display: shareState === "idle" || shareState === "generating" ? "none" : "block",
          width: "100%", maxWidth: 240, margin: "0 auto",
          border: `1px solid ${theme.accent}33`, boxShadow: `0 0 30px ${theme.glow}55`,
        }} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="max-w-md mx-auto pb-28 space-y-5">

        <PageHeader title="Fight Card" subtitle="Premium dövüşçü kartın — Instagram'da paylaş" accent="Fight Card" />

        {/* ═══════════════════════════════════════════════
            EA FC ULTIMATE TEAM TARZI DÖVÜŞÇÜ KARTI
        ═══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="relative mx-auto" style={{ maxWidth: 380 }}>
          {/* Dış ışık halesi */}
          <div className="absolute -inset-6 rounded-[40px] blur-3xl opacity-50 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${theme.glow}66, transparent 70%)` }} />

          {theme.effect === "legend" ? (
            <motion.div className="relative rounded-[28px] p-[3px]"
              style={{ backgroundImage: "linear-gradient(115deg, #7C3AED, #FBBF24, #C084FC, #7C3AED)", backgroundSize: "300% 300%", boxShadow: `0 0 60px ${theme.glow}aa` }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
              {cardBody}
            </motion.div>
          ) : theme.effect === "neon" ? (
            <motion.div className="relative rounded-[28px] p-[3px]"
              style={{ background: `linear-gradient(160deg, ${theme.frameFrom}, ${theme.frameTo})` }}
              animate={{ boxShadow: [`0 0 25px ${theme.glow}66`, `0 0 55px ${theme.glow}cc`, `0 0 25px ${theme.glow}66`] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
              {cardBody}
            </motion.div>
          ) : theme.effect === "gold" ? (
            <motion.div className="relative rounded-[28px] p-[3px]"
              style={{ backgroundImage: "linear-gradient(115deg, #B45309, #FFD700, #FDE68A, #FFD700, #B45309)", backgroundSize: "300% 300%" }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"], boxShadow: [`0 0 30px ${theme.glow}66`, `0 0 58px ${theme.glow}cc`, `0 0 30px ${theme.glow}66`] }}
              transition={{ backgroundPosition: { duration: 4, repeat: Infinity, ease: "linear" }, boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}>
              {cardBody}
            </motion.div>
          ) : (
            <div className="relative rounded-[28px] p-[3px]"
              style={{ background: `linear-gradient(160deg, ${theme.frameFrom}, ${theme.frameTo})`, boxShadow: `0 0 40px ${theme.glow}55` }}>
              {cardBody}
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════
            PAYLAŞ BÖLÜMÜ
        ═══════════════════════════════════════════════ */}
        <div className="rounded-2xl p-4 sm:p-5 space-y-3"
          style={{ background: `linear-gradient(135deg, ${theme.accent}14, rgba(0,0,0,0))`, border: `1px solid ${theme.accent}33` }}>
          <div className="flex items-center gap-2">
            <Camera size={13} style={{ color: theme.accent }} />
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-bebas)" }}>
              Hikaye Kartı
            </span>
          </div>

          <button onClick={handleShare} disabled={shareState === "generating" || shareState === "idle"}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: `linear-gradient(90deg, ${theme.frameFrom}, ${theme.frameTo})`, color: "white",
              fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em",
              boxShadow: `0 0 24px ${theme.glow}55`,
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
