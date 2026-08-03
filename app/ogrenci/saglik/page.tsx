"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { useToast } from "@/app/components/shared/Toast";
import {
  getHealthProfile, saveHealthProfile,
  getWeightLogs, logWeight,
  getCalorieLogs, logCalories,
  getWaterLog, setWaterGlasses as saveWaterGlasses,
  calcBMI, bmiCategory, calcTDEE, todayDate,
  type HealthProfile, type WeightEntry, type CalorieEntry,
} from "@/lib/health";
import {
  generateDietPlan, getDietPlan, saveDietPlan,
  type DietInput, type DietPlan, type GoalType, type ActivityLevel,
} from "@/lib/diet";
import { PageHeader } from "@/app/components/ui";
import {
  Scale, Droplets, Flame, Activity, TrendingUp, Plus, Save,
  Utensils, RefreshCw, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

/* ─── Sabitler ─────────────────────────────────────────────────── */

const activityOptions: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary",   label: "Hareketsiz (masa başı iş)" },
  { value: "light",       label: "Hafif aktif (haftada 1-2 gün)" },
  { value: "moderate",    label: "Orta aktif (haftada 3-5 gün)" },
  { value: "active",      label: "Aktif (haftada 6-7 gün)" },
  { value: "very-active", label: "Çok aktif (günlük yoğun)" },
];

const goalOptions: { value: GoalType; label: string; icon: string }[] = [
  { value: "kilo-verme",   label: "Kilo Verme",          icon: "⬇️" },
  { value: "kilo-alma",    label: "Kilo Alma",            icon: "⬆️" },
  { value: "kas-kazanma",  label: "Kas Kazanma",          icon: "💪" },
  { value: "yag-yakma",    label: "Yağ Yakma",            icon: "🔥" },
  { value: "kondisyon",    label: "Kondisyon Artırma",    icon: "🏃" },
];

const V = "#8B5CF6";
const inputCls = "glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg";
const labelCls = "block text-xs text-white/35 tracking-widest uppercase mb-1.5";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

function GradientBar({ pct, colorFrom, colorTo }: { pct: number; colorFrom: string; colorTo: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})` }}
      />
    </div>
  );
}

type Tab = "saglik" | "ai-diyet";

/* ─── Ana sayfa ────────────────────────────────────────────────── */

export default function SaglikPage() {
  const { student } = useAuth();
  const { toast }   = useToast();
  const today       = todayDate();
  const searchParams = useSearchParams();

  // Dashboard'daki "AI Diyet" hızlı işlemi ?tab=ai-diyet ile doğrudan bu sekmeye
  // yönlendirir — sayfanın kendi state/mantığı değişmedi, sadece başlangıç sekmesi.
  const [activeTab, setActiveTab]       = useState<Tab>(searchParams.get("tab") === "ai-diyet" ? "ai-diyet" : "saglik");

  /* Sağlık verileri */
  const [profile, setProfile]           = useState<HealthProfile | null>(null);
  const [weightLogs, setWeightLogs]     = useState<WeightEntry[]>([]);
  const [calorieLogs, setCalorieLogs]   = useState<CalorieEntry[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [profileTab, setProfileTab]     = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [pf, setPf] = useState<HealthProfile>({ height: 175, weight: 70, age: 25, gender: "male", activityLevel: "moderate" });
  const [todayWeight, setTodayWeight]   = useState("");
  const [calIn, setCalIn]               = useState("");
  const [calBurned, setCalBurned]       = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingCal, setSavingCal]       = useState(false);
  const [savingWater, setSavingWater]   = useState(false);

  /* AI Diyet */
  const [dietPlan, setDietPlan]         = useState<DietPlan | null>(null);
  const [dietLoading, setDietLoading]   = useState(false);
  const [dietSaving, setDietSaving]     = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [dInput, setDInput]             = useState<DietInput>({
    age: 25, gender: "male", heightCm: 175, weightKg: 70, targetWeightKg: 65,
    goalType: "kilo-verme", activityLevel: "moderate",
    likedFoods: "", dislikedFoods: "", allergies: "", mealsPerDay: 3,
  });

  /* ── Yükle ──────────────────────────────────────────────────── */
  const reload = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [prof, wLogs, cLogs, wLog] = await Promise.all([
        getHealthProfile(student.id),
        getWeightLogs(student.id, 30),
        getCalorieLogs(student.id, 7),
        getWaterLog(student.id, today),
      ]);
      setProfile(prof);
      setWeightLogs(wLogs);
      setCalorieLogs(cLogs);
      setWaterGlasses(wLog?.glasses ?? 0);
      if (prof) {
        setPf(prof);
        // Sağlık profilinden diyet formunu önceden doldur
        setDInput(d => ({ ...d, age: prof.age, gender: prof.gender, heightCm: prof.height, weightKg: prof.weight, activityLevel: prof.activityLevel }));
      }
    } catch (err: unknown) {
      toast("Veriler yüklenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setLoading(false);
    }
  }, [student, today]); // eslint-disable-line

  const loadDiet = useCallback(async () => {
    if (!student) return;
    setDietLoading(true);
    const plan = await getDietPlan(student.id);
    setDietPlan(plan);
    if (plan) {
      setDInput(plan.input);
    }
    setDietLoading(false);
  }, [student]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (activeTab === "ai-diyet") loadDiet(); }, [activeTab, loadDiet]);

  /* ── Sağlık handlers ──────────────────────────────────────── */
  const saveProfile = async () => {
    if (!student) return;
    setProfileSaving(true);
    try {
      await saveHealthProfile(student.id, pf);
      setProfile(pf);
      setProfileTab(false);
      setDInput(d => ({ ...d, age: pf.age, gender: pf.gender, heightCm: pf.height, weightKg: pf.weight, activityLevel: pf.activityLevel }));
      toast("Profil kaydedildi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Profil kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setProfileSaving(false); }
  };

  const saveWeight = async () => {
    if (!student || !todayWeight) return;
    setSavingWeight(true);
    try {
      await logWeight(student.id, today, Number(todayWeight));
      setTodayWeight("");
      toast("Kilo kaydedildi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Kilo kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setSavingWeight(false); }
  };

  const saveCalories = async () => {
    if (!student || !calIn) return;
    setSavingCal(true);
    try {
      await logCalories(student.id, today, Number(calIn), Number(calBurned) || 0, tdee ?? 2000);
      setCalIn(""); setCalBurned("");
      toast("Kalori kaydedildi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Kalori kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setSavingCal(false); }
  };

  const changeWater = async (delta: number) => {
    if (!student) return;
    const newVal = Math.max(0, Math.min(20, waterGlasses + delta));
    setSavingWater(true);
    try {
      await saveWaterGlasses(student.id, today, newVal);
      setWaterGlasses(newVal);
    } catch (err: unknown) {
      toast("Su kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setSavingWater(false); }
  };

  /* ── AI Diyet handler ─────────────────────────────────────── */
  const generateAndSave = async () => {
    if (!student) return;
    setDietSaving(true);
    try {
      const plan = generateDietPlan(dInput);
      const saved = await saveDietPlan(student.id, plan);
      setDietPlan(saved);
      setExpandedMeal(0);
      toast("Diyet planı oluşturuldu ve kaydedildi ✓", "success");
    } catch (err: unknown) {
      toast("Plan oluşturulamadı: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setDietSaving(false); }
  };

  /* ── Hesaplamalar ─────────────────────────────────────────── */
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const bmi        = profile ? calcBMI(profile.weight, profile.height) : null;
  const bmiCat     = bmi ? bmiCategory(bmi) : null;
  const tdee       = profile ? calcTDEE(profile) : null;
  const todayCal   = calorieLogs.find(c => c.date === today);

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-5xl mx-auto space-y-5 w-full pb-28">
      <PageHeader
        title="Sağlık & Diyet"
        subtitle="BMI, kalori, su takibi ve kişisel AI diyet planı"
        accent="Öğrenci Paneli"
      />

      {/* Sekme geçişi */}
      <motion.div variants={fadeUp} className="flex items-center gap-1.5 glass rounded-xl p-1 w-fit">
        {([
          { key: "saglik"  as Tab, label: "Sağlık Takibi", icon: <Scale size={14}/> },
          { key: "ai-diyet" as Tab, label: "AI Diyet",     icon: <Utensils size={14}/> },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="relative flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors"
            style={{
              fontFamily: "var(--font-label)",
              color: activeTab === t.key ? "#fff" : "rgba(255,255,255,0.4)",
            }}>
            {activeTab === t.key && (
              <motion.div layoutId="saglik-tab-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
            )}
            {t.icon} {t.label}
            {t.key === "ai-diyet" && !dietPlan && (
              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(139,92,246,0.25)", color:"#fff" }}>YENİ</span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ══ SAĞLIK TAKİBİ ══════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === "saglik" && (
          <motion.div key="saglik" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-5">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 rounded-full animate-spin mx-auto" style={{ border: "2px solid #8B5CF6", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <>
                {/* Profil butonu */}
                <div className="flex justify-end">
                  <button onClick={() => setProfileTab(v => !v)}
                    className="glass flex items-center gap-2 text-xs text-white/40 hover:text-white tracking-widest uppercase px-3 py-2 rounded-lg transition-all"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <Activity size={14}/> Profil {profileTab ? "Kapat" : "Düzenle"}
                  </button>
                </div>

                {/* Profil formu */}
                {profileTab && (
                  <motion.div initial={{ opacity:0, y:-8, scale: 0.98 }} animate={{ opacity:1, y:0, scale: 1 }}
                    className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
                    <div className="glass-strong relative rounded-2xl p-6">
                      <h3 className="text-lg text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>Sağlık Profiliniz</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {[
                          { label:"Boy (cm)", key:"height" as const, type:"number" },
                          { label:"Kilo (kg)", key:"weight" as const, type:"number" },
                          { label:"Yaş",       key:"age"    as const, type:"number" },
                        ].map(f => (
                          <div key={f.key}>
                            <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>{f.label}</label>
                            <input type={f.type} value={pf[f.key]}
                              onChange={e => setPf(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                              className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                          </div>
                        ))}
                        <div>
                          <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Cinsiyet</label>
                          <select value={pf.gender} onChange={e => setPf(p => ({ ...p, gender: e.target.value as "male"|"female" }))}
                            className={`${inputCls} appearance-none`} style={{ fontFamily:"var(--font-label)" }}>
                            <option value="male" className="bg-carbon">Erkek</option>
                            <option value="female" className="bg-carbon">Kadın</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Aktivite Seviyesi</label>
                          <select value={pf.activityLevel} onChange={e => setPf(p => ({ ...p, activityLevel: e.target.value as HealthProfile["activityLevel"] }))}
                            className={`${inputCls} appearance-none`} style={{ fontFamily:"var(--font-label)" }}>
                            {activityOptions.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={saveProfile} disabled={profileSaving}
                        className="gradient-animated gradient-slow gradient-violet-pink-orange disabled:opacity-50 flex items-center gap-2 text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 rounded-lg transition-transform hover:scale-105 active:scale-95"
                        style={{ fontFamily:"var(--font-label)" }}>
                        <Save size={14}/>{profileSaving ? "Kaydediliyor..." : "Profili Kaydet"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Özet kartlar */}
                <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label:"BMI",          val: bmi, isNum: !!bmi, sub: bmiCat?.label ?? "Profil girin", color: bmiCat?.color ?? "#fff", icon: <Scale size={16}/> },
                    { label:"Günlük Kalori",val: tdee, isNum: !!tdee, suffix: " kcal", sub:"kcal / gün (TDEE)", color:"var(--color-achievement)", icon:<Flame size={16}/> },
                    { label:"Bugün Su",     val: waterGlasses, isNum: true, suffix: "/8", sub:"bardak (250ml)", color:"#60A5FA", icon:<Droplets size={16}/> },
                    { label:"Son Kilo",     val: lastWeight?.weight ?? null, isNum: !!lastWeight, suffix: " kg", sub: lastWeight ? format(parseISO(lastWeight.date),"dd MMM",{locale:tr}) : "Kayıt yok", color:"var(--color-success)", icon:<TrendingUp size={16}/> },
                  ].map(s => (
                    <div key={s.label} className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet">
                      <div className="glass relative rounded-2xl p-5 h-full">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily:"var(--font-label)" }}>{s.label}</span>
                          <span style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="text-2xl" style={{ fontFamily:"var(--font-display)", color: s.color }}>
                          {s.isNum ? <CountUp value={s.val as number} decimals={s.label === "BMI" ? 1 : 0} suffix={s.suffix ?? ""} /> : "—"}
                        </div>
                        <div className="text-xs text-white/25 mt-0.5" style={{ fontFamily:"var(--font-label)" }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-5">
                  {/* Su */}
                  <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-base text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>Su Tüketimi</h3>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <button onClick={() => changeWater(-1)} disabled={savingWater || waterGlasses===0}
                        className="glass w-8 h-8 rounded-full hover:text-white text-white/40 text-xl flex items-center justify-center transition-all disabled:opacity-30">−</button>
                      <div className="text-center">
                        <div className="text-5xl" style={{ fontFamily:"var(--font-display)", color: "#60A5FA" }}>{waterGlasses}</div>
                        <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>/ 8 bardak</div>
                      </div>
                      <button onClick={() => changeWater(1)} disabled={savingWater}
                        className="w-8 h-8 rounded-full text-xl flex items-center justify-center transition-all disabled:opacity-30"
                        style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", color: "#60A5FA" }}>+</button>
                    </div>
                    <GradientBar pct={(waterGlasses / 8) * 100} colorFrom="#3B82F6" colorTo="#60A5FA" />
                    <div className="mt-3 grid grid-cols-8 gap-1">
                      {Array.from({length:8},(_,i) => (
                        <div key={i} className="h-5 rounded-sm transition-all" style={{ background: i < waterGlasses ? "#60A5FA" : "rgba(255,255,255,0.08)" }} />
                      ))}
                    </div>
                  </div>

                  {/* Kalori */}
                  <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-base text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>Kalori Takibi</h3>
                    {todayCal && (
                      <div className="space-y-2 mb-4">
                        {[
                          { l:"Alınan",       v:todayCal.consumed+" kcal",                         c:"var(--color-achievement)" },
                          { l:"Yakılan",      v:todayCal.burned+" kcal",                            c:"var(--color-success)"  },
                          { l:"Net / Hedef",  v:`${todayCal.consumed-todayCal.burned} / ${todayCal.target}`, c:"#fff" },
                        ].map(r => (
                          <div key={r.l} className="flex justify-between text-xs">
                            <span className="text-white/40" style={{ fontFamily:"var(--font-label)" }}>{r.l}</span>
                            <span className="font-semibold" style={{ color: r.c, fontFamily:"var(--font-label)" }}>{r.v}</span>
                          </div>
                        ))}
                        <GradientBar pct={(Math.min(todayCal.consumed-todayCal.burned,todayCal.target) / todayCal.target) * 100} colorFrom="#D97706" colorTo="var(--color-achievement)" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <input type="number" value={calIn}     onChange={e=>setCalIn(e.target.value)}     placeholder="Alınan kalori (kcal)"    className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                      <input type="number" value={calBurned} onChange={e=>setCalBurned(e.target.value)} placeholder="Antrenman yakımı (kcal)" className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                      <button onClick={saveCalories} disabled={savingCal||!calIn}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold tracking-widest uppercase py-2 rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                        style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"var(--color-achievement)", fontFamily:"var(--font-label)" }}>
                        <Plus size={13}/>{savingCal?"Kaydediliyor...":"Kaydet"}
                      </button>
                    </div>
                  </div>

                  {/* Kilo */}
                  <div className="glass-strong rounded-2xl p-5">
                    <h3 className="text-base text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>Kilo Kaydı</h3>
                    <div className="space-y-2 mb-4">
                      <input type="number" step="0.1" value={todayWeight} onChange={e=>setTodayWeight(e.target.value)} placeholder="Bugünkü kilonuz (kg)" className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                      <button onClick={saveWeight} disabled={savingWeight||!todayWeight}
                        className="w-full flex items-center justify-center gap-2 text-xs font-semibold tracking-widest uppercase py-2 rounded-lg transition-all disabled:opacity-40 hover:scale-[1.02]"
                        style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", color:"var(--color-success)", fontFamily:"var(--font-label)" }}>
                        <Plus size={13}/>{savingWeight?"Kaydediliyor...":"Kaydet"}
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {weightLogs.slice(-5).reverse().map(e => (
                        <div key={e.date} className="flex justify-between py-1 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          <span className="text-xs text-white/35" style={{ fontFamily:"var(--font-label)" }}>{format(parseISO(e.date),"dd MMM",{locale:tr})}</span>
                          <span className="text-xs font-semibold" style={{ color: "var(--color-success)", fontFamily:"var(--font-label)" }}>{e.weight} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Kilo grafiği */}
                {weightLogs.length >= 2 && (
                  <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-6">
                    <h3 className="text-lg text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>Kilo Değişim Grafiği (30 Gün)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weightLogs.map(e=>({ tarih:format(parseISO(e.date),"dd MMM",{locale:tr}), kilo:e.weight }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="tarih" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} />
                        <YAxis domain={["auto","auto"]} tick={{ fill:"rgba(255,255,255,0.25)",fontSize:10 }} />
                        <Tooltip contentStyle={{ background:"rgba(20,14,35,0.95)", backdropFilter: "blur(8px)", border:"1px solid rgba(139,92,246,0.35)", borderRadius:10 }} labelStyle={{ color:"#fff" }} />
                        <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={2} dot={{ fill:"#22c55e",r:3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* BMI tablosu */}
                {bmi && (
                  <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-5">
                    <h3 className="text-base text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-display)" }}>BMI Referans</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { range:"< 18.5", label:"Zayıf",        color:"#60A5FA" },
                        { range:"18.5–24.9",label:"Normal",      color:"var(--color-success)" },
                        { range:"25–29.9", label:"Fazla Kilolu", color:"var(--color-achievement)" },
                        { range:"≥ 30",    label:"Obez",         color:"var(--color-error)" },
                      ].map(r => (
                        <div key={r.label} className="glass rounded-xl p-3 text-center"
                          style={{ boxShadow: bmiCat?.label===r.label ? `0 0 0 1px ${r.color}` : "none" }}>
                          <div className="text-sm font-semibold" style={{ color: r.color, fontFamily:"var(--font-label)" }}>{r.label}</div>
                          <div className="text-xs text-white/25" style={{ fontFamily:"var(--font-label)" }}>{r.range}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/30 mt-3 text-center" style={{ fontFamily:"var(--font-label)" }}>
                      Mevcut BMI: <strong style={{ color: bmiCat?.color }}>{bmi}</strong> — {bmiCat?.label}
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ══ AI DİYET ══════════════════════════════════════════ */}
        {activeTab === "ai-diyet" && (
          <motion.div key="diyet" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-5">

            {/* Form */}
            <div className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
              <div className="glass-strong relative rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} style={{ color:V }} />
                    <span className="text-base text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                      KİŞİSEL DİYET FORMU
                    </span>
                  </div>
                  {dietPlan && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:"rgba(34,197,94,0.15)", color:"var(--color-success)", fontFamily:"var(--font-label)" }}>
                      Plan mevcut
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Kişisel bilgiler */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Yaş</label>
                      <input type="number" value={dInput.age} onChange={e=>setDInput(d=>({...d,age:Number(e.target.value)}))} className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Cinsiyet</label>
                      <select value={dInput.gender} onChange={e=>setDInput(d=>({...d,gender:e.target.value as "male"|"female"}))}
                        className={`${inputCls} appearance-none`} style={{ fontFamily:"var(--font-label)" }}>
                        <option value="male" className="bg-carbon">Erkek</option>
                        <option value="female" className="bg-carbon">Kadın</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Boy (cm)</label>
                      <input type="number" value={dInput.heightCm} onChange={e=>setDInput(d=>({...d,heightCm:Number(e.target.value)}))} className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Kilo (kg)</label>
                      <input type="number" step="0.1" value={dInput.weightKg} onChange={e=>setDInput(d=>({...d,weightKg:Number(e.target.value)}))} className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Hedef Kilo (kg)</label>
                      <input type="number" step="0.1" value={dInput.targetWeightKg} onChange={e=>setDInput(d=>({...d,targetWeightKg:Number(e.target.value)}))} className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Günlük Öğün</label>
                      <select value={dInput.mealsPerDay} onChange={e=>setDInput(d=>({...d,mealsPerDay:Number(e.target.value)}))}
                        className={`${inputCls} appearance-none`} style={{ fontFamily:"var(--font-label)" }}>
                        {[2,3,4,5].map(n => <option key={n} value={n} className="bg-carbon">{n} öğün</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Aktivite Seviyesi</label>
                      <select value={dInput.activityLevel} onChange={e=>setDInput(d=>({...d,activityLevel:e.target.value as ActivityLevel}))}
                        className={`${inputCls} appearance-none`} style={{ fontFamily:"var(--font-label)" }}>
                        {activityOptions.map(o=><option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Hedef türü */}
                  <div>
                    <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Hedef Türü</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {goalOptions.map(g => {
                        const active = dInput.goalType === g.value;
                        return (
                          <button key={g.value} type="button" onClick={()=>setDInput(d=>({...d,goalType:g.value}))}
                            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${active ? "gradient-animated gradient-slow gradient-violet-pink-orange" : "glass"}`}>
                            <span className="text-lg leading-none">{g.icon}</span>
                            <span className="text-[10px] text-center leading-tight" style={{ color: active?"#fff":"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>{g.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tercihler */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Sevdiği Yiyecekler</label>
                      <input value={dInput.likedFoods} onChange={e=>setDInput(d=>({...d,likedFoods:e.target.value}))}
                        placeholder="tavuk, pirinç, yoğurt..."
                        className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Sevmediği Yiyecekler</label>
                      <input value={dInput.dislikedFoods} onChange={e=>setDInput(d=>({...d,dislikedFoods:e.target.value}))}
                        placeholder="brokoli, mercimek..."
                        className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontFamily:"var(--font-label)" }}>Alerjiler</label>
                      <input value={dInput.allergies} onChange={e=>setDInput(d=>({...d,allergies:e.target.value}))}
                        placeholder="fıstık, glüten, süt..."
                        className={inputCls} style={{ fontFamily:"var(--font-label)" }} />
                    </div>
                  </div>

                  {/* Butonlar */}
                  <div className="flex gap-3 pt-1">
                    <button onClick={generateAndSave} disabled={dietSaving}
                      className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 flex items-center justify-center gap-2 py-3 text-white text-sm font-semibold tracking-widest uppercase rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-40"
                      style={{ fontFamily:"var(--font-label)" }}>
                      {dietSaving ? (
                        <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"/>Oluşturuluyor...</>
                      ) : dietPlan ? (
                        <><RefreshCw size={15}/> Diyeti Yenile</>
                      ) : (
                        <><Sparkles size={15}/> AI Diyet Planı Oluştur</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Diyet Planı Sonucu */}
            {dietLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:`${V}50`, borderTopColor:"transparent" }} />
              </div>
            ) : dietPlan && (
              <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="space-y-4">

                {/* Makro özet */}
                <div className="glass-strong rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={14} style={{ color:V }} />
                    <h3 className="text-base text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                      GÜNLÜK HEDEFLER
                    </h3>
                    {dietPlan.updatedAt && (
                      <span className="ml-auto text-[10px] text-white/25" style={{ fontFamily:"var(--font-label)" }}>
                        {format(parseISO(dietPlan.updatedAt),"dd MMM yyyy",{locale:tr})}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:"Günlük Kalori", val:`${dietPlan.dailyCalories.toLocaleString("tr-TR")} kcal`, color:"#D946EF" },
                      { label:"Protein",       val:`${dietPlan.proteinG} g`,  color:"#22c55e" },
                      { label:"Karbonhidrat",  val:`${dietPlan.carbsG} g`,    color:"#f59e0b" },
                      { label:"Yağ",           val:`${dietPlan.fatG} g`,      color:"#60a5fa" },
                    ].map(m => (
                      <div key={m.label} className="glass rounded-xl p-3 text-center">
                        <div className="text-lg font-bold" style={{ color:m.color, fontFamily:"var(--font-display)" }}>{m.val}</div>
                        <div className="text-[10px] text-white/40" style={{ fontFamily:"var(--font-label)" }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 glass flex items-center gap-2 px-3 py-2 rounded-xl">
                    <Droplets size={13} style={{ color:"#60a5fa" }} />
                    <span className="text-xs" style={{ color:"#60a5fa", fontFamily:"var(--font-label)" }}>
                      Günlük su hedefi: {Math.round(dietPlan.waterMl / 250)} bardak ({dietPlan.waterMl} ml)
                    </span>
                  </div>
                </div>

                {/* Öğün planı */}
                <div className="glass-strong rounded-2xl overflow-hidden">
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
                    <h3 className="text-base text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                      GÜNLÜK ÖĞÜN PLANI
                    </h3>
                  </div>
                  <div className="divide-y" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
                    {dietPlan.meals.map((meal, i) => (
                      <div key={i}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                          onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}>
                          <div className="w-12 text-center flex-shrink-0">
                            <div className="text-xs font-bold" style={{ color:V, fontFamily:"var(--font-display)", letterSpacing:"0.05em" }}>{meal.time}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>{meal.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(139,92,246,0.15)", color:"#C4B5FD", fontFamily:"var(--font-label)" }}>
                                {meal.calories} kcal
                              </span>
                            </div>
                            <div className="text-xs text-white/30 truncate" style={{ fontFamily:"var(--font-label)" }}>
                              {meal.items[0]}{meal.items.length > 1 ? ` + ${meal.items.length-1} daha` : ""}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-white/20">
                            {expandedMeal === i ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedMeal === i && (
                            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:"hidden" }}>
                              <div className="px-5 pb-4 pt-1 space-y-3" style={{ borderTop:"1px solid rgba(139,92,246,0.1)" }}>
                                {/* Besinler */}
                                <ul className="space-y-1">
                                  {meal.items.map((item, j) => (
                                    <li key={j} className="flex items-center gap-2 text-xs" style={{ color:"rgba(255,255,255,0.6)", fontFamily:"var(--font-label)" }}>
                                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background:V }} />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                                {/* Makrolar */}
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { l:"Protein",  v:meal.macros.protein+"g", c:"#22c55e" },
                                    { l:"Karb",     v:meal.macros.carbs+"g",   c:"#f59e0b" },
                                    { l:"Yağ",      v:meal.macros.fat+"g",     c:"#60a5fa" },
                                  ].map(m => (
                                    <div key={m.l} className="glass text-center py-1.5 rounded-lg">
                                      <div className="text-xs font-bold" style={{ color:m.c, fontFamily:"var(--font-label)" }}>{m.v}</div>
                                      <div className="text-[9px] text-white/30" style={{ fontFamily:"var(--font-label)" }}>{m.l}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* İpuçları */}
                <div className="glass-strong rounded-2xl p-5">
                  <h3 className="text-base text-white tracking-wider mb-3" style={{ fontFamily:"var(--font-display)" }}>
                    ÖNEMLİ İPUÇLARI
                  </h3>
                  <ul className="space-y-2">
                    {dietPlan.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-label)" }}>
                        <span className="flex-shrink-0 mt-0.5 text-[10px]" style={{ color:V }}>✦</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
