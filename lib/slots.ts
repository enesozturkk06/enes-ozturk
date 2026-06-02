/**
 * lib/slots.ts — Takvim slotları
 * Tüm veriler Supabase time_slots tablosunda.
 * localStorage kullanılmaz.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export interface Slot {
  id?: string;
  start: string;  // "HH:mm"
  end: string;
  open: boolean;
}

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function getSlotsForDate(date: string): Promise<Slot[]> {
  const { data, error } = await db()
    .from("time_slots")
    .select("id, start_time, end_time, is_open")
    .eq("date", date)
    .order("start_time");
  if (error) { console.error("[getSlotsForDate]", error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id, start: r.start_time, end: r.end_time, open: r.is_open ?? true,
  }));
}

// ── Aralık oluştur ────────────────────────────────────────────────────────────
export function generateSlots(from: string, to: string, intervalMin = 60): Slot[] {
  const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const str  = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  const slots: Slot[] = [];
  for (let m = mins(from); m + intervalMin <= mins(to); m += intervalMin)
    slots.push({ start: str(m), end: str(m + intervalMin), open: true });
  return slots;
}

// ── Aralık ekle ───────────────────────────────────────────────────────────────
export async function addSlotsToDate(date: string, from: string, to: string, intervalMin = 60): Promise<void> {
  const existing = await getSlotsForDate(date);
  const existingStarts = new Set(existing.map(s => s.start));
  const rows = generateSlots(from, to, intervalMin)
    .filter(s => !existingStarts.has(s.start))
    .map(s => ({ date, start_time: s.start, end_time: s.end, is_open: true }));
  if (rows.length === 0) return;
  const { error } = await db().from("time_slots").insert(rows);
  if (error) { console.error("[addSlotsToDate]", error.message); throw error; }
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export async function toggleSlot(date: string, start: string): Promise<void> {
  const { data, error: e1 } = await db()
    .from("time_slots").select("id, is_open")
    .eq("date", date).eq("start_time", start).single();
  if (e1) { console.error("[toggleSlot:get]", e1.message); throw e1; }
  const { error: e2 } = await db()
    .from("time_slots").update({ is_open: !data.is_open }).eq("id", data.id);
  if (e2) { console.error("[toggleSlot:update]", e2.message); throw e2; }
}

// ── Tek slot sil ──────────────────────────────────────────────────────────────
export async function removeSlot(date: string, start: string): Promise<void> {
  const { error } = await db()
    .from("time_slots").delete()
    .eq("date", date).eq("start_time", start);
  if (error) { console.error("[removeSlot]", error.message); throw error; }
}

// ── Günü temizle ──────────────────────────────────────────────────────────────
export async function clearDate(date: string): Promise<void> {
  const { error } = await db().from("time_slots").delete().eq("date", date);
  if (error) { console.error("[clearDate]", error.message); throw error; }
}

// ── Tümünü aç/kapat ───────────────────────────────────────────────────────────
export async function setAllOpen(date: string, open: boolean): Promise<void> {
  const { error } = await db()
    .from("time_slots").update({ is_open: open }).eq("date", date);
  if (error) { console.error("[setAllOpen]", error.message); throw error; }
}

// ── Haftalık özet ─────────────────────────────────────────────────────────────
export async function weekSummary(dates: string[]): Promise<Record<string, { total: number; open: number }>> {
  const result: Record<string, { total: number; open: number }> = {};
  const { data, error } = await db()
    .from("time_slots").select("date, is_open").in("date", dates);
  if (error) { console.error("[weekSummary]", error.message); }
  const rows = data ?? [];
  for (const date of dates) {
    const dayRows = rows.filter(r => r.date === date);
    result[date] = { total: dayRows.length, open: dayRows.filter(r => r.is_open).length };
  }
  return result;
}
