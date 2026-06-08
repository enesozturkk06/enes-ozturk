/**
 * lib/kediTasks.ts — Kedi AI Görev Motoru
 *
 * Altı otomatik görev tipi gerçek StudentContext verilerinden hesaplanır.
 * Haftalık görevler ISO hafta numarasıyla sıfırlanır (YYYY-Wxx).
 * XP ödülü createXPAdjustment + recordMissionCompletion ile verilir.
 */

import { parseISO, startOfWeek, getISOWeek, getYear } from "date-fns";
import type { Appointment, LessonRecord, KediMission, StudentMission } from "./types";

export type { StudentMission };

/* ── Hesaplama girdisi ────────────────────────────────────────────── */

export interface MissionComputeInput {
  appointments:       Appointment[];
  records:            LessonRecord[];
  totalXP:            number;
  lastTrainingPlan?:  { date: string };
  lastNutritionPlan?: { date: string };
}

/* ── Hafta anahtarı ───────────────────────────────────────────────── */

/** Geçerli ISO hafta anahtarı, örn. "2025-W03" */
export function getWeekKey(): string {
  const now = new Date();
  return `${getYear(now)}-W${getISOWeek(now).toString().padStart(2, "0")}`;
}

/** Bu haftanın başlangıcı (Pazartesi) */
function thisWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

/* ── Yardımcılar ──────────────────────────────────────────────────── */

function isUpcomingApt(a: Appointment): boolean {
  if (a.status !== "onaylandi") return false;
  try {
    return parseISO(`${a.date}T${a.startTime ?? "00:00"}`) > new Date();
  } catch {
    return parseISO(a.date) >= new Date();
  }
}

/** Üst üste tamamlanan ders serisi uzunluğu */
function computeStreak(appointments: Appointment[]): number {
  const sorted = [...appointments]
    .filter(a => ["tamamlandi", "iptal", "gelmedi"].includes(a.status))
    .sort((a, b) =>
      `${b.date}T${b.startTime ?? ""}`.localeCompare(`${a.date}T${a.startTime ?? ""}`)
    );
  let n = 0;
  for (const a of sorted) {
    if (a.status === "tamamlandi") n++;
    else break;
  }
  return n;
}

/* ── Otomatik görev şablonları ────────────────────────────────────── */

interface AutoDef {
  baseKey:     string;
  weekly:      boolean;
  title:       string;
  description: string;
  icon:        string;
  xpReward:    number;
  target:      number;
  progress:    (inp: MissionComputeInput, ws: Date) => number;
}

const AUTO_DEFS: AutoDef[] = [
  {
    baseKey: "weekly_2_lessons", weekly: true,
    title:       "Bu Hafta 2 Ders Tamamla",
    description: "Antrenörle bu hafta en az 2 ders tamamla",
    icon: "🥊", xpReward: 150, target: 2,
    progress: (inp, ws) =>
      inp.appointments.filter(
        a => a.status === "tamamlandi" && parseISO(a.date) >= ws
      ).length,
  },
  {
    baseKey: "take_appointment", weekly: true,
    title:       "Randevu Al",
    description: "Bu hafta için aktif bir ders randevun olsun",
    icon: "📅", xpReward: 50, target: 1,
    progress: (inp) => inp.appointments.some(isUpcomingApt) ? 1 : 0,
  },
  {
    baseKey: "ai_training_plan", weekly: true,
    title:       "AI Antrenman Planı Al",
    description: "Kedi AI ile özel antrenman programı oluştur",
    icon: "💪", xpReward: 75, target: 1,
    progress: (inp, ws) =>
      inp.lastTrainingPlan && parseISO(inp.lastTrainingPlan.date) >= ws ? 1 : 0,
  },
  {
    baseKey: "ai_nutrition_plan", weekly: true,
    title:       "AI Diyet Planı Al",
    description: "Kedi AI ile kişisel beslenme planı oluştur",
    icon: "🥗", xpReward: 75, target: 1,
    progress: (inp, ws) =>
      inp.lastNutritionPlan && parseISO(inp.lastNutritionPlan.date) >= ws ? 1 : 0,
  },
  {
    baseKey: "streak_3", weekly: false,
    title:       "3 Ders Serisi",
    description: "Üst üste 3 ders tamamla, iptal veya gelmedi olmadan",
    icon: "🔥", xpReward: 100, target: 3,
    progress: (inp) => Math.min(computeStreak(inp.appointments), 3),
  },
  {
    baseKey: "high_technical", weekly: true,
    title:       "Teknik Gelişim",
    description: "Bu hafta bir teknik alanda 8 veya üzeri puan al",
    icon: "🎯", xpReward: 125, target: 1,
    progress: (inp, ws) =>
      inp.records.some(r => {
        try { if (parseISO(r.date) < ws) return false; } catch { return false; }
        return r.punch >= 8 || r.kick >= 8 || r.defense >= 8 || r.conditioning >= 8;
      }) ? 1 : 0,
  },
];

/* ── Ana hesaplama fonksiyonu ─────────────────────────────────────── */

/**
 * Öğrencinin mevcut görevlerini hesaplar.
 * @param input         StudentContext'ten gelen veriler
 * @param completions   DB'den gelen tamamlanmış görev anahtarları (Set<string>)
 * @param weekKey       Geçerli hafta anahtarı (getWeekKey())
 * @param custom        Admin tarafından oluşturulan özel görevler
 */
export function computeStudentMissions(
  input:    MissionComputeInput,
  completions: Set<string>,
  weekKey:  string,
  custom:   KediMission[] = [],
): StudentMission[] {
  const ws  = thisWeekStart();
  const out: StudentMission[] = [];

  /* Otomatik görevler */
  for (const def of AUTO_DEFS) {
    const key  = def.weekly ? `${def.baseKey}_${weekKey}` : def.baseKey;
    const prog = Math.min(def.progress(input, ws), def.target);
    const done = prog >= def.target;
    out.push({
      key, title: def.title, description: def.description, icon: def.icon,
      xpReward: def.xpReward, progress: prog, target: def.target,
      completed: done, xpAwarded: completions.has(key), isCustom: false,
    });
  }

  /* Admin görevleri */
  for (const m of custom) {
    if (!m.isActive) continue;
    const awarded = completions.has(m.id);
    out.push({
      key: m.id, title: m.title, description: m.description ?? "",
      icon: m.icon, xpReward: m.xpReward,
      progress: awarded ? m.targetValue : 0, target: m.targetValue,
      completed: awarded, xpAwarded: awarded, isCustom: true,
    });
  }

  return out;
}

/** Aktif (tamamlanmamış) görev sayısı */
export function activeMissionCount(missions: StudentMission[]): number {
  return missions.filter(m => !m.completed).length;
}

/** Tamamlanan görev sayısı */
export function completedMissionCount(missions: StudentMission[]): number {
  return missions.filter(m => m.completed).length;
}

/** Bu hafta kazanılabilecek toplam XP */
export function totalMissionXP(missions: StudentMission[]): number {
  return missions.filter(m => !m.xpAwarded).reduce((s, m) => s + m.xpReward, 0);
}

/** Öğrencinin en yakın tamamlanabilir görevini bul */
export function nearestMission(missions: StudentMission[]): StudentMission | null {
  const active = missions.filter(m => !m.completed);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => (b.progress / b.target) - (a.progress / a.target))[0];
}
