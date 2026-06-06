/**
 * lib/xp.ts — XP & Seviye sistemi
 * Mevcut verilerden client-side hesaplanır.
 */
import type { Appointment, LessonRecord } from "./types";

/* ── Seviye tanımları ────────────────────────────────────────────── */

export interface XPLevel {
  id:          string;
  threshold:   number;
  name:        string;
  shortName:   string;
  icon:        string;
  /* Gradient renkleri */
  colorPrimary:string;
  gradFrom:    string;
  gradTo:      string;
  glowColor:   string;        // rgba
  borderColor: string;        // rgba
  /* Ödüller */
  bonusXP:     number;
  giftLesson:  boolean;
  description: string;
  reward:      string;        // kısa ödül açıklaması
  notifMsg:    string;
}

export const XP_LEVELS: XPLevel[] = [
  {
    id: "starter",
    threshold:    0,
    name:         "Amatör Sporcu",
    shortName:    "Amatör",
    icon:         "⚔️",
    colorPrimary: "#6B7280",
    gradFrom:     "#374151",
    gradTo:       "#6B7280",
    glowColor:    "rgba(107,114,128,0.2)",
    borderColor:  "rgba(107,114,128,0.25)",
    bonusXP:      0,
    giftLesson:   false,
    description:  "Yolculuğun başlangıcı. Her ders seni ileriye taşıyor!",
    reward:       "—",
    notifMsg:     "",
  },
  {
    id: "bronze",
    threshold:    1000,
    name:         "Bronz Sporcu",
    shortName:    "Bronz",
    icon:         "🛡️",
    colorPrimary: "#CD7F32",
    gradFrom:     "#92400E",
    gradTo:       "#F59E0B",
    glowColor:    "rgba(205,127,50,0.3)",
    borderColor:  "rgba(205,127,50,0.45)",
    bonusXP:      100,
    giftLesson:   false,
    description:  "Temel disiplinini kanıtladın. Artık düzenli sporcu yolundasın.",
    reward:       "Bronz rozet + +100 XP bonus + Profilde bronz çerçeve",
    notifMsg:     "Tebrikler! 1000 XP'ye ulaştın ve Bronz Sporcu rozetini kazandın. Disiplinin yeni başlıyor.",
  },
  {
    id: "silver",
    threshold:    2500,
    name:         "Gümüş Sporcu",
    shortName:    "Gümüş",
    icon:         "⭐",
    colorPrimary: "#D1D5DB",
    gradFrom:     "#9CA3AF",
    gradTo:       "#F3F4F6",
    glowColor:    "rgba(209,213,219,0.25)",
    borderColor:  "rgba(209,213,219,0.4)",
    bonusXP:      200,
    giftLesson:   false,
    description:  "Düzenli çalışman artık net görülüyor. İstikrarın güçleniyor.",
    reward:       "Gümüş rozet + +200 XP bonus + Profilde gümüş çerçeve",
    notifMsg:     "Harika gidiyorsun! 2500 XP'ye ulaştın ve Gümüş Sporcu oldun. Artık hedeflerin daha ciddi.",
  },
  {
    id: "gold",
    threshold:    5000,
    name:         "Altın Sporcu",
    shortName:    "Altın",
    icon:         "🥇",
    colorPrimary: "#FBBF24",
    gradFrom:     "#D97706",
    gradTo:       "#FDE68A",
    glowColor:    "rgba(251,191,36,0.28)",
    borderColor:  "rgba(251,191,36,0.5)",
    bonusXP:      0,
    giftLesson:   true,
    description:  "Yüksek disiplin gösterdin. Bu seviyeye ulaşan sporcu gerçek emek vermiştir.",
    reward:       "🎁 1 Hediye Ders + Altın rozet + Profilde altın çerçeve",
    notifMsg:     "Tebrikler! 5000 XP'ye ulaştın ve Altın Sporcu oldun. 1 hediye ders hakkı kazandın. Antrenör onayından sonra hesabına eklenecek.",
  },
  {
    id: "diamond",
    threshold:    10000,
    name:         "Elmas Sporcu",
    shortName:    "Elmas",
    icon:         "💎",
    colorPrimary: "#67E8F9",
    gradFrom:     "#0E7490",
    gradTo:       "#A5F3FC",
    glowColor:    "rgba(103,232,249,0.25)",
    borderColor:  "rgba(103,232,249,0.5)",
    bonusXP:      0,
    giftLesson:   true,
    description:  "Üst seviye disiplin, devamlılık ve karakter gösterdin.",
    reward:       "🎁 1 Hediye Ders daha + Elmas rozet + Hall of Fame + Mor-mavi çerçeve",
    notifMsg:     "Efsane ilerliyorsun! 10000 XP'ye ulaştın ve Elmas Sporcu oldun. 1 hediye ders hakkı daha kazandın. Bu seviyeye ulaşmak büyük disiplin ister.",
  },
  {
    id: "legend",
    threshold:    15000,
    name:         "Efsane Sporcu",
    shortName:    "Efsane",
    icon:         "👑",
    colorPrimary: "#C084FC",
    gradFrom:     "#7C3AED",
    gradTo:       "#F0ABFC",
    glowColor:    "rgba(192,132,252,0.3)",
    borderColor:  "rgba(192,132,252,0.55)",
    bonusXP:      0,
    giftLesson:   false,
    description:  "Bu seviye artık ödülden çok prestij seviyesidir. Sen bu kulübün efsanesisin.",
    reward:       "Efsane rozet + Onur Listesi zirvesi + Animasyonlu taç + Özel profil etiketi",
    notifMsg:     "Büyük başarı! 15000 XP'ye ulaştın ve Efsane Sporcu oldun. Bu seviye sadece en disiplinli sporcular içindir. Artık Onur Listesi'ndesin.",
  },
];

/* ── Seviye hesaplama ────────────────────────────────────────────── */

export function getLevelForXP(xp: number): { current: XPLevel; next: XPLevel | null; progressPct: number; xpInLevel: number; xpToNext: number } {
  let current = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.threshold) current = lvl;
    else break;
  }
  const currentIdx = XP_LEVELS.indexOf(current);
  const next = XP_LEVELS[currentIdx + 1] ?? null;

  const xpInLevel = xp - current.threshold;
  const levelRange = next ? next.threshold - current.threshold : 5000;
  const progressPct = next ? Math.min(100, Math.round((xpInLevel / levelRange) * 100)) : 100;
  const xpToNext = next ? Math.max(0, next.threshold - xp) : 0;

  return { current, next, progressPct, xpInLevel, xpToNext };
}

/* ── XP Hesaplama ────────────────────────────────────────────────── */

export interface XPBreakdown {
  total:            number;
  lessonsXP:        number;
  streakXP:         number;
  improvementXP:    number;
  absenceDeduction: number;
}

export interface XPResult {
  breakdown:     XPBreakdown;
  currentStreak: number;
  maxStreak:     number;
  level:         ReturnType<typeof getLevelForXP>;
  /* Hediye ders eşikleri */
  gold5kReached:    boolean;   // 5000 XP
  diamond10kReached:boolean;   // 10000 XP
}

export function computeXPFromData(
  completedLessons: number,
  appointments:     Appointment[],
  records:          LessonRecord[],
): XPResult {
  const lessonsXP = completedLessons * 100;

  const absents          = appointments.filter(a => a.status === "gelmedi").length;
  const absenceDeduction = absents * -100;

  const sortedApts = [...appointments]
    .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningStreak = 0;
  let maxStreak     = 0;
  for (const apt of sortedApts) {
    if (apt.status === "tamamlandi") {
      runningStreak++;
      maxStreak = Math.max(maxStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }
  const currentStreak = runningStreak;
  /* 5 ders serisi → +250 XP, 10 ders serisi → ek +500 XP */
  const streakXP = Math.floor(maxStreak / 10) * 500 + Math.floor((maxStreak % 10) / 5) * 250;

  let improvementXP = 0;
  if (records.length >= 2) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].overall > sorted[i - 1].overall) improvementXP += 100;
    }
  }

  const total = Math.max(0, lessonsXP + streakXP + improvementXP + absenceDeduction);

  return {
    breakdown: { total, lessonsXP, streakXP, improvementXP, absenceDeduction },
    currentStreak,
    maxStreak,
    level: getLevelForXP(total),
    gold5kReached:     total >= 5000,
    diamond10kReached: total >= 10000,
  };
}

export const XP_GIFT_THRESHOLD = 5000;

/* ── Sezon sistemi ───────────────────────────────────────────────── */

/** Mevcut sezonu döndürür: "2026-Q2" */
export function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/** Sezonun başlangıç ve bitiş tarihlerini ISO string olarak döndürür */
export function getSeasonDateRange(season: string): { start: string; end: string } {
  const [yearStr, qStr] = season.split("-Q");
  const year  = parseInt(yearStr, 10);
  const q     = parseInt(qStr, 10);
  const startMonth = (q - 1) * 3; // 0=Ocak, 3=Nisan, 6=Temmuz, 9=Ekim
  const start = new Date(year, startMonth, 1);
  const end   = new Date(year, startMonth + 3, 0); // çeyreğin son günü
  return {
    start: start.toISOString().split("T")[0],
    end:   end.toISOString().split("T")[0],
  };
}

/** Sezon bitiş tarihini okunabilir formatta döndürür */
export function getSeasonLabel(season: string): string {
  const labels: Record<string, string> = {
    "Q1": "Ocak – Mart",
    "Q2": "Nisan – Haziran",
    "Q3": "Temmuz – Eylül",
    "Q4": "Ekim – Aralık",
  };
  const [yearStr, qStr] = season.split("-");
  return `${labels[qStr] ?? qStr} ${yearStr}`;
}

/** Sezon bitiş tarihini döndürür (gün sayısı için) */
export function getDaysUntilSeasonEnd(season: string): number {
  const { end } = getSeasonDateRange(season);
  const endDate = new Date(end + "T23:59:59");
  const now     = new Date();
  return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Hem sezon hem de ömür boyu XP'yi hesaplar */
export interface SeasonXPSummary {
  season:        string;    // "2026-Q2"
  seasonEnd:     string;    // "2026-06-30"
  seasonResult:  XPResult;  // sadece bu sezondaki XP
  lifetimeResult:XPResult;  // tüm zamandaki XP
}

export function computeFullXP(
  completedLessons: number,
  appointments:     Appointment[],
  records:          LessonRecord[],
  season:           string = getCurrentSeason(),
): SeasonXPSummary {
  // Ömür boyu XP
  const lifetimeResult = computeXPFromData(completedLessons, appointments, records);

  // Sezon filtresi
  const { start, end } = getSeasonDateRange(season);
  const seasonApts      = appointments.filter(a => a.date >= start && a.date <= end);
  const seasonRecs      = records.filter(r => r.date >= start && r.date <= end);
  const seasonCompleted = seasonApts.filter(a => a.status === "tamamlandi").length;

  const seasonResult = computeXPFromData(seasonCompleted, seasonApts, seasonRecs);

  return {
    season,
    seasonEnd:     end,
    seasonResult,
    lifetimeResult,
  };
}
