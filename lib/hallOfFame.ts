/**
 * lib/hallOfFame.ts — Onur Listesi (Hall of Fame) Premium
 * Teknik puan ortalamaları, 30 günlük gelişim ve kategori sıralamaları
 * client-side, mevcut ders kayıtlarından hesaplanır.
 */
import type { LessonRecord } from "./types";
import { differenceInDays, parseISO } from "date-fns";
import type { XPLevel } from "./xp";
import type { Badge } from "./badges";

/* ── Teknik puan ortalaması ───────────────────────────────────────── */

export interface TechnicalAverages {
  punch:      number;
  kick:       number;
  defense:    number;
  conditioning: number;
  average:    number;   // (yumruk + tekme + savunma + kondisyon) / 4
  sampleSize: number;   // ortalamanın hesaplandığı ders kaydı sayısı
}

const TECH_SAMPLE = 10; // son N ders kaydı üzerinden ortalama al

/** Son derslerden teknik puan ortalamalarını hesapla (yeterli veri yoksa null) */
export function computeTechnicalAverages(records: LessonRecord[]): TechnicalAverages | null {
  if (records.length === 0) return null;
  const sample = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, TECH_SAMPLE);
  const n = sample.length;
  const punch        = sample.reduce((s, r) => s + r.punch, 0) / n;
  const kick         = sample.reduce((s, r) => s + r.kick, 0) / n;
  const defense      = sample.reduce((s, r) => s + r.defense, 0) / n;
  const conditioning = sample.reduce((s, r) => s + r.conditioning, 0) / n;
  return {
    punch, kick, defense, conditioning,
    average:    (punch + kick + defense + conditioning) / 4,
    sampleSize: n,
  };
}

/* ── Son 30 günlük gelişim yüzdesi ────────────────────────────────── */

export interface ImprovementResult {
  available: boolean;   // karşılaştırma için yeterli geçmiş veri var mı
  pct:       number;    // yüzde değişim (pozitif = gelişim)
  recentAvg: number;
  pastAvg:   number;
}

/**
 * Son 30 gün içindeki kayıtların teknik ortalamasını, ondan önceki
 * (30-60 gün arası) kayıtların ortalamasıyla karşılaştırır.
 * Geçmiş veri yoksa "yeterli veri yok" anlamına gelen `available:false` döner.
 */
export function compute30DayImprovement(records: LessonRecord[]): ImprovementResult {
  const now = new Date();
  const techScore = (r: LessonRecord) => (r.punch + r.kick + r.defense + r.conditioning) / 4;

  const recent: number[] = [];
  const past:   number[] = [];

  for (const r of records) {
    let d: Date;
    try { d = parseISO(r.date); } catch { continue; }
    const daysAgo = differenceInDays(now, d);
    if (daysAgo < 0) continue;
    if (daysAgo <= 30) recent.push(techScore(r));
    else if (daysAgo <= 60) past.push(techScore(r));
  }

  if (recent.length === 0 || past.length === 0) {
    return { available: false, pct: 0, recentAvg: 0, pastAvg: 0 };
  }

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const pastAvg   = past.reduce((s, v) => s + v, 0) / past.length;
  const pct = pastAvg > 0 ? ((recentAvg - pastAvg) / pastAvg) * 100 : 0;

  return { available: true, pct, recentAvg, pastAvg };
}

/* ── Onur Listesi kayıt tipi ──────────────────────────────────────── */

export interface HallEntry {
  studentId:        string;
  name:             string;
  isMe:             boolean;
  /* XP & seviye */
  xp:               number;
  level:            XPLevel;
  /* Ders & rozet */
  completedLessons: number;
  badgeCount:       number;
  /* Teknik puanlar (yetersiz veri varsa null) */
  technical:        TechnicalAverages | null;
  /* Son 30 günlük gelişim */
  improvement:      ImprovementResult;
  /* Hediye ders durumu */
  giftEligible:     boolean;   // bu sezon en az bir eşiği geçmiş mi
  giftClaimed:      boolean;   // en az bir hediye ders talep edilmiş/onaylanmış mı
  /* Admin öne çıkarma / ayın sporcusu */
  featured:         boolean;
  studentOfMonth:   boolean;
  /** Profil fotoğrafı URL (Supabase Storage) */
  avatarUrl?:       string;
}

/* ── Premium kategoriler ──────────────────────────────────────────── */

export type HallCategory =
  | "xp" | "lessons" | "improvement" | "technical"
  | "punch" | "kick" | "defense" | "conditioning"
  | "monthly" | "legends";

export interface CategoryDef {
  id:          HallCategory;
  label:       string;
  icon:        string;
  description: string;
  /** Sıralama anahtarı — yüksekten düşüğe sıralanır. null dönerse listeden çıkarılır */
  sortValue:   (e: HallEntry) => number | null;
  /** Kart üzerinde gösterilecek değer metni */
  displayValue:(e: HallEntry) => string;
}

export const HALL_CATEGORIES: CategoryDef[] = [
  {
    id: "xp", label: "En Yüksek XP", icon: "⚡",
    description: "Ömür boyu toplam XP sıralaması",
    sortValue:   e => e.xp,
    displayValue:e => `${e.xp.toLocaleString()} XP`,
  },
  {
    id: "lessons", label: "En Çok Ders Tamamlayan", icon: "🥊",
    description: "Toplam tamamlanan ders sayısı",
    sortValue:   e => e.completedLessons,
    displayValue:e => `${e.completedLessons} ders`,
  },
  {
    id: "improvement", label: "En Çok Gelişim Gösteren", icon: "📈",
    description: "Son 30 günlük teknik puan artışı",
    sortValue:   e => e.improvement.available ? e.improvement.pct : null,
    displayValue:e => e.improvement.available
      ? `${e.improvement.pct >= 0 ? "+" : ""}${e.improvement.pct.toFixed(1)}%`
      : "Yeterli veri yok",
  },
  {
    id: "technical", label: "En İyi Teknik Ortalama", icon: "🎯",
    description: "Yumruk + tekme + savunma + kondisyon ortalaması",
    sortValue:   e => e.technical ? e.technical.average : null,
    displayValue:e => e.technical ? `${e.technical.average.toFixed(1)} puan` : "Yeterli veri yok",
  },
  {
    id: "punch", label: "En İyi Yumruk", icon: "👊",
    description: "Yumruk teknik puanı",
    sortValue:   e => e.technical ? e.technical.punch : null,
    displayValue:e => e.technical ? `${e.technical.punch.toFixed(1)} puan` : "Yeterli veri yok",
  },
  {
    id: "kick", label: "En İyi Tekme", icon: "🦵",
    description: "Tekme teknik puanı",
    sortValue:   e => e.technical ? e.technical.kick : null,
    displayValue:e => e.technical ? `${e.technical.kick.toFixed(1)} puan` : "Yeterli veri yok",
  },
  {
    id: "defense", label: "En İyi Savunma", icon: "🛡️",
    description: "Savunma teknik puanı",
    sortValue:   e => e.technical ? e.technical.defense : null,
    displayValue:e => e.technical ? `${e.technical.defense.toFixed(1)} puan` : "Yeterli veri yok",
  },
  {
    id: "conditioning", label: "En İyi Kondisyon", icon: "🔥",
    description: "Kondisyon teknik puanı",
    sortValue:   e => e.technical ? e.technical.conditioning : null,
    displayValue:e => e.technical ? `${e.technical.conditioning.toFixed(1)} puan` : "Yeterli veri yok",
  },
  {
    id: "monthly", label: "Ayın Sporcusu", icon: "🌟",
    description: "Antrenör tarafından bu ay için seçilen sporcu(lar)",
    sortValue:   e => e.studentOfMonth ? 1 : null,
    displayValue:() => "🌟 Ayın Sporcusu",
  },
  {
    id: "legends", label: "Efsane Sporcular", icon: "👑",
    description: "Efsane seviyesine ulaşmış sporcular",
    sortValue:   e => e.level.id === "legend" ? e.xp : null,
    displayValue:e => `${e.xp.toLocaleString()} XP`,
  },
];

/** Bir kategori için sıralanmış (ve uygunsuz girdileri filtrelenmiş) listeyi üret */
export function rankByCategory(entries: HallEntry[], category: HallCategory): HallEntry[] {
  const def = HALL_CATEGORIES.find(c => c.id === category);
  if (!def) return [];
  return entries
    .map(e => ({ entry: e, value: def.sortValue(e) }))
    .filter((x): x is { entry: HallEntry; value: number } => x.value !== null)
    .sort((a, b) => b.value - a.value)
    .map(x => x.entry);
}

/** Kazanılan rozet sayısını saymak için (computeBadges sonucundan) */
export function countEarnedBadges(badges: Badge[]): number {
  return badges.filter(b => b.earned).length;
}
