"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSlotsForDate, addSlotsToDate, toggleSlot,
  removeSlot, clearDate, setAllOpen, weekSummary,
  type Slot,
} from "@/lib/slots";
import { getAppointments } from "@/lib/db";
import type { Appointment } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Lock, Unlock,
  Check, X, Clock, Calendar, Zap,
} from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

/* ─── Saat formatı ───────────────────────────────────────────────── */
const fmt = (d: Date) => d.toISOString().split("T")[0];
const todayStr = fmt(new Date());

/* ─── Saatleri üret (dropdown için) ─────────────────────────────── */
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

/* ─── Ana sayfa ──────────────────────────────────────────────────── */
export default function TakvimPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekBase, setWeekBase] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; open: number }>>({});
  const [saved, setSaved] = useState(false);

  /* Hızlı ekle formu */
  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("22:00");
  const [interval, setInterval] = useState("60");

  /* Haftanın günleri */
  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => fmt(addDays(weekStart, i)));

  /* ─── Yükle ──────────────────────────────────────────────────── */
  const reload = useCallback(() => {
    setSlots(getSlotsForDate(selectedDate));
    setSummary(weekSummary(weekDays));
    getAppointments({ date: selectedDate }).then(setAppointments);
  }, [selectedDate, weekDays.join(",")]); // eslint-disable-line

  useEffect(() => { reload(); }, [selectedDate, weekBase]); // eslint-disable-line

  /* ─── Bildirim göster ─────────────────────────────────────────── */
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  /* ─── Aralık ekle ────────────────────────────────────────────── */
  const handleAddRange = () => {
    if (!rangeFrom || !rangeTo) return;
    addSlotsToDate(selectedDate, rangeFrom, rangeTo, Number(interval) || 60);
    reload();
    flash();
  };

  /* ─── Toggle ─────────────────────────────────────────────────── */
  const handleToggle = (start: string) => {
    toggleSlot(selectedDate, start);
    reload();
    flash();
  };

  /* ─── Sil ────────────────────────────────────────────────────── */
  const handleRemove = (start: string) => {
    removeSlot(selectedDate, start);
    reload();
    flash();
  };

  /* ─── Tümünü aç/kapat ────────────────────────────────────────── */
  const handleSetAll = (open: boolean) => {
    setAllOpen(selectedDate, open);
    reload();
    flash();
  };

  /* ─── Tüm saatleri sil ───────────────────────────────────────── */
  const handleClear = () => {
    clearDate(selectedDate);
    reload();
    flash();
  };

  /* ─── Randevu var mı? ────────────────────────────────────────── */
  const bookedAt = (start: string) =>
    appointments.find(a => a.startTime === start && a.status !== "iptal");

  const dayLabel = (date: string) =>
    format(parseISO(date), "EEEE", { locale: tr });
  const dayNum = (date: string) =>
    format(parseISO(date), "d");
  const monthShort = (date: string) =>
    format(parseISO(date), "MMM", { locale: tr }).toUpperCase();

  const openCount = slots.filter(s => s.open).length;
  const totalCount = slots.length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Başlık ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            TAKVİM & MÜSAİTLİK
          </h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            Randevu saatlerini kendiniz tanımlayın ve yönetin
          </p>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-green-400 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <Check size={13} />Kaydedildi
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Haftalık mini takvim ────────────────────────────────── */}
      <div className="bg-carbon border border-white/6">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button onClick={() => setWeekBase(d => addDays(d, -7))}
            className="p-1.5 text-white/30 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="flex-1 text-center text-sm font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            {format(addDays(weekStart, 0), "dd MMM", { locale: tr })} – {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: tr })}
          </span>
          <button onClick={() => setWeekBase(d => addDays(d, 7))}
            className="p-1.5 text-white/30 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => { setWeekBase(new Date()); setSelectedDate(todayStr); }}
            className="text-xs text-crimson/60 hover:text-crimson tracking-wider transition-colors"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bugün</button>
        </div>

        <div className="grid grid-cols-7">
          {weekDays.map(date => {
            const s = summary[date] || { total: 0, open: 0 };
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            const dayApts = appointments.filter(a => a.date === date && a.status !== "iptal").length;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center py-3 px-1 border-r last:border-0 border-white/5 transition-all duration-200 ${
                  isSelected ? "bg-crimson/10 border-b-2 border-b-crimson" : "hover:bg-steel/20"
                }`}
              >
                <span className="text-xs text-white/35 mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {format(parseISO(date), "EEE", { locale: tr }).toUpperCase()}
                </span>
                <span className={`text-xl font-display mb-1 ${isSelected ? "text-crimson" : isToday ? "text-gold-bright" : "text-white"}`}
                  style={{ fontFamily: "var(--font-bebas)" }}>
                  {dayNum(date)}
                </span>
                {/* Slot özeti */}
                {s.total > 0 ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {s.open} açık
                    </span>
                    <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {s.total} toplam
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-white/15" style={{ fontFamily: "var(--font-barlow-condensed)" }}>—</span>
                )}
                {/* Randevu göstergesi */}
                {dayApts > 0 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Seçili gün başlığı ──────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            {dayLabel(selectedDate).toUpperCase()} — {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr })}
          </h2>
          <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {totalCount} saat tanımlı · {openCount} açık · {totalCount - openCount} kapalı
          </p>
        </div>
        {/* Tarih inputu */}
        <input
          type="date"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setWeekBase(parseISO(e.target.value)); }}
          className="ml-auto bg-carbon border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-crimson/50 transition-colors"
          style={{ fontFamily: "var(--font-inter)" }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Sol: Saat ekleme ────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Hızlı aralık ekle */}
          <div className="bg-carbon border border-crimson/20 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson/60" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-crimson" />
                <h3 className="text-sm font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  SAAT ARALIK EKLE
                </h3>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Başlangıç</label>
                    <select value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-bebas)", fontSize: "1rem", letterSpacing: "0.05em" }}>
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t} className="bg-carbon">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bitiş</label>
                    <select value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-bebas)", fontSize: "1rem", letterSpacing: "0.05em" }}>
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t} className="bg-carbon">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/35 tracking-wider uppercase mb-1"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders Süresi</label>
                  <select value={interval} onChange={e => setInterval(e.target.value)}
                    className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="30" className="bg-carbon">30 dakika</option>
                    <option value="45" className="bg-carbon">45 dakika</option>
                    <option value="60" className="bg-carbon">60 dakika (1 saat)</option>
                    <option value="90" className="bg-carbon">90 dakika</option>
                    <option value="120" className="bg-carbon">120 dakika (2 saat)</option>
                  </select>
                </div>

                <button
                  onClick={handleAddRange}
                  className="w-full flex items-center justify-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all hover:shadow-[0_0_20px_rgba(224,32,32,0.4)]"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  <Plus size={14} />
                  Saatleri Ekle
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-white/25 leading-relaxed" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Örn: 09:00 → 22:00, 60 dk = 09:00, 10:00, 11:00 ... 21:00 saatleri eklenir.
                  Zaten var olan saatler tekrar eklenmez.
                </p>
              </div>
            </div>
          </div>

          {/* Toplu işlemler */}
          {totalCount > 0 && (
            <div className="bg-carbon border border-white/6 p-4 space-y-2">
              <h3 className="text-xs text-white/35 tracking-widest uppercase mb-2"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>Toplu İşlemler</h3>
              <button onClick={() => handleSetAll(true)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-green-500/20 text-green-400 hover:border-green-500/40 hover:bg-green-500/5 text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Unlock size={12} />Tüm Saatleri Aç
              </button>
              <button onClick={() => handleSetAll(false)}
                className="w-full flex items-center gap-2 px-3 py-2 border border-white/10 text-white/40 hover:border-white/20 hover:text-white text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Lock size={12} />Tüm Saatleri Kapat
              </button>
              <button onClick={handleClear}
                className="w-full flex items-center gap-2 px-3 py-2 border border-crimson/20 text-crimson/60 hover:border-crimson/40 hover:text-crimson text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Trash2 size={12} />Güne Ait Saatleri Sil
              </button>
            </div>
          )}
        </div>

        {/* ── Sağ: Saat listesi ───────────────────────────────── */}
        <div className="lg:col-span-2">
          {slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-carbon border border-dashed border-white/10">
              <Clock size={36} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Bu güne ait tanımlı saat yok
              </p>
              <p className="text-white/15 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Soldan saat aralığı ekleyin
              </p>
            </div>
          ) : (
            <div className="bg-carbon border border-white/6 overflow-hidden">
              {/* Tablo başlığı */}
              <div className="flex items-center px-4 py-2.5 bg-steel/30 border-b border-white/5">
                <span className="text-xs text-white/30 tracking-widest uppercase w-28"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Saat</span>
                <span className="text-xs text-white/30 tracking-widest uppercase flex-1"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Durum</span>
                <span className="text-xs text-white/30 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>İşlem</span>
              </div>

              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                <AnimatePresence>
                  {slots.map((slot, i) => {
                    const apt = bookedAt(slot.start);
                    const isBooked = !!apt;

                    return (
                      <motion.div
                        key={slot.start}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex items-center gap-3 px-4 py-3 group transition-colors ${
                          isBooked ? "bg-gold/4" :
                          !slot.open ? "bg-crimson/3 opacity-60" :
                          "hover:bg-steel/15"
                        }`}
                      >
                        {/* Saat */}
                        <div className="w-28 flex-shrink-0">
                          <div
                            className={`text-base font-display ${
                              isBooked ? "text-gold-bright" :
                              slot.open ? "text-white" : "text-white/30"
                            }`}
                            style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }}
                          >
                            {slot.start}
                          </div>
                          <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                            → {slot.end}
                          </div>
                        </div>

                        {/* Durum */}
                        <div className="flex-1 min-w-0">
                          {isBooked ? (
                            <div>
                              <div className="text-xs text-gold font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                                {apt.studentName}
                              </div>
                              <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                                {apt.studentCode} · Randevu var
                              </div>
                            </div>
                          ) : slot.open ? (
                            <span className="text-xs text-green-400 flex items-center gap-1"
                              style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Açık — öğrenci alabilir
                            </span>
                          ) : (
                            <span className="text-xs text-white/25 flex items-center gap-1"
                              style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                              Kapalı
                            </span>
                          )}
                        </div>

                        {/* İşlem butonları */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Randevu varsa toggle/sil kapat */}
                          {!isBooked && (
                            <>
                              <button
                                onClick={() => handleToggle(slot.start)}
                                title={slot.open ? "Kapat" : "Aç"}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-all ${
                                  slot.open
                                    ? "border-crimson/20 text-crimson/60 hover:border-crimson/50 hover:text-crimson hover:bg-crimson/5"
                                    : "border-green-500/20 text-green-400/60 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/5"
                                }`}
                                style={{ fontFamily: "var(--font-barlow-condensed)" }}
                              >
                                {slot.open ? (
                                  <><Lock size={11} />Kapat</>
                                ) : (
                                  <><Unlock size={11} />Aç</>
                                )}
                              </button>

                              <button
                                onClick={() => handleRemove(slot.start)}
                                title="Saati sil"
                                className="p-1.5 text-white/15 hover:text-crimson transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          {isBooked && (
                            <span className="text-xs text-gold/50 px-2 py-1 border border-gold/15"
                              style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              Dolu
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Özet footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-steel/20 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <span className="text-green-400">{openCount} açık</span>
                  <span className="text-white/25">{totalCount - openCount} kapalı</span>
                  <span className="text-gold">{appointments.filter(a => a.status !== "iptal").length} randevulu</span>
                </div>
                <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {totalCount} saat toplam
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
