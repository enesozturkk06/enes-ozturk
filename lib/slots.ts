"use client";

/**
 * lib/slots.ts — Takvim slot yönetimi.
 * Supabase aktifse time_slots tablosunu kullanır,
 * yoksa localStorage'a düşer.
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export interface Slot {
  id?: string;
  start: string;  // "HH:mm"
  end: string;    // "HH:mm"
  open: boolean;
}

// ─── localStorage yedek ───────────────────────────────────────────────────────
const LS_KEY = "eo_slots_v2";

function lsLoad(): Record<string, Slot[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}

function lsSave(store: Record<string, Slot[]>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

// ─── Supabase row → Slot ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSlot(row: any): Slot {
  return {
    id:    row.id,
    start: row.start_time,  // sütun zaten "HH:mm" metin
    end:   row.end_time,
    open:  row.is_open ?? true,
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function getSlotsForDate(date: string): Promise<Slot[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .eq("date", date)
      .order("start_time");
    if (error) {
      console.log("[getSlotsForDate] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapSlot);
  }
  return (lsLoad()[date] || []).sort((a, b) => a.start.localeCompare(b.start));
}

// ─── SET (tüm günü yaz) ───────────────────────────────────────────────────────
export async function setSlotsForDate(date: string, slots: Slot[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Önce günün tüm slotlarını sil
    const { error: delErr } = await supabase
      .from("time_slots")
      .delete()
      .eq("date", date);
    if (delErr) { console.log("[setSlotsForDate] delete hatası:", delErr.message); return; }
    if (slots.length === 0) return;
    // Yeni slotları ekle
    const rows = slots.map(s => ({
      date,
      start_time: s.start,
      end_time:   s.end,
      is_open:    s.open,
    }));
    const { error: insErr } = await supabase.from("time_slots").insert(rows);
    if (insErr) console.log("[setSlotsForDate] insert hatası:", insErr.message);
    return;
  }
  const store = lsLoad();
  if (slots.length === 0) { delete store[date]; }
  else { store[date] = slots.sort((a, b) => a.start.localeCompare(b.start)); }
  lsSave(store);
}

// ─── Saat aralığından slot üret ───────────────────────────────────────────────
export function generateSlots(from: string, to: string, intervalMin = 60): Slot[] {
  const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromStr = (mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const fromMin = toMins(from);
  const toMin   = toMins(to);
  const slots: Slot[] = [];
  for (let m = fromMin; m + intervalMin <= toMin; m += intervalMin) {
    slots.push({ start: fromStr(m), end: fromStr(m + intervalMin), open: true });
  }
  return slots;
}

// ─── Aralık ekle ─────────────────────────────────────────────────────────────
export async function addSlotsToDate(
  date: string, from: string, to: string, intervalMin = 60
): Promise<void> {
  const existing = await getSlotsForDate(date);
  const existingStarts = new Set(existing.map(s => s.start));
  const newSlots = generateSlots(from, to, intervalMin).filter(
    s => !existingStarts.has(s.start)
  );
  if (newSlots.length === 0) return;

  if (isSupabaseConfigured && supabase) {
    const rows = newSlots.map(s => ({
      date,
      start_time: s.start,
      end_time:   s.end,
      is_open:    true,
    }));
    const { error } = await supabase.from("time_slots").insert(rows);
    if (error) console.log("[addSlotsToDate] Supabase hatası:", error.message);
    return;
  }
  await setSlotsForDate(date, [...existing, ...newSlots]);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export async function toggleSlot(date: string, start: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // Mevcut durumu oku
    const { data } = await supabase
      .from("time_slots")
      .select("id, is_open")
      .eq("date", date)
      .eq("start_time", start)
      .single();
    if (!data) return;
    const { error } = await supabase
      .from("time_slots")
      .update({ is_open: !data.is_open })
      .eq("id", data.id);
    if (error) console.log("[toggleSlot] Supabase hatası:", error.message);
    return;
  }
  const store = lsLoad();
  store[date] = (store[date] || []).map(s =>
    s.start === start ? { ...s, open: !s.open } : s
  );
  lsSave(store);
}

// ─── Tek slot sil ─────────────────────────────────────────────────────────────
export async function removeSlot(date: string, start: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("time_slots")
      .delete()
      .eq("date", date)
      .eq("start_time", start);
    if (error) console.log("[removeSlot] Supabase hatası:", error.message);
    return;
  }
  const store = lsLoad();
  store[date] = (store[date] || []).filter(s => s.start !== start);
  lsSave(store);
}

// ─── Günü tamamen temizle ────────────────────────────────────────────────────
export async function clearDate(date: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("time_slots")
      .delete()
      .eq("date", date);
    if (error) console.log("[clearDate] Supabase hatası:", error.message);
    return;
  }
  const store = lsLoad();
  delete store[date];
  lsSave(store);
}

// ─── Tümünü aç/kapat ─────────────────────────────────────────────────────────
export async function setAllOpen(date: string, open: boolean): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("time_slots")
      .update({ is_open: open })
      .eq("date", date);
    if (error) console.log("[setAllOpen] Supabase hatası:", error.message);
    return;
  }
  const store = lsLoad();
  store[date] = (store[date] || []).map(s => ({ ...s, open }));
  lsSave(store);
}

// ─── Haftalık özet ───────────────────────────────────────────────────────────
export async function weekSummary(
  dates: string[]
): Promise<Record<string, { total: number; open: number }>> {
  const result: Record<string, { total: number; open: number }> = {};

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("time_slots")
      .select("date, is_open")
      .in("date", dates);
    if (error) { console.log("[weekSummary] Supabase hatası:", error.message); }
    const rows = data || [];
    for (const date of dates) {
      const dayRows = rows.filter(r => r.date === date);
      result[date] = {
        total: dayRows.length,
        open:  dayRows.filter(r => r.is_open).length,
      };
    }
    return result;
  }
  const store = lsLoad();
  for (const date of dates) {
    const slots = store[date] || [];
    result[date] = { total: slots.length, open: slots.filter(s => s.open).length };
  }
  return result;
}
