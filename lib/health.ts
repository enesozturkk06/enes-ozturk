"use client";

export interface HealthProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very-active";
}

export interface WeightEntry { date: string; weight: number }
export interface CalorieEntry { date: string; consumed: number; burned: number; target: number }
export interface WaterEntry { date: string; glasses: number }

export interface HealthData {
  profile: HealthProfile | null;
  weightLog: WeightEntry[];
  calorieLog: CalorieEntry[];
  waterLog: WaterEntry[];
}

function key(studentId: string) { return `eo_health_${studentId}`; }

const EMPTY: HealthData = { profile: null, weightLog: [], calorieLog: [], waterLog: [] };

export function getHealthData(studentId: string): HealthData {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(key(studentId));
  if (!raw) return EMPTY;
  try { return JSON.parse(raw) as HealthData; } catch { return EMPTY; }
}

export function saveHealthData(studentId: string, data: HealthData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(studentId), JSON.stringify(data));
}

// BMI
export function calcBMI(weight: number, height: number): number {
  return Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Zayıf", color: "text-blue-400" };
  if (bmi < 25) return { label: "Normal", color: "text-green-400" };
  if (bmi < 30) return { label: "Fazla Kilolu", color: "text-gold-bright" };
  return { label: "Obez", color: "text-crimson" };
}

// TDEE — Mifflin-St Jeor
export function calcTDEE(p: HealthProfile): number {
  const bmr =
    p.gender === "male"
      ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
      : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const m: Record<HealthProfile["activityLevel"], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    "very-active": 1.9,
  };
  return Math.round(bmr * m[p.activityLevel]);
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}
