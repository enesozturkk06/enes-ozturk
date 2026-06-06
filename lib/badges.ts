/**
 * lib/badges.ts — Rozet sistemi tanımları ve hesaplama motoru
 * Tüm rozet kriterleri mevcut öğrenci verisinden client-side hesaplanır.
 */

import type { Student, LessonRecord, Appointment } from "./types";
import { differenceInDays, parseISO } from "date-fns";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Badge {
  id:               string;
  name:             string;
  description:      string;
  icon:             string;
  color:            string;   // neon renk — earned state
  bgColor:          string;   // hafif arka plan tonu
  rarity:           Rarity;
  earned:           boolean;
  earnedAt?:        string;   // ISO date string
  progressCurrent:  number;
  progressMax:      number;
}

/* ── Dahili rozet tanımları ──────────────────────────────────────────── */

type BadgeDef = {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  color:       string;
  bgColor:     string;
  rarity:      Rarity;
  check:       (s: Student, apts: Appointment[], recs: LessonRecord[]) => boolean;
  progress:    (s: Student, apts: Appointment[], recs: LessonRecord[]) => {
    current:   number;
    max:       number;
    earnedAt?: string;
  };
};

const DEFS: BadgeDef[] = [
  /* ── Ders milestone rozetleri ──────────────────────────────────────── */
  {
    id:          "first-lesson",
    name:        "İlk Adım",
    description: "İlk dersini başarıyla tamamladın. Her şampiyonun bir başlangıcı vardır.",
    icon:        "🥊",
    color:       "#8B5CF6",
    bgColor:     "rgba(139,92,246,0.12)",
    rarity:      "common",
    check:       (s) => s.completedLessons >= 1,
    progress:    (s, _, recs) => ({
      current:  Math.min(s.completedLessons, 1),
      max:      1,
      earnedAt: [...recs].sort((a, b) => a.date.localeCompare(b.date))[0]?.date,
    }),
  },
  {
    id:          "five-lessons",
    name:        "Isınma Bitti",
    description: "5 ders tamamladın. Artık gerçek antrenman başlıyor.",
    icon:        "🔥",
    color:       "#A78BFA",
    bgColor:     "rgba(167,139,250,0.1)",
    rarity:      "common",
    check:       (s) => s.completedLessons >= 5,
    progress:    (s, _, recs) => ({
      current:  Math.min(s.completedLessons, 5),
      max:      5,
      earnedAt: [...recs].sort((a, b) => a.date.localeCompare(b.date))[4]?.date,
    }),
  },
  {
    id:          "ten-lessons",
    name:        "10 Ders Ustası",
    description: "10 ders tamamladın. Disiplin ve kararlılığın meyvelerini topluyorsun.",
    icon:        "🎯",
    color:       "#7C3AED",
    bgColor:     "rgba(124,58,237,0.12)",
    rarity:      "common",
    check:       (s) => s.completedLessons >= 10,
    progress:    (s, _, recs) => ({
      current:  Math.min(s.completedLessons, 10),
      max:      10,
      earnedAt: [...recs].sort((a, b) => a.date.localeCompare(b.date))[9]?.date,
    }),
  },
  {
    id:          "twenty-five-lessons",
    name:        "25 Ders Şampiyonu",
    description: "25 dersin tamamlandı. Artık bir şampiyon adayısın!",
    icon:        "🏆",
    color:       "#6D28D9",
    bgColor:     "rgba(109,40,217,0.12)",
    rarity:      "rare",
    check:       (s) => s.completedLessons >= 25,
    progress:    (s) => ({
      current: Math.min(s.completedLessons, 25),
      max:     25,
    }),
  },
  {
    id:          "fifty-lessons",
    name:        "50 Ders Efsanesi",
    description: "50 ders tamamladın. Seninle aynı ringde olmak istemezdim.",
    icon:        "⚡",
    color:       "#5B21B6",
    bgColor:     "rgba(91,33,182,0.14)",
    rarity:      "epic",
    check:       (s) => s.completedLessons >= 50,
    progress:    (s) => ({
      current: Math.min(s.completedLessons, 50),
      max:     50,
    }),
  },

  /* ── Teknik / performans rozetleri ─────────────────────────────────── */
  {
    id:          "high-score",
    name:        "Yüksek Performans",
    description: "Bir derste genel notun 8+ oldu. Teknik gelişimin muhteşem!",
    icon:        "⭐",
    color:       "#9333EA",
    bgColor:     "rgba(147,51,234,0.1)",
    rarity:      "rare",
    check:       (_, __, recs) => recs.some(r => r.overall >= 8),
    progress:    (_, __, recs) => {
      const best = recs.reduce((mx, r) => Math.max(mx, r.overall), 0);
      return { current: Math.min(Math.round(best * 10), 80), max: 80 };
    },
  },
  {
    id:          "perfect-score",
    name:        "Mükemmel Teknik",
    description: "Bir derste 9+ puan aldın. Sen artık bir usta sayılırsın.",
    icon:        "🎖️",
    color:       "#7C3AED",
    bgColor:     "rgba(124,58,237,0.14)",
    rarity:      "epic",
    check:       (_, __, recs) => recs.some(r => r.overall >= 9),
    progress:    (_, __, recs) => {
      const best = recs.reduce((mx, r) => Math.max(mx, r.overall), 0);
      return { current: Math.min(Math.round(best * 10), 90), max: 90 };
    },
  },
  {
    id:          "punch-master",
    name:        "Yumruk Ustası",
    description: "Yumruk tekniğinde 9+ puan. Rakipler kaçmak isteyecek!",
    icon:        "🤜",
    color:       "#8B5CF6",
    bgColor:     "rgba(139,92,246,0.1)",
    rarity:      "rare",
    check:       (_, __, recs) => recs.some(r => r.punch >= 9),
    progress:    (_, __, recs) => {
      const best = recs.reduce((mx, r) => Math.max(mx, r.punch), 0);
      return { current: Math.min(Math.round(best * 10), 90), max: 90 };
    },
  },
  {
    id:          "kick-master",
    name:        "Tekme Ustası",
    description: "Tekme tekniğinde 9+ puan. O bacaklar tehlikeli!",
    icon:        "🦵",
    color:       "#6D28D9",
    bgColor:     "rgba(109,40,217,0.1)",
    rarity:      "rare",
    check:       (_, __, recs) => recs.some(r => r.kick >= 9),
    progress:    (_, __, recs) => {
      const best = recs.reduce((mx, r) => Math.max(mx, r.kick), 0);
      return { current: Math.min(Math.round(best * 10), 90), max: 90 };
    },
  },

  /* ── Aktivite / devamlılık rozetleri ───────────────────────────────── */
  {
    id:          "thirty-days",
    name:        "30 Gün Aktif",
    description: "30 gündür sistemde aktifsin. Süreklilik her şeydir.",
    icon:        "📅",
    color:       "#7C3AED",
    bgColor:     "rgba(124,58,237,0.1)",
    rarity:      "common",
    check:       (s) => {
      if (!s.createdAt) return false;
      return differenceInDays(new Date(), parseISO(s.createdAt)) >= 30;
    },
    progress:    (s) => ({
      current: Math.min(differenceInDays(new Date(), parseISO(s.createdAt || new Date().toISOString())), 30),
      max:     30,
    }),
  },
  {
    id:          "disciplined",
    name:        "Disiplinli Sporcu",
    description: "Son 5 randevunda hiç kaçırmadın. Gerçek bir sporcu ruhusun.",
    icon:        "💪",
    color:       "#9333EA",
    bgColor:     "rgba(147,51,234,0.1)",
    rarity:      "rare",
    check:       (_, apts) => {
      const finished = apts
        .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
      return finished.length >= 5 && finished.every(a => a.status === "tamamlandi");
    },
    progress:    (_, apts) => {
      const finished = apts
        .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);
      return {
        current: finished.filter(a => a.status === "tamamlandi").length,
        max:     5,
      };
    },
  },
  {
    id:          "no-miss",
    name:        "Devam Rekoru",
    description: "10 tamamlanan derste hiç gelmedi yazmıyor. Efsane devamlılık!",
    icon:        "🎗️",
    color:       "#7C3AED",
    bgColor:     "rgba(124,58,237,0.12)",
    rarity:      "epic",
    check:       (_, apts) => {
      const finished = apts
        .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);
      return finished.length >= 10 && finished.every(a => a.status === "tamamlandi");
    },
    progress:    (_, apts) => {
      const finished = apts
        .filter(a => a.status === "tamamlandi" || a.status === "gelmedi")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);
      return {
        current: finished.filter(a => a.status === "tamamlandi").length,
        max:     10,
      };
    },
  },

  /* ── Özel rozetler ─────────────────────────────────────────────────── */
  {
    id:          "first-badge",
    name:        "İlk Rozetim",
    description: "İlk rozetini kazandın. Koleksiyonun başladı, yolun henüz bitmedi!",
    icon:        "🏅",
    color:       "#A78BFA",
    bgColor:     "rgba(167,139,250,0.1)",
    rarity:      "common",
    check:       (s) => s.completedLessons >= 1,
    progress:    (s) => ({ current: s.completedLessons >= 1 ? 1 : 0, max: 1 }),
  },
  {
    id:          "shadow-fan",
    name:        "KEDİ AI Dostu",
    description: "KEDİ AI ile ilk konuşmayı yaptın. Artık yalnız değilsin.",
    icon:        "🐾",
    color:       "#6D28D9",
    bgColor:     "rgba(109,40,217,0.12)",
    rarity:      "rare",
    // Bu rozet localStorage flag'i ile client-side tetiklenir
    check:       () => false, // BlackCatAI component'i unlock eder
    progress:    () => ({ current: 0, max: 1 }),
  },
];

/* ── Ana hesaplama fonksiyonu ────────────────────────────────────────── */

export function computeBadges(
  student: Student,
  appointments: Appointment[],
  records:      LessonRecord[],
  extraFlags:   Record<string, boolean> = {},
): Badge[] {
  return DEFS.map(def => {
    // Harici flag (örn: KARA ile konuşma)
    const forcedEarned = extraFlags[def.id] ?? false;
    const earned = forcedEarned || def.check(student, appointments, records);
    const { current, max, earnedAt } = def.progress(student, appointments, records);

    return {
      id:              def.id,
      name:            def.name,
      description:     def.description,
      icon:            def.icon,
      color:           def.color,
      bgColor:         def.bgColor,
      rarity:          def.rarity,
      earned,
      earnedAt:        earned ? earnedAt : undefined,
      progressCurrent: current,
      progressMax:     max,
    };
  });
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common:    "Yaygın",
  rare:      "Nadir",
  epic:      "Destansı",
  legendary: "Efsanevi",
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    "#A78BFA",
  rare:      "#8B5CF6",
  epic:      "#7C3AED",
  legendary: "#5B21B6",
};
