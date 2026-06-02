/**
 * lib/health.ts — Sağlık takip veri katmanı
 * Tüm veriler Supabase'de saklanır.
 * localStorage kullanılmaz.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export interface HealthProfile {
  height: number;
  weight: number;
  age: number;
  gender: "male" | "female";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very-active";
}

export interface WeightEntry  { date: string; weight: number }
export interface CalorieEntry { date: string; consumed: number; burned: number; target: number }
export interface WaterEntry   { date: string; glasses: number }

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

// ── Profil ────────────────────────────────────────────────────────────────────

export async function getHealthProfile(studentId: string): Promise<HealthProfile | null> {
  const { data, error } = await db()
    .from("health_profiles")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) { console.error("[getHealthProfile]", error.message); return null; }
  if (!data) return null;
  return {
    height: data.height ?? 170,
    weight: Number(data.weight ?? 70),
    age: data.age ?? 25,
    gender: data.gender as HealthProfile["gender"],
    activityLevel: data.activity_level as HealthProfile["activityLevel"],
  };
}

export async function saveHealthProfile(studentId: string, profile: HealthProfile): Promise<void> {
  const { error } = await db().from("health_profiles").upsert({
    student_id: studentId,
    height: profile.height,
    weight: profile.weight,
    age: profile.age,
    gender: profile.gender,
    activity_level: profile.activityLevel,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id" });
  if (error) { console.error("[saveHealthProfile]", error.message); throw error; }
}

// ── Kilo logu ─────────────────────────────────────────────────────────────────

export async function getWeightLogs(studentId: string, days = 30): Promise<WeightEntry[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await db()
    .from("weight_logs")
    .select("date, weight")
    .eq("student_id", studentId)
    .gte("date", from.toISOString().split("T")[0])
    .order("date", { ascending: true });
  if (error) { console.error("[getWeightLogs]", error.message); return []; }
  return (data ?? []).map(r => ({ date: r.date, weight: Number(r.weight) }));
}

export async function logWeight(studentId: string, date: string, weight: number): Promise<void> {
  const { error } = await db().from("weight_logs").upsert(
    { student_id: studentId, date, weight },
    { onConflict: "student_id,date" }
  );
  if (error) { console.error("[logWeight]", error.message); throw error; }
}

// ── Kalori logu ───────────────────────────────────────────────────────────────

export async function getCalorieLogs(studentId: string, days = 30): Promise<CalorieEntry[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data, error } = await db()
    .from("calorie_logs")
    .select("date, consumed, burned, target")
    .eq("student_id", studentId)
    .gte("date", from.toISOString().split("T")[0])
    .order("date", { ascending: true });
  if (error) { console.error("[getCalorieLogs]", error.message); return []; }
  return (data ?? []).map(r => ({
    date: r.date, consumed: r.consumed ?? 0, burned: r.burned ?? 0, target: r.target ?? 2000,
  }));
}

export async function logCalories(
  studentId: string, date: string, consumed: number, burned: number, target: number
): Promise<void> {
  const { error } = await db().from("calorie_logs").upsert(
    { student_id: studentId, date, consumed, burned, target },
    { onConflict: "student_id,date" }
  );
  if (error) { console.error("[logCalories]", error.message); throw error; }
}

// ── Su logu ───────────────────────────────────────────────────────────────────

export async function getWaterLog(studentId: string, date: string): Promise<WaterEntry | null> {
  const { data, error } = await db()
    .from("water_logs")
    .select("date, glasses")
    .eq("student_id", studentId)
    .eq("date", date)
    .maybeSingle();
  if (error) { console.error("[getWaterLog]", error.message); return null; }
  return data ? { date: data.date, glasses: data.glasses ?? 0 } : null;
}

export async function setWaterGlasses(studentId: string, date: string, glasses: number): Promise<void> {
  const { error } = await db().from("water_logs").upsert(
    { student_id: studentId, date, glasses },
    { onConflict: "student_id,date" }
  );
  if (error) { console.error("[setWaterGlasses]", error.message); throw error; }
}

// ── Hesaplamalar (pure functions) ─────────────────────────────────────────────

export function calcBMI(weight: number, height: number): number {
  return Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Zayıf",        color: "text-blue-400" };
  if (bmi < 25)   return { label: "Normal",        color: "text-green-400" };
  if (bmi < 30)   return { label: "Fazla Kilolu",  color: "text-gold-bright" };
  return              { label: "Obez",         color: "text-crimson" };
}

export function calcTDEE(p: HealthProfile): number {
  const bmr = p.gender === "male"
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const m: Record<HealthProfile["activityLevel"], number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, "very-active": 1.9,
  };
  return Math.round(bmr * m[p.activityLevel]);
}

export function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}
