/**
 * lib/avatarEvolution.ts — Kedi Avatar Sistemi: evrim kademesi + kozmetik
 * açılım motoru. TAMAMEN türetilmiş (saf fonksiyonlar, ağ çağrısı yok) —
 * mevcut lib/xp.ts (XP_LEVELS) ve lib/badges.ts (computeBadges) verisinden
 * hesaplanır. Yeni, paralel bir "seviye" veya "kazanıldı" durumu SAKLANMAZ —
 * bu projedeki rozet sisteminin aynı felsefesi (bkz. lib/badges.ts üstteki not).
 */
import type { XPLevel } from "./xp";
import { XP_LEVELS } from "./xp";
import type { Badge } from "./badges";
import type { WeightEntry } from "./health";
import type { AvatarBodyType } from "./types";

/* ── Evrim kademesi — XP_LEVELS'e DOĞRUDAN eşlenir, yeni eşik İCAT EDİLMEZ ── */

export interface EvolutionTier {
  /** XP_LEVELS içindeki index (0=starter ... 5=legend) — SVG'de kas/duruş ölçeği için kullanılır. */
  tierIndex: number;
  level: XPLevel;
  /** Gövde path'ine uygulanan basit ölçek çarpanı (1 = başlangıç, 1.16 = efsane) — yeni path seti değil, mevcut path'in scale'i. */
  physiqueScale: number;
  /** Omuz/kas tanımı opacity'si (0 = belirsiz, 1 = tam belirgin) — düşük kademede hafif, yüksek kademede belirgin kas çizgileri. */
  muscleDefinition: number;
}

export function getEvolutionTier(xp: number): EvolutionTier {
  let tierIndex = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].threshold) tierIndex = i;
  }
  const level = XP_LEVELS[tierIndex];
  const pct = tierIndex / (XP_LEVELS.length - 1); // 0..1
  return {
    tierIndex,
    level,
    physiqueScale: 1 + pct * 0.16,
    muscleDefinition: pct,
  };
}

/* ── Kilo trendi — mevcut weight_logs verisinden, yeni tablo YOK ────── */

export type WeightTrend = "gaining" | "losing" | "stable";

export function getWeightTrend(logs: WeightEntry[]): WeightTrend {
  if (logs.length < 2) return "stable";
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].weight;
  const last = sorted[sorted.length - 1].weight;
  const deltaPct = ((last - first) / first) * 100;
  if (deltaPct <= -3) return "losing";
  if (deltaPct >= 3) return "gaining";
  return "stable";
}

/* ── Kozmetik kataloğu + rozet-tabanlı açılım ────────────────────────
 * Her kategori seçeneği opsiyonel bir `unlockBadgeId` taşır — tanımlıysa
 * SADECE o rozet kazanıldığında seçilebilir; tanımlı değilse her zaman
 * açık (varsayılan/temel seçenek). computeBadges() zaten türetilmiş
 * olduğu için burada AYRI bir "unlocked" durumu saklamaya gerek yok. */

export interface CatalogOption {
  id: string;
  label: string;
  /** Renk kategorileri için hex kod, stil kategorileri için render anahtarı. */
  value: string;
  unlockBadgeId?: string;
}

export const SKIN_TONES: CatalogOption[] = [
  { id: "tone-1", label: "Açık", value: "#F5CBA7" },
  { id: "tone-2", label: "Bej", value: "#E0AC80" },
  { id: "tone-3", label: "Orta", value: "#C68863" },
  { id: "tone-4", label: "Buğday", value: "#A9673F" },
  { id: "tone-5", label: "Kahve", value: "#7A4A2B" },
  { id: "tone-6", label: "Koyu", value: "#4A2E1D" },
];

export const EYE_COLORS: CatalogOption[] = [
  { id: "brown", label: "Kahverengi", value: "#6B4226" },
  { id: "hazel", label: "Ela", value: "#8A6E3D" },
  { id: "green", label: "Yeşil", value: "#4C8C4A" },
  { id: "blue", label: "Mavi", value: "#3B7FC4" },
  { id: "gray", label: "Gri", value: "#8B95A1" },
  { id: "amber", label: "Amber", value: "#D97706", unlockBadgeId: "perfect-score" },
];

export const HAIR_STYLES: CatalogOption[] = [
  { id: "short-1", label: "Kısa Düz", value: "short-1" },
  { id: "short-2", label: "Kısa Dalgalı", value: "short-2" },
  { id: "buzz", label: "Asker Tıraşı", value: "buzz" },
  { id: "mohawk", label: "Fauhawk", value: "mohawk" },
  { id: "long", label: "Uzun", value: "long" },
  { id: "bald", label: "Kel", value: "bald" },
];

export const HAIR_COLORS: CatalogOption[] = [
  { id: "black", label: "Siyah", value: "#0F0F12" },
  { id: "brown", label: "Kahverengi", value: "#4A2E1D" },
  { id: "blonde", label: "Sarı", value: "#D4A843" },
  { id: "red", label: "Kızıl", value: "#A53E2B" },
  { id: "gray", label: "Gri", value: "#9CA3AF" },
  { id: "neon", label: "Neon Mavi", value: "#38BDF8", unlockBadgeId: "shadow-fan" },
];

export const EYEBROW_STYLES: CatalogOption[] = [
  { id: "neutral", label: "Doğal", value: "neutral" },
  { id: "thick", label: "Kalın", value: "thick" },
  { id: "thin", label: "İnce", value: "thin" },
  { id: "angled", label: "Açılı", value: "angled" },
];

export const BEARD_STYLES: CatalogOption[] = [
  { id: "none", label: "Yok", value: "none" },
  { id: "stubble", label: "Gölge Sakal", value: "stubble" },
  { id: "full", label: "Tam Sakal", value: "full" },
  { id: "goatee", label: "Keçi Sakalı", value: "goatee" },
];

export const OUTFITS: CatalogOption[] = [
  { id: "starter-kit", label: "Başlangıç Forması", value: "starter-kit" },
  { id: "club-kit", label: "Kulüp Forması", value: "club-kit" },
  { id: "pro-kit", label: "Profesyonel Forma", value: "pro-kit", unlockBadgeId: "disciplined" },
  { id: "champion-kit", label: "Şampiyon Forması", value: "champion-kit", unlockBadgeId: "level-legend" },
];

export const GLOVE_COLORS: CatalogOption[] = [
  { id: "red", label: "Kırmızı", value: "#DC2626" },
  { id: "black", label: "Siyah", value: "#111827" },
  { id: "blue", label: "Mavi", value: "#2563EB" },
  { id: "white", label: "Beyaz", value: "#F3F4F6" },
  { id: "gold", label: "Altın Eldiven", value: "#F59E0B", unlockBadgeId: "fifty-lessons" },
];

export const SHOE_STYLES: CatalogOption[] = [
  { id: "starter", label: "Başlangıç", value: "starter" },
  { id: "hightop", label: "Yüksek Bilekli", value: "hightop" },
  { id: "pro", label: "Profesyonel", value: "pro", unlockBadgeId: "punch-master" },
];

export const TATTOOS: CatalogOption[] = [
  { id: "none", label: "Yok", value: "none" },
  { id: "arm-tribal", label: "Kol Dövmesi", value: "arm-tribal" },
  { id: "chest-tiger", label: "Göğüs Kaplanı", value: "chest-tiger", unlockBadgeId: "kick-master" },
];

export const AURAS: CatalogOption[] = [
  { id: "none", label: "Yok", value: "none" },
  { id: "gold-aura", label: "Altın Hâle", value: "gold-aura", unlockBadgeId: "fifty-lessons" },
  { id: "neon-aura", label: "Neon Aura", value: "neon-aura", unlockBadgeId: "perfect-score" },
];

export const BACKGROUNDS: CatalogOption[] = [
  { id: "none", label: "Yok", value: "none" },
  { id: "flame", label: "Alev Arka Plan", value: "flame", unlockBadgeId: "thirty-days" },
  { id: "arena", label: "Şampiyon Arenası", value: "arena", unlockBadgeId: "level-legend" },
];

export const BELTS: CatalogOption[] = [
  { id: "none", label: "Yok", value: "none" },
  { id: "champion-belt", label: "Şampiyon Kemeri", value: "champion-belt", unlockBadgeId: "level-legend" },
];

/** Bir kategori kataloğundaki seçeneğin, mevcut rozet durumuna göre açık olup olmadığı. */
export function isOptionUnlocked(option: CatalogOption, earnedBadgeIds: Set<string>): boolean {
  return !option.unlockBadgeId || earnedBadgeIds.has(option.unlockBadgeId);
}

/** Tüm rozetlerden kazanılmış olanların id kümesi — katalog kilidini açmak için tek kaynak. */
export function getEarnedBadgeIds(badges: Badge[]): Set<string> {
  return new Set(badges.filter(b => b.earned).map(b => b.id));
}

/** Son kazanılan rozetlerden, YENİ açılmış kozmetik etiketlerini döner — Kedi AI dijestinde
 * "yeni görünüm açıldı" gibi doğal bir cümle kurabilmek için (bkz. lib/kediAi.ts). */
export function getRecentlyUnlockedCosmetics(badges: Badge[]): string[] {
  const earnedIds = getEarnedBadgeIds(badges);
  const allCatalogs = [
    ...EYE_COLORS, ...HAIR_COLORS, ...OUTFITS, ...GLOVE_COLORS,
    ...SHOE_STYLES, ...TATTOOS, ...AURAS, ...BACKGROUNDS, ...BELTS,
  ];
  return allCatalogs
    .filter(o => o.unlockBadgeId && earnedIds.has(o.unlockBadgeId))
    .map(o => o.label);
}

export const BODY_TYPE_LABELS: Record<AvatarBodyType, string> = {
  slim: "İnce", athletic: "Atletik", heavy: "Güçlü/İri",
};
