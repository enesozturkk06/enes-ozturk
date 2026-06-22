"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, createGiftLessonRequest,
  getStudentGiftClaimsForSeason, getStudentXPAdjustments,
  getStudents, getAllXPAdjustments,
  getStudentMissionCompletions, recordMissionCompletion, getKediMissions,
  createXPAdjustment,
} from "@/lib/db";
import {
  computeStudentMissions, getWeekKey, nearestMission, activeMissionCount,
  totalMissionXP, type StudentMission, type MissionComputeInput,
} from "@/lib/kediTasks";
import { getWaterLog, getHealthProfile, todayDate } from "@/lib/health";
import type { Appointment, LessonRecord, GiftLessonRequest } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getSeasonLabel, getDaysUntilSeasonEnd,
  getLevelForXP, sumManualXP, type XPResult, type SeasonXPSummary,
} from "@/lib/xp";
import { computeBadges, type Badge } from "@/lib/badges";
import { isPackageExpired, getDaysRemaining } from "@/lib/packageDuration";
import { PACKAGE_EXPIRED_AI_TEXT } from "@/lib/constants";
import { X, Send, ChevronDown, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

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
  subscriptionType?: string;
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
}

/* ── Yardımcılar ─────────────────────────────────────────────────── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** AI cevabını sesli oku (Web Speech Synthesis API) */
function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = text.replace(/\*\*/g, "").replace(/[#_~`]/g, "").replace(/\n+/g, ". ");
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "tr-TR";
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  } catch { /* sessizce geç */ }
}

/** Sesli komuttaki "Kedi," çağrı sözcüğünü temizle */
function stripWakeWord(text: string): string {
  return text.replace(/^\s*kedi[\s,]+/i, "").trim();
}

/** Seviye id'sine göre koçluk tonu — her öğrenciye aynı tonda konuşulmaz */
type CoachTier = "amator" | "gelisen" | "elit";
function coachTier(levelId: string): CoachTier {
  if (levelId === "starter") return "amator";
  if (levelId === "bronze" || levelId === "silver") return "gelisen";
  return "elit"; // gold, diamond, legend
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

/* ── Intent tipleri ──────────────────────────────────────────────── */
type Intent =
  | "training" | "technical" | "lesson" | "appointment"
  | "progress"  | "motivation" | "nutrition" | "water"
  | "greeting"  | "badge"      | "identity"  | "appinfo"
  | "xp"        | "goal"       | "ranking"   | "missions"
  | "default";

function detectIntent(msg: string): Intent {
  if (/antrenman yap|bugün ne|program|egzersiz|hazırla|çalışma|ısın|kondisyon plan|idman/.test(msg)) return "training";
  if (/teknik|yumruk|tekme|savunma|gard|kombinasyon|spar|punch|kick/.test(msg))                       return "technical";
  if (/paket|ders hakkı|kalan ders|yenile|satın|ders bit|paket bit|kaç dersim|ne zaman bit|kaç gün kaldı|pakete kalan/.test(msg)) return "lesson";
  if (/randevu|ne zaman geli|randevum|booking|takvim/.test(msg))                                       return "appointment";
  if (/ilerleme|gelişim|skor|puan|performans|nasıl gidiy|grafik|trend|istatistik/.test(msg))           return "progress";
  if (/motivasyon|vazgeç|bırak|yorgun|zor|üzgün|kötü|sinir|pes|olmaz|duy|hisse/.test(msg))            return "motivation";
  if (/beslenme|diyet|kalori|protein|karbonhidrat|yemek|ne yemeli|gıda|öğün|ne yesem/.test(msg))      return "nutrition";
  if (/bugün ne kadar su|su iç|su miktarı|hidrasyon|kaç bardak/.test(msg))                            return "water";
  if (/merhaba|selam|hey|nasılsın|iyi misin|naber|günaydın|iyi gece|iyi akşam/.test(msg))             return "greeting";
  if (/görev|mission|görevim|haftalık görev|görevlerim/.test(msg))                                    return "missions";
  if (/sıralama|kaçıncı|onur listesi|hall of fame|en iyiler|listede/.test(msg))                       return "ranking";
  if (/rozet|ödül|başarı koleksiyon/.test(msg))                                                        return "badge";
  if (/kim|ne sin|yapay zeka|robot|kedi ai|kendin|tanıt/.test(msg))                                   return "identity";
  if (/xp|enerji puan|puan durumum|hediye ders|5000 xp/.test(msg))                                   return "xp";
  if (/hedef|amacım|neden geli|antrenman amac|ne için/.test(msg))                                     return "goal";
  if (/nasıl randevu|nereden randevu|iptal kural|18 saat|paket nasıl|rozet nasıl|uygulama|ne yapabil|ai antrenman|ai diyet|nasıl kullan|ne işe yar/.test(msg)) return "appinfo";
  return "default";
}

/* ── Yönlendirme butonları ────────────────────────────────────────── */

const ACTION_LINKS: Record<string, ActionLink> = {
  appointment:   { label: "Randevu Al",       href: "/ogrenci/randevu" },
  level:         { label: "Seviye Merkezim",  href: "/ogrenci/seviye" },
  badges:        { label: "Rozetlerim",       href: "/ogrenci/rozetler" },
  progress:      { label: "Gelişimim",        href: "/ogrenci/gelisim" },
  training:      { label: "AI Antrenman",     href: "/ogrenci/antrenman" },
  nutrition:     { label: "AI Diyet",         href: "/ogrenci/saglik" },
  notifications: { label: "Bildirimler",      href: "/ogrenci/bildirimler" },
  shop:          { label: "Mağaza",           href: "/magaza" },
  lessons:       { label: "Kalan Derslerim",  href: "/ogrenci" },
  missions:      { label: "Görevlerimi Gör",  href: "/ogrenci/seviye" },
  fightcard:     { label: "Fight Card",       href: "/ogrenci/fight-card" },
  profile:       { label: "Profilim",         href: "/ogrenci/profil" },
  renewal:       { label: "Paket Yenile",     href: "/magaza" },
};

/** İlgili yönlendirme butonlarını intent + mesaj içeriğine göre seç (tekrarsız) */
function getActionLinks(intent: Intent, msg: string): ActionLink[] {
  const links: ActionLink[] = [];
  switch (intent) {
    case "appointment": links.push(ACTION_LINKS.appointment); break;
    case "missions":    links.push(ACTION_LINKS.missions, ACTION_LINKS.level); break;
    case "xp":
    case "badge":
    case "ranking":     links.push(ACTION_LINKS.level, ACTION_LINKS.badges); break;
    case "progress":
    case "technical":   links.push(ACTION_LINKS.progress); break;
    case "training":    links.push(ACTION_LINKS.training); break;
    case "nutrition":   links.push(ACTION_LINKS.nutrition); break;
    case "lesson":      links.push(ACTION_LINKS.lessons); break;
    case "default":     links.push(ACTION_LINKS.missions); break;
  }
  if (/randevu al|randevu oluştur/.test(msg)) links.push(ACTION_LINKS.appointment);
  if (/mağaza|market|ürün|satın al/.test(msg)) links.push(ACTION_LINKS.shop);
  if (/bildirim|duyuru/.test(msg)) links.push(ACTION_LINKS.notifications);
  if (/seviye|level/.test(msg)) links.push(ACTION_LINKS.level);
  if (/rozet|ödül/.test(msg)) links.push(ACTION_LINKS.badges);
  if (/fight card|dövüşçü kart|kartım/.test(msg)) links.push(ACTION_LINKS.fightcard);
  if (/profil/.test(msg)) links.push(ACTION_LINKS.profile);
  if (/paket yenile|yeni paket|paket al/.test(msg)) links.push(ACTION_LINKS.renewal);

  // tekrarsız hale getir (href bazlı)
  const seen = new Set<string>();
  return links.filter(l => (seen.has(l.href) ? false : (seen.add(l.href), true)));
}

/* ── Intent handler'ları ─────────────────────────────────────────── */

function handleTraining(name: string, ctx: StudentContext): string {
  const last  = ctx.records[0];
  const level = ctx.level ?? "orta";

  if (last) {
    const scores: [string, number, string][] = [
      ["Yumruk",         last.punch,       "gölge boks + kombinasyon serisi"],
      ["Tekme",          last.kick,        "tekme tekniği, pivot ve kalça açılımı"],
      ["Savunma",        last.defense,     "slip, bob & weave, gard çalışması"],
      ["Kombinasyon",    last.combination, "2'li ve 3'lü seri ritim antrenmanı"],
      ["Serbest Çalışma",last.sparring,    "kontrollü spar ve mesafe yönetimi"],
    ];
    const weakest = [...scores].sort((a, b) => a[1] - b[1])[0];
    const reply = pick([
      `${name}, bugün **${weakest[0]}** odaklı antrenman öneriyorum (zayıf alanın):\n\n🔥 **Isınma** (10 dk): ip atlama + eklem hareketleri\n🥊 **Ana çalışma** (25 dk): ${weakest[2]}\n💨 **Kondisyon** (10 dk): tabata × 4 tur (20sn iş / 10sn dinlenme)\n🧘 **Soğuma** (5 dk): esneme + nefes`,
      `${weakest[0]} en gelişim alanın ${name}, o yüzden bugün:\n\n1️⃣ 3 dk ip atlama ısınma\n2️⃣ 4×3 dk ${weakest[2]}\n3️⃣ 3×2 dk kondisyon devresi (burpee + squat + plank)\n4️⃣ 5 dk esneme\n\nToplam ~50 dk. Hazır mısın? 🥊`,
    ]);
    saveAIPlan("training", `${weakest[0]} odaklı antrenman (zayıf alan analizi)`);
    return reply;
  }

  const levelPrograms: Record<string, string[]> = {
    baslangic: [
      `${name}, başlangıç seviyesi için bugünkü program:\n\n🔥 **Isınma** (10 dk): hafif koşu + eklem döndürme\n👊 **Temel teknik** (20 dk): düz yumruk (jab-cross) + öne tekme\n💪 **Kondisyon** (10 dk): 3×(10 squat + 10 push-up + 20sn plank)\n🧘 **Soğuma** (5 dk): nefes + esneme`,
      `${name}, bugün temel egzersizlere odaklan:\n\n🌟 5 dk jump rope ısınma\n🥊 Gölge boks: 4×2 dk (sadece jab-cross)\n🦵 Öne tekme: 3×20 tekrar (her bacak)\n🔥 Finisher: 3×(8 burpee + 15 squat)\n🧘 Esneme`,
    ],
    orta: [
      `${name}, orta seviye kickboks antrenmanı:\n\n🔥 **Isınma** (10 dk): ip atlama + shadowboxing\n🥊 **Teknik** (20 dk): jab-cross-kanca kombinasyonu + diz + yüksek tekme\n💨 **Güç** (15 dk): kese vuruşu (ağır kese, 5×3 dk tur)\n💪 **Kondisyon** (10 dk): tabata × 4\n🧘 **Soğuma**`,
      `Bugün yoğun bir seans ${name}:\n\n⏱ 12 dk shadowboxing (2 dk iş, 1 dk dinlenme)\n🥊 Kombine seri: jab-cross-roundhouse × 50\n🦵 Yüksek tekme çalışması: 3×30 (sağ-sol)\n💨 HIIT finisher: 4×(15 sn maksimum punch + 45 sn dinlenme)\n🧘 Esneme`,
    ],
    ileri: [
      `İleri seviye seans ${name}:\n\n🔥 Isınma: 15 dk aktif (ip + shadowboxing + kalça mobilitesi)\n🥊 Tur çalışması: 6×3 dk ağır kese (1 dk dinlenme)\n🦵 Hız tekme: 4×20 ikili kombinasyon her bacak\n💪 Güç: explosive squat + clap push-up × 4 tur\n⚡ Spar simülasyonu: 3×2 dk\n🧘 Soğuma + foam roller`,
    ],
  };

  const programs = levelPrograms[level] ?? levelPrograms["orta"];
  const reply = pick(programs);
  saveAIPlan("training", `${level === "baslangic" ? "Başlangıç" : level === "ileri" ? "İleri" : "Orta"} seviye genel program`);
  return reply;
}

function handleTechnical(name: string, ctx: StudentContext): string {
  const last = ctx.records[0];
  const tips: Record<string, string> = {
    "Yumruk":          "Pivot ile güç üret; vuruş anında el bileğini kilitle, sonra gevşet.",
    "Tekme":           "Kalça açılımını tam yap; destek ayağın parmak uçlarında pivot çevir.",
    "Savunma":         "Her vuruştan sonra gard geri gelsin; slip hareketi omuzdan başlamalı.",
    "Kombinasyon":     "Ritim tutarlılığı şart; ilk vuruş bitmeden ikinciyi hazırla.",
    "Serbest Çalışma": "Rakibini oku, mesafe yönet; boş vururken de gard ihmal etme.",
  };

  if (!last) {
    return pick([
      `${name}, henüz ders kaydın yok ama temel teknik kontrol listesi:\n\n✅ Duruş: Dominant el arkada, çene korumalı\n✅ Gard: Her zaman yüz seviyesinde\n✅ Nefes: Vuruşla nefes ver\n✅ Dönüş: Her vuruşta gardı geri al\n\nDers sonrası kişisel analizine başlayabiliriz!`,
      `Teknik için ders kaydına ihtiyacım var ${name}. Şimdilik kontrol et:\n\n🥊 Her vuruştan sonra gard yerine dönüyor mu?\n👣 Ayak işi tutarlı mı, pivot yapıyor musun?\n💨 Nefes ritmin vuruşla senkronize mi?\n\nİlk dersten sonra detaylı analiz gelecek!`,
    ]);
  }

  const scores: [string, number][] = [
    ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
    ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
  ];
  const sorted = [...scores].sort((a, b) => a[1] - b[1]);
  const weak   = sorted[0];
  const weak2  = sorted[1];
  const strong = [...scores].sort((a, b) => b[1] - a[1])[0];
  const avg    = (scores.reduce((s, [, v]) => s + v, 0) / scores.length).toFixed(1);

  return pick([
    `${name}, son ders teknik özeti:\n\n💪 **En güçlü**: ${strong[0]} → ${strong[1]}/10\n⚠️ **Öncelik 1**: ${weak[0]} → ${weak[1]}/10\n⚠️ **Öncelik 2**: ${weak2[0]} → ${weak2[1]}/10\n\n💡 ${tips[weak[0]]}\n\nGenel ortalama: **${avg}/10**`,
    `Teknik raporu ${name} (son ders):\n\n🌟 ${strong[0]}: ${strong[1]}/10 — bu alanda iyi gidiyorsun\n🎯 Odak: ${weak[0]} (${weak[1]}/10) — ${tips[weak[0]]}\n📊 Tüm skor ort: **${avg}/10** | Genel: **${last.overall}/10**`,
  ]);
}

function handleLesson(name: string, ctx: StudentContext): string {
  const lowL = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;
  const days = ctx.packageDaysRemaining;
  const packLine = days !== null
    ? (days < 0
        ? `\n\n⚠️ Paketinin süresi **${Math.abs(days)} gün önce** doldu.`
        : days === 0
        ? `\n\n⏰ Paketin **bugün** sona eriyor!`
        : `\n\n📅 Paketinin bitmesine **${days} gün** kaldı.`)
    : "";

  if (ctx.subscriptionType === "monthly") {
    return pick([
      `${name}, aylık üyeliğin aktif! 🎉 Sınırsız ders — sadece randevu oluşturman yeterli. Bu ay ne kadar ders aldığını görmek ister misin?${packLine}`,
      `Aylık paketle ${name}, her hafta istediğin kadar antrenman yapabilirsin. Randevu sayfasından uygun slotu seç, başka bir şey gerekmez!${packLine}`,
    ]);
  }
  if (ctx.remainingLessons === 0) {
    return pick([
      `${name}, ders hakkın tükendi 😿 Antrenör Enes'e WhatsApp'tan ulaşarak yeni paket alabilirsin. ${ctx.completedLessons} ders tamamladın — harika bir çalışmaydı!${packLine}`,
      `Ders hakkın bitti ${name}. Devam etmek için yeni paket al — WhatsApp butonuna bas, Enes sana en uygun paketi önerir. Momentumu kaybetme!${packLine}`,
    ]);
  }
  if (lowL) {
    return pick([
      `${name}, dikkat! Sadece **${ctx.remainingLessons}** ders hakkın kaldı. Bu hafta içinde yeni paket almayı planla. Toplam **${ctx.completedLessons}** ders bitti — momentumu koruyalım!${packLine}`,
      `**${ctx.remainingLessons}** ders kaldı ${name} — yakında bitiyor. WhatsApp'tan Enes'e yaz, kesintisiz devam et. Şu ana kadar ${ctx.completedLessons} ders tamamladın!${packLine}`,
    ]);
  }
  return pick([
    `${name}, ders durumun:\n\n✅ **Kalan**: ${ctx.remainingLessons} ders\n📚 **Tamamlanan**: ${ctx.completedLessons} ders${packLine}\n\nSürdür, harika gidiyorsun! 🥊`,
    `Paket özeti ${name}: **${ctx.remainingLessons}** ders hakkın var, arkanda **${ctx.completedLessons}** ders var. Her ders seni biraz daha güçlendirdi!${packLine}`,
  ]);
}

/* ── Randevu intent handler ──────────────────────────────────────── */

function handleAppointment(name: string, ctx: StudentContext): string {
  // Paket süresi dolmuşsa randevu alınamaz — önce bunu bildir
  if (isPackageExpired(ctx.packageEndDate)) {
    return PACKAGE_EXPIRED_AI_TEXT;
  }

  // Sadece onaylı + gelecek randevular (tarih+saat bazlı)
  const upcoming = ctx.appointments
    .filter(a => a.status === "onaylandi" && isUpcomingApt(a))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

  // Bugünkü dersi ayrıca belirt
  const today = todayStr();
  const todayApt = upcoming.find(a => a.date === today);
  const futureApts = upcoming.filter(a => a.date !== today);

  if (todayApt) {
    const rest = futureApts.length > 0
      ? `\n\nSonraki: **${format(parseISO(futureApts[0].date), "d MMMM", { locale: tr })}** saat **${futureApts[0].startTime}**`
      : "";
    return `${name}, **bugün** dersin var! 🥊\n\n📅 **${format(parseISO(todayApt.date), "d MMMM EEEE", { locale: tr })}** saat **${todayApt.startTime}**\n\nHazır mısın? Antrenman öncesi hafif ye, bol su iç!${rest}`;
  }

  if (upcoming.length >= 2) {
    const n1 = upcoming[0];
    const n2 = upcoming[1];
    return pick([
      `${name}, önümüzdeki randevuların:\n\n📅 **${format(parseISO(n1.date), "d MMMM EEEE", { locale: tr })}** → ${n1.startTime}\n📅 **${format(parseISO(n2.date), "d MMMM EEEE", { locale: tr })}** → ${n2.startTime}\n\nO güne kadar bol su, iyi uyku! 🥊`,
      `Takviminde **${upcoming.length}** randevu var ${name}. En yakını: **${format(parseISO(n1.date), "d MMMM", { locale: tr })}** saat **${n1.startTime}**. Hazırlıklı gel!`,
    ]);
  }

  if (upcoming.length === 1) {
    const next    = upcoming[0];
    const dateStr = format(parseISO(next.date), "d MMMM EEEE", { locale: tr });
    return pick([
      `${name}, yaklaşan randevun: **${dateStr}** saat **${next.startTime}**.\n\nO günden önce iyi uyu, hafif ye. Hazır gelince ring senin olur! 🥊`,
      `Takvimde görüyorum ${name} — **${dateStr}** antrenman günün. Hazırlıklı gel, Enes Hoca hazır olacak!`,
    ]);
  }

  // Geçmiş randevuları kontrol et — "var ama geçmiş" hatasını önle
  const passedToday = ctx.appointments.filter(a =>
    a.status === "onaylandi" && a.date === today && !isUpcomingApt(a)
  );
  if (passedToday.length > 0) {
    return `${name}, bugünkü dersin az önce tamamlandı veya başlamıştı. Yeni randevu için "Randevu" sayfasından müsait slot seçebilirsin! 📅`;
  }

  const missedNote = (ctx.cancelledLessons + ctx.noShowLessons) > 0
    ? `\n\n(Not: geçmişte ${ctx.cancelledLessons} iptal, ${ctx.noShowLessons} gelinmeyen ders var — yeni randevunu bu sefer sonuna kadar götürelim! 💪)`
    : "";

  return pick([
    `${name}, şu an aktif onaylı randevun görünmüyor. "Randevu" sayfasından antrenör Enes'in müsait slotlarına bakabilirsin! 📅${missedNote}`,
    `Takvimde yaklaşan randevun yok ${name}. Hemen "Randevu" sayfasına git ve bir slot ayır — devam etmek için kritik! 🥊${missedNote}`,
  ]);
}

/* ── İlerleme handler ────────────────────────────────────────────── */

function handleProgress(name: string, ctx: StudentContext): string {
  const last = ctx.records[0];
  if (ctx.records.length === 0)
    return pick([
      `${name}, henüz ders kaydın yok. İlk dersten sonra sana detaylı ilerleme analizi yapacağım! Her ders kaydedilir, trend zamanla görünür hale gelir.`,
      `İlerleme takibi için ders kaydına ihtiyacım var ${name}. İlk ders sonrası analiz hazır — başlamak en büyük adım!`,
    ]);

  if (ctx.records.length === 1)
    return pick([
      `${name}, ilk ders notun **${last.overall}/10** — güçlü bir başlangıç! 2-3 ders sonra gerçek trend görünür hale gelecek.`,
      `Başlangıç notun **${last.overall}/10** ${name}. Harika! Birkaç ders sonra karşılaştırmalı analiz yapabileceğim.`,
    ]);

  const older     = ctx.records[ctx.records.length - 1];
  const diff      = last.overall - older.overall;
  const allScores = ctx.records.map(r => r.overall);
  const avg       = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
  const trend     = diff > 0 ? `📈 **+${diff.toFixed(1)} puan** artış` : diff < 0 ? `📉 **${Math.abs(diff).toFixed(1)} puan** dalgalanma` : `➡️ Stabil seyir`;

  const scores: [string, number][] = [
    ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
    ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
  ];
  const weakest = [...scores].sort((a, b) => a[1] - b[1])[0];
  const strongest = [...scores].sort((a, b) => b[1] - a[1])[0];

  return pick([
    `${name}, **${ctx.records.length}** ders analizi:\n\n${trend}\nİlk: **${older.overall}/10** → Son: **${last.overall}/10**\nOrtalama: **${avg}/10**\n\n💪 En güçlü: **${strongest[0]}** (${strongest[1]}/10)\n🎯 Geliştir: **${weakest[0]}** (${weakest[1]}/10)\n\n${diff > 0 ? "Harika yükseliş! 🌟" : diff < 0 ? "Dalgalanmalar normaldir — devam et." : "İstikrarlı performans!"}`,
    `İlerleme raporu ${name}:\n\n🎯 Son not: **${last.overall}/10**\n📊 ${ctx.records.length} ders ortalaması: **${avg}/10**\n${trend}\n\n💡 Bu hafta **${weakest[0]}** üzerine odaklan — burada en büyük kazanım var.`,
  ]);
}

/* ── Motivasyon handler ──────────────────────────────────────────── */

function handleMotivation(name: string, ctx: StudentContext): string {
  const streak = ctx.xp.currentStreak;
  if (streak >= 5) {
    return pick([
      `${name}, **${streak} ders** üst üste bırakmadan geldin — bu şampiyonluk! 🏆 Zorlanıyorsun ama vazgeçmiyorsun. Bu fark her şey.`,
      `${streak} derslik serin var ${name}. Çoğu insan böyle bir seriye sahip olamaz bile. Devam et, ringde seni görmek harika!`,
    ]);
  }
  return pick([
    `${name}, **${ctx.completedLessons}** ders tamamladın — bu tesadüf değil, bu karar! Her geldiğinde bir adım daha ilerliyorsun. Durmak yok! 🐾`,
    `Yorgunluk geçer, güç kalır ${name}. Ring seni her seferinde biraz daha güçlü yapıyor. Vazgeçme!`,
    `${name}, düşün: Başladığın günden bu yana **${ctx.completedLessons}** kez ayakkabını giyip geldin. Bu iradenin kanıtı. Devam et! 🥊`,
    `Zorlandığında şunu hatırla ${name}: Şampiyonlar da yorulur. Fark şu — onlar yine de gidiyor. Sen de öylesin!`,
    `En iyi kedi bile bazen tökezler ${name}. Ama her zaman ayağa kalkar. Sen de kalkacaksın — çünkü buraya kadar geldin! 🐾`,
    `${name}, ${ctx.completedLessons} ders kolay değil. Çoğu insan ilk haftada bırakır. Sen hâlâ buradasın — bu başarının ta kendisi!`,
  ]);
}

/* ── Beslenme plan oluşturucu ────────────────────────────────────── */

function buildNutritionPlan(
  name: string,
  weight: number,
  goalType: string,
  ctx: StudentContext,
): string {
  const isTrainingDay = ctx.appointments.some(
    a => a.date === todayStr() && (a.status === "onaylandi" || a.status === "tamamlandi")
  );
  const dayLabel = isTrainingDay ? "antrenman günü" : "dinlenme günü";
  const protein  = Math.round(weight * (goalType === "kilo-alma" ? 2.2 : goalType === "musabaka" ? 2.0 : 1.8));
  const carbs    = isTrainingDay
    ? Math.round(weight * (goalType === "kilo-verme" ? 2.5 : 4))
    : Math.round(weight * (goalType === "kilo-verme" ? 1.5 : 3));
  const calories = goalType === "kilo-verme"
    ? Math.round(weight * 27)
    : goalType === "kilo-alma"
    ? Math.round(weight * 36)
    : Math.round(weight * 32);

  let plan = `${name}, **${weight} kg** için **${dayLabel}** beslenme planın:\n\n`;
  plan += `🎯 **Hedef**: ${goalType === "kilo-verme" ? "Kilo Verme" : goalType === "kilo-alma" ? "Kas/Kilo Alma" : goalType === "musabaka" ? "Maç Hazırlığı" : "Kondisyon"}\n\n`;
  plan += `📊 **Günlük Hedefler:**\n`;
  plan += `• Kalori: **~${calories} kcal**\n`;
  plan += `• Protein: **${protein}g**\n`;
  plan += `• Karbonhidrat: **${carbs}g**\n`;
  plan += `• Su: **${(Math.round(weight * 35 + (isTrainingDay ? 500 : 0)) / 1000).toFixed(1)}L**\n\n`;

  if (isTrainingDay) {
    plan += `🥊 **Antrenman Günü Öğünleri:**\n`;
    plan += `• **2 saat önce**: Yulaf + muz + yumurta\n`;
    plan += `• **Hemen sonra**: 30g protein + basit karbonhidrat (muz, pirinç)\n`;
    plan += `• **Gece**: Yavaş protein — süzme peynir veya yoğurt\n\n`;
  } else {
    plan += `💤 **Dinlenme Günü:**\n`;
    plan += `• Karbonhidratı azalt, protein koru\n`;
    plan += `• Sebze ağırlıklı öğünler tercih et\n`;
    plan += `• ${goalType === "kilo-verme" ? "Kalori açığı için iyi gün — kısıtlamayı uygula!" : "Toparlanma için protein önemli."}\n\n`;
  }

  if (goalType === "kilo-verme")
    plan += `⚠️ Şeker ve işlenmiş gıdadan kaç. Haftada 0.5-1 kg hedefle — daha hızlı kas yitirir.`;
  else if (goalType === "kilo-alma")
    plan += `💪 Kalori fazlasını 300-500 kcal arasında tut. Her öğünde protein kaynağı olsun.`;
  else
    plan += `⚡ Karbonhidratı antrenman saatine göre ayarla. Magnezyum + B vitamini kombinasyonu için ceviz ve muz ekle.`;

  saveAIPlan("nutrition", `${weight} kg, hedef: ${goalType} — ${calories} kcal / ${protein}g protein`);
  return plan;
}

/* ── Beslenme handler (multi-turn destekli) ──────────────────────── */

function handleNutrition(
  name: string,
  ctx: StudentContext,
  pendingIntent: string | null,
  userMsg: string,
): { reply: string; nextPending?: string } {
  const m = userMsg.toLowerCase();

  // Önceki soruya cevap alınıyor
  if (pendingIntent === "nutrition_profile") {
    const weightMatch = m.match(/(\d{2,3})\s*(?:kg|kilo)?/);
    const weight = weightMatch ? parseInt(weightMatch[1]) : (ctx.weight ?? 0);

    const goalMap: Record<string, string> = {
      "kilo ver": "kilo-verme", "zayıfla": "kilo-verme", "yağ": "kilo-verme",
      "kondisyon": "kondisyon", "kilo al": "kilo-alma",
      "kas": "kilo-alma", "güç": "kondisyon",
      "maç": "musabaka", "müsabaka": "musabaka", "teknik": "teknik",
    };
    let detectedGoal: string | null = ctx.goal ?? null;
    for (const [kw, g] of Object.entries(goalMap)) {
      if (m.includes(kw)) { detectedGoal = g; break; }
    }

    if (weight < 30) {
      return {
        reply: `${name}, kilonu anlayamadım. Örnek: "70 kg, kilo vermek istiyorum" şeklinde yaz, sana özel plan hazırlayayım!`,
        nextPending: "nutrition_profile",
      };
    }

    return { reply: buildNutritionPlan(name, weight, detectedGoal ?? "kondisyon", ctx) };
  }

  // Profil bilgisi var mı?
  const hasWeight = (ctx.weight ?? 0) > 30;
  const hasGoal   = Boolean(ctx.goal);

  if (!hasWeight) {
    const missing: string[] = ["kilo"];
    if (!ctx.height) missing.push("boy");
    if (!ctx.age)    missing.push("yaş");
    if (!hasGoal)    missing.push("hedef (kilo verme / kilo alma / kondisyon / maç hazırlığı)");
    return {
      reply: `${name}, kafama göre uydurmuş bir diyet vermem — sana **gerçekten kişisel** bir plan yapabilmem için şunlara ihtiyacım var: **${missing.join(", ")}**.\n\n📝 Şöyle yaz: **"70 kg, 175 cm, 17 yaşındayım, kilo vermek istiyorum"**\n\nYa da kısaca: **"75 kg, maça hazırlanıyorum"** — en azından kilo ve hedefini bilmem lazım, gerisini sağlık profilinden tamamlarım.\n\nBunlarla birlikte kalori, protein ve karbonhidrat hedeflerini antrenman durumuna göre hesaplayacağım!`,
      nextPending: "nutrition_profile",
    };
  }

  return { reply: buildNutritionPlan(name, ctx.weight!, hasGoal ? ctx.goal! : "kondisyon", ctx) };
}

/* ── Su handler ──────────────────────────────────────────────────── */

function handleWater(name: string, ctx: StudentContext): string {
  const pct       = ctx.waterTarget > 0 ? Math.round((ctx.waterGlasses / ctx.waterTarget) * 100) : 0;
  const remaining = Math.max(0, ctx.waterTarget - ctx.waterGlasses);
  if (pct >= 100) {
    return pick([
      `Harika ${name}! Günlük su hedefini tamamladın (**${ctx.waterGlasses}/${ctx.waterTarget}** bardak). Hidrasyon şampiyonusun! 💧`,
      `${name}, **${ctx.waterGlasses}** bardak — günlük hedefe ulaştın! Bu düzeyi koru, performansın buna bağlı. 💧`,
    ]);
  }
  const msg = `${name}, bugün **${ctx.waterGlasses}/${ctx.waterTarget}** bardak su içtin (${pct}%). **${remaining}** bardak daha var.`;
  const tip  = ctx.appointments.some(a => a.date === todayStr() && a.status === "onaylandi")
    ? " Bugün antrenman günü — su kritik, şimdi bir bardak iç!" : "";
  return `${msg}${tip} 💧`;
}

/* ── Selam handler ───────────────────────────────────────────────── */

function handleGreeting(name: string, ctx: StudentContext): string {
  const hour  = new Date().getHours();
  const greet = hour < 6 ? "Gece geç saatte çalışıyorsun" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : hour < 22 ? "İyi akşamlar" : "Gece geç saatte";
  const hasToday = ctx.appointments.some(a => a.date === todayStr() && isUpcomingApt(a));
  const lowL = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 2;
  const tier = coachTier(ctx.xp.level.current.id);

  let extra = "";
  if (hasToday) extra = " Bugün dersin var — hazır ol!";
  else if (lowL) extra = ` ⚠️ Sadece **${ctx.remainingLessons}** ders hakkın kaldı, dikkat!`;

  if (tier === "amator") {
    return pick([
      `${greet} ${name}! 🐾${extra} Düzenli gelmek en önemli şey — randevunu kontrol edelim mi?`,
      `${greet} ${name}! İlk hedefin: disiplinli gelmek. ${extra} Yardım için her şeyi sorabilirsin.`,
    ]);
  }
  if (tier === "gelisen") {
    return pick([
      `${greet} ${name}! 🐾${extra} **${ctx.xp.breakdown.total.toLocaleString()} XP**'desin — bugün teknik gelişim veya görevlere bakalım mı?`,
      `${greet} ${name}! Seninle çalışmaya her zaman hazırım.${extra} Antrenman mı, teknik mi, görev mi? 🥊`,
    ]);
  }
  return pick([
    `${greet} ${name}! 🐾${extra} **${ctx.xp.level.current.name}** seviyesindesin — bugün performans analizi mi, hedef belirleme mi konuşalım?`,
    `${greet} ${name}! Üst düzey bir sporcusun.${extra} Detaylı teknik analiz veya sezon hedefin hakkında konuşabiliriz.`,
  ]);
}

/* ── Rozet handler ───────────────────────────────────────────────── */

function handleBadge(name: string, ctx: StudentContext): string {
  const earned = ctx.earnedBadges;
  const next   = ctx.nextBadge;
  const tierName = ctx.xp.level.current.name;

  let msg = `${name}, şu an **${tierName}** seviyesindesin. Rozet koleksiyonun:\n\n🏅 **${earned.length}/${ctx.badges.length}** rozet kazandın`;
  if (earned.length > 0) {
    const recent = [...earned].sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? "")).slice(0, 3);
    msg += `\n\n✅ Son kazandıkların: ${recent.map(b => `${b.icon} ${b.name}`).join(", ")}`;
  }

  if (next) {
    const remaining = Math.max(0, next.progressMax - next.progressCurrent);
    msg += `\n\n🎯 **Sıradaki rozet**: ${next.icon} **${next.name}**\n${next.description}\n📊 İlerleme: ${next.progressCurrent}/${next.progressMax}${remaining > 0 ? ` — kalan: **${remaining}**` : ""}`;
  } else if (earned.length === ctx.badges.length) {
    msg += `\n\n👑 Tüm rozetleri topladın ${name}! Efsane bir koleksiyon — şimdi sırada Hall of Fame zirvesi var!`;
  }

  msg += `\n\n"Rozetlerim" sayfasından tüm koleksiyonu inceleyebilirsin. 🐾`;
  return msg;
}

/* ── Sıralama / Hall of Fame handler ─────────────────────────────── */

function handleRanking(name: string, ctx: StudentContext): string {
  if (ctx.hallRank === null) {
    return `${name}, Onur Listesi'nde henüz bir sıralaman görünmüyor — XP kazandıkça listeye gireceksin. Şu an **${ctx.xp.breakdown.total.toLocaleString()} XP**'desin, devam et! 🐾`;
  }

  const rank = ctx.hallRank;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";

  if (rank <= 3) {
    return pick([
      `${name}, Onur Listesi'nde **${rank}.** sıradasın ${medal}! ${ctx.hallTotal} sporcu arasında zirveye bu kadar yakınsın — bu büyük bir başarı! **${ctx.xp.breakdown.total.toLocaleString()} XP** ile listede gururla yerini koruyorsun.`,
      `Tebrikler ${name}! Şu an Onur Listesi'nde **${rank}. sıradasın** ${medal} (${ctx.hallTotal} sporcu arasında). XP'n: **${ctx.xp.breakdown.total.toLocaleString()}**. Zirveyi bırakma!`,
    ]);
  }

  return pick([
    `${name}, Onur Listesi'nde **${rank}. sıradasın** (${ctx.hallTotal} sporcu arasında) — **${ctx.xp.breakdown.total.toLocaleString()} XP** ile. Birkaç ders ve düzenli su/antrenman takibiyle sıralamada hızla yükselebilirsin! 🐾`,
    `Şu an **${rank}.** sıradasın ${name} (toplam ${ctx.hallTotal} sporcu). **${ctx.xp.breakdown.total.toLocaleString()} XP**'le iyi gidiyorsun — üst sıralara tırmanmak için her ders +100 XP getiriyor, unutma!`,
  ]);
}

/* ── Kimlik handler ──────────────────────────────────────────────── */

function handleIdentity(): string {
  return pick([
    `Ben **KEDİ AI** — antrenör Enes'in dijital koçuyum. 🐾\n\nBir gözüm mavi, diğeri yeşil. Verilerine bakarak gerçek analiz yaparım — uydurma yok.\n\nNe sormak istiyorsun?`,
    `**KEDİ AI** olarak görevim seni en iyi halinde antrenmanına hazırlamak! 🥊\n\nTeknik analiz, öğrenciye özel beslenme, motivasyon, randevu takibi — buradayım.`,
  ]);
}

/* ── XP handler ──────────────────────────────────────────────────── */

function handleXP(name: string, ctx: StudentContext): string {
  const { seasonResult, season, seasonEnd } = ctx.seasonSummary;
  const lifetimeTotal = ctx.xp.breakdown.total;
  const seasonTotal   = seasonResult.breakdown.total;

  const nextThreshold = ctx.claimed5k ? (ctx.claimed10k ? null : 10000) : 5000;
  const toNext        = nextThreshold ? Math.max(0, nextThreshold - seasonTotal) : 0;
  const pct           = nextThreshold
    ? Math.min(100, Math.round((seasonTotal / nextThreshold) * 100))
    : 100;
  const filled = Math.round(pct / 10);
  const bar    = "█".repeat(filled) + "░".repeat(10 - filled);

  const daysLeft = getDaysUntilSeasonEnd(season);
  const seasonLbl = getSeasonLabel(season);
  const levelInfo = ctx.xp.level;

  /* Kişisel açılış cümlesi — örnek: "Hüseyin, şu an 1250 XP ile Bronz Sporcu seviyesindesin..." */
  let msg = `${name}, şu an **${lifetimeTotal.toLocaleString()} XP** ile **${levelInfo.current.name}** seviyesindesin.`;
  if (levelInfo.next) {
    msg += ` **${levelInfo.next.name}** olmak için **${levelInfo.xpToNext.toLocaleString()} XP** daha gerekiyor`;
    if (levelInfo.next.giftLesson) msg += ` — bu seviyeye ulaşınca 🎁 hediye ders hakkı da kazanacaksın`;
    msg += `.`;
  } else {
    msg += ` En üst seviyedesin — efsane olmuşsun! 👑`;
  }
  msg += ` Bu hafta **2 ders** tamamlarsan +200 XP, su takibini düzenli yaparsan ekstra rozet ilerlemesi kazanırsın. 🐾\n\n`;

  msg += `🗓️ **${seasonLbl}** sezon XP durumun:\n\n`;
  msg += `🗓️ **Sezon Bitiş**: ${seasonEnd} (${daysLeft} gün kaldı)\n\n`;
  msg += `⚡ **Bu Sezon XP**: ${seasonTotal.toLocaleString()} XP\n`;
  msg += `${bar} ${pct}%\n`;
  msg += `🏅 **Ömür Boyu XP**: ${lifetimeTotal.toLocaleString()} XP\n\n`;

  msg += `📊 **Bu sezon nasıl kazandın:**\n`;
  msg += `• Ders tamamlama: +${seasonResult.breakdown.lessonsXP} XP\n`;
  if (seasonResult.breakdown.streakXP > 0)
    msg += `• Seri bonusu: +${seasonResult.breakdown.streakXP} XP\n`;
  if (seasonResult.breakdown.improvementXP > 0)
    msg += `• Puan artışı: +${seasonResult.breakdown.improvementXP} XP\n`;
  if (seasonResult.breakdown.absenceDeduction < 0)
    msg += `• Devamsızlık: ${seasonResult.breakdown.absenceDeduction} XP\n`;

  msg += `\n🎁 **Sezon Hediye Dersler** (max 2):\n`;
  if (ctx.claimed5k)  msg += `• 5000 XP → ✅ Talep edildi\n`;
  else if (seasonTotal >= 5000) msg += `• 5000 XP → ✅ Eşik geçildi, admin onayı bekleniyor\n`;
  else msg += `• 5000 XP → ${Math.max(0,5000-seasonTotal).toLocaleString()} XP kaldı\n`;

  if (ctx.claimed10k) msg += `• 10000 XP → ✅ Talep edildi\n`;
  else if (seasonTotal >= 10000) msg += `• 10000 XP → ✅ Eşik geçildi, admin onayı bekleniyor\n`;
  else msg += `• 10000 XP → ${Math.max(0,10000-seasonTotal).toLocaleString()} XP kaldı\n`;

  if (nextThreshold && toNext > 0) {
    msg += `\n💡 Sıradaki hediye derse **${toNext.toLocaleString()} XP** kaldı. Her ders +100 XP!`;
  } else if (!nextThreshold) {
    msg += `\n👑 Bu sezon her iki hediye dersi de kazandın!`;
  }

  if (ctx.nextBadge) {
    const remaining = Math.max(0, ctx.nextBadge.progressMax - ctx.nextBadge.progressCurrent);
    msg += `\n\n🏅 Sıradaki rozetin: ${ctx.nextBadge.icon} **${ctx.nextBadge.name}** (${ctx.nextBadge.progressCurrent}/${ctx.nextBadge.progressMax}${remaining > 0 ? `, kalan ${remaining}` : ""})`;
  }
  if (ctx.hallRank !== null) {
    msg += `\n🏆 Onur Listesi'nde **${ctx.hallRank}. sıradasın** (${ctx.hallTotal} sporcu arasında).`;
  }

  return msg;
}

/* ── Hedef handler ───────────────────────────────────────────────── */

function handleGoal(name: string, ctx: StudentContext, userMsg: string): string {
  const m = userMsg.toLowerCase();
  const goalMap: Record<string, string> = {
    "kilo ver": "kilo-verme", "zayıfla": "kilo-verme", "yağ yak": "kilo-verme",
    "kondisyon": "kondisyon", "kilo al": "kilo-alma", "kas yap": "kilo-alma",
    "güç": "kondisyon", "maç": "musabaka", "müsabaka": "musabaka",
    "teknik": "teknik", "esneklik": "esneklik", "düzenli": "duzensiz-katilim",
  };

  let detected: string | null = null;
  for (const [kw, g] of Object.entries(goalMap)) {
    if (m.includes(kw)) { detected = g; break; }
  }

  if (detected) {
    if (typeof window !== "undefined") localStorage.setItem("kedi_ai_goal", detected);

    const advice: Record<string, string> = {
      "kilo-verme":  `${name}, **Kilo Verme** hedefi kaydedildi! 🎯\n\nStrateji:\n• Haftada en az 3 ders — kalori yakımı için\n• Antrenman günü karbonhidrat zamanla\n• Günlük kalori açığı: 300-400 kcal\n• Şeker + işlenmiş gıda: sıfır\n\n📝 **Bu Hafta Görev**: Sağlık sekmesinden kalori takibini başlat. Verilerini görünce daha net öneri veririm!`,
      "kondisyon":   `${name}, **Kondisyon** hedefi harika! 💪\n\nProgram:\n• Haftada 3-4 ders\n• Ders arası HIIT + ip atlama\n• Protein: Kg × 1.8g\n\n📊 Teknik puanlarına bakarak zayıf alanı önce çalışacağız. ${ctx.records[0] ? `Son ders ortalaması **${ctx.records[0].overall}/10** — bu alanı büyütme fırsatımız var.` : "İlk ders sonrası kişisel plan yapayım."}`,
      "musabaka":    `${name}, ciddi hedef — **Müsabaka Hazırlığı**! 🥊\n\nKritikler:\n• Haftada 4-5 ders zorunlu\n• Spar çalışması önce savunma geliştir\n• Kilo yönetimi başlat (beslenme sorusu sor)\n\n⚠️ **Önemli**: Enes Hoca ile özel maç planı konuş — hemen mesaj at!`,
      "teknik":      `${name}, **Teknik Geliştirme** için:\n\n${ctx.records[0] ? `Son ders analizin:\n🎯 Önce **${([["Yumruk", ctx.records[0].punch], ["Tekme", ctx.records[0].kick], ["Savunma", ctx.records[0].defense], ["Kombinasyon", ctx.records[0].combination], ["Serbest Çalışma", ctx.records[0].sparring]] as [string,number][]).sort((a,b) => a[1]-b[1])[0][0]}** alanında odaklan (en düşük puan)\n• Her derste 1 alan hedefle\n• Ev pratiği: gölge boks + ayna` : "İlk ders sonrası zayıf alan tespiti yapayım."}`,
      "esneklik":    `${name}, **Esneklik** hedefi:\n\n• Her antrenman sonrası 15 dk esneme zorunlu\n• Sabah 10 dk bel + kalça açıcı\n• Foam roller — bacak + sırt\n\nEsneklik tekme yüksekliğini direk etkiler — ihmal etme!`,
      "kilo-alma":   `${name}, **Kas/Kilo Alma** hedefi:\n\n• Kalori fazlası: +300-500 kcal/gün\n• Protein: Kg × 2.2g\n• Uyku: minimum 8 saat — kas orada büyür\n• Antrenman sonrası 30 dk içinde yemek şart`,
      "duzensiz-katilim": `${name}, **Düzenli Katılım** hedefi:\n\n${ctx.xp.currentStreak > 0 ? `Şu an **${ctx.xp.currentStreak} derslik** serin var — devam et!` : "Şu an serisiz — yeni seri başlatma zamanı!"}\n\n🎯 Hedef: Üst üste 5 ders → +250 XP bonus\n• Randevuyu haftanın aynı günlerine koy\n• 18 saatten önce iptal et — XP kaybetme`,
    };

    return advice[detected] ?? `${name}, hedefin kaydedildi! Artık buna göre öneri vereceğim. 🐾`;
  }

  const current = ctx.goal
    ? `Şu anki hedefin: **${ctx.goal}**\n\n`
    : "";

  return `${name}, ${current}Hedef belirle ve sana özel plan yapayım:\n\n🏃 **"kilo vermek istiyorum"**\n💪 **"kondisyon artırmak istiyorum"**\n🥊 **"maça hazırlanıyorum"**\n🎯 **"tekniğimi geliştirmek istiyorum"**\n🧘 **"esnekliğimi artırmak istiyorum"**\n💪 **"kas yapmak istiyorum"**\n📅 **"düzenli katılmak istiyorum"**`;
}

/* ── Uygulama kılavuzu handler ───────────────────────────────────── */

function handleAppInfo(msg: string, name: string): string {
  if (/randevu.*nasıl|nasıl.*randevu|nereden randevu|randevu al/.test(msg))
    return `${name}, randevu almak basit!\n\n📅 **Adımlar:**\n1. Alt menüden **"Randevu"** sekmesine git\n2. Takvimden müsait sloту seç\n3. Onay bekleme — uygun slot varsa hemen kaydolur\n\n⚠️ **18 Saat Kuralı:** Randevunu en az **18 saat önceden** iptal etmezsen ders hakkın düşer!`;

  if (/iptal.*kural|18 saat|son dakika iptal|iptal neden/.test(msg))
    return `${name}, iptal kuralı:\n\n⚠️ **18 Saat Kuralı:**\nRandevunu en az **18 saat önce** iptal etmezsen ders hakkın otomatik düşer.\n\nÖrnek: Yarın saat 10:00 dersin varsa → bu gece **saat 16:00'ya** kadar iptal edebilirsin.\n\nAdmin iptal ederse ders hakkın iade edilir. Öğrenci iptali geç olursa iade yok.`;

  if (/rozet.*nasıl|rozetler.*çalış|badge/.test(msg))
    return `${name}, rozet sistemi:\n\n🏅 **Nasıl Kazanılır:**\n• İlk ders tamamlandığında\n• 5, 10, 25, 50 ders milestone\n• Üst üste devamsızlık yoksa (5/10 ders)\n• Teknik puanın 8+ veya 9+\n• 30 gün aktif\n• KEDİ AI ile ilk konuşma\n\n"Rozetlerim" sayfasında kilidi açılanlara ve ilerlemene bakabilirsin! 🐾`;

  if (/xp.*nasıl|puan nasıl|enerji puan.*çalış/.test(msg))
    return `${name}, XP sistemi:\n\n⚡ **Kazanma:**\n• Ders tamamlama: +100 XP\n• Üst üste 5 ders: +250 XP bonus\n• Teknik puan artışı: +100 XP\n\n⚠️ **Kaybetme:**\n• Gelmedi: -100 XP\n\n🎁 **5000 XP** → Antrenör onayıyla 1 hediye ders!\n\nXP durumun için "xp durumum" yaz.`;

  if (/hedef.*nasıl|hedef sistem/.test(msg))
    return `${name}, hedef sistemi:\n\nKEDİ AI'a hedefini söyle — örn: "hedefim kilo vermek"\n\nBuna göre sana özel antrenman ve beslenme önerileri vereceğim.\n\n🎯 Hedefler: kilo verme, kondisyon, teknik, esneklik, maç hazırlığı, kas yapma, düzenli katılım.`;

  if (/ai antrenman|antrenman.*yapay zeka/.test(msg))
    return `${name}, **AI Antrenman** özelliği:\n\n💪 Alt menüden **"Antrenman"** sekmesine git\n• Seviyeni, hedefini, haftada kaç gün antrenman yaptığını seç\n• Ekipmana göre özelleştirilmiş program oluşturulur\n• Her gün farklı odak: yumruk, tekme, kondisyon, güç`;

  if (/ai diyet|beslenme.*yapay zeka|diyet.*plan/.test(msg))
    return `${name}, beslenme planı için bana doğrudan sor!\n\n🥗 "Beslenme öner" veya "ne yesem" de — kilonu ve hedefini sorarsam yaz, kişisel plan yapayım!`;

  if (/paket.*nereden|paket nasıl|kalan ders.*nerede/.test(msg))
    return `${name}, paket bilgilerini birkaç yerden görebilirsin:\n\n📱 **Ana ekran**: Kalan ders sayısı\n👤 **Profil**: Paket detayları ve bitiş tarihi\n💬 **KEDİ AI**: "kalan dersim kaç?" de\n\nYeni paket için WhatsApp butonuna bas, Enes Hoca seçenekleri anlatır!`;

  return `${name}, uygulamada yapabileceklerin:\n\n📅 **Randevu** — müsait slottan ders al (18 saat kuralı)\n📊 **Gelişim** — teknik puanlarını ve trend\n🏋️ **Antrenman** — AI destekli program\n💧 **Sağlık** — su, kalori, kilo takibi\n🏅 **Rozetler** — başarı koleksiyonu + XP\n💬 **KEDİ AI** — her şeyi sor!\n\nNe hakkında yardım istersin?`;
}

/* ── Varsayılan handler ──────────────────────────────────────────── */

function handleDefault(name: string, ctx: StudentContext): string {
  return pick([
    `${name}, şu konularda yardımcı olabilirim:\n\n🏋️ **"Antrenman programı"** — bugünkü özel plan\n📊 **"Teknik analizim"** — yumruk, tekme, savunma\n🥗 **"Beslenme öner"** — kişisel plan\n📅 **"Randevum ne zaman?"** — takvim kontrolü\n⚡ **"XP durumum"** — puan ve hediye ders\n🏅 **"Rozetlerim"** — kazandıkların ve sıradaki\n🏆 **"Sıralamam kaç?"** — Onur Listesi konumun\n🎯 **"Hedefim kilo vermek"** — hedefe özel plan`,
    `Bunu tam anlayamadım ${name}, ama buradayım! Dene: "Bugün ne antrenman yapayım?" veya "Teknik analizim nasıl?" 🐾`,
    `${name}, ${ctx.completedLessons} derslik bir geçmişin var. Hangi alanda ilerlemek istiyorsun? Antrenman, beslenme, teknik, randevu — söyle! 🥊`,
  ]);
}

/* ── Görev handler ───────────────────────────────────────────────── */

function handleMissions(
  name: string,
  ctx: StudentContext,
): { reply: string; missions: StudentMission[] } {
  const missions = ctx.missions;
  const active   = missions.filter(m => !m.completed);
  const done     = missions.filter(m => m.completed);
  const pending  = missions.filter(m => m.completed && !m.xpAwarded);
  const earnableXP = totalMissionXP(missions);
  const nearest  = nearestMission(missions);

  let reply = `${name}, bu haftaki görevlerin:\n\n`;

  if (missions.length === 0) {
    reply += `Henüz aktif görev yok. Antrenman yapınca ve randevu alınca yeni görevler belirecek! 🎯`;
    return { reply, missions };
  }

  reply += `🎯 **${active.length}** aktif görev | ✅ **${done.length}** tamamlandı`;
  if (earnableXP > 0) reply += ` | ⚡ **${earnableXP} XP** kazanabilirsin`;
  reply += `\n`;

  if (nearest) {
    const pct = Math.round((nearest.progress / nearest.target) * 100);
    reply += `\n🏃 En yakın: **${nearest.title}** (${pct}%) — ${nearest.xpReward} XP`;
  }

  if (pending.length > 0) {
    reply += `\n\n💰 ${pending.length} tamamlanan görevin XP'si hesaplanıyor...`;
  }

  reply += `\n\nGörev kartlarına bakabilirsin:`;
  return { reply, missions };
}

/* ── buildContext — açılış mesajı ────────────────────────────────── */

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

/* ── Ana yanıt motoru ────────────────────────────────────────────── */

function aiRespond(
  userMsg: string,
  ctx: StudentContext,
  _history: Msg[],
  pendingIntent: string | null,
): { reply: string; nextPending?: string; links?: ActionLink[]; kind?: "missions"; missions?: StudentMission[] } {
  const msg    = userMsg.toLowerCase();
  const name   = ctx.name.split(" ")[0];

  // Multi-turn: Beslenme sorusu yanıt bekliyor
  if (pendingIntent?.startsWith("nutrition")) {
    const r = handleNutrition(name, ctx, pendingIntent, userMsg);
    return { ...r, links: getActionLinks("nutrition", msg) };
  }

  const intent = detectIntent(msg);
  const links  = getActionLinks(intent, msg);

  // Ders hakkı bittiyse veya paket süresi dolduysa "Paket Yenile" butonunu otomatik ekle
  if (intent === "lesson" && ctx.subscriptionType !== "monthly" &&
      (ctx.remainingLessons === 0 || isPackageExpired(ctx.packageEndDate)) &&
      !links.some(l => l.href === ACTION_LINKS.renewal.href)) {
    links.push(ACTION_LINKS.renewal);
  }

  if (intent === "missions") {
    const r = handleMissions(name, ctx);
    return { reply: r.reply, kind: "missions", missions: r.missions, links };
  }

  if (intent === "nutrition") {
    const r = handleNutrition(name, ctx, null, userMsg);
    return { ...r, links };
  }

  const reply = (() => {
    switch (intent) {
      case "training":    return handleTraining(name, ctx);
      case "technical":   return handleTechnical(name, ctx);
      case "lesson":      return handleLesson(name, ctx);
      case "appointment": return handleAppointment(name, ctx);
      case "progress":    return handleProgress(name, ctx);
      case "motivation":  return handleMotivation(name, ctx);
      case "water":       return handleWater(name, ctx);
      case "greeting":    return handleGreeting(name, ctx);
      case "badge":       return handleBadge(name, ctx);
      case "ranking":     return handleRanking(name, ctx);
      case "identity":    return handleIdentity();
      case "xp":          return handleXP(name, ctx);
      case "goal":        return handleGoal(name, ctx, userMsg);
      case "appinfo":     return handleAppInfo(msg, name);
      default:            return handleDefault(name, ctx);
    }
  })();

  return { reply, links: links.length ? links : undefined };
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
        initial={{ opacity: 0, y: 8, x: -8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25 }}
        className="flex gap-2.5 items-end"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <CatIcon size={20} />
        </div>
        <div className="max-w-[85%] flex flex-col gap-2 items-start">
          <div className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)",
              color:"rgba(255,255,255,0.85)", fontFamily:"var(--font-inter)", borderRadius:"0 12px 12px 12px" }}>
            {parsed}
          </div>

          {/* Görev kartları */}
          {msg.kind === "missions" && msg.missions && msg.missions.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {msg.missions.map(m => {
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                return (
                  <div key={m.key}
                    style={{
                      background: m.completed ? "rgba(74,222,128,0.08)" : "rgba(139,92,246,0.08)",
                      border: `1px solid ${m.completed ? "rgba(74,222,128,0.25)" : "rgba(139,92,246,0.2)"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0">{m.icon}</span>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold truncate"
                            style={{ color: m.completed ? "#4ADE80" : "#C4B5FD", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.04em" }}>
                            {m.title}
                          </div>
                          <div className="text-[10px] opacity-60 truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {m.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[11px] font-bold"
                          style={{ color: m.xpAwarded ? "#4ADE80" : "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
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
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
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
                  className="inline-flex items-center text-[12px] px-4 rounded-lg transition-all duration-150 active:scale-95"
                  style={{
                    fontFamily:   "var(--font-barlow-condensed)",
                    letterSpacing: "0.06em",
                    background:   "rgba(139,92,246,0.18)",
                    border:       "1px solid rgba(139,92,246,0.45)",
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
      initial={{ opacity: 0, y: 8, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)",
          color:"rgba(255,255,255,0.9)", fontFamily:"var(--font-inter)", borderRadius:"12px 0 12px 12px" }}>
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
        style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
        <CatIcon size={20} />
      </div>
      <div className="px-4 py-3 flex items-center gap-1"
        style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:"0 12px 12px 12px" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"#8B5CF6" }}
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
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  /* Sesli komut (Web Speech API) */
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  /* Sesli cevap (Text-to-Speech) — tercih localStorage'da saklanır */
  const [voiceOut, setVoiceOut] = useState(false);
  /* sendMessage henüz tanımlanmadan toggleVoice'tan çağırabilmek için ref */
  const sendMessageRef = useRef<(text?: string) => void>(() => {});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported(!!(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ));
      setVoiceOut(localStorage.getItem("kedi_ai_voice_out") === "1");
    }
  }, []);

  useEffect(() => {
    const h = () => { setOpen(true); setMin(false); };
    window.addEventListener("kedi-open", h);
    return () => window.removeEventListener("kedi-open", h);
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (typeof window === "undefined") return;
    const SR = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as any;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "tr-TR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart  = () => { setListening(true); setVoiceError(null); };
    recognition.onerror  = (e: any) => {
      setListening(false);
      const map: Record<string, string> = {
        "not-allowed":   "Mikrofon izni reddedildi. Tarayıcı ayarlarından izin vermen gerekiyor.",
        "no-speech":     "Ses algılanamadı, tekrar dener misin?",
        "audio-capture": "Mikrofon bulunamadı.",
        "network":       "Ses tanıma için internet bağlantısı gerekiyor.",
      };
      setVoiceError(map[e?.error] ?? "Ses tanıma başarısız oldu, yazarak devam edebilirsin.");
      setTimeout(() => setVoiceError(null), 4500);
    };
    recognition.onend    = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setListening(false);
        const cleaned = stripWakeWord(transcript);
        if (cleaned) sendMessageRef.current?.(cleaned);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {
      setListening(false);
      setVoiceError("Mikrofon başlatılamadı, yazarak devam edebilirsin.");
      setTimeout(() => setVoiceError(null), 4500);
    }
  }, [listening]);

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
    ]).then(([apts, recs, water, health, giftClaims, xpAdjustments, allStudents, allAdjustments, completions, customMissions]) => {
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

  /* İlk açılışta karşılama */
  useEffect(() => {
    if (!open || !ctx || msgs.length > 0) return;
    setTyping(true);
    const timer = setTimeout(() => {
      const greeting = buildContext(ctx);
      setMsgs([{ id:"init", role:"ai", text: greeting, ts: Date.now() }]);
      setTyping(false);
      if (typeof window !== "undefined") localStorage.setItem("kedi_ai_used", "1");
      if (voiceOut) speakText(greeting);
    }, 900);
    return () => clearTimeout(timer);
  }, [open, ctx, msgs.length, voiceOut]);

  /* Scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, typing]);

  /* Input focus */
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  const sendMessage = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !ctx) return;
    const userMsg: Msg = { id: Date.now().toString(), role:"user", text, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const { reply, nextPending, links, kind, missions: ms } = aiRespond(userMsg.text, ctx, msgs, pendingIntent);
      setPendingIntent(nextPending ?? null);
      setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now(), links, kind, missions: ms }]);
      setTyping(false);
      if (voiceOut) speakText(reply);
    }, 600 + Math.random() * 800);
  }, [input, ctx, msgs, pendingIntent, voiceOut]);

  /* toggleVoice — daha önce tanımlandığı için sendMessage'a ref üzerinden ulaşır */
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const toggleVoiceOut = useCallback(() => {
    setVoiceOut(v => {
      const next = !v;
      if (typeof window !== "undefined") localStorage.setItem("kedi_ai_voice_out", next ? "1" : "0");
      if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

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
        className="hidden lg:flex dbg-floating-ui"
        style={{
          position:     "fixed",
          bottom:       "calc(env(safe-area-inset-bottom, 0px) + 88px)",
          right:        20,
          zIndex:       50,
          width:        56,
          height:       56,
          borderRadius: "50%",
          background:   "radial-gradient(circle at 38% 38%, #1e1040, #0a0718)",
          border:       open ? "2px solid rgba(139,92,246,0.9)" : "2px solid rgba(139,92,246,0.5)",
          boxShadow:    open
            ? "0 0 0 3px rgba(139,92,246,0.22), 0 0 28px rgba(139,92,246,0.75), 0 0 56px rgba(139,92,246,0.22)"
            : "0 0 18px rgba(139,92,246,0.45), 0 4px 14px rgba(0,0,0,0.5)",
          cursor:       "grab",
          touchAction:  "none",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
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
          <CatIcon size={34} />
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
              className="fixed inset-0 sm:hidden dbg-floating-ui"
              style={{ zIndex:54, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity:0, y:24, scale:0.96 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:24, scale:0.96 }}
              transition={{ type:"spring", stiffness:320, damping:28 }}
              className="fixed flex flex-col kara-panel dbg-floating-ui"
              style={{
                zIndex:     55,
                background: "rgba(10,7,20,0.98)",
                border:     "1px solid rgba(139,92,246,0.28)",
                boxShadow:  "0 0 0 1px rgba(139,92,246,0.1), 0 24px 80px rgba(0,0,0,0.85), 0 0 60px rgba(139,92,246,0.14)",
              }}
            >
              {/* Üst neon şerit */}
              <div className="absolute top-0 left-0 right-0 h-0.5 flex-shrink-0"
                style={{ background:"linear-gradient(90deg,transparent,#7C3AED,#A78BFA,#7C3AED,transparent)" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom:"1px solid rgba(139,92,246,0.12)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(139,92,246,0.3)" }}>
                    <CatIcon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-wider"
                      style={{ color:"#C4B5FD", fontFamily:"var(--font-bebas)", letterSpacing:"0.12em" }}>
                      KEDİ AI
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                        Kişisel Antrenör Koçun
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleVoiceOut}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color: voiceOut ? "#A78BFA" : "rgba(255,255,255,0.3)" }}
                    title={voiceOut ? "Sesli oku: Açık" : "Sesli oku: Kapalı"}
                    aria-label="Sesli oku aç/kapat"
                  >
                    {voiceOut ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>
                  <button
                    onClick={() => setMin(m => !m)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Küçült"
                  >
                    <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
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
                          onClick={() => {
                            if (!ctx) return;
                            const userMsg: Msg = { id:Date.now().toString(), role:"user", text:q, ts:Date.now() };
                            setMsgs(prev => [...prev, userMsg]);
                            setTyping(true);
                            setTimeout(() => {
                              const { reply, nextPending: np, links, kind, missions: ms } = aiRespond(q, ctx, msgs, null);
                              setPendingIntent(np ?? null);
                              setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now(), links, kind, missions: ms }]);
                              setTyping(false);
                              if (voiceOut) speakText(reply);
                            }, 700 + Math.random() * 600);
                          }}
                          className="text-[10px] px-2.5 py-1 transition-all duration-200"
                          style={{
                            fontFamily:  "var(--font-barlow-condensed)",
                            background:  "rgba(139,92,246,0.08)",
                            border:      "1px solid rgba(139,92,246,0.22)",
                            color:       "#A78BFA",
                            borderRadius: 6,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sesli komut hata mesajı */}
                  {voiceError && (
                    <div className="flex-shrink-0 px-4 pb-1.5 text-[11px]" style={{ color:"#FCA5A5", fontFamily:"var(--font-barlow-condensed)" }}>
                      ⚠️ {voiceError}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                    style={{ borderTop:"1px solid rgba(139,92,246,0.1)" }}>

                    {/* Mikrofon butonu */}
                    {speechSupported && (
                      <button
                        onClick={toggleVoice}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                        title={listening ? "Dinleniyor — durdurmak için tıkla" : "Sesli komut"}
                        style={{
                          background: listening ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${listening ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.08)"}`,
                          color: listening ? "#FCA5A5" : "rgba(255,255,255,0.25)",
                          animation: listening ? "glowPulse 1s ease-in-out infinite" : "none",
                        }}
                        aria-label={listening ? "Dinlemeyi durdur" : "Sesli komut başlat"}
                      >
                        {listening ? <MicOff size={13} /> : <Mic size={13} />}
                      </button>
                    )}

                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={listening ? "Dinleniyor…" : "Bir şey sor…"}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20"
                      style={{ fontFamily:"var(--font-inter)" }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || typing}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                      style={{
                        background: input.trim() && !typing ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${input.trim() && !typing ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: input.trim() && !typing ? "#C4B5FD" : "rgba(255,255,255,0.2)",
                      }}
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
