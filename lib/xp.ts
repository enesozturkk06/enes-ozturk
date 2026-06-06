/**
 * lib/xp.ts — Öğrenci XP (Deneyim Puanı) hesaplama motoru
 * Mevcut Supabase verisinden client-side hesaplanır — ek tablo gerekmez.
 */
import type { Appointment, LessonRecord } from "./types";

export interface XPBreakdown {
  total:            number;
  lessonsXP:        number;    // tamamlanan ders × 100
  streakXP:         number;    // üst üste 5 ders serisi × 250
  improvementXP:    number;    // her puan artışı × 100
  absenceDeduction: number;    // gelmedi × -100
}

export interface XPResult {
  breakdown:     XPBreakdown;
  nextMilestone: number;       // sonraki XP hedefi
  toGift:        number;       // hediye ders için kalan XP (5000 eşik)
  currentStreak: number;       // şu anki seri uzunluğu
  maxStreak:     number;       // en uzun seri
  giftEarned:    boolean;      // 5000 XP'ye ulaşıldı mı
}

const GIFT_XP_THRESHOLD = 5000;
const MILESTONES        = [500, 1000, 2000, 3000, 5000, 7500, 10000];

export function computeXPFromData(
  completedLessons: number,
  appointments:     Appointment[],
  records:          LessonRecord[],
): XPResult {
  /* Ders XP */
  const lessonsXP = completedLessons * 100;

  /* Devamsızlık kesintisi */
  const absents          = appointments.filter(a => a.status === "gelmedi").length;
  const absenceDeduction = absents * -100;

  /* Seri hesaplama */
  const sortedApts = [...appointments]
    .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
    .sort((a, b) => a.date.localeCompare(b.date));

  let currentStreak = 0;
  let maxStreak     = 0;
  let runningStreak = 0;
  for (const apt of sortedApts) {
    if (apt.status === "tamamlandi") {
      runningStreak++;
      maxStreak = Math.max(maxStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }
  currentStreak = runningStreak;
  const streakXP = Math.floor(maxStreak / 5) * 250;

  /* Puan iyileştirme XP */
  let improvementXP = 0;
  if (records.length >= 2) {
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].overall > sorted[i - 1].overall) improvementXP += 100;
    }
  }

  const total        = Math.max(0, lessonsXP + streakXP + improvementXP + absenceDeduction);
  const toGift       = Math.max(0, GIFT_XP_THRESHOLD - total);
  const nextMilestone = MILESTONES.find(m => m > total) ?? total + 1000;

  return {
    breakdown: { total, lessonsXP, streakXP, improvementXP, absenceDeduction },
    nextMilestone,
    toGift,
    currentStreak,
    maxStreak,
    giftEarned: total >= GIFT_XP_THRESHOLD,
  };
}

export const XP_GIFT_THRESHOLD = GIFT_XP_THRESHOLD;
