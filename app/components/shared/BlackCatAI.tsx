"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, createGiftLessonRequest,
  getStudentGiftClaimsForSeason, getStudentXPAdjustments,
  getStudents, getAllXPAdjustments,
  getStudentMissionCompletions, recordMissionCompletion, getKediMissions,
  createXPAdjustment, getKediMessages, getKediVisionAnalyses, getPublishedKediProgram,
} from "@/lib/db";
import {
  computeStudentMissions, getWeekKey, nearestMission,
  totalMissionXP, type StudentMission, type MissionComputeInput,
} from "@/lib/kediTasks";
import { getWaterLog, getWaterLogRange, getHealthProfile, todayDate, type WaterEntry } from "@/lib/health";
import type { Appointment, LessonRecord, GiftLessonRequest, KediVisionAnalysis, KediProgram, SubscriptionType } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getSeasonLabel, getDaysUntilSeasonEnd,
  sumManualXP, type XPResult, type SeasonXPSummary,
} from "@/lib/xp";
import { computeBadges, type Badge } from "@/lib/badges";
import { getDaysRemaining, isPackageExpired, computePackagePaceProjection } from "@/lib/packageDuration";
import { SPORT_LABELS, GOAL_LABELS } from "@/lib/kediProgramLabels";
import { X, Send, ChevronDown, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import KediAvatar, { type KediAvatarState, type KediMood } from "./KediAvatar";
import KediBriefToast from "./KediBriefToast";
import { useKediVoice } from "@/hooks/useKediVoice";

/* ── Tipler ───────────────────────────────────────────────────────── */

interface ActionLink {
  label: string;
  href:  string;
}

interface Msg {
  id:       string;
  role:     "ai" | "user";
  text:     string;
  ts:       number;
  links?:   ActionLink[];
  kind?:    "missions";
  missions?: StudentMission[];
}

/* ── Kedi SVG ikonu ───────────────────────────────────────────────── */

export function CatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sol kulak */}
      <path d="M10 22L5 5L20 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M10.5 21L6.5 7.5L18.5 15.5Z" fill="#2d1b4e" />
      {/* Sağ kulak */}
      <path d="M38 22L43 5L28 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M37.5 21L41.5 7.5L29.5 15.5Z" fill="#2d1b4e" />
      {/* Kafa */}
      <ellipse cx="24" cy="30" rx="16" ry="14" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="0.8" />
      {/* Sol göz — Parlak Mavi */}
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="#38BDF8" />
      <ellipse cx="18" cy="28" rx="2.3" ry="3.6" fill="#001830" />
      <circle cx="16.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
      {/* Sağ göz — Parlak Yeşil */}
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="#4ADE80" />
      <ellipse cx="30" cy="28" rx="2.3" ry="3.6" fill="#001210" />
      <circle cx="28.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#22C55E" strokeWidth="0.5" />
      {/* Burun */}
      <path d="M22.5 33.5L24 35.5L25.5 33.5L24 32.5Z" fill="#8B5CF6" opacity="0.95" />
      {/* Bıyıklar */}
      <line x1="5"  y1="33" x2="17" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="5"  y1="36" x2="17" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
      <line x1="43" y1="33" x2="31" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="43" y1="36" x2="31" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
    </svg>
  );
}

/* ── AI yanıt motoru ─────────────────────────────────────────────── */

interface StudentContext {
  name:             string;
  studentId:        string;
  remainingLessons: number;
  completedLessons: number;
  totalLessons:     number;
  level:            string;
  appointments:     Appointment[];
  records:          LessonRecord[];
  waterGlasses:     number;
  waterTarget:      number;
  subscriptionType?: SubscriptionType;
  packageStartDate?: string;
  packageEndDate?: string;
  packageDaysRemaining: number | null;
  /* Sağlık profili */
  weight?:          number;
  age?:             number;
  height?:          number;
  gender?:          "male" | "female";
  /* Hedef (localStorage'dan) */
  goal?:            string;
  /* XP */
  xp:               XPResult;      // ömür boyu (rozetler, motivasyon için)
  seasonSummary:    SeasonXPSummary; // sezon XP (hediye ders için)
  /* Sezon hediye ders talepleri */
  claimed5k:        boolean;
  claimed10k:       boolean;
  giftRequests:     GiftLessonRequest[]; // bu sezona ait talepler (durumlarıyla)
  /* Rozetler */
  badges:           Badge[];        // tüm rozetler (kazanılan + kilitli)
  earnedBadges:     Badge[];
  nextBadge:        Badge | null;   // en yakın kilitli rozet
  /* Onur Listesi (Hall of Fame) */
  hallRank:         number | null;  // 1-bazlı sıra
  hallTotal:        number;
  /* Ders geçmişi detayı */
  cancelledLessons: number;
  noShowLessons:    number;
  /* KEDİ AI'ın daha önce önerdiği planlar (gerçek geçmiş — localStorage) */
  lastTrainingPlan?: { date: string; summary: string };
  lastNutritionPlan?:{ date: string; summary: string };
  /* Görevler */
  missions:         StudentMission[];
  /* Smart Notification Center (V5) — bkz. pickSmartNotification */
  visionAnalyses:   KediVisionAnalysis[]; // en yeniden en eskiye
  publishedProgram: KediProgram | null;
  recentWaterLogs:  WaterEntry[];         // son 7 gün, tarihe göre artan
}

/* ── Yardımcılar ─────────────────────────────────────────────────── */
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}


/** Sesli komuttaki "Kedi," çağrı sözcüğünü temizle */
function stripWakeWord(text: string): string {
  return text.replace(/^\s*kedi[\s,]+/i, "").trim();
}

/** En yakın kilidi açılacak rozeti bul (ilerleme oranına göre) */
function findNextBadge(badges: Badge[]): Badge | null {
  const locked = badges.filter(b => !b.earned && b.progressMax > 0);
  if (locked.length === 0) return null;
  return [...locked].sort((a, b) => (b.progressCurrent / b.progressMax) - (a.progressCurrent / a.progressMax))[0];
}

/** KEDİ AI'ın önerdiği son antrenman/diyet planını localStorage'a kaydet (gerçek geçmiş oluşturmak için) */
function saveAIPlan(kind: "training" | "nutrition", summary: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`kedi_ai_last_${kind}`, JSON.stringify({ date: todayStr(), summary }));
  } catch { /* sessizce geç */ }
}

function loadAIPlan(kind: "training" | "nutrition"): { date: string; summary: string } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`kedi_ai_last_${kind}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.date === "string" && typeof parsed.summary === "string") return parsed;
  } catch { /* sessizce geç */ }
  return undefined;
}

/** Randevu gelecekte mi? (tarih + saat bazlı, sadece tarih karşılaştırması değil) */
function isUpcomingApt(apt: Appointment): boolean {
  try {
    const dt = parseISO(`${apt.date}T${apt.startTime}`);
    return dt > new Date();
  } catch {
    const d = parseISO(apt.date);
    d.setHours(23, 59, 59);
    return d > new Date();
  }
}

/* ── Açılış karşılaması — anında, yerel olarak üretilir (LLM çağrısı yok) ── */

function buildContext(ctx: StudentContext): string {
  const firstName  = ctx.name.split(" ")[0];
  const last       = ctx.records[0];
  const upcoming   = ctx.appointments
    .filter(a => a.status === "onaylandi" && isUpcomingApt(a))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const lastApt    = ctx.appointments.filter(a => a.status === "tamamlandi")[0];
  const daysSince  = lastApt ? differenceInDays(new Date(), parseISO(lastApt.date)) : 999;
  const lowLessons = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;
  const xp         = ctx.xp;

  const lines: string[] = [`Merhaba **${firstName}**! 🐾 Ben **KEDİ AI**, senin kişisel AI antrenör koçunum.`];

  // Kısa günlük özet — tek cümlelik, örnek: "Adar, 7 dersin kaldı. Paketinin bitmesine 41 gün var..."
  const digestParts: string[] = [];
  if (ctx.subscriptionType !== "monthly") digestParts.push(`**${ctx.remainingLessons}** dersin kaldı`);
  if (ctx.packageDaysRemaining !== null && ctx.packageDaysRemaining >= 0)
    digestParts.push(`paketinin bitmesine **${ctx.packageDaysRemaining} gün** var`);
  const nearestM = nearestMission(ctx.missions);
  if (nearestM) {
    const remain = Math.max(0, nearestM.target - nearestM.progress);
    if (remain > 0) digestParts.push(`**${nearestM.title}** görevine **${remain}** adım kaldı`);
  }
  if (ctx.xp.level.next) digestParts.push(`sıradaki hedefin **${ctx.xp.level.next.name}**`);
  if (digestParts.length > 0) lines.push(digestParts.join(", ") + ".");

  // Paket durumu
  if (ctx.subscriptionType === "monthly") {
    lines.push(`Aylık üyeliğinle sınırsız ders alabilirsin. Randevu almanı öneriyorum!`);
  } else if (ctx.remainingLessons === 0) {
    lines.push(`⚠️ **Ders hakkın tükendi.** Yeni paket için antrenörünle iletişime geç — WhatsApp butonu hazır!`);
  } else {
    lines.push(`Şu an **${ctx.remainingLessons}** ders hakkın var, toplamda **${ctx.completedLessons}** ders tamamladın.`);
    if (lowLessons) lines.push(`⚠️ Ders hakkın azalıyor — yeni paket almayı planla!`);
  }

  // Randevu durumu
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const isToday = next.date === todayStr();
    lines.push(isToday
      ? `🥊 **Bugün dersin var!** Saat **${next.startTime}** — hazır ol!`
      : `📅 Yaklaşan ders: **${format(parseISO(next.date), "d MMMM EEEE", { locale: tr })}** saat **${next.startTime}**.`
    );
  } else if (daysSince > 14) {
    lines.push(`⏰ **${daysSince} gündür** ders almamışsın. Randevu almayı düşün!`);
  }

  // Teknik özet
  if (last) {
    const scores: [string, number][] = [
      ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
      ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
    ];
    const weak = [...scores].sort((a, b) => a[1] - b[1])[0];
    if (last.overall >= 9)      lines.push(`🌟 Son dersinde **${last.overall}/10** — olağanüstü!`);
    else if (last.overall >= 8) lines.push(`⭐ Son dersinde **${last.overall}/10**. Harika gidiyorsun!`);
    else                        lines.push(`📊 Son dersinde **${last.overall}/10** — **${weak[0]}** geliştirilebilir.`);
  } else {
    lines.push(`Henüz ders kaydın yok. İlk ders sonrası sana özel analiz yapacağım!`);
  }

  // XP özeti — sezon bazlı hediye ders durumu
  const seasonTotal = ctx.seasonSummary.seasonResult.breakdown.total;
  const nextGift    = ctx.claimed5k ? (ctx.claimed10k ? null : 10000) : 5000;
  const toGiftXP    = nextGift ? Math.max(0, nextGift - seasonTotal) : 0;
  lines.push(`⚡ **Sezon XP**: ${seasonTotal.toLocaleString()} puan${(ctx.claimed5k || seasonTotal >= 5000) ? " | 🎁 Hediye ders durumun var!" : ` | Hediye ders için ${toGiftXP.toLocaleString()} XP kaldı`}`);

  // Seviye + rozet + sıralama özeti
  const levelInfo = xp.level;
  let levelLine = `🏅 **${levelInfo.current.name}** seviyesindesin (${xp.breakdown.total.toLocaleString()} XP)`;
  if (ctx.nextBadge) levelLine += ` | Sıradaki rozet: ${ctx.nextBadge.icon} ${ctx.nextBadge.name}`;
  if (ctx.hallRank !== null) levelLine += ` | Onur Listesi: **${ctx.hallRank}.** sıra`;
  lines.push(levelLine);

  // Görev özeti
  const activeMissions = ctx.missions.filter(m => !m.completed);
  const earnableXP     = totalMissionXP(ctx.missions);
  if (activeMissions.length > 0) {
    lines.push(`🎯 **${activeMissions.length} aktif görev** var — toplam **${earnableXP} XP** kazanabilirsin. "Görevlerim neler?" de detayları gör!`);
  }

  // KEDİ AI'ın daha önce önerdiği plan varsa hatırlat (gerçek geçmiş)
  if (ctx.lastTrainingPlan && ctx.lastTrainingPlan.date === todayStr()) {
    lines.push(`📋 Bugün sana zaten bir antrenman programı önermiştim: *${ctx.lastTrainingPlan.summary}*. İstersen tekrar bakalım veya farklı bir konuya geçelim.`);
  }

  lines.push(`\nNe hakkında konuşmak istersin?`);
  return lines.join(" \n");
}

/* ── Smart Notification Center (V5) ──────────────────────────────────
 * Gerçek olaylara bağlı, tek seferlik, YENİ bir OpenRouter çağrısı YAPMAYAN
 * (buildContext ile AYNI felsefe — anında, yerel, deterministik) bildirimler.
 * Her olay türü kendi "kimliğini" localStorage'da saklar; aynı kimlik
 * tekrar gösterilmez, YENİ bir kimlik (yeni ders notu/rozet/seviye/vision/
 * program) ortaya çıkarsa yeniden aktif olur — bkz. pickSmartNotification. */

interface SmartNotifSeenState {
  lastLessonId?: string;
  lastBadgeIds?: string[];
  lastLevelId?: string;
  lastVisionId?: string;
  lastProgramId?: string;
  packageEmptyActive?: boolean;
  packageExpiredActive?: boolean;
  oneLessonLeftActive?: boolean;
  inactiveForLessonDate?: string;
  waterGoalShownDate?: string;
  packagePaceShownDate?: string;
}

function smartNotifSeenKey(studentId: string): string {
  return `kedi_smart_notif_seen_${studentId}`;
}
function loadSeenState(studentId: string): SmartNotifSeenState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(smartNotifSeenKey(studentId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveSeenState(studentId: string, state: SmartNotifSeenState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(smartNotifSeenKey(studentId), JSON.stringify(state)); } catch { /* sessizce geç */ }
}

/** "Aktif" durum bayraklarını (paket bitti/süresi doldu/son ders) mevcut
 * duruma göre sıfırlar — koşul artık geçerli değilse bayrak temizlenir,
 * böylece YENİ bir oluşumda (ör. yenileme sonrası tekrar 0'a düşerse)
 * bildirim yeniden aktif olabilir ("yeni olay oluşursa tekrar aktif olsun"). */
function reconcileSeenState(ctx: StudentContext, seen: SmartNotifSeenState): SmartNotifSeenState {
  const next = { ...seen };
  if (ctx.remainingLessons !== 0) next.packageEmptyActive = false;
  if (!isPackageExpired(ctx.packageEndDate)) next.packageExpiredActive = false;
  if (ctx.remainingLessons !== 1) next.oneLessonLeftActive = false;
  return next;
}

interface SmartNotifCandidate {
  priority: number; // düşük numara = önce gösterilir
  text: string;
  links: ActionLink[];
  markSeen: (state: SmartNotifSeenState) => SmartNotifSeenState;
}

/** Son ders kaydından güçlü/zayıf yön + kısa motivasyon üretir — tamamen
 * deterministik (gerçek punch/kick/defense/conditioning/combination/
 * sparring sayılarından), AI çağrısı YOK. */
function buildLastLessonAnalysis(record: LessonRecord, firstName: string): string {
  const categories: [string, number][] = [
    ["Yumruk", record.punch], ["Tekme", record.kick], ["Savunma", record.defense],
    ["Kondisyon", record.conditioning], ["Kombinasyon", record.combination], ["Serbest Çalışma", record.sparring],
  ];
  const sorted = [...categories].sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const lines = [
    `Tebrikler ${firstName}.`,
    `Son antrenmanında ortalama ${record.overall}/10 performans gösterdin.`,
    `${strongest[0]} çok başarılıydı.`,
    weakest[1] < strongest[1]
      ? `${weakest[0]} konusuna biraz daha odaklanmanı öneriyorum.`
      : `Bu seviyeni korumanı öneriyorum.`,
  ];
  return lines.join(" \n");
}

/** Tüm aday bildirimleri hesaplar, henüz GÖRÜLMEMİŞ olanları filtreler,
 * en yüksek öncelikli TEK adayı döner (bir kerede tek mesaj — kullanıcıyı
 * bir mesaj yığınıyla karşılamamak için). null ise gösterilecek yeni bir
 * şey yok. */
function pickSmartNotification(ctx: StudentContext, seen: SmartNotifSeenState): SmartNotifCandidate | null {
  const firstName = ctx.name.split(" ")[0];
  const candidates: SmartNotifCandidate[] = [];

  if (ctx.subscriptionType !== "monthly" && ctx.remainingLessons === 0 && !seen.packageEmptyActive) {
    candidates.push({
      priority: 1,
      text: "Ders paketindeki tüm haklarını kullandın. \nYeni randevu oluşturabilmek için lütfen ders paketini yenile.",
      links: [{ label: "Paketleri Gör", href: "/ogrenci#paket-kartı" }],
      markSeen: s => ({ ...s, packageEmptyActive: true }),
    });
  }

  if (isPackageExpired(ctx.packageEndDate) && !seen.packageExpiredActive) {
    candidates.push({
      priority: 2,
      text: "Kullanım süresi içerisinde ders paketini tamamlayamadığın için kalan ders hakların sona ermiştir. \nYeni ders planlayabilmek için lütfen yeni paketini yenileyin.",
      links: [{ label: "Paketleri Gör", href: "/ogrenci#paket-kartı" }],
      markSeen: s => ({ ...s, packageExpiredActive: true }),
    });
  }

  if (ctx.subscriptionType !== "monthly" && ctx.remainingLessons === 1 && !seen.oneLessonLeftActive) {
    candidates.push({
      priority: 3,
      text: "Paketinde yalnızca 1 ders kaldı. \nAntrenmanlarına ara vermemek için yeni paketini planlamanı öneriyorum.",
      links: [{ label: "Paketleri Gör", href: "/ogrenci#paket-kartı" }],
      markSeen: s => ({ ...s, oneLessonLeftActive: true }),
    });
  }

  // Yeni rozet — ilk yüklemede (seen.lastBadgeIds hiç yoksa) sessizce
  // kaydedilir, ESKİ rozetler "yeni kazanıldı" diye kutlanmaz (bkz. effect).
  if (seen.lastBadgeIds !== undefined) {
    const newBadges = ctx.earnedBadges.filter(b => !seen.lastBadgeIds!.includes(b.id));
    if (newBadges.length > 0) {
      const b = newBadges[0];
      candidates.push({
        priority: 4,
        text: `Tebrikler ${firstName}! Yeni bir rozet kazandın: ${b.icon} ${b.name}. \n${b.description}`,
        links: [{ label: "Rozetlerim", href: "/ogrenci/rozetler" }],
        markSeen: s => ({ ...s, lastBadgeIds: ctx.earnedBadges.map(x => x.id) }),
      });
    }
  }

  // Seviye atlama — ilk yüklemede sessizce kaydedilir, ESKİ seviye "yeni
  // atlandı" diye kutlanmaz. lib/xp.ts XPLevel.notifMsg ZATEN bu tam amaç
  // için yazılmış hazır bir metin — burada YENİDEN YAZMIYORUZ.
  if (seen.lastLevelId !== undefined && seen.lastLevelId !== ctx.xp.level.current.id) {
    const msg = ctx.xp.level.current.notifMsg || `Tebrikler ${firstName}! Artık ${ctx.xp.level.current.name} seviyesindesin.`;
    candidates.push({
      priority: 5,
      text: msg,
      links: [{ label: "Seviye Merkezi", href: "/ogrenci/seviye" }],
      markSeen: s => ({ ...s, lastLevelId: ctx.xp.level.current.id }),
    });
  }

  // Son ders analizi — antrenör yeni bir ders notu girdiyse (kayıt kimliği
  // değiştiyse), ilk girişte dahil göster (bu, "yeni veri" bildirimi —
  // eski bir başarıyı YANLIŞLIKLA kutlamıyor, sadece gerçek en son notu
  // bildiriyor, bu yüzden badge/level'daki bootstrap-sessizliği burada YOK).
  const lastRecord = ctx.records[0];
  if (lastRecord && lastRecord.id !== seen.lastLessonId) {
    candidates.push({
      priority: 6,
      text: buildLastLessonAnalysis(lastRecord, firstName),
      links: [{ label: "Detayları Gör", href: "/ogrenci/gelisim" }],
      markSeen: s => ({ ...s, lastLessonId: lastRecord.id }),
    });
  }

  // Vision — önceki analizle karşılaştırır, gelişim/gerileme + en önemli öneri.
  const lastVision = ctx.visionAnalyses[0];
  if (lastVision) {
    const visionId = lastVision.id ?? lastVision.createdAt ?? "";
    if (visionId && visionId !== seen.lastVisionId) {
      const parts = [`Yeni Vision analizin tamamlandı. Genel skor: ${lastVision.overallScore}/100.`];
      const prevVision = ctx.visionAnalyses[1];
      if (prevVision) {
        const diff = lastVision.overallScore - prevVision.overallScore;
        if (diff > 0) parts.push(`Önceki analize göre ${diff} puan gelişim var.`);
        else if (diff < 0) parts.push(`Önceki analize göre ${Math.abs(diff)} puan gerileme var.`);
        else parts.push(`Önceki analizle aynı seviyedesin.`);
      }
      if (lastVision.deficiencies[0]) parts.push(`En önemli öneri: ${lastVision.deficiencies[0].fix}`);
      candidates.push({
        priority: 7,
        text: parts.join(" \n"),
        links: [{ label: "Analizi Aç", href: "/ogrenci/antrenman?tab=vision" }],
        markSeen: s => ({ ...s, lastVisionId: visionId }),
      });
    }
  }

  // Yeni program — çok kısa özet.
  if (ctx.publishedProgram) {
    const programId = ctx.publishedProgram.id ?? String(ctx.publishedProgram.version ?? "");
    if (programId && programId !== seen.lastProgramId) {
      const p = ctx.publishedProgram;
      candidates.push({
        priority: 8,
        text: `Yeni antrenman ve beslenme programın hazır: ${SPORT_LABELS[p.sport]} · ${GOAL_LABELS[p.goalType]}, günlük ${p.dailyCalories} kcal hedefiyle.`,
        links: [{ label: "Programı Gör", href: "/ogrenci/antrenman?tab=kedi-ai" }],
        markSeen: s => ({ ...s, lastProgramId: programId }),
      });
    }
  }

  // Uzun süredir gelmedi (10-14 gün) — "streak kimliği" son tamamlanan ders
  // tarihi: aynı boşluk için tekrar gösterilmez, YENİ bir ders + YENİ bir
  // boşluk oluşursa tekrar aktif olur.
  const lastCompleted = ctx.appointments.filter(a => a.status === "tamamlandi")[0];
  if (lastCompleted) {
    const daysSince = differenceInDays(new Date(), parseISO(lastCompleted.date));
    if (daysSince >= 10 && daysSince <= 14 && seen.inactiveForLessonDate !== lastCompleted.date) {
      candidates.push({
        priority: 9,
        text: "Seni bir süredir antrenmanda göremedik. \nHazırsan kaldığımız yerden devam edelim.",
        links: [{ label: "Randevu Al", href: "/ogrenci/randevu" }],
        markSeen: s => ({ ...s, inactiveForLessonDate: lastCompleted.date }),
      });
    }
  }

  // Paket analizi (tempo bazlı) — spam olmasın diye 7 günde bir gösterilir.
  const pace = computePackagePaceProjection(ctx.appointments, ctx.remainingLessons, ctx.subscriptionType);
  if (pace && pace.estimatedDaysUntilLessonsRunOut <= 14) {
    const lastShown = seen.packagePaceShownDate ? parseISO(seen.packagePaceShownDate) : null;
    const cooldownOk = !lastShown || differenceInDays(new Date(), lastShown) >= 7;
    if (cooldownOk) {
      candidates.push({
        priority: 10,
        text: `Bu tempoyla yaklaşık ${pace.estimatedDaysUntilLessonsRunOut} gün sonra ders paketin bitecek. \nŞimdiden yenilemeyi planlayabilirsin.`,
        links: [{ label: "Paketleri Gör", href: "/ogrenci#paket-kartı" }],
        markSeen: s => ({ ...s, packagePaceShownDate: todayStr() }),
      });
    }
  }

  // Su hedefi — son günlerin en az 3'ü loglanmış VE hepsi hedefin altındaysa,
  // 7 günde bir hatırlat (her gün tekrar etmesin).
  const recentDays = ctx.recentWaterLogs.slice(-4);
  const waterGoalMissed = recentDays.length >= 3 && recentDays.every(w => w.glasses < ctx.waterTarget);
  if (waterGoalMissed) {
    const lastShown = seen.waterGoalShownDate ? parseISO(seen.waterGoalShownDate) : null;
    const cooldownOk = !lastShown || differenceInDays(new Date(), lastShown) >= 7;
    if (cooldownOk) {
      candidates.push({
        priority: 11,
        text: "Son günlerde su hedefini tutturamıyorsun. \nToparlanma ve performans için su tüketimine dikkat etmeni öneririm.",
        links: [{ label: "Sağlık", href: "/ogrenci/saglik" }],
        markSeen: s => ({ ...s, waterGoalShownDate: todayStr() }),
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

/* ── Mesaj bubble ─────────────────────────────────────────────────── */

function MsgBubble({ msg, onNavigate }: { msg: Msg; onNavigate: () => void }) {
  const parsed = msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#C4B5FD" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );

  if (msg.role === "ai") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: -8, scale: 0.96, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex gap-2.5 items-end"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <KediAvatar size={20} />
        </div>
        <div className="max-w-[85%] flex flex-col gap-2 items-start">
          <div className="glass px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-label)", borderRadius: "0 14px 14px 14px" }}>
            {parsed}
          </div>

          {/* Görev kartları */}
          {msg.kind === "missions" && msg.missions && msg.missions.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {msg.missions.map(m => {
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                return (
                  <div key={m.key} className="glass rounded-xl px-3 py-2.5"
                    style={{ borderColor: m.completed ? "rgba(34,197,94,0.3)" : undefined }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0">{m.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold truncate"
                            style={{ color: m.completed ? "var(--color-success)" : "#C4B5FD", fontFamily: "var(--font-label)", letterSpacing: "0.04em" }}>
                            {m.title}
                          </div>
                          <div className="text-[10px] opacity-60 truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {m.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[11px] font-bold"
                          style={{ color: m.xpAwarded ? "var(--color-success)" : "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                          {m.xpAwarded ? "✅" : `+${m.xpReward} XP`}
                        </div>
                        <div className="text-[10px] opacity-50" style={{ color: "rgba(255,255,255,0.7)" }}>
                          {m.progress}/{m.target}
                        </div>
                      </div>
                    </div>
                    {/* İlerleme çubuğu */}
                    {!m.completed && (
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="gradient-animated gradient-fast gradient-violet-pink-orange"
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            borderRadius: "99px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {msg.links && msg.links.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {msg.links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className="glass inline-flex items-center text-[12px] px-4 rounded-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                  style={{
                    fontFamily:   "var(--font-label)",
                    letterSpacing: "0.06em",
                    color:        "#C4B5FD",
                    minHeight:    "36px",
                    touchAction:  "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    textDecoration: "none",
                  }}
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: 8, scale: 0.96, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div className="glass px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-label)", borderRadius: "14px 0 14px 14px" }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

/* ── Yazıyor göstergesi ───────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
      className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.35)" }}>
        <KediAvatar size={20} state="thinking" />
      </div>
      <div className="glass px-4 py-3 flex items-center gap-1" style={{ borderRadius:"0 14px 14px 14px" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"var(--color-violet)" }}
            animate={{ y:[0,-4,0] }} transition={{ duration:0.7, repeat:Infinity, delay:i*0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */

export default function BlackCatAI() {
  const { student }         = useAuth();
  const [open, setOpen]         = useState(false);
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [minimized, setMin]     = useState(false);
  // Bu bileşen oturumu boyunca ödül verilmiş görevleri takip eder (remount koruması)
  const awardedThisSession      = useRef<Set<string>>(new Set());
  /* Kalıcı geçmiş (Supabase) yüklendi mi ve içeriği var mı — varsa açılış karşılaması atlanır */
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasHistory, setHasHistory]       = useState(false);
  /* Avatar durumu — LLM yanıtı beklenirken/konuşurken/dinlerken değişir */
  const [avatarState, setAvatarState] = useState<KediAvatarState>("idle");
  const [mood, setMood] = useState<KediMood>(null);
  // NOT: Öğrencinin kendi 3D avatarını (Thinking/Talking/Happy) burada da
  // göstermek denendi, ama BlackCatAI SAYFA-BAĞIMSIZ bir floating overlay —
  // herhangi bir avatar-gösteren sayfanın (Dashboard/Sağlık/Randevu/Fight
  // Card) ÜZERİNDE açılabiliyor, bu da AYNI ANDA 2 canvas'ın birlikte render
  // olmasına yol açtı. Ölçüldü: heap ~2x (21MB→47MB), FPS ~14 (ölü sabit,
  // 4sn yerleşme sonrası bile) — "Aynı anda yalnızca görünür avatar render
  // edilsin" ve "mobil performans kesinlikle düşmemeli" kurallarını gerçek
  // ölçümle ihlal ettiği için GERİ ALINDI. Thinking/Talking zaten mevcut 2D
  // KediAvatar maskotu (aşağıdaki avatarState) üzerinden görünüyor; Happy
  // zaten var olan sunucu-güdümlü `mood` mekanizmasıyla kapsanıyor.
  /* Proaktif günlük özet — günde en fazla 1 kez, chat açık olmasa bile */
  const [brief, setBrief] = useState<{ text: string; mood: KediMood } | null>(null);
  const briefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* sendMessage henüz tanımlanmadan ses hook'undan çağırabilmek için ref */
  const sendMessageRef = useRef<(text?: string) => void>(() => {});
  /* Kelime-senkronlu ağız vuruşu — her arttığında KediAvatar kısa bir vurgu ekler */
  const [mouthPulseKey, setMouthPulseKey] = useState(0);

  const voice = useKediVoice({
    storageKey: "kedi_ai_voice_out",
    onInterimTranscript: setInput,
    onFinalTranscript: (transcript) => {
      const cleaned = stripWakeWord(transcript);
      if (cleaned) sendMessageRef.current?.(cleaned);
    },
    onSpeechStart: () => setAvatarState("speaking"),
    onSpeechEnd: () => setAvatarState("idle"),
    onMouthPulse: () => setMouthPulseKey(k => k + 1),
  });

  /* Dinleme durumunu avatar durumuna yansıt (eskiden toggleVoice içinde inline yapılıyordu) */
  useEffect(() => {
    if (voice.listening) setAvatarState("listening");
    else setAvatarState(s => s === "listening" ? "idle" : s);
  }, [voice.listening]);

  useEffect(() => {
    const h = () => { setOpen(true); setMin(false); };
    window.addEventListener("kedi-open", h);
    return () => window.removeEventListener("kedi-open", h);
  }, []);

  /* Sürükleme */
  const constraintRef = useRef<HTMLDivElement>(null);
  const [didDrag, setDidDrag] = useState(false);

  /* Gecikmeli görünürlük (initial animation delay) */
  const [appeared, setAppeared] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [ctx, setCtx] = useState<StudentContext | null>(null);

  /* Kalıcı sohbet hafızası — sayfa yenilense de konuşma geçmişi kaybolmasın (madde 10) */
  useEffect(() => {
    if (!student || historyLoaded) return;
    getKediMessages("student", student.id)
      .then(history => {
        if (history.length > 0) {
          setMsgs(history.map(m => ({
            id: m.id, role: m.role === "assistant" ? "ai" : "user",
            text: m.content, ts: new Date(m.createdAt).getTime(),
          })));
          setHasHistory(true);
          const lastMood = [...history].reverse().find(m => m.mood)?.mood;
          if (lastMood) setMood(lastMood as KediMood);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [student, historyLoaded]);

  /* Proaktif günlük özet — chat kapalıyken bile, girişte günde en fazla 1 kez.
     Model kendi karar verir (bkz. buildBriefPrompt): gerçekten önemli bir şey
     yoksa hiçbir şey göstermez, böylece rahatsız edici sıklıkta konuşmaz. */
  useEffect(() => {
    if (!student || typeof window === "undefined") return;
    const gateKey = `kedi_ai_brief_date_${student.id}`;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(gateKey) === today) return;
    localStorage.setItem(gateKey, today);

    fetch("/api/kedi-ai/brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorType: "student", studentId: student.id }),
    })
      .then(res => res.json())
      .then((data: { brief: string | null; mood?: string }) => {
        if (!data.brief) return;
        const briefMood = (data.mood as KediMood) ?? null;
        setBrief({ text: data.brief, mood: briefMood });
        if (briefMood) setMood(briefMood);
        setMsgs(prev => [...prev, { id: `brief-${Date.now()}`, role: "ai", text: data.brief!, ts: Date.now() }]);
        briefTimerRef.current = setTimeout(() => setBrief(null), 16000);
      })
      .catch(() => {});

    return () => { if (briefTimerRef.current) clearTimeout(briefTimerRef.current); };
  }, [student]);

  /* Veri yükle */
  useEffect(() => {
    if (!student || loaded) return;
    const season = getCurrentSeason();
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getWaterLog(student.id, todayDate()).catch(() => null),
      getHealthProfile(student.id).catch(() => null),
      getStudentGiftClaimsForSeason(student.id, season).catch(() => []),
      getStudentXPAdjustments(student.id).catch(() => []),
      getStudents().catch(() => []),
      getAllXPAdjustments().catch(() => []),
      getStudentMissionCompletions(student.id).catch(() => new Set<string>()),
      getKediMissions(student.id).catch(() => []),
      getKediVisionAnalyses(student.id).catch(() => []),
      getPublishedKediProgram(student.id).catch(() => null),
      getWaterLogRange(student.id, 7).catch(() => []),
    ]).then(([apts, recs, water, health, giftClaims, xpAdjustments, allStudents, allAdjustments, completions, customMissions, visionAnalyses, publishedProgram, recentWaterLogs]) => {
      const sorted      = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const sortedApts  = [...apts].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
      const summary     = computeFullXP(student.completedLessons, apts, sorted, season, xpAdjustments);
      const xp          = summary.lifetimeResult;
      const seasonTotal = summary.seasonResult.breakdown.total;

      const claimed5k  = giftClaims.some(c => c.threshold === 5000);
      const claimed10k = giftClaims.some(c => c.threshold === 10000);

      const savedGoal = typeof window !== "undefined"
        ? localStorage.getItem("kedi_ai_goal") ?? undefined
        : undefined;

      /* Rozetler */
      const extraFlags: Record<string, boolean> = {};
      if (typeof window !== "undefined") {
        extraFlags["shadow-fan"] = localStorage.getItem("kedi_ai_used") === "1" || localStorage.getItem("kara_ai_used") === "1";
      }
      const manualXP     = sumManualXP(xpAdjustments);
      const badges       = computeBadges(student, sortedApts, sorted, extraFlags, manualXP);
      const earnedBadges = badges.filter(b => b.earned);
      const nextBadge    = findNextBadge(badges);

      /* Onur Listesi (Hall of Fame) sırası — heuristic: tamamlanan ders × 100 + manuel XP */
      const hallEntries = allStudents
        .map(s => {
          const manualTotal = sumManualXP(allAdjustments.filter(a => a.studentId === s.id));
          const approxXP    = Math.max(0, s.completedLessons * 100 + manualTotal);
          return { id: s.id, xp: approxXP };
        })
        .filter(e => e.xp > 0);
      const myHallIdx = hallEntries.findIndex(e => e.id === student.id);
      if (myHallIdx !== -1) {
        hallEntries[myHallIdx].xp = xp.breakdown.total;
      } else if (xp.breakdown.total > 0) {
        hallEntries.push({ id: student.id, xp: xp.breakdown.total });
      }
      hallEntries.sort((a, b) => b.xp - a.xp);
      const myRankIdx = hallEntries.findIndex(e => e.id === student.id);
      const hallRank  = myRankIdx !== -1 ? myRankIdx + 1 : null;
      const hallTotal = hallEntries.length;

      /* Ders geçmişi detayı */
      const cancelledLessons = sortedApts.filter(a => a.status === "iptal").length;
      const noShowLessons    = sortedApts.filter(a => a.status === "gelmedi").length;

      /* Görevler */
      const weekKey   = getWeekKey();
      const missionInput: MissionComputeInput = {
        appointments:     sortedApts,
        records:          sorted,
        totalXP:          xp.breakdown.total,
        lastTrainingPlan: loadAIPlan("training"),
        lastNutritionPlan:loadAIPlan("nutrition"),
      };
      const missions  = computeStudentMissions(missionInput, completions, weekKey, customMissions);

      // Yeni tamamlananlar için XP ödülü — üç katmanlı koruma:
      // 1) m.xpAwarded → DB'de zaten var (completions set'inden)
      // 2) awardedThisSession → aynı component oturumunda tekrar tetiklenme
      // 3) recordMissionCompletion → false döndürürse XP verilmez (DB guard)
      missions.forEach(m => {
        if (m.completed && !m.xpAwarded && !awardedThisSession.current.has(m.key)) {
          awardedThisSession.current.add(m.key); // anında işaretle, async bitmesini bekleme
          recordMissionCompletion(student.id, m.key, m.xpReward)
            .then(wasNew => {
              if (wasNew) {
                createXPAdjustment(
                  student.id, student.fullName, m.xpReward,
                  "Görev Tamamlama", m.title, "KEDİ AI", season,
                ).catch(() => {});
              }
            })
            .catch(() => {});
        }
      });

      const ctx: StudentContext = {
        name:             student.fullName,
        studentId:        student.id,
        remainingLessons: student.remainingLessons,
        completedLessons: student.completedLessons,
        totalLessons:     student.totalLessons,
        level:            student.level,
        appointments:     sortedApts,
        records:          sorted,
        waterGlasses:     water?.glasses ?? 0,
        waterTarget:      8,
        subscriptionType: student.subscriptionType,
        packageStartDate: student.packageStartDate,
        packageEndDate:   student.packageEndDate,
        packageDaysRemaining: getDaysRemaining(student.packageEndDate),
        weight:           health?.weight ?? student.weight,
        age:              health?.age    ?? student.age,
        height:           health?.height,
        gender:           health?.gender,
        goal:             savedGoal,
        xp,
        seasonSummary:    summary,
        claimed5k,
        claimed10k,
        giftRequests:     giftClaims,
        badges,
        earnedBadges,
        nextBadge,
        hallRank,
        hallTotal,
        cancelledLessons,
        noShowLessons,
        lastTrainingPlan:  loadAIPlan("training"),
        lastNutritionPlan: loadAIPlan("nutrition"),
        missions,
        visionAnalyses,
        publishedProgram,
        recentWaterLogs,
      };

      setCtx(ctx);
      setLoaded(true);

      // Sezon XP eşiğine ulaşıldıysa ve henüz talep edilmediyse admin'e gönder
      if (seasonTotal >= 5000 && !claimed5k) {
        createGiftLessonRequest(
          student.id, student.fullName, xp.breakdown.total, season, 5000, seasonTotal,
        ).catch(() => {});
      }
      if (seasonTotal >= 10000 && !claimed10k) {
        createGiftLessonRequest(
          student.id, student.fullName, xp.breakdown.total, season, 10000, seasonTotal,
        ).catch(() => {});
      }
    }).catch(() => setLoaded(true));
  }, [student, loaded]);

  /* Smart Notification Center (V5) — uygulama açıldıktan ~1sn sonra kontrol
     eder; gösterilecek GERÇEK bir olay varsa paneli KENDİSİ açar, mesajı
     Kedi AI'nin konuşma balonu olarak enjekte eder ve avatarı "speaking"
     durumuna geçirir. Panel zaten kullanıcı tarafından açıksa (open=true)
     araya girmez — bir sonraki uygun kontrolde (ör. başka bir sayfaya geçiş)
     tekrar denenir, olay "görülmüş" işaretlenmediği için kaybolmaz. */
  useEffect(() => {
    if (!ctx || !student || open || !historyLoaded) return;
    const timer = setTimeout(() => {
      const seen = loadSeenState(student.id);
      let bootstrapped = reconcileSeenState(ctx, seen);
      // İlk yüklemede rozet/seviye kimliklerini SESSİZCE kaydet — eski
      // başarıları "yeni kazanıldı" diye yanlışlıkla kutlamamak için.
      if (bootstrapped.lastBadgeIds === undefined) {
        bootstrapped = { ...bootstrapped, lastBadgeIds: ctx.earnedBadges.map(b => b.id) };
      }
      if (bootstrapped.lastLevelId === undefined) {
        bootstrapped = { ...bootstrapped, lastLevelId: ctx.xp.level.current.id };
      }
      saveSeenState(student.id, bootstrapped);

      const candidate = pickSmartNotification(ctx, bootstrapped);
      if (!candidate) return;
      saveSeenState(student.id, candidate.markSeen(bootstrapped));

      setOpen(true);
      setMin(false);
      setAvatarState("speaking");
      setMsgs(prev => [...prev, { id: `smart-${Date.now()}`, role: "ai", text: candidate.text, ts: Date.now(), links: candidate.links }]);
      if (voice.voiceOut) voice.speak(candidate.text);
      else setTimeout(() => setAvatarState("idle"), 3000);
    }, 1000);
    return () => clearTimeout(timer);
    // `voice` BİLEREK deps dışında — useKediVoice her render'da YENİ bir
    // obje referansı döndürüyor (memoize edilmemiş), deps'e eklenirse bu
    // effect her render'da yeniden çalışır ve panel zaten "open" olduğu
    // ANDA bile tekrar tetiklenip İKİNCİ bir bildirimi art arda gösterirdi
    // (canlı testte gözlemlendi, bu düzeltmeyle giderildi).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, student, open, historyLoaded]);

  /* İlk açılışta karşılama — kalıcı geçmiş varsa atlanır (madde 10) */
  useEffect(() => {
    if (!open || !ctx || !historyLoaded || hasHistory || msgs.length > 0) return;
    setTyping(true);
    const timer = setTimeout(() => {
      const greeting = buildContext(ctx);
      setMsgs([{ id:"init", role:"ai", text: greeting, ts: Date.now() }]);
      setTyping(false);
      if (typeof window !== "undefined") localStorage.setItem("kedi_ai_used", "1");
      if (voice.voiceOut) voice.speak(greeting);
    }, 900);
    return () => clearTimeout(timer);
  }, [open, ctx, historyLoaded, hasHistory, msgs.length, voice]);

  /* Scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, typing]);

  /* Input focus */
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  /* Kedi AI Ultra — gerçek LLM'e (Claude Opus 5) streaming istek atar.
     Sunucu tarafı /api/kedi-ai/chat, öğrencinin tüm verisinden bir "digest"
     kurup system prompt'a gömüyor; burada sadece metni akıtıyoruz. */
  const KEDI_MOOD_DELIM = " KEDI_MOOD::";
  const sendMessage = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !ctx) return;
    const userMsg: Msg = { id: Date.now().toString(), role:"user", text, ts: Date.now() };
    const aiMsgId = (Date.now() + 1).toString();
    setMsgs(prev => [...prev, userMsg, { id: aiMsgId, role:"ai", text:"", ts: Date.now() }]);
    setInput("");
    setTyping(true);
    setAvatarState("thinking");

    (async () => {
      try {
        const res = await fetch("/api/kedi-ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ actorType: "student", studentId: ctx.studentId, message: text }),
        });
        if (!res.ok || !res.body) throw new Error("Kedi AI yanıt veremedi");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        let firstChunk = true;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          if (firstChunk) { setTyping(false); firstChunk = false; }
          const display = raw.split(KEDI_MOOD_DELIM)[0];
          setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display } : m));
        }

        const [finalText, moodPart] = raw.split(KEDI_MOOD_DELIM);
        const finalMood = (moodPart?.trim() as KediMood) || null;
        const cleanText = finalText.trim();
        setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: cleanText } : m));
        if (finalMood) setMood(finalMood);
        setTyping(false);
        if (voice.voiceOut) {
          voice.speak(cleanText);
        } else {
          setAvatarState("idle");
        }
      } catch {
        setMsgs(prev => prev.map(m => m.id === aiMsgId
          ? { ...m, text: "Kedi şu an düşüncelerini toparlayamadı, birazdan tekrar dener misin? 🐈" }
          : m));
        setTyping(false);
        setAvatarState("idle");
      }
    })();
  }, [input, ctx, voice]);

  /* sendMessage tanımlandıktan sonra ref'e yaz — ses hook'u bunu final transcript'te çağırır */
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!student) return null;

  return (
    <>
      {/* ── Drag sınırı: tüm ekranı kapsar, pointer-events yok ─── */}
      <div
        ref={constraintRef}
        style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:49 }}
      />

      {/* ── Proaktif günlük özet ─────────────────────────────────── */}
      <AnimatePresence>
        {brief && !open && (
          <KediBriefToast
            text={brief.text}
            mood={brief.mood}
            onOpen={() => { setOpen(true); setMin(false); setBrief(null); }}
            onDismiss={() => setBrief(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Floating buton ─────────────────────────────────────── */}
      <motion.button
        drag
        dragMomentum={false}
        dragConstraints={constraintRef}
        dragElastic={0.05}
        onDragStart={() => setDidDrag(true)}
        onDragEnd={() => setTimeout(() => setDidDrag(false), 100)}
        onClick={() => { if (!didDrag) { setOpen(o => !o); setMin(false); } }}
        initial={false}
        animate={{
          scale:   appeared ? 1 : 0,
          opacity: appeared ? (open ? 1 : 0.72) : 0,
        }}
        whileHover={{ opacity: 1, scale: 1.07 }}
        whileTap={{ scale: 0.91 }}
        transition={{ type:"spring", stiffness:280, damping:22 }}
        aria-label="KEDİ AI Koç — tıkla veya sürükle"
        className="hidden lg:flex"
        style={{
          position:     "fixed",
          bottom:       "calc(env(safe-area-inset-bottom, 0px) + 88px)",
          right:        20,
          zIndex:       50,
          width:        56,
          height:       56,
          borderRadius: "50%",
          border:       "none",
          boxShadow:    open
            ? "0 0 0 3px rgba(139,92,246,0.22), 0 0 28px rgba(139,92,246,0.6), 0 0 56px rgba(236,72,153,0.2)"
            : "0 0 18px rgba(139,92,246,0.4), 0 4px 14px rgba(0,0,0,0.5)",
          cursor:       "grab",
          touchAction:  "none",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        {/* Akan gradient halka */}
        <div className="gradient-animated gradient-slow gradient-violet-pink-orange"
          style={{ position: "absolute", inset: -2, borderRadius: "50%" }} />
        {/* Koyu dolgu */}
        <div style={{
          position:     "absolute",
          inset:        0,
          borderRadius: "50%",
          background:   "radial-gradient(circle at 38% 38%, #1e1040, #0a0718)",
        }} />

        {/* Beyaz daire arka plan — kedi kontrast için */}
        <div style={{
          position:     "absolute",
          width:        40,
          height:       40,
          borderRadius: "50%",
          background:   "rgba(255,255,255,0.93)",
          boxShadow:    "inset 0 0 0 1px rgba(139,92,246,0.15)",
        }} />

        {/* Kedi SVG */}
        <div style={{ position:"relative", zIndex:1 }}>
          <KediAvatar size={34} state={open ? avatarState : "idle"} mood={mood} mouthPulseKey={mouthPulseKey} />
        </div>

        {/* Nabız glow — sadece kapalıyken */}
        {!open && appeared && (
          <motion.div
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              border:       "1.5px solid rgba(139,92,246,0.55)",
              pointerEvents:"none",
            }}
            animate={{ scale:[1, 1.4, 1], opacity:[0.6, 0, 0.6] }}
            transition={{ duration:2.4, repeat:Infinity }}
          />
        )}
      </motion.button>

      {/* ── Chat paneli ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobil overlay */}
            <motion.div
              className="fixed inset-0 sm:hidden"
              style={{ zIndex:54, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity:0, y:24, scale:0.96, filter:"blur(6px)" }}
              animate={{ opacity:1, y:0, scale:1, filter:"blur(0px)" }}
              exit={{ opacity:0, y:24, scale:0.96, filter:"blur(4px)" }}
              transition={{ type:"spring", stiffness:320, damping:28 }}
              className="fixed flex flex-col kara-panel glass-strong"
              style={{ zIndex: 55 }}
            >
              {/* Üst akan neon şerit */}
              <div className="absolute top-0 left-0 right-0 h-[3px] flex-shrink-0 gradient-animated gradient-violet-pink-orange rounded-t-2xl" />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom:"1px solid rgba(139,92,246,0.15)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(139,92,246,0.3)" }}>
                    {/* Sinematik giriş — panel açılınca bir kerelik ışık patlaması */}
                    <motion.div
                      aria-hidden
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(196,181,253,0.9) 0%, transparent 70%)" }}
                      initial={{ opacity: 0.9, scale: 0.3 }}
                      animate={{ opacity: 0, scale: 2.2 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                    <KediAvatar size={24} state={avatarState} mood={mood} mouthPulseKey={mouthPulseKey} />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                  >
                    <div className="text-sm font-semibold tracking-wider"
                      style={{ color:"#C4B5FD", fontFamily:"var(--font-display)", letterSpacing:"0.12em" }}>
                      KEDİ AI
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                        Kişisel Antrenör Koçun
                      </span>
                    </div>
                  </motion.div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={voice.toggleVoiceOut}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                    style={{ color: voice.voiceOut ? "#A78BFA" : "rgba(255,255,255,0.3)" }}
                    title={voice.voiceOut ? "Sesli oku: Açık" : "Sesli oku: Kapalı"}
                    aria-label="Sesli oku aç/kapat"
                  >
                    {voice.voiceOut ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
                  <button
                    onClick={() => setMin(m => !m)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Küçült"
                  >
                    <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Kapat"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Mesaj alanı + input */}
              {!minimized && (
                <>
                  <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                    style={{ overscrollBehavior:"contain", WebkitOverflowScrolling:"touch" } as React.CSSProperties}
                  >
                    <AnimatePresence initial={false}>
                      {msgs.map(m => <MsgBubble key={m.id} msg={m} onNavigate={() => setOpen(false)} />)}
                      {typing && <TypingIndicator key="typing" />}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                  </div>

                  {/* Hızlı sorular */}
                  {msgs.length <= 1 && (
                    <div className="flex-shrink-0 px-4 pb-2 flex gap-2 flex-wrap">
                      {["Görevlerim neler?", "Bugün ne antrenman yapayım?", "Randevum ne zaman?", "XP durumum"].map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="glass text-[10px] px-2.5 py-1.5 rounded-lg transition-transform duration-200 hover:scale-[1.04] active:scale-95"
                          style={{ fontFamily: "var(--font-label)", color: "#A78BFA" }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sesli komut hata mesajı */}
                  {voice.voiceError && (
                    <div className="flex-shrink-0 px-4 pb-1.5 text-[11px]" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                      ⚠️ {voice.voiceError}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                    style={{ borderTop:"1px solid rgba(139,92,246,0.15)" }}>

                    {/* Mikrofon butonu */}
                    {voice.speechSupported && (
                      <button
                        onClick={voice.toggleListening}
                        className="glass w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                        title={voice.listening ? "Dinleniyor — durdurmak için tıkla" : "Sesli komut"}
                        style={{
                          background: voice.listening ? "rgba(239,68,68,0.2)" : undefined,
                          borderColor: voice.listening ? "rgba(239,68,68,0.5)" : undefined,
                          color: voice.listening ? "var(--color-error)" : "rgba(255,255,255,0.3)",
                          animation: voice.listening ? "glowPulse 1s ease-in-out infinite" : "none",
                        }}
                        aria-label={voice.listening ? "Dinlemeyi durdur" : "Sesli komut başlat"}
                      >
                        {voice.listening ? <MicOff size={13} /> : <Mic size={13} />}
                      </button>
                    )}

                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={voice.listening ? "Dinleniyor…" : "Bir şey sor…"}
                      className="glass flex-1 outline-none text-sm text-white placeholder-white/20 px-3.5 py-2 rounded-full"
                      style={{ fontFamily:"var(--font-label)" }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || typing}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform duration-200 flex-shrink-0 hover:scale-105 active:scale-95 ${input.trim() && !typing ? "gradient-animated gradient-fast gradient-violet-pink-orange" : "glass"}`}
                      style={{ color: input.trim() && !typing ? "#fff" : "rgba(255,255,255,0.2)" }}
                      aria-label="Gönder"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
