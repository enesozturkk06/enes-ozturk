"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startOfWeek, addDays, format } from "date-fns";
import { getGyms, getStudents, getAppointments, createGym, updateGym, deleteGym } from "@/lib/db";
import type { Gym, GymShareType, Student, Appointment } from "@/lib/types";
import { Building2, Trash2, Plus, X, Check, Search, Users, CalendarCheck2, Gauge } from "lucide-react";
import { useToast } from "@/app/components/shared/Toast";
import SalonStatCard from "@/app/components/salonlar/SalonStatCard";
import GymCard from "@/app/components/salonlar/GymCard";
import GymSkeleton from "@/app/components/salonlar/GymSkeleton";

const EMPTY = {
  name: "", shareType: "no_share" as GymShareType,
  fixedLessonFee: "", gymPercentage: "", notes: "",
};

const SHARE_TYPE_OPTIONS: { value: GymShareType; label: string; desc: string }[] = [
  { value: "fixed_per_lesson", label: "Ders Başı Sabit Ücret", desc: "Her tamamlanan ders için sabit tutar salona ödenir (ödeme anında değil, ders tamamlanınca tahakkuk eder)" },
  { value: "percentage",       label: "Yüzdelik Paylaşım",      desc: "Ödeme alınır alınmaz salon yüzdesi anında hesaplanır (50/50, 60/40 vb.)" },
  { value: "no_share",         label: "Salon Payı Yok",         desc: "Tamamen kendi öğrencin — hiçbir pay düşülmez" },
];

const FILTERS: [string, string][] = [["all", "Tümü"], ["active", "Aktif"], ["inactive", "Pasif"]];

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
/* gradient-border-quiet taşıyan elemanlar için: opacity'yi CSS yönetir (0.22),
   Framer Motion sadece y/scale/filter animasyonu yapar — aksi halde motion'ın
   opacity:1'i CSS'in opacity:0.22'sini kalıcı olarak eziyordu. */
const fadeUpNoOpacity = {
  initial: { y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

function Field({
  label, value, onChange, type = "text", placeholder, required, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>
        {label}{required && <span className="ml-0.5" style={{ color: "var(--color-error)" }}>*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg"
          style={{ fontFamily: "var(--font-label)" }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function shareTypeBadge(gym: Gym) {
  if (gym.shareType === "fixed_per_lesson") return { label: `Ders başı ₺${gym.fixedLessonFee ?? 0}`, color: "#C4B5FD", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" };
  if (gym.shareType === "percentage")       return { label: `Salon %${gym.gymPercentage ?? 0}`, color: "#F0ABFC", bg: "rgba(217,70,239,0.12)", border: "rgba(217,70,239,0.3)" };
  return { label: "Salon payı yok", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
}

export default function SalonlarPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState(EMPTY.name);
  const [shareType, setShareType] = useState<GymShareType>(EMPTY.shareType);
  const [fixedLessonFee, setFixedLessonFee] = useState(EMPTY.fixedLessonFee);
  const [gymPercentage, setGymPercentage] = useState(EMPTY.gymPercentage);
  const [notes, setNotes] = useState(EMPTY.notes);

  const reload = () => Promise.all([getGyms(), getStudents(), getAppointments()]).then(([g, s, a]) => {
    setGyms(g); setStudents(s); setAppointments(a); setLoading(false);
  });
  useEffect(() => { reload(); }, []);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  const resetForm = () => {
    setName(EMPTY.name); setShareType(EMPTY.shareType);
    setFixedLessonFee(EMPTY.fixedLessonFee); setGymPercentage(EMPTY.gymPercentage); setNotes(EMPTY.notes);
  };

  const openAdd = () => { resetForm(); setPanel("add"); };

  const openEdit = (gym: Gym) => {
    setName(gym.name); setShareType(gym.shareType);
    setFixedLessonFee(gym.fixedLessonFee != null ? String(gym.fixedLessonFee) : "");
    setGymPercentage(gym.gymPercentage != null ? String(gym.gymPercentage) : "");
    setNotes(gym.notes ?? "");
    setEditId(gym.id); setPanel("edit");
  };

  const buildPayload = () => ({
    name: name.trim(),
    shareType,
    fixedLessonFee: shareType === "fixed_per_lesson" ? Number(fixedLessonFee) || 0 : undefined,
    gymPercentage:  shareType === "percentage" ? Number(gymPercentage) || 0 : undefined,
    trainerPercentage: shareType === "percentage" ? 100 - (Number(gymPercentage) || 0) : undefined,
    notes: notes.trim() || undefined,
    isActive: true,
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await createGym(buildPayload());
      await reload();
      setPanel("none");
      flash();
    } catch (err) {
      toast("Salon eklenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await updateGym(editId, buildPayload());
      await reload();
      setPanel("none");
      setEditId(null);
      flash();
    } catch (err) {
      toast("Güncellenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGym(deleteId);
      await reload();
      setDeleteId(null);
      flash();
    } catch (err) {
      toast("Pasifleştirilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const toggleActive = async (gym: Gym) => {
    try {
      await updateGym(gym.id, { isActive: !gym.isActive });
      await reload();
      flash();
    } catch (err) {
      toast("Güncellenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const panelOpen = panel !== "none";
  const canSubmit = name.trim() !== "" &&
    (shareType !== "fixed_per_lesson" || Number(fixedLessonFee) > 0) &&
    (shareType !== "percentage" || (Number(gymPercentage) > 0 && Number(gymPercentage) <= 100));

  /* ── Haftalık ders sayısı / aktif öğrenci — gerçek verilerden türetilir ── */
  const gymStats = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
    const gymIdByStudentId = new Map(students.map(s => [s.id, s.gymId ?? null]));
    const weeklyAppointments = appointments.filter(a =>
      a.status !== "iptal" && a.date >= weekStart && a.date <= weekEnd
    );

    const map = new Map<string, { activeStudents: number; weeklyLessons: number }>();
    for (const gym of gyms) {
      const activeStudents = students.filter(s => s.gymId === gym.id && s.isActive).length;
      const weeklyLessons = weeklyAppointments.filter(a => gymIdByStudentId.get(a.studentId) === gym.id).length;
      map.set(gym.id, { activeStudents, weeklyLessons });
    }
    return map;
  }, [gyms, students, appointments]);

  const maxWeeklyLessons = useMemo(
    () => Math.max(1, ...Array.from(gymStats.values()).map(s => s.weeklyLessons)),
    [gymStats],
  );

  const kpis = useMemo(() => {
    const activeGyms = gyms.filter(g => g.isActive);
    const totalStudents = students.filter(s => s.gymId && s.isActive).length;
    const totalWeeklyLessons = Array.from(gymStats.values()).reduce((sum, s) => sum + s.weeklyLessons, 0);
    const avgOccupancy = activeGyms.length > 0
      ? Math.round(activeGyms.reduce((sum, g) => {
          const stat = gymStats.get(g.id);
          return sum + (stat ? Math.min(100, (stat.weeklyLessons / maxWeeklyLessons) * 100) : 0);
        }, 0) / activeGyms.length)
      : 0;
    return {
      totalGyms: gyms.length,
      activeGyms: activeGyms.length,
      totalStudents,
      totalWeeklyLessons,
      avgOccupancy,
    };
  }, [gyms, students, gymStats, maxWeeklyLessons]);

  const filtered = useMemo(() => {
    let list = gyms;
    if (filter === "active") list = list.filter(g => g.isActive);
    if (filter === "inactive") list = list.filter(g => !g.isActive);
    if (search.trim()) {
      const q = search.trim().toLocaleLowerCase("tr-TR");
      list = list.filter(g => g.name.toLocaleLowerCase("tr-TR").includes(q) || (g.notes ?? "").toLocaleLowerCase("tr-TR").includes(q));
    }
    return list;
  }, [gyms, filter, search]);

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* Hareketli arka plan ışıkları */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-72 h-72 rounded-full blur-3xl animate-float-slow" style={{ background: "rgba(139,92,246,0.10)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl animate-float-medium" style={{ background: "rgba(236,72,153,0.08)" }} />
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate">
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <motion.div variants={fadeUpNoOpacity} className="relative rounded-3xl overflow-hidden mb-6 gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-8 h-px" style={{ background: "var(--color-violet)" }} />
                  <span className="text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-label)", color: "var(--color-violet-bright)" }}>Admin</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  SALON YÖNETİMİ
                </h1>
                <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
                  Gelir paylaşımlı çalıştığın salonlar — öğrencileri buradan bir salona atarsın
                </p>
              </div>

              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {saved && (
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-label)", color: "var(--color-success)" }}>
                      <Check size={13} /> Kaydedildi
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 gradient-animated gradient-slow gradient-violet-pink-orange text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  <Plus size={14} /> Yeni Salon
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <SalonStatCard label="Toplam Salon" value={kpis.totalGyms} icon={<Building2 size={16} />} color="#A78BFA" />
              <SalonStatCard label="Aktif Salon" value={kpis.activeGyms} icon={<Check size={16} />} color="#4ADE80" />
              <SalonStatCard label="Toplam Öğrenci" value={kpis.totalStudents} icon={<Users size={16} />} color="#60A5FA" />
              <SalonStatCard label="Bu Haftaki Ders" value={kpis.totalWeeklyLessons} icon={<CalendarCheck2 size={16} />} color="#FBBF24" />
              <SalonStatCard label="Ortalama Yoğunluk" value={kpis.avgOccupancy} suffix="%" sub="Salonlar arası göreli" icon={<Gauge size={16} />} color="#F0ABFC" />
            </div>
          </div>
        </motion.div>

        {/* ── ARAMA + FİLTRE ───────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Salon ara..."
              className="glass w-full text-white pl-9 pr-3 py-2.5 text-sm outline-none rounded-xl"
              style={{ fontFamily: "var(--font-label)" }} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 glass rounded-xl p-1">
            {FILTERS.map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value as typeof filter)}
                className="relative px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-label)", color: filter === value ? "#fff" : "rgba(255,255,255,0.4)" }}>
                {filter === value && (
                  <motion.div layoutId="salonlar-filter-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
                )}
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Ekleme/düzenleme paneli ──────────────────────────────── */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ y: -16 }} animate={{ y: 0 }} exit={{ y: -12 }}
              transition={{ duration: 0.25 }} className="mb-6 relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]"
            >
              <div className="glass-strong relative rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                    {panel === "add" ? "YENİ SALON EKLE" : "SALONU DÜZENLE"}
                  </h2>
                  <button onClick={() => { setPanel("none"); setEditId(null); }} className="text-white/25 hover:text-white transition-colors p-1">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4">
                  <Field label="Salon Adı" value={name} onChange={setName} placeholder="örn: Elit Spor, Demirhan..." required />
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-label)" }}>
                    Anlaşma Tipi<span className="ml-0.5" style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {SHARE_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setShareType(opt.value)}
                        className="text-left p-3 rounded-xl transition-all duration-200 glass"
                        style={{
                          borderColor: shareType === opt.value ? "rgba(139,92,246,0.5)" : undefined,
                          boxShadow: shareType === opt.value ? "0 0 20px rgba(139,92,246,0.12)" : "none",
                        }}
                      >
                        <div className="text-sm text-white font-semibold mb-1" style={{ fontFamily: "var(--font-label)" }}>{opt.label}</div>
                        <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-label)" }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {shareType === "fixed_per_lesson" && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Ders Başı Ücret" value={fixedLessonFee} onChange={setFixedLessonFee} type="number" placeholder="300" suffix="₺" required />
                  </div>
                )}
                {shareType === "percentage" && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Salon Yüzdesi" value={gymPercentage} onChange={setGymPercentage} type="number" placeholder="40" suffix="%" required />
                    <div>
                      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>
                        Senin Yüzden
                      </label>
                      <div className="glass px-3 py-2.5 text-sm rounded-lg" style={{ fontFamily: "var(--font-label)", color: "var(--color-success)" }}>
                        %{Math.max(0, 100 - (Number(gymPercentage) || 0))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <Field label="Not (isteğe bağlı)" value={notes} onChange={setNotes} placeholder="Anlaşma detayları..." />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setPanel("none"); setEditId(null); }}
                    className="flex-1 glass text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-xl transition-all duration-200"
                    style={{ fontFamily: "var(--font-label)" }}>
                    Vazgeç
                  </button>
                  <button onClick={panel === "add" ? handleAdd : handleEdit} disabled={!canSubmit}
                    className="flex-1 gradient-animated gradient-slow gradient-violet-pink-orange disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-xl transition-all duration-200"
                    style={{ fontFamily: "var(--font-label)" }}>
                    {panel === "add" ? "Salonu Ekle" : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Salon listesi ────────────────────────────────────────── */}
        {loading ? (
          <GymSkeleton />
        ) : filtered.length === 0 ? (
          <motion.div variants={fadeUp} className="glass text-center py-20 rounded-2xl">
            <Building2 size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm mb-2" style={{ fontFamily: "var(--font-label)" }}>
              {gyms.length === 0 ? "Henüz salon yok" : "Aramaya uyan salon yok"}
            </p>
            {gyms.length === 0 && (
              <button onClick={openAdd} className="text-xs tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-label)", color: "var(--color-violet-bright)" }}>
                + İlk salonu ekle
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((gym, i) => {
                const stat = gymStats.get(gym.id) ?? { activeStudents: 0, weeklyLessons: 0 };
                return (
                  <GymCard
                    key={gym.id}
                    gym={gym}
                    badge={shareTypeBadge(gym)}
                    activeStudents={stat.activeStudents}
                    weeklyLessons={stat.weeklyLessons}
                    maxWeeklyLessons={maxWeeklyLessons}
                    isEditing={editId === gym.id && panel === "edit"}
                    index={i}
                    onToggleActive={toggleActive}
                    onEdit={openEdit}
                    onDeleteRequest={setDeleteId}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ── Pasifleştirme onayı ──────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                  <Trash2 size={18} style={{ color: "var(--color-error)" }} />
                </div>
                <div>
                  <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>SALONU PASİFLEŞTİR</h3>
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>{gyms.find(g => g.id === deleteId)?.name}</p>
                </div>
              </div>
              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-label)" }}>
                Salon listede pasif görünecek, yeni öğrenci atanamaz. Geçmiş gelir hareketleri ve raporlar bozulmaz.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 glass text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-xl transition-all" style={{ fontFamily: "var(--font-label)" }}>
                  Vazgeç
                </button>
                <button onClick={handleDelete} className="flex-1 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-xl transition-all"
                  style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                  Evet, Pasifleştir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
