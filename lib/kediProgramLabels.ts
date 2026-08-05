/**
 * lib/kediProgramLabels.ts — Kedi AI programı için saf, client-safe etiket
 * verisi. lib/kediPrograms.ts (sunucu, LLM prompt'ları için) ve client
 * bileşenleri (Select seçenekleri, rozet metinleri) BURADAN import eder —
 * hiçbir server-only bağımlılık (Supabase/OpenRouter) içermez, bu yüzden
 * "use client" bileşenlerine güvenle bundle edilebilir.
 */
import type { KediSport, KediProgramGoal } from "./types";

export const SPORT_LABELS: Record<KediSport, string> = {
  kickboks: "Kickboks", muaythai: "Muay Thai", boks: "Boks", fitness: "Genel Fitness",
};

export const GOAL_LABELS: Record<KediProgramGoal, string> = {
  "kilo-verme": "Kilo Verme", "kilo-alma": "Kilo Alma", "kas-kazanma": "Kas Kazanma",
  "yag-yakma": "Yağ Yakma", "kondisyon": "Kondisyon Artırma",
};

export const SPORT_OPTS: { value: KediSport; label: string }[] =
  (Object.keys(SPORT_LABELS) as KediSport[]).map(value => ({ value, label: SPORT_LABELS[value] }));

export const GOAL_OPTS: { value: KediProgramGoal; label: string }[] =
  (Object.keys(GOAL_LABELS) as KediProgramGoal[]).map(value => ({ value, label: GOAL_LABELS[value] }));

export const DAYS_PER_WEEK_OPTS = [2, 3, 4, 5, 6].map(d => ({ value: String(d), label: `Haftada ${d} gün` }));
