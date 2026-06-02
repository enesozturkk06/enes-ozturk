/**
 * lib/packages.ts — Ders paketleri
 * Tüm veriler Supabase packages tablosunda.
 * localStorage kullanılmaz.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export interface LessonPackage {
  id: string;
  name: string;
  lessonCount: number;
  price: number;
  durationDays: number;
  description: string;
  isActive: boolean;
  highlight?: boolean;
  sortOrder?: number;
}

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): LessonPackage {
  return {
    id: r.id, name: r.name, lessonCount: r.lesson_count, price: Number(r.price),
    durationDays: r.duration_days, description: r.description ?? "",
    isActive: r.is_active ?? true, highlight: r.highlight ?? false, sortOrder: r.sort_order ?? 0,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function getPackages(): Promise<LessonPackage[]> {
  const { data, error } = await db().from("packages").select("*").order("sort_order");
  if (error) { console.error("[getPackages]", error.message); throw error; }
  return (data ?? []).map(map);
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createPackage(pkg: Omit<LessonPackage, "id">): Promise<LessonPackage> {
  const { data, error } = await db().from("packages").insert({
    name: pkg.name, lesson_count: pkg.lessonCount, price: pkg.price,
    duration_days: pkg.durationDays, description: pkg.description,
    is_active: pkg.isActive, highlight: pkg.highlight ?? false, sort_order: pkg.sortOrder ?? 0,
  }).select().single();
  if (error) { console.error("[createPackage]", error.message); throw error; }
  return map(data);
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
export async function updatePackage(id: string, updates: Partial<LessonPackage>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name        !== undefined) row.name         = updates.name;
  if (updates.lessonCount !== undefined) row.lesson_count = updates.lessonCount;
  if (updates.price       !== undefined) row.price        = updates.price;
  if (updates.durationDays!== undefined) row.duration_days= updates.durationDays;
  if (updates.description !== undefined) row.description  = updates.description;
  if (updates.isActive    !== undefined) row.is_active    = updates.isActive;
  if (updates.highlight   !== undefined) row.highlight    = updates.highlight;
  if (updates.sortOrder   !== undefined) row.sort_order   = updates.sortOrder;
  const { error } = await db().from("packages").update(row).eq("id", id);
  if (error) { console.error("[updatePackage]", error.message); throw error; }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deletePackage(id: string): Promise<void> {
  const { error } = await db().from("packages").delete().eq("id", id);
  if (error) { console.error("[deletePackage]", error.message); throw error; }
}

// savePackages compat shim — artık kullanılmıyor ama import hatası vermemek için
export function savePackages(_: LessonPackage[]): void {
  console.warn("savePackages: artık kullanılmıyor, Supabase kullanın");
}
