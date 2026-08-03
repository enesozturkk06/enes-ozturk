"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSlotsForDate, addSlotsToDate, toggleSlot,
  removeSlot, clearDate, setAllOpen, weekSummary,
  type Slot,
} from "@/lib/slots";
import { getAppointments, getStudents, createAppointment, getIncomeMovements, getPendingGiftLessonRequests, getGyms } from "@/lib/db";
import type { Appointment, Student, LessonType, GiftLessonRequest, Gym } from "@/lib/types";
import {
  Plus, Trash2, Lock, Unlock, Check, Zap, UserPlus,
  Calendar, Wallet, CalendarClock, PieChart, LayoutGrid, CalendarDays,
} from "lucide-react";
import { format, addDays, startOfWeek, parseISO, isFuture } from "date-fns";
import { tr } from "date-fns/locale";
import TakvimStatCard from "@/app/components/takvim/TakvimStatCard";
import WeekStrip from "@/app/components/takvim/WeekStrip";
import DayTimeline from "@/app/components/takvim/DayTimeline";
import TakvimRightPanel from "@/app/components/takvim/TakvimRightPanel";
import LessonDetailModal from "@/app/components/takvim/LessonDetailModal";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; open: number }>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  /* Premium redesign — salt-okunur ek veriler (hesaplama/iş mantığı değişmedi) */
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingGifts, setPendingGifts] = useState<GiftLessonRequest[]>([]);
  const [todaySlots, setTodaySlots] = useState<Slot[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [weekSlots, setWeekSlots] = useState<Record<string, Slot[]>>({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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
  /* Salonlar — ders detay popup'ında "Salon" alanı için (salt-okunur) */
  const [gyms, setGyms] = useState<Gym[]>([]);
  useEffect(() => { getGyms().then(setGyms).catch(() => {}); }, []);

  /* Ders detay popup'ı */
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);

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
      const [s, a, sum, todaySl, income, gifts] = await Promise.all([
        getSlotsForDate(selectedDate),
        getAppointments(),
        weekSummary(weekDays),
        getSlotsForDate(todayStr),
        getIncomeMovements({ dateFrom: todayStr, dateTo: todayStr, status: "odendi" }).catch(() => []),
        getPendingGiftLessonRequests().catch(() => []),
      ]);
      setSlots(s);
      setAllAppointments(a);
      setSummary(sum);
      setTodaySlots(todaySl);
      setTodayRevenue(income.reduce((sum2, m) => sum2 + m.paymentAmount, 0));
      setPendingGifts(gifts);
    } catch (err) {
      console.log("[TakvimPage] reload hatası:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, weekBase]);

  useEffect(() => { reload(); }, [reload]);

  /* Haftalık görünüm — sadece view=week iken 7 gün için slot verisi çekilir (lazy) */
  useEffect(() => {
    if (viewMode !== "week") return;
    let cancelled = false;
    Promise.all(weekDays.map(d => getSlotsForDate(d))).then(results => {
      if (cancelled) return;
      const map: Record<string, Slot[]> = {};
      weekDays.forEach((d, i) => { map[d] = results[i]; });
      setWeekSlots(map);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekBase]);

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

  /* ── Türetilmiş veriler — salt-okunur, allAppointments/todaySlots'tan ──
     Hiçbir yeni hesaplama/iş mantığı yok, sadece görüntüleme için filtre/sort. */
  const selectedDayAppointments = useMemo(
    () => allAppointments.filter(a => a.date === selectedDate),
    [allAppointments, selectedDate],
  );
  const todayAppointments = useMemo(
    () => allAppointments.filter(a => a.date === todayStr && a.status !== "iptal").sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [allAppointments],
  );
  const upcomingAppointments = useMemo(
    () => allAppointments
      .filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`)))
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
      .slice(0, 5),
    [allAppointments],
  );
  const lastCompletedAppointment = useMemo(
    () => allAppointments
      .filter(a => a.status === "tamamlandi")
      .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))[0] ?? null,
    [allAppointments],
  );

  const openCount  = slots.filter(s => s.open).length;
  const totalCount = slots.length;

  const emptyTodaySlots  = todaySlots.filter(s => s.open && !todayAppointments.find(a => a.startTime === s.start && a.status !== "iptal"));
  const bookedTodayCount = todaySlots.filter(s => todayAppointments.find(a => a.startTime === s.start && a.status !== "iptal")).length;
  const occupancyRate    = todaySlots.length > 0 ? Math.round((bookedTodayCount / todaySlots.length) * 100) : 0;

  const detailStudent = detailApt ? students.find(s => s.id === detailApt.studentId) : undefined;
  const detailGym = detailStudent?.gymId ? gyms.find(g => g.id === detailStudent.gymId) : undefined;

  return (
    <>
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-6">

      {/* Hero */}
      <motion.div variants={fadeUp} className="glass-strong relative overflow-hidden rounded-3xl">
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                TAKVİM & RANDEVU YÖNETİMİ
              </h1>
              <p className="text-xs sm:text-sm text-white/40 mt-1" style={{ fontFamily: "var(--font-label)" }}>
                Randevu saatlerini tanımlayın ve yönetin
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="glass flex rounded-xl p-1">
                <button onClick={() => setViewMode("day")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg tracking-wider transition-all"
                  style={{
                    background: viewMode === "day" ? "rgba(139,92,246,0.3)" : "transparent",
                    color: viewMode === "day" ? "#fff" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-label)",
                  }}>
                  <CalendarDays size={13} />Günlük
                </button>
                <button onClick={() => setViewMode("week")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg tracking-wider transition-all"
                  style={{
                    background: viewMode === "week" ? "rgba(139,92,246,0.3)" : "transparent",
                    color: viewMode === "week" ? "#fff" : "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-label)",
                  }}>
                  <LayoutGrid size={13} />Haftalık
                </button>
              </div>
              <AnimatePresence>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                    <Check size={13} />Kaydedildi
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <TakvimStatCard label="Bugünkü Ders" value={todayAppointments.length}
              sub={`${todayAppointments.filter(a => a.status === "tamamlandi").length} tamamlandı`}
              icon={<Calendar size={16} />} color="#F87171" />
            <TakvimStatCard label="Bugünkü Gelir" value={todayRevenue} prefix="₺"
              sub="Ödenen tahsilat" icon={<Wallet size={16} />} color="var(--color-achievement)" />
            <TakvimStatCard label="Boş Saat" value={emptyTodaySlots.length}
              sub="Bugün için" icon={<CalendarClock size={16} />} color="#60A5FA" />
            <TakvimStatCard label="Doluluk Oranı" value={occupancyRate} suffix="%"
              sub="Bugünün doluluğu" icon={<PieChart size={16} />} color="#4ADE80" />
          </div>
        </div>
      </motion.div>

      {/* Haftalık mini takvim */}
      <motion.div variants={fadeUp}>
        <WeekStrip
          weekDays={weekDays}
          weekLabel={`${format(addDays(weekStart, 0), "dd MMM", { locale: tr })} – ${format(addDays(weekStart, 6), "dd MMM yyyy", { locale: tr })}`}
          selectedDate={selectedDate}
          todayStr={todayStr}
          summary={summary}
          onSelectDate={d => setSelectedDate(d)}
          onPrevWeek={() => setWeekBase(d => addDays(d, -7))}
          onNextWeek={() => setWeekBase(d => addDays(d, 7))}
          onToday={() => { setWeekBase(new Date()); setSelectedDate(todayStr); }}
        />
      </motion.div>

      {/* Seçili gün başlığı — sadece günlük görünümde */}
      {viewMode === "day" && (
        <motion.div variants={fadeUp} className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl text-white tracking-wider leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {format(parseISO(selectedDate), "EEEE", { locale: tr }).toUpperCase()} — {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr })}
            </h2>
            <p className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
              {totalCount} saat tanımlı · {openCount} açık · {totalCount - openCount} kapalı
              {loading && " · yükleniyor..."}
            </p>
          </div>
          <input type="date" value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setWeekBase(parseISO(e.target.value)); }}
            className="glass text-white px-3 py-2 text-sm outline-none transition-colors flex-shrink-0 rounded-xl"
            style={{ fontFamily: "var(--font-label)" }}
          />
        </motion.div>
      )}

      <div className="grid lg:grid-cols-4 gap-5">

        {/* Sol: Saat ekleme */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-strong relative rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} style={{ color: "#A78BFA" }} />
                <h3 className="text-sm text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>SAAT ARALIK EKLE</h3>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Başlangıç</label>
                    <select value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Bitiş</label>
                    <select value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                      className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Ders Süresi</label>
                  <select value={intervalMin} onChange={e => setIntervalMin(e.target.value)}
                    className="w-full bg-steel/50 border border-white/10 focus:border-crimson/60 text-white px-2 py-2 text-sm outline-none appearance-none transition-colors"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="30"  className="bg-carbon">30 dakika</option>
                    <option value="45"  className="bg-carbon">45 dakika</option>
                    <option value="60"  className="bg-carbon">60 dakika (1 saat)</option>
                    <option value="90"  className="bg-carbon">90 dakika</option>
                    <option value="120" className="bg-carbon">120 dakika (2 saat)</option>
                  </select>
                </div>

                <button onClick={handleAddRange} disabled={loading}
                  className="gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-xl transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}>
                  <Plus size={14} />{loading ? "Ekleniyor..." : "Saatleri Ekle"}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-white/25 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>
                  Örn: 09:00 → 22:00, 60 dk = 13 saat eklenir. Mevcut saatler tekrar eklenmez.
                </p>
              </div>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <h3 className="text-xs text-white/35 tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-label)" }}>Toplu İşlemler</h3>
              <button onClick={() => handleSetAll(true)} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                <Unlock size={12} />Tüm Saatleri Aç
              </button>
              <button onClick={() => handleSetAll(false)} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                <Lock size={12} />Tüm Saatleri Kapat
              </button>
              <button onClick={handleClear} disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                <Trash2 size={12} />Güne Ait Saatleri Sil
              </button>
            </div>
          )}
        </div>

        {/* Sağ: Randevu Oluştur + Saat listesi */}
        <div className="lg:col-span-2 space-y-4">

          {/* Randevu oluşturma */}
          <div className="glass-strong relative rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange" />
            <button className="w-full flex items-center justify-between p-4"
              onClick={() => setAptPanel(o => !o)}>
              <div className="flex items-center gap-2">
                <UserPlus size={15} style={{ color: "#A78BFA" }} />
                <span className="text-sm text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                  RANDEVU OLUŞTUR
                </span>
              </div>
              <span className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                {aptPanel ? "Kapat ▲" : "Aç ▼"}
              </span>
            </button>
            <AnimatePresence>
              {aptPanel && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                  exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                  className="overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="p-4 space-y-3">
                    {/* Ders tipi */}
                    <div>
                      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                        style={{ fontFamily:"var(--font-label)" }}>Ders Tipi</label>
                      <div className="flex gap-2">
                        {(["bireysel","duet","grup"] as LessonType[]).map(t => (
                          <button key={t} onClick={() => { setAptType(t); if(t==="bireysel") setAptStudent2(""); }}
                            className="flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-all"
                            style={{
                              fontFamily:"var(--font-label)",
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
                        style={{ fontFamily:"var(--font-label)" }}>
                        {aptType==="bireysel"?"Öğrenci":"Öğrenci A"}
                      </label>
                      <select value={aptStudent} onChange={e => setAptStudent(e.target.value)}
                        className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none transition-colors"
                        style={{ fontFamily:"var(--font-label)" }}>
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
                          style={{ fontFamily:"var(--font-label)" }}>Öğrenci B</label>
                        <select value={aptStudent2} onChange={e => setAptStudent2(e.target.value)}
                          className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                          style={{ fontFamily:"var(--font-label)" }}>
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
                            <p className="text-xs text-gold mt-1" style={{ fontFamily:"var(--font-label)" }}>
                              ⚠️ {std.fullName} adlı öğrencinin kalan dersi yok!
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {/* Saat seç */}
                    <div>
                      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5"
                        style={{ fontFamily:"var(--font-label)" }}>Saat (Boş slotlardan)</label>
                      <select value={aptTime} onChange={e => setAptTime(e.target.value)}
                        className="w-full bg-carbon border border-violet/20 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                        style={{ fontFamily:"var(--font-display)", fontSize:"1rem" }}>
                        <option value="" className="bg-carbon">Saat seçin...</option>
                        {slots.filter(s => s.open && !selectedDayAppointments.find(a=>a.startTime===s.start&&a.status!=="iptal"))
                          .map(s => (
                          <option key={s.start} value={s.start} className="bg-carbon">
                            {s.start} – {s.end}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleCreateApt} disabled={!aptStudent || !aptTime || aptSaving}
                      className="gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange w-full py-3 rounded-xl text-white text-xs font-semibold tracking-widest uppercase transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                      style={{ fontFamily:"var(--font-label)" }}>
                      {aptSaving ? "Oluşturuluyor..." : `${aptType==="duet"?"Düet ":""}Randevu Oluştur`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saat çizelgesi — Günlük veya Haftalık */}
          {viewMode === "day" ? (
            <DayTimeline
              date={selectedDate}
              slots={slots}
              appointments={selectedDayAppointments}
              isToday={selectedDate === todayStr}
              now={now}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onApptClick={setDetailApt}
            />
          ) : (
            <div className="overflow-x-auto overscroll-x-contain pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="grid grid-cols-7 gap-2" style={{ minWidth: 900 }}>
                {weekDays.map(d => (
                  <DayTimeline
                    key={d}
                    date={d}
                    slots={weekSlots[d] ?? []}
                    appointments={allAppointments.filter(a => a.date === d)}
                    isToday={d === todayStr}
                    now={now}
                    compact
                    onApptClick={setDetailApt}
                  />
                ))}
              </div>
            </div>
          )}

          {slots.length > 0 && viewMode === "day" && (
            <div className="glass flex items-center justify-between px-4 py-3 rounded-xl">
              <div className="flex items-center gap-4 text-xs" style={{ fontFamily: "var(--font-label)" }}>
                <span style={{ color: "var(--color-success)" }}>{openCount} açık</span>
                <span className="text-white/25">{totalCount - openCount} kapalı</span>
                <span style={{ color: "var(--color-achievement)" }}>{selectedDayAppointments.filter(a => a.status !== "iptal").length} randevulu</span>
              </div>
              <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-label)" }}>{totalCount} saat toplam</span>
            </div>
          )}
        </div>

        {/* Sağ panel */}
        <div className="lg:col-span-1">
          <TakvimRightPanel
            upcomingAppointments={upcomingAppointments}
            todayAppointments={todayAppointments}
            lastCompletedAppointment={lastCompletedAppointment}
            pendingGifts={pendingGifts}
            emptyTodaySlots={emptyTodaySlots}
          />
        </div>
      </div>
    </motion.div>

    <LessonDetailModal
      appointment={detailApt}
      student={detailStudent}
      gym={detailGym}
      onClose={() => setDetailApt(null)}
    />
    </>
  );
}
