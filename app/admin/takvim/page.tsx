"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  getSlotsForDate, addSlotsToDate, toggleSlot,
  removeSlot, clearDate, setAllOpen, weekSummary,
  type Slot,
} from "@/lib/slots";
import {
  getAppointments, getStudents, createAppointment, getIncomeMovements,
  getPendingGiftLessonRequests, getGyms, getAppointmentStudents,
  completeAppointmentWithAttendance, adminCancelAppointment, updateAppointment,
} from "@/lib/db";
import type { Appointment, Student, LessonType, GiftLessonRequest, Gym } from "@/lib/types";
import { Gift, Check, Package as PackageIcon, MapPin, User as UserIcon, Clock } from "lucide-react";
import { format, addDays, subDays, startOfWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { STATUS_LABELS, TRAINER_NAME, TRAINER_LOCATION, LESSON_DURATION_MINUTES, PACKAGES } from "@/lib/constants";

import CalendarHeader from "@/app/components/calendar/CalendarHeader";
import CalendarStats from "@/app/components/calendar/CalendarStats";
import WeekDateSelector, { type CalendarDay } from "@/app/components/calendar/WeekDateSelector";
import CalendarTimeline, { type TimelineRow } from "@/app/components/calendar/CalendarTimeline";
import EmptySlot from "@/app/components/calendar/EmptySlot";
import AppointmentCard from "@/app/components/calendar/AppointmentCard";
import AppointmentBottomSheet from "@/app/components/calendar/AppointmentBottomSheet";
import CalendarActionMenu from "@/app/components/calendar/CalendarActionMenu";

const fadeUp = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

const fmt = (d: Date) => d.toISOString().split("T")[0];
const todayStr = fmt(new Date());

const LESSON_TYPE_LABEL: Record<LessonType, string> = { bireysel: "Özel Ders", duet: "Düet Ders", grup: "Grup Ders" };
const STATUS_COLOR: Record<string, string> = {
  onaylandi: "var(--color-success)", tamamlandi: "#60A5FA", iptal: "var(--color-error)", gelmedi: "var(--color-warning)",
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) for (const m of [0, 30]) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

type SheetMode = null | "addChoice" | "addRange" | "addAppt";

export default function TakvimPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekBase, setWeekBase] = useState(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<Record<string, { total: number; open: number }>>({});
  const [loading, setLoading] = useState(false);

  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingGifts, setPendingGifts] = useState<GiftLessonRequest[]>([]);
  const [now, setNow] = useState(new Date());
  const [gyms, setGyms] = useState<Gym[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("22:00");
  const [intervalMin, setIntervalMin] = useState("60");

  /* Randevu oluşturma formu — mevcut mantık aynen korunuyor */
  const [aptStudent, setAptStudent] = useState("");
  const [aptStudent2, setAptStudent2] = useState("");
  const [aptTime, setAptTime] = useState("");
  const [aptType, setAptType] = useState<LessonType>("bireysel");
  const [aptSaving, setAptSaving] = useState(false);

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => fmt(addDays(weekStart, i)));

  useEffect(() => { getStudents().then(setStudents); }, []);
  useEffect(() => { getGyms().then(setGyms).catch(() => {}); }, []);

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
      setSheetMode(null);
      setAptStudent(""); setAptStudent2(""); setAptTime(""); setAptType("bireysel");
      await reload();
    } catch (err: unknown) {
      alert("Randevu oluşturulamadı: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAptSaving(false);
    }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, sum, income, gifts] = await Promise.all([
        getSlotsForDate(selectedDate),
        getAppointments(),
        weekSummary(weekDays),
        getIncomeMovements({ dateFrom: todayStr, dateTo: todayStr, status: "odendi" }).catch(() => []),
        getPendingGiftLessonRequests().catch(() => []),
      ]);
      setSlots(s);
      setAllAppointments(a);
      setSummary(sum);
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

  const handleAddRange = async () => {
    if (!rangeFrom || !rangeTo) return;
    setLoading(true);
    await addSlotsToDate(selectedDate, rangeFrom, rangeTo, Number(intervalMin) || 60);
    await reload();
    setSheetMode(null);
  };

  const handleToggle = async (start: string) => { await toggleSlot(selectedDate, start); await reload(); };
  const handleRemove = async (start: string) => { await removeSlot(selectedDate, start); await reload(); };
  const handleSetAll = async (open: boolean) => { await setAllOpen(selectedDate, open); await reload(); };
  const handleClear = async () => { await clearDate(selectedDate); await reload(); };

  const handleComplete = async (apt: Appointment) => {
    setSheetBusy(true);
    try {
      const parts = await getAppointmentStudents(apt.id).catch(() => []);
      const attendances = parts.length > 0
        ? parts.map(p => ({ studentId: p.studentId, attended: true }))
        : [{ studentId: apt.studentId, attended: true }];
      const result = await completeAppointmentWithAttendance(apt.id, attendances);
      if (!result.success && result.warnings.length) alert(result.warnings.join("\n"));
      setDetailApt(null);
      await reload();
    } catch (err) {
      alert("Tamamlanamadı: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSheetBusy(false);
    }
  };

  const handleCancelApt = async (apt: Appointment) => {
    if (!confirm(`${apt.studentName} — ${apt.date} ${apt.startTime} randevusunu iptal etmek istediğinize emin misiniz?`)) return;
    setSheetBusy(true);
    try {
      await adminCancelAppointment(apt.id);
      setDetailApt(null);
      await reload();
    } catch (err) {
      alert("İptal edilemedi: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSheetBusy(false);
    }
  };

  const handleSaveNote = async (apt: Appointment) => {
    setSheetBusy(true);
    try {
      await updateAppointment(apt.id, { notes: noteDraft.trim() || undefined });
      setEditingNote(false);
      await reload();
    } catch (err) {
      alert("Not kaydedilemedi: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSheetBusy(false);
    }
  };

  /* ── Türetilmiş veriler — salt-okunur, iş mantığı DEĞİŞMEDİ ─────── */
  const selectedDayAppointments = useMemo(
    () => allAppointments.filter(a => a.date === selectedDate),
    [allAppointments, selectedDate],
  );
  // Görüntüleme-katmanı güvence: aynı date+start_time için birden fazla
  // time_slots satırı varsa (eski/bozuk veri — Supabase'ten hiçbir şey
  // silinmez) istatistikler ve çizelgede aynı saat iki kez sayılmasın.
  const uniqueSlots = useMemo(() => {
    const seen = new Set<string>();
    return slots.filter(s => (seen.has(s.start) ? false : (seen.add(s.start), true)));
  }, [slots]);
  const openSlots = useMemo(() => uniqueSlots.filter(s => s.open), [uniqueSlots]);
  const bookedCount = useMemo(() => selectedDayAppointments.filter(a => a.status !== "iptal").length, [selectedDayAppointments]);
  const emptySlots = useMemo(
    () => openSlots.filter(s => !selectedDayAppointments.find(a => a.startTime === s.start && a.status !== "iptal")),
    [openSlots, selectedDayAppointments],
  );
  const occupancyRate = uniqueSlots.length > 0 ? Math.round((bookedCount / uniqueSlots.length) * 100) : 0;

  const isSelectedToday = selectedDate === todayStr;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

  const detailStudent = detailApt ? students.find(s => s.id === detailApt.studentId) : undefined;
  const detailGym = detailStudent?.gymId ? gyms.find(g => g.id === detailStudent.gymId) : undefined;

  const weekDayItems: CalendarDay[] = weekDays.map(d => ({
    iso: d,
    dayLabel: format(parseISO(d), "EEE", { locale: tr }).toUpperCase(),
    dayNum: format(parseISO(d), "d"),
    hasBadge: (summary[d]?.open ?? 0) > 0,
  }));

  const timelineRows: TimelineRow[] = useMemo(() => uniqueSlots.map(s => {
    const apt = selectedDayAppointments.find(a => a.startTime === s.start && a.status !== "iptal");
    const key = s.id ?? s.start;
    if (apt) {
      const ongoing = isSelectedToday && nowMin >= toMin(apt.startTime) && nowMin < toMin(apt.endTime);
      return {
        key, time: s.start,
        node: (
          <AppointmentCard
            title={apt.studentName}
            subtitle={`${LESSON_TYPE_LABEL[apt.lessonType]} · ${apt.startTime}–${apt.endTime}`}
            badgeLabel={STATUS_LABELS[apt.status]}
            badgeColor={STATUS_COLOR[apt.status]}
            accent={ongoing}
            onClick={() => setDetailApt(apt)}
          />
        ),
      };
    }
    return {
      key, time: s.start,
      node: (
        <EmptySlot
          label={s.open ? "Boş" : "Kapalı"}
          muted={!s.open}
          isOpen={s.open}
          onToggle={() => handleToggle(s.start)}
          onRemove={() => handleRemove(s.start)}
          actionLabel={s.open ? "+ Randevu" : undefined}
          onAction={s.open ? () => { setAptTime(s.start); setAptStudent(""); setAptStudent2(""); setAptType("bireysel"); setSheetMode("addAppt"); } : undefined}
        />
      ),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [uniqueSlots, selectedDayAppointments, isSelectedToday, nowMin, selectedDate]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <CalendarHeader
          title="TAKVİM"
          dateLabel={format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr }).toUpperCase()}
          weekdayLabel={format(parseISO(selectedDate), "EEEE", { locale: tr })}
          isToday={isSelectedToday}
          onPrev={() => { const d = fmt(subDays(parseISO(selectedDate), 1)); setSelectedDate(d); setWeekBase(parseISO(d)); }}
          onNext={() => { const d = fmt(addDays(parseISO(selectedDate), 1)); setSelectedDate(d); setWeekBase(parseISO(d)); }}
          onToday={() => { setSelectedDate(todayStr); setWeekBase(new Date()); }}
        />
      </motion.div>

      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <CalendarStats
          items={[
            { label: "Ders", value: String(bookedCount) },
            { label: "Boş", value: String(emptySlots.length) },
            { label: "Doluluk", value: `%${occupancyRate}` },
          ]}
          secondary={`Bugün ₺${todayRevenue.toLocaleString("tr-TR")}`}
        />
      </motion.div>

      {pendingGifts.length > 0 && (
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Gift size={13} style={{ color: "var(--color-achievement)" }} />
          <span className="text-xs" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
            {pendingGifts.length} bekleyen hediye ders onayı
          </span>
        </motion.div>
      )}

      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <WeekDateSelector
            days={weekDayItems}
            selected={selectedDate}
            todayIso={todayStr}
            onSelect={setSelectedDate}
            onPrevWeek={() => setWeekBase(d => addDays(d, -7))}
            onNextWeek={() => setWeekBase(d => addDays(d, 7))}
          />
        </div>
        <CalendarActionMenu
          disabled={loading}
          onAdd={() => setSheetMode("addChoice")}
          onOpenAll={() => handleSetAll(true)}
          onCloseAll={() => handleSetAll(false)}
          onClearDay={handleClear}
        />
      </motion.div>

      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <CalendarTimeline rows={timelineRows} emptyText="Bu güne ait tanımlı saat yok — sağ üstten + Ekle ile saat aralığı tanımlayın" />
      </motion.div>

      {/* ── + Ekle seçim sayfası ─────────────────────────────────── */}
      <AppointmentBottomSheet open={sheetMode === "addChoice"} onClose={() => setSheetMode(null)} title="EKLE">
        <div className="flex flex-col gap-2">
          <button onClick={() => setSheetMode("addRange")}
            className="w-full text-left px-4 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
            style={{ minHeight: 52, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "var(--font-label)" }}>
            + Saat Aralığı
            <div className="text-[11px] font-normal text-white/35 mt-0.5">Belirli bir zaman dilimine yeni randevu saatleri ekle</div>
          </button>
          <button onClick={() => { setAptTime(""); setAptStudent(""); setAptStudent2(""); setAptType("bireysel"); setSheetMode("addAppt"); }}
            className="w-full text-left px-4 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
            style={{ minHeight: 52, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontFamily: "var(--font-label)" }}>
            + Randevu
            <div className="text-[11px] font-normal text-white/35 mt-0.5">Boş bir saate doğrudan randevu oluştur</div>
          </button>
        </div>
      </AppointmentBottomSheet>

      {/* ── Saat aralığı ekle ────────────────────────────────────── */}
      <AppointmentBottomSheet open={sheetMode === "addRange"} onClose={() => setSheetMode(null)} title="SAAT ARALIĞI EKLE" subtitle={selectedDate}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Başlangıç</label>
              <select value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Bitiş</label>
              <select value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-carbon">{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/35 tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Ders Süresi</label>
            <select value={intervalMin} onChange={e => setIntervalMin(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
              <option value="30" className="bg-carbon">30 dakika</option>
              <option value="45" className="bg-carbon">45 dakika</option>
              <option value="60" className="bg-carbon">60 dakika (1 saat)</option>
              <option value="90" className="bg-carbon">90 dakika</option>
              <option value="120" className="bg-carbon">120 dakika (2 saat)</option>
            </select>
          </div>
          <p className="text-xs text-white/25 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>
            Örn: 09:00 → 22:00, 60 dk = 13 saat eklenir. Mevcut saatler tekrar eklenmez.
          </p>
          <button onClick={handleAddRange} disabled={loading}
            className="gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white text-xs font-semibold tracking-widest uppercase rounded-xl transition-transform hover:scale-[1.01] active:scale-95"
            style={{ minHeight: 48, fontFamily: "var(--font-label)" }}>
            {loading ? "Ekleniyor..." : "Saatleri Ekle"}
          </button>
        </div>
      </AppointmentBottomSheet>

      {/* ── Randevu oluştur ──────────────────────────────────────── */}
      <AppointmentBottomSheet open={sheetMode === "addAppt"} onClose={() => setSheetMode(null)} title="RANDEVU OLUŞTUR" subtitle={selectedDate}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Ders Tipi</label>
            <div className="flex gap-2">
              {(["bireysel", "duet", "grup"] as LessonType[]).map(t => (
                <button key={t} onClick={() => { setAptType(t); if (t === "bireysel") setAptStudent2(""); }}
                  className="flex-1 text-xs font-semibold tracking-wider uppercase transition-all rounded-lg"
                  style={{
                    minHeight: 40, fontFamily: "var(--font-label)",
                    ...(aptType === t
                      ? { background: "linear-gradient(135deg,#8B5CF6,#A855F7)", color: "#fff" }
                      : { border: "1px solid rgba(139,92,246,0.2)", color: "rgba(139,92,246,0.6)" }),
                  }}>
                  {t === "bireysel" ? "Bireysel" : t === "duet" ? "Düet" : "Grup"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>
              {aptType === "bireysel" ? "Öğrenci" : "Öğrenci A"}
            </label>
            <select value={aptStudent} onChange={e => setAptStudent(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
              <option value="" className="bg-carbon">Öğrenci seçin...</option>
              {students.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id} className="bg-carbon">{s.fullName} ({s.code}) — {s.remainingLessons} ders kaldı</option>
              ))}
            </select>
          </div>
          {aptType !== "bireysel" && (
            <div>
              <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Öğrenci B</label>
              <select value={aptStudent2} onChange={e => setAptStudent2(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                <option value="" className="bg-carbon">İkinci öğrenci seçin...</option>
                {students.filter(s => s.isActive && s.id !== aptStudent).map(s => (
                  <option key={s.id} value={s.id} className="bg-carbon">{s.fullName} ({s.code}) — {s.remainingLessons} ders kaldı</option>
                ))}
              </select>
              {aptStudent2 && (() => {
                const std = students.find(s => s.id === aptStudent2);
                return std && std.remainingLessons === 0 ? (
                  <p className="text-xs mt-1" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>⚠️ {std.fullName} adlı öğrencinin kalan dersi yok!</p>
                ) : null;
              })()}
            </div>
          )}
          <div>
            <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Saat (Boş slotlardan)</label>
            <select value={aptTime} onChange={e => setAptTime(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
              <option value="" className="bg-carbon">Saat seçin...</option>
              {uniqueSlots.filter(s => s.open && !selectedDayAppointments.find(a => a.startTime === s.start && a.status !== "iptal")).map((s, i) => (
                <option key={s.id ?? `${s.start}-${i}`} value={s.start} className="bg-carbon">{s.start} – {s.end}</option>
              ))}
            </select>
          </div>
          <button onClick={handleCreateApt} disabled={!aptStudent || !aptTime || aptSaving}
            className="gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange w-full rounded-xl text-white text-xs font-semibold tracking-widest uppercase transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40"
            style={{ minHeight: 48, fontFamily: "var(--font-label)" }}>
            {aptSaving ? "Oluşturuluyor..." : `${aptType === "duet" ? "Düet " : ""}Randevu Oluştur`}
          </button>
        </div>
      </AppointmentBottomSheet>

      {/* ── Ders detayı ──────────────────────────────────────────── */}
      <AppointmentBottomSheet
        open={!!detailApt}
        onClose={() => { setDetailApt(null); setEditingNote(false); }}
        title={detailApt?.studentName ?? ""}
        subtitle={detailApt ? `${detailApt.startTime} – ${detailApt.endTime}` : undefined}>
        {detailApt && (
          <div className="space-y-4">
            <span className="inline-flex items-center text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase"
              style={{ background: `${STATUS_COLOR[detailApt.status]}18`, color: STATUS_COLOR[detailApt.status], fontFamily: "var(--font-label)" }}>
              {STATUS_LABELS[detailApt.status]}
            </span>

            <div className="space-y-2.5 text-sm" style={{ fontFamily: "var(--font-label)" }}>
              <div className="flex items-center justify-between">
                <span className="text-white/35 flex items-center gap-1.5"><PackageIcon size={13} />Paket</span>
                <span className="text-white/80">
                  {detailStudent
                    ? (detailStudent.subscriptionType === "monthly" ? "Aylık Üyelik" : PACKAGES.find(p => p.type === detailStudent.packageType)?.name ?? "—")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/35">Kalan Ders</span>
                <span className="text-white/80">
                  {detailStudent ? (detailStudent.subscriptionType === "monthly" ? "Sınırsız" : `${detailStudent.remainingLessons} / ${detailStudent.totalLessons}`) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/35 flex items-center gap-1.5"><Clock size={13} />Ders Süresi</span>
                <span className="text-white/80">{LESSON_DURATION_MINUTES} dk</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/35 flex items-center gap-1.5"><MapPin size={13} />Salon</span>
                <span className="text-white/80">{detailGym?.name ?? TRAINER_LOCATION}</span>
              </div>
              <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-white/35 flex items-center gap-1.5"><UserIcon size={13} />Eğitmen</span>
                <span className="text-white/80">{TRAINER_NAME}</span>
              </div>
            </div>

            {editingNote ? (
              <div className="space-y-2">
                <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={3} placeholder="Not ekleyin..."
                  className="w-full bg-white/[0.03] border border-white/10 text-white px-3 py-2.5 text-base sm:text-sm outline-none rounded-lg resize-none" style={{ fontFamily: "var(--font-label)" }} />
                <div className="flex gap-2">
                  <button onClick={() => setEditingNote(false)}
                    className="flex-1 text-xs font-semibold uppercase rounded-lg border border-white/10 text-white/40"
                    style={{ minHeight: 40, fontFamily: "var(--font-label)" }}>Vazgeç</button>
                  <button onClick={() => handleSaveNote(detailApt)} disabled={sheetBusy}
                    className="flex-1 text-xs font-semibold uppercase rounded-lg text-white disabled:opacity-40"
                    style={{ minHeight: 40, background: "var(--color-achievement)", color: "#1a1005", fontFamily: "var(--font-label)" }}>Kaydet</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {detailApt.status === "onaylandi" && (
                  <>
                    <button onClick={() => handleComplete(detailApt)} disabled={sheetBusy}
                      className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-semibold uppercase transition-colors disabled:opacity-40"
                      style={{ minHeight: 44, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                      <Check size={13} />{sheetBusy ? "İşleniyor..." : "Tamamlandı"}
                    </button>
                    <button onClick={() => handleCancelApt(detailApt)} disabled={sheetBusy}
                      className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-semibold uppercase transition-colors disabled:opacity-40"
                      style={{ minHeight: 44, background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                      İptal Et
                    </button>
                  </>
                )}
                <button onClick={() => { setNoteDraft(detailApt.notes ?? ""); setEditingNote(true); }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg text-xs font-semibold uppercase transition-colors"
                  style={{ minHeight: 44, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-label)" }}>
                  Düzenle (Not)
                </button>
              </div>
            )}
          </div>
        )}
      </AppointmentBottomSheet>
    </div>
  );
}
