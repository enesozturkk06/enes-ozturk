"use client";

/**
 * lib/packages.ts — Ders paketleri.
 * Supabase aktifse packages tablosunu kullanır,
 * yoksa localStorage'a düşer.
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

const LS_KEY = "eo_packages_v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPackage(row: any): LessonPackage {
  return {
    id:          row.id,
    name:        row.name,
    lessonCount: row.lesson_count,
    price:       Number(row.price),
    durationDays: row.duration_days,
    description: row.description ?? "",
    isActive:    row.is_active ?? true,
    highlight:   row.highlight ?? false,
    sortOrder:   row.sort_order ?? 0,
  };
}

const DEFAULTS: LessonPackage[] = [
  { id: "pkg-a", name: "Başlangıç", lessonCount: 8,  price: 1490, durationDays: 45, description: "Temel teknikler, duruş ve kondisyon", isActive: true, highlight: false },
  { id: "pkg-b", name: "Gelişim",   lessonCount: 10, price: 1790, durationDays: 60, description: "Kombine çalışmalar, serbest çalışma girişi", isActive: true, highlight: true },
  { id: "pkg-c", name: "Şampiyon",  lessonCount: 12, price: 2190, durationDays: 75, description: "İleri seviye teknik, müsabaka hazırlığı", isActive: true, highlight: false },
];

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function getPackages(): Promise<LessonPackage[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("sort_order");
    if (error) {
      console.log("[getPackages] Supabase hatası:", error.message);
      return DEFAULTS;
    }
    return (data || []).map(mapPackage);
  }
  // localStorage fallback
  if (typeof window === "undefined") return DEFAULTS;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return DEFAULTS;
  try { return JSON.parse(raw) as LessonPackage[]; }
  catch { return DEFAULTS; }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
export async function createPackage(
  pkg: Omit<LessonPackage, "id">
): Promise<LessonPackage | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("packages")
      .insert({
        name:         pkg.name,
        lesson_count: pkg.lessonCount,
        price:        pkg.price,
        duration_days: pkg.durationDays,
        description:  pkg.description,
        is_active:    pkg.isActive,
        highlight:    pkg.highlight ?? false,
        sort_order:   pkg.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) {
      console.log("[createPackage] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapPackage(data) : null;
  }
  // localStorage fallback
  const all = await getPackages();
  const newPkg: LessonPackage = { ...pkg, id: `pkg-${Date.now()}` };
  lsSave([...all, newPkg]);
  return newPkg;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export async function updatePackage(
  id: string,
  updates: Partial<LessonPackage>
): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const db: Record<string, unknown> = {};
    if (updates.name !== undefined)        db.name         = updates.name;
    if (updates.lessonCount !== undefined) db.lesson_count = updates.lessonCount;
    if (updates.price !== undefined)       db.price        = updates.price;
    if (updates.durationDays !== undefined) db.duration_days = updates.durationDays;
    if (updates.description !== undefined) db.description  = updates.description;
    if (updates.isActive !== undefined)    db.is_active    = updates.isActive;
    if (updates.highlight !== undefined)   db.highlight    = updates.highlight;
    if (updates.sortOrder !== undefined)   db.sort_order   = updates.sortOrder;
    const { error } = await supabase.from("packages").update(db).eq("id", id);
    if (error) { console.log("[updatePackage] Supabase hatası:", error.message); return false; }
    return true;
  }
  // localStorage
  const all = await getPackages();
  lsSave(all.map(p => p.id === id ? { ...p, ...updates } : p));
  return true;
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function deletePackage(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) { console.log("[deletePackage] Supabase hatası:", error.message); return false; }
    return true;
  }
  const all = await getPackages();
  lsSave(all.filter(p => p.id !== id));
  return true;
}

// ─── Tüm paketleri yeniden kaydet (localStorage mod) ─────────────────────────
export function savePackages(packages: LessonPackage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(packages));
}

function lsSave(packages: LessonPackage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(packages));
}
