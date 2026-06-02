"use client";

/* ── Veri yapısı ────────────────────────────────────────────────── */
export interface Slot {
  start: string;  // "HH:mm"
  end: string;    // "HH:mm"
  open: boolean;  // true = açık, false = kapalı/bloke
}

type SlotStore = Record<string, Slot[]>; // date → slots

const KEY = "eo_slots_v2";

/* ── Depolama ───────────────────────────────────────────────────── */
export function loadSlots(): SlotStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as SlotStore;
  } catch {
    return {};
  }
}

export function saveSlots(store: SlotStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

/* ── Tarihe göre slot oku/yaz ───────────────────────────────────── */
export function getSlotsForDate(date: string): Slot[] {
  return (loadSlots()[date] || []).sort((a, b) => a.start.localeCompare(b.start));
}

export function setSlotsForDate(date: string, slots: Slot[]): void {
  const store = loadSlots();
  if (slots.length === 0) {
    delete store[date];
  } else {
    store[date] = slots.sort((a, b) => a.start.localeCompare(b.start));
  }
  saveSlots(store);
}

/* ── Saat aralığından slot üret ────────────────────────────────── */
export function generateSlots(from: string, to: string, intervalMin = 60): Slot[] {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const fromStr = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const fromMin = toMins(from);
  const toMin = toMins(to);
  const slots: Slot[] = [];

  for (let m = fromMin; m + intervalMin <= toMin; m += intervalMin) {
    slots.push({ start: fromStr(m), end: fromStr(m + intervalMin), open: true });
  }
  return slots;
}

/* ── Belirli tarihe saat aralığı ekle ──────────────────────────── */
export function addSlotsToDate(date: string, from: string, to: string, intervalMin = 60): void {
  const existing = getSlotsForDate(date);
  const existingStarts = new Set(existing.map(s => s.start));
  const newSlots = generateSlots(from, to, intervalMin).filter(s => !existingStarts.has(s.start));
  setSlotsForDate(date, [...existing, ...newSlots]);
}

/* ── Tek slot aç/kapat ──────────────────────────────────────────── */
export function toggleSlot(date: string, start: string): void {
  setSlotsForDate(date, getSlotsForDate(date).map(s =>
    s.start === start ? { ...s, open: !s.open } : s
  ));
}

/* ── Tek slot sil ───────────────────────────────────────────────── */
export function removeSlot(date: string, start: string): void {
  setSlotsForDate(date, getSlotsForDate(date).filter(s => s.start !== start));
}

/* ── Güne ait tüm saatleri sil ─────────────────────────────────── */
export function clearDate(date: string): void {
  const store = loadSlots();
  delete store[date];
  saveSlots(store);
}

/* ── Güne ait tüm slotları aç/kapat ────────────────────────────── */
export function setAllOpen(date: string, open: boolean): void {
  setSlotsForDate(date, getSlotsForDate(date).map(s => ({ ...s, open })));
}

/* ── Haftalık özet ──────────────────────────────────────────────── */
export function weekSummary(dates: string[]): Record<string, { total: number; open: number }> {
  const store = loadSlots();
  const result: Record<string, { total: number; open: number }> = {};
  for (const date of dates) {
    const slots = store[date] || [];
    result[date] = { total: slots.length, open: slots.filter(s => s.open).length };
  }
  return result;
}
