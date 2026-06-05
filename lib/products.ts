import { supabase, isSupabaseConfigured } from "./supabase";

/* ─── Tipler ──────────────────────────────────────────────────── */

export type ProductStatus   = "active" | "coming_soon";
export type ProductCategory =
  | "eldiven" | "bandaj" | "dislik" | "kaval" | "kasik"
  | "tisort"  | "sort"   | "ekipman"| "kondisyon" | "takviye"
  | "canta"   | "diger";

export interface Product {
  id:          string;
  name:        string;
  category:    ProductCategory;
  description: string;
  price?:      number;          // undefined → "Fiyat için iletişime geçiniz"
  imageUrl?:   string;          // undefined → kategori ikonu
  status:      ProductStatus;
  isActive:    boolean;
  sortOrder:   number;
  createdAt:   string;
}

/* ─── Kategori meta ───────────────────────────────────────────── */

export const CATEGORIES: Record<ProductCategory, { label: string; icon: string }> = {
  eldiven:    { label: "Eldivenler",             icon: "🥊" },
  bandaj:     { label: "Bandajlar",              icon: "🥋" },
  dislik:     { label: "Dişlikler",              icon: "🦷" },
  kaval:      { label: "Kaval Koruyucular",      icon: "🦵" },
  kasik:      { label: "Kasık Koruyucular",      icon: "🛡️" },
  tisort:     { label: "Tişörtler",              icon: "👕" },
  sort:       { label: "Şortlar",                icon: "🩳" },
  ekipman:    { label: "Antrenman Ekipmanları",  icon: "🎽" },
  kondisyon:  { label: "Kondisyon Ürünleri",     icon: "🏋️" },
  takviye:    { label: "Takviyeler",             icon: "💊" },
  canta:      { label: "Çantalar",               icon: "🎒" },
  diger:      { label: "Diğer Ürünler",          icon: "🔥" },
};

/* ─── Supabase ────────────────────────────────────────────────── */

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Product {
  return {
    id:          r.id,
    name:        r.name,
    category:    r.category as ProductCategory,
    description: r.description ?? "",
    price:       r.price != null ? Number(r.price) : undefined,
    imageUrl:    r.image_url ?? undefined,
    status:      (r.status ?? "active") as ProductStatus,
    isActive:    r.is_active ?? true,
    sortOrder:   r.sort_order ?? 0,
    createdAt:   r.created_at ?? "",
  };
}

export async function getProducts(activeOnly = false): Promise<Product[]> {
  let q = db().from("products").select("*").order("sort_order").order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) { console.error("getProducts:", error.message); return []; }
  return (data ?? []).map(map);
}

export async function createProduct(p: Omit<Product, "id" | "createdAt">): Promise<Product> {
  const { data, error } = await db().from("products").insert({
    name:        p.name,
    category:    p.category,
    description: p.description || null,
    price:       p.price ?? null,
    image_url:   p.imageUrl ?? null,
    status:      p.status,
    is_active:   p.isActive,
    sort_order:  p.sortOrder,
  }).select().single();
  if (error) throw error;
  return map(data);
}

export async function updateProduct(id: string, p: Partial<Omit<Product, "id" | "createdAt">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (p.name        !== undefined) row.name        = p.name;
  if (p.category    !== undefined) row.category    = p.category;
  if (p.description !== undefined) row.description = p.description || null;
  if (p.price       !== undefined) row.price       = p.price ?? null;
  if (p.imageUrl    !== undefined) row.image_url   = p.imageUrl ?? null;
  if (p.status      !== undefined) row.status      = p.status;
  if (p.isActive    !== undefined) row.is_active   = p.isActive;
  if (p.sortOrder   !== undefined) row.sort_order  = p.sortOrder;
  const { error } = await db().from("products").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db().from("products").delete().eq("id", id);
  if (error) throw error;
}
