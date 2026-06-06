"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSlotsForDate, addSlotsToDate, toggleSlot,
  removeSlot, clearDate, setAllOpen, weekSummary,
  type Slot,
} from "@/lib/slots";
import { getAppointments, getStudents, createAppointment } from "@/lib/db";
import type { Appointment, Student, LessonType } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Lock, Unlock, Check, Zap, Clock, UserPlus,
} from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const fmt = (d: Date) => d.toISOString().split("T")[0];
const todayStr = fmt(new Date());

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export default function TakvimPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekBase, setWeekBase] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; open: number }>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("22:00");
  const [intervalMin, setIntervalMin] = useState("60");

  /* Randevu oluşturma formu */
  const [aptPanel, setAptPanel]         = useState(false);
  const [aptStudent, setAptStudent]     = useState("");
  const [aptStudent2, setAptStudent2]   = useState("");
  const [aptTime, setAptTime]           = useState("");
  const [aptType, setAptType]           = useState<LessonType>("bireysel");
  const [aptSaving, setAptSaving]       = useState(false);

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => fmt(addDays(weekStart, i)));

  /* Öğrencileri yükle */
  useEffect(() => { getStudents().then(setStudents); }, []);

  /* Randevu oluştur */
  const handleCreateApt = async () => {
    if (!aptStudent || !aptTime) { alert("Öğrenci ve saat seçin."); return; }
    const std = students.find(s => s.id === aptStudent);
    if (!std) return;
    setAptSaving(true);
    try {
      const slotEnd = slots.find(s => s.start === aptTime)?.end ?? "";
      const secondIds = aptType !== "bireysel" && aptStudent2 ? [aptStudent2] : [];
      await createAppointment({
        studentId: std.id, studentName: std.fullName,
        studentCode: std.code, studentPhone: std.phone,
        date: selectedDate, startTime: aptTime, endTime: slotEnd,
        lessonType: aptType, partnerStudentIds: secondIds,
      });
      setAptPanel(false);
      setAptStudent(""); setAptStudent2(""); setAptTime(""); setAptType("bireysel");
      await reload();
      flash();
    } catch (err: unknown) {
      alert("Randevu oluşturulamadı: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAptSaving(false);
    }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, sum] = await Promise.all([
        getSlotsForDate(selectedDate),
        getAppointments({ date: selectedDate }),
        weekSummary(weekDays),
      ]);
      setSlots(s);
      setAppointments(a);
      setSummary(sum);
    } catch (err) {
      console.log("[TakvimPage] reload hatası:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, weekBase]);

  useEffect(() => { reload(); }, [reload]);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const handleAddRange = async () => {
    if (!rangeFrom || !rangeTo) return;
    setLoading(true);
    await addSlotsToDate(selectedDate, rangeFrom, rangeTo, Number(intervalMin) || 60);
    await reload();
    flash();
  };

  const handleToggle = async (start: string) => {
    await toggleSlot(selectedDate, start);
    await reload();
    flash();
  };

  const handleRemove = async (start: string) => {
    await removeSlot(selectedDate, start);
    await reload();
    flash();
  };

  const handleSetAll = async (open: boolean) => {
    await setAllOpen(selectedDate, open);
    await reload();
    flash();
  };

  const handleClear = async () => {
    await clearDate(selectedDate);
    await reload();
    flash();
  };

  const bookedAt = (start: string) =>
    appointments.find(a => a.startTime === start && a.status !== "iptal");

  const openCount  = slots.filter(s => s.open).length;
  const totalCount = slots.length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            TAKVİM & MÜSAİTLİK
          </h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            Randevu saatlerini kendiniz tanımlayın
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

      {/* Haftalık mini takvim */}
      <div className="bg-carbon border border-white/6">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button onClick={() => setWeekBase(d => addDays(d, -7))} className="p-1.5 text-white/30 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
          <span className="flex-1 text-center text-sm font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            {format(addDays(weekStart, 0), "dd MMM", { locale: tr })} – {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: tr })}
          </span>
          <button onClick={() => setWeekBase(d => addDays(d, 7))} className="p-1.5 text-white/30 hover:text-white transition-colors"><ChevronRight size={18} /></button>
          <button onClick={() => { setWeekBase(new Date()); setSelectedDate(todayStr); }} className="text-xs text-crimson/60 hover:text-crimson tracking-wider transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bugün</button>
        </div>

        {/* 7 sütun küçük ekranda taşar — yatay kaydırılabilir wrapper */}
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="grid grid-cols-7" style={{ minWidth: 360 }}>
            {weekDays.map(date => {
              const s = summary[date] || { total: 0, open: 0 };
              const isSelected = date === selectedDate;
              const isToday    = date === todayStr;
              return (
                <button key={date} onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center py-3 px-1 border-r last:border-0 border-white/5 transition-all duration-200 ${isSelected ? "bg-crimson/10 border-b-2 border-b-crimson" : "hover:bg-steel/20"}`}>
                  <span className="text-xs text-white/35 mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {format(parseISO(date), "EEE", { locale: tr }).toUpperCase()}
                  </span>
                  <span className={`text-xl font-display mb-1 ${isSelected ? "text-crimson" : isToday ? "text-gold-bright" : "text-white"}`} style={{ fontFamily: "var(--font-bebas)" }}>
                    {format(parseISO(date), "d")}
                  </span>
                  {s.total > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.open} açık</span>
                      <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.total} tpl</span>
                    </div>
                  ) : <span className="text-xs text-white/15" style={{ fontFamily: "var(--font-barlow-condensed)" }}>—</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seçili gün başlığı */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-display text-white tracking-wider leading-tight" style={{ fontFamily: "var(--font-bebas)" }}>
            {format(parseISO(selectedDate), "EEEE", { locale: tr }).toUpperCase()} — {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr })}
          </h2>
          <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {totalCount} saat tanımlı · {openCount} açık · {totalCount - openCount} kapalı
            {loading && " · yükleniyor..."}
          </p>
        </div>
        <input type="date" value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setWeekBase(parseISO(e.target.value)); }}
          className="bg-carbon border border-white/10 text-white px-3 py-2 text-sm outline-none focus:border-crimson/50 transition-colors flex-shrink-0"
          style={{ fontFamily: "var(--font-inter)" }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Sol: Saat ekleme */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-carbon border border-crimson/20 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson/60" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-crimson" />
                <h3 className="text-sm font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>SAAT ARALIK EKLE</h3>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Başlangıç</label>
                    <select value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-bebas)", fontSize: "1rem" }}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bitiş</label>
                    <select value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-bebas)", fontSize: "1rem" }}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders Süresi</label>
                  <select value={intervalMin} onChange={e => setIntervalMin(e.target.value)}
                    className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="30"  className="bg-carbon">30 dakika</option>
                    <option value="45"  className="bg-carbon">45 dakika</option>
                    <option value="60"  className="bg-carbon">60 dakika (1 saat)</option>
                    <option value="90"  className="bg-carbon">90 dakika</option>
                    <option value="120" className="bg-carbon">120 dakika (2 saat)</option>
                  </select>
                </div>

                <button onClick={handleAddRange} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-crimson hover:bg-crimson-bright disabled:opacity-50 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all hover:shadow-[0_0_20px_rgba(224,32,32,0.4)]"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <Plus size={14} />{loading ? "Ekleniyor..." : "Saatleri Ekle"}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-white/25 leading-relaxed" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Örn: 09:00 → 22:00, 60 dk = 13 saat eklenir. Mevcut saatler tekrar eklenmez.
                </p>
              </div>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="bg-carbon border border-white/6 p-4 space-y-2">
              <h3 className="text-xs text-white/35 tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Toplu İşlemler</h3>
              <button onClick={() => handleSetAll(true)} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 border border-green-500/20 text-green-400 hover:border-green-500/40 hover:bg-green-500/5 text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Unlock size={12} />Tüm Saatleri Aç
              </button>
              <button onClick={() => handleSetAll(false)} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 border border-white/10 text-white/40 hover:border-white/20 hover:text-white text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Lock size={12} />Tüm Saatleri Kapat
              </button>
              <button onClick={handleClear} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 border border-crimson/20 text-crimson/60 hover:border-crimson/40 hover:text-crimson text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Trash2 size={12} />Güne Ait Saatleri Sil
              </button>
            </div>
          )}
        </div>

        {/* Sağ: Randevu Oluştur + Saat listesi */}
        <div className="lg:col-span-2 space-y-4">

          {/* Randevu oluşturma */}
          <div className="bg-carbon border border-violet/20 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet to-transparent" />
            <button className="w-full flex items-center justify-between p-4"
              onClick={() => setAptPanel(o => !o)}>
              <div className="flex items-center gap-2">
                <UserPlus size={15} className="text-violet" />
                <span className="text-sm font-display text-white tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>
                  RANDEVU OLUŞTUR
                </span>
              </div>
              <span className="text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                {aptPanel ? "Kapat ▲" : "Aç ▼"}
              </span>
            </button>
            <AnimatePresence>
              {aptPanel && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                  exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                  className="overflow-hidden border-t border-white/5">
                  <div className="p-4 space-y-3">
                    {/* Ders tipi */}
                    <div>
                      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                        style={{ fontFamily:"var(--font-barlow-condensed)" }}>Ders Tipi</label>
                      <div className="flex gap-2">
                        {(["bireysel","duet","grup"] as LessonType[]).map(t => (
                          <button key={t} onClick={() => { setAptType(t); if(t==="bireysel") setAptStudent2(""); }}
                            className="flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-all"
                            style={{
                              fontFamily:"var(--font-barlow-condensed)",
                              ...(aptType===t
                                ? { background:"linear-gradient(135deg,#8B5CF6,#A855F7)", color:"#fff" }
                                : { border:"1px solid rgba(139,92,246,0.2)", color:"rgba(139,92,246,0.6)" }),
                            }}>
                            {t==="bireysel"?"Bireysel":t==="duet"?"Düet":"Grup"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Öğrenci 1 */}
                    <div>
                      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                        style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                        {aptType==="bireysel"?"Öğrenci":"Öğrenci A"}
                      </label>
                      <select value={aptStudent} onChange={e => setAptStudent(e.target.value)}
                        className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none transition-colors"
                        style={{ fontFamily:"var(--font-inter)" }}>
                        <option value="" className="bg-carbon">Öğrenci seçin...</option>
                        {students.filter(s=>s.isActive).map(s => (
                          <option key={s.id} value={s.id} className="bg-carbon">
                            {s.fullName} ({s.code}) — {s.remainingLessons} ders kaldı
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Öğrenci 2 (Düet/Grup) */}
                    {aptType !== "bireysel" && (
                      <div>
                        <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                          style={{ fontFamily:"var(--font-barlow-condensed)" }}>Öğrenci B</label>
                        <select value={aptStudent2} onChange={e => setAptStudent2(e.target.value)}
                          className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                          style={{ fontFamily:"var(--font-inter)" }}>
                          <option value="" className="bg-carbon">İkinci öğrenci seçin...</option>
                          {students.filter(s => s.isActive && s.id !== aptStudent).map(s => (
                            <option key={s.id} value={s.id} className="bg-carbon">
                              {s.fullName} ({s.code}) — {s.remainingLessons} ders kaldı
                            </option>
                          ))}
                        </select>
                        {/* Uyarı: 0 ders */}
                        {aptStudent2 && (() => {
                          const std = students.find(s => s.id === aptStudent2);
                          return std && std.remainingLessons === 0 ? (
                            <p className="text-xs text-gold mt-1" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                              ⚠️ {std.fullName} adlı öğrencinin kalan dersi yok!
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {/* Saat seç */}
                    <div>
                      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                        style={{ fontFamily:"var(--font-barlow-condensed)" }}>Saat (Boş slotlardan)</label>
                      <select value={aptTime} onChange={e => setAptTime(e.target.value)}
                        className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                        style={{ fontFamily:"var(--font-bebas)", fontSize:"1rem" }}>
                        <option value="" className="bg-carbon">Saat seçin...</option>
                        {slots.filter(s => s.open && !appointments.find(a=>a.startTime===s.start&&a.status!=="iptal"))
                          .map(s => (
                          <option key={s.start} value={s.start} className="bg-carbon">
                            {s.start} – {s.end}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleCreateApt} disabled={!aptStudent || !aptTime || aptSaving}
                      className="w-full py-3 text-white text-xs font-semibold tracking-widest uppercase transition-all disabled:opacity-40"
                      style={{
                        fontFamily:"var(--font-barlow-condensed)",
                        background:"linear-gradient(135deg,#8B5CF6,#A855F7)",
                        boxShadow: aptStudent && aptTime ? "0 0 15px rgba(139,92,246,0.4)" : "none",
                      }}>
                      {aptSaving ? "Oluşturuluyor..." : `${aptType==="duet"?"Düet ":""}Randevu Oluştur`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saat listesi */}
          <div>
          {slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-carbon border border-dashed border-white/10">
              <Clock size={36} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bu güne ait tanımlı saat yok</p>
              <p className="text-white/15 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Soldan saat aralığı ekleyin</p>
            </div>
          ) : (
            <div className="bg-carbon border border-white/6 overflow-hidden">
              <div className="flex items-center px-4 py-2.5 bg-steel/30 border-b border-white/5">
                <span className="text-xs text-white/30 tracking-widest uppercase w-28" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Saat</span>
                <span className="text-xs text-white/30 tracking-widest uppercase flex-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Durum</span>
                <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>İşlem</span>
              </div>

              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                <AnimatePresence>
                  {slots.map((slot, i) => {
                    const apt = bookedAt(slot.start);
                    const isBooked = !!apt;
                    return (
                      <motion.div key={slot.start}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex items-center gap-3 px-4 py-3 group transition-colors ${isBooked ? "bg-gold/4" : !slot.open ? "bg-crimson/3 opacity-60" : "hover:bg-steel/15"}`}>

                        <div className="w-28 flex-shrink-0">
                          <div className={`text-base font-display ${isBooked ? "text-gold-bright" : slot.open ? "text-white" : "text-white/30"}`}
                            style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }}>
                            {slot.start}
                          </div>
                          <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>→ {slot.end}</div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {isBooked ? (
                            <div>
                              <div className="text-xs text-gold font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{apt.studentName}</div>
                              <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{apt.studentCode} · Randevu var</div>
                            </div>
                          ) : slot.open ? (
                            <span className="text-xs text-green-400 flex items-center gap-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />Açık — öğrenci alabilir
                            </span>
                          ) : (
                            <span className="text-xs text-white/25 flex items-center gap-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />Kapalı
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isBooked && (
                            <>
                              <button onClick={() => handleToggle(slot.start)} disabled={loading}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-all ${slot.open ? "border-crimson/20 text-crimson/60 hover:border-crimson/50 hover:text-crimson hover:bg-crimson/5" : "border-green-500/20 text-green-400/60 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/5"}`}
                                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                                {slot.open ? <><Lock size={11} />Kapat</> : <><Unlock size={11} />Aç</>}
                              </button>
                              <button onClick={() => handleRemove(slot.start)} disabled={loading}
                                className="p-1.5 text-white/15 hover:text-crimson transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          {isBooked && (
                            <span className="text-xs text-gold/50 px-2 py-1 border border-gold/15" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Dolu</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-steel/20 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <span className="text-green-400">{openCount} açık</span>
                  <span className="text-white/25">{totalCount - openCount} kapalı</span>
                  <span className="text-gold">{appointments.filter(a => a.status !== "iptal").length} randevulu</span>
                </div>
                <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{totalCount} saat toplam</span>
              </div>
            </div>
          )}
          </div>{/* saat listesi div kapanış */}
        </div>{/* lg:col-span-2 kapanış */}
      </div>
    </div>
  );
}
