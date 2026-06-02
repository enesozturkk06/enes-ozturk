"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
import { Card, PageHeader, ProgressBar } from "@/app/components/ui";
import { Scale, Droplets, Flame, Activity, TrendingUp, Plus, Save } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const activityOptions = [
  { value: "sedentary",   label: "Hareketsiz (masa başı iş)" },
  { value: "light",       label: "Hafif aktif (haftada 1-2 gün)" },
  { value: "moderate",    label: "Orta aktif (haftada 3-5 gün)" },
  { value: "active",      label: "Aktif (haftada 6-7 gün)" },
  { value: "very-active", label: "Çok aktif (günlük yoğun)" },
] as const;

const inputCls = "w-full bg-steel/40 border border-white/8 focus:border-crimson/50 text-white placeholder-white/15 px-3 py-2.5 text-sm outline-none transition-all";
const labelCls = "block text-xs text-white/35 tracking-widest uppercase mb-1.5";

export default function SaglikPage() {
  const { student } = useAuth();
  const { toast } = useToast();
  const today = todayDate();

  /* State */
  const [profile, setProfile]       = useState<HealthProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightEntry[]>([]);
  const [calorieLogs, setCalorieLogs] = useState<CalorieEntry[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [profileTab, setProfileTab] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  /* Form state */
  const [pf, setPf] = useState<HealthProfile>({ height: 175, weight: 70, age: 25, gender: "male", activityLevel: "moderate" });
  const [todayWeight, setTodayWeight] = useState("");
  const [calIn, setCalIn]   = useState("");
  const [calBurned, setCalBurned] = useState("");
  const [savingWeight, setSavingWeight]   = useState(false);
  const [savingCal, setSavingCal]         = useState(false);
  const [savingWater, setSavingWater]     = useState(false);

  /* Yükle */
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
      if (prof) setPf(prof);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast("Veriler yüklenemedi: " + msg, "error");
    } finally {
      setLoading(false);
    }
  }, [student, today]); // eslint-disable-line

  useEffect(() => { reload(); }, [reload]);

  /* Profil kaydet */
  const saveProfile = async () => {
    if (!student) return;
    setProfileSaving(true);
    try {
      await saveHealthProfile(student.id, pf);
      setProfile(pf);
      setProfileTab(false);
      toast("Profil kaydedildi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Profil kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setProfileSaving(false);
    }
  };

  /* Kilo kaydet */
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
    } finally {
      setSavingWeight(false);
    }
  };

  /* Kalori kaydet */
  const saveCalories = async () => {
    if (!student || !calIn) return;
    setSavingCal(true);
    try {
      const target = profile ? calcTDEE(profile) : 2000;
      await logCalories(student.id, today, Number(calIn), Number(calBurned || 0), target);
      setCalIn(""); setCalBurned("");
      toast("Kalori kaydedildi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Kalori kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setSavingCal(false);
    }
  };

  /* Su */
  const changeWater = async (delta: number) => {
    if (!student) return;
    const newGlasses = Math.max(0, waterGlasses + delta);
    setSavingWater(true);
    try {
      await saveWaterGlasses(student.id, today, newGlasses);
      setWaterGlasses(newGlasses);
      if (delta > 0) toast(`Su: ${newGlasses} bardak`, "success");
    } catch (err: unknown) {
      toast("Su kaydedilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setSavingWater(false);
    }
  };

  /* Hesaplar */
  const bmi     = profile ? calcBMI(profile.weight, profile.height) : null;
  const bmiCat  = bmi     ? bmiCategory(bmi) : null;
  const tdee    = profile ? calcTDEE(profile) : null;
  const todayCal = calorieLogs.find(e => e.date === today);
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const openCount = waterGlasses;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Sağlık Takibi"
        subtitle="BMI, kalori, su ve kilo — tüm veriler Supabase'de"
        accent="Öğrenci Paneli"
        actions={
          <button onClick={() => setProfileTab(v => !v)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-gold tracking-widest uppercase border border-white/10 hover:border-gold/30 px-3 py-2 transition-all"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <Activity size={14} />Profil {profileTab ? "Kapat" : "Düzenle"}
          </button>
        }
      />

      {loading && (
        <div className="text-center py-12"><div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" /></div>
      )}

      {!loading && (
        <>
          {/* Profil formu */}
          {profileTab && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6">
                <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Sağlık Profiliniz</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Boy (cm)", key: "height" as const, type: "number" },
                    { label: "Kilo (kg)", key: "weight" as const, type: "number" },
                    { label: "Yaş", key: "age" as const, type: "number" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>{f.label}</label>
                      <input type={f.type} value={pf[f.key]}
                        onChange={e => setPf(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                    </div>
                  ))}
                  <div>
                    <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Cinsiyet</label>
                    <select value={pf.gender} onChange={e => setPf(p => ({ ...p, gender: e.target.value as "male"|"female" }))}
                      className={`${inputCls} appearance-none`} style={{ fontFamily: "var(--font-inter)" }}>
                      <option value="male" className="bg-carbon">Erkek</option>
                      <option value="female" className="bg-carbon">Kadın</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Aktivite Seviyesi</label>
                    <select value={pf.activityLevel} onChange={e => setPf(p => ({ ...p, activityLevel: e.target.value as HealthProfile["activityLevel"] }))}
                      className={`${inputCls} appearance-none`} style={{ fontFamily: "var(--font-inter)" }}>
                      {activityOptions.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={saveProfile} disabled={profileSaving}
                  className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright disabled:opacity-50 text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <Save size={14} />{profileSaving ? "Kaydediliyor..." : "Profili Kaydet"}
                </button>
              </Card>
            </motion.div>
          )}

          {/* Özet kartlar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "BMI", val: bmi ?? "—", sub: bmiCat?.label ?? "Profil girin", color: bmiCat?.color ?? "text-white", icon: <Scale size={16} /> },
              { label: "Günlük Kalori",val: tdee ? tdee.toLocaleString("tr-TR") : "—", sub: "kcal / gün (TDEE)", color: "text-gold-bright", icon: <Flame size={16} /> },
              { label: "Bugün Su", val: `${openCount}/8`, sub: "bardak (250ml)", color: "text-blue-400", icon: <Droplets size={16} /> },
              { label: "Son Kilo", val: lastWeight ? `${lastWeight.weight} kg` : "—", sub: lastWeight ? format(parseISO(lastWeight.date), "dd MMM", { locale: tr }) : "Kayıt yok", color: "text-green-400", icon: <TrendingUp size={16} /> },
            ].map(s => (
              <Card key={s.label} className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</span>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <div className={`text-2xl font-display ${s.color}`} style={{ fontFamily: "var(--font-bebas)" }}>{s.val}</div>
                <div className="text-xs text-white/25 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.sub}</div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Su */}
            <Card className="p-5">
              <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Su Tüketimi</h3>
              <div className="flex items-center justify-center gap-3 mb-4">
                <button onClick={() => changeWater(-1)} disabled={savingWater || waterGlasses === 0}
                  className="w-8 h-8 border border-white/10 hover:border-crimson/40 hover:text-crimson text-white/40 text-xl flex items-center justify-center transition-all disabled:opacity-30">−</button>
                <div className="text-center">
                  <div className="text-5xl font-display text-blue-400" style={{ fontFamily: "var(--font-bebas)" }}>{waterGlasses}</div>
                  <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>/ 8 bardak</div>
                </div>
                <button onClick={() => changeWater(1)} disabled={savingWater}
                  className="w-8 h-8 border border-blue-400/30 hover:border-blue-400/60 hover:bg-blue-400/8 text-blue-400 text-xl flex items-center justify-center transition-all disabled:opacity-30">+</button>
              </div>
              <ProgressBar value={waterGlasses} max={8} color="green" />
              <div className="mt-3 grid grid-cols-8 gap-1">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={`h-5 rounded-sm transition-all ${i < waterGlasses ? "bg-blue-400/70" : "bg-iron/50"}`} />
                ))}
              </div>
            </Card>

            {/* Kalori */}
            <Card className="p-5">
              <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Kalori Takibi</h3>
              {todayCal && (
                <div className="space-y-2 mb-4">
                  {[
                    { l: "Alınan", v: todayCal.consumed + " kcal", c: "text-gold-bright" },
                    { l: "Yakılan", v: todayCal.burned + " kcal", c: "text-green-400" },
                    { l: "Net / Hedef", v: `${todayCal.consumed - todayCal.burned} / ${todayCal.target}`, c: "text-white" },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between text-xs">
                      <span className="text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{r.l}</span>
                      <span className={`font-semibold ${r.c}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>{r.v}</span>
                    </div>
                  ))}
                  <ProgressBar value={Math.min(todayCal.consumed - todayCal.burned, todayCal.target)} max={todayCal.target} color="gold" />
                </div>
              )}
              <div className="space-y-2">
                <input type="number" value={calIn} onChange={e => setCalIn(e.target.value)} placeholder="Alınan kalori (kcal)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                <input type="number" value={calBurned} onChange={e => setCalBurned(e.target.value)} placeholder="Antrenman yakımı (kcal)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                <button onClick={saveCalories} disabled={savingCal || !calIn}
                  className="w-full flex items-center justify-center gap-2 bg-gold/15 hover:bg-gold/25 border border-gold/25 text-gold text-xs font-semibold tracking-widest uppercase py-2 transition-all disabled:opacity-40"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <Plus size={13} />{savingCal ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </Card>

            {/* Kilo */}
            <Card className="p-5">
              <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Kilo Kaydı</h3>
              <div className="space-y-2 mb-4">
                <input type="number" step="0.1" value={todayWeight} onChange={e => setTodayWeight(e.target.value)} placeholder="Bugünkü kilonuz (kg)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                <button onClick={saveWeight} disabled={savingWeight || !todayWeight}
                  className="w-full flex items-center justify-center gap-2 bg-crimson/12 hover:bg-crimson/20 border border-crimson/25 text-crimson text-xs font-semibold tracking-widest uppercase py-2 transition-all disabled:opacity-40"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <Plus size={13} />{savingWeight ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {weightLogs.slice(-5).reverse().map(e => (
                  <div key={e.date} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                    <span className="text-xs text-white/35" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{format(parseISO(e.date), "dd MMM", { locale: tr })}</span>
                    <span className="text-xs text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{e.weight} kg</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Kilo grafiği */}
          {weightLogs.length >= 2 && (
            <Card className="p-6">
              <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Kilo Değişim Grafiği (30 Gün)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightLogs.map(e => ({ tarih: format(parseISO(e.date), "dd MMM", { locale: tr }), kilo: e.weight }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="tarih" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "var(--font-barlow-condensed)" }} />
                  <YAxis domain={["auto","auto"]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 0 }} labelStyle={{ color: "#fff" }} />
                  <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* BMI tablosu */}
          {bmi && (
            <Card className="p-5">
              <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>BMI Referans</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { range: "< 18.5", label: "Zayıf", color: "text-blue-400", bg: "bg-blue-400/8 border-blue-400/15" },
                  { range: "18.5–24.9", label: "Normal", color: "text-green-400", bg: "bg-green-400/8 border-green-400/15" },
                  { range: "25–29.9", label: "Fazla Kilolu", color: "text-gold-bright", bg: "bg-gold/8 border-gold/15" },
                  { range: "≥ 30", label: "Obez", color: "text-crimson", bg: "bg-crimson/8 border-crimson/15" },
                ].map(r => (
                  <div key={r.label} className={`p-3 border text-center ${r.bg} ${bmiCat?.label === r.label ? "ring-1 ring-white/20" : ""}`}>
                    <div className={`text-sm font-semibold ${r.color}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>{r.label}</div>
                    <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{r.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/20 mt-3 text-center" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Mevcut BMI: <strong className={bmiCat?.color}>{bmi}</strong> — {bmiCat?.label}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
