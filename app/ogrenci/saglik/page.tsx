"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getHealthData, saveHealthData, calcBMI, bmiCategory, calcTDEE, today,
  type HealthProfile, type HealthData,
} from "@/lib/health";
import { Card, PageHeader, ProgressBar, Badge } from "@/app/components/ui";
import { Scale, Droplets, Flame, Activity, TrendingUp, Plus, Save } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { tr } from "date-fns/locale";

const activityOptions = [
  { value: "sedentary",   label: "Hareketsiz (masa başı iş)" },
  { value: "light",       label: "Hafif aktif (haftada 1-2 gün)" },
  { value: "moderate",    label: "Orta aktif (haftada 3-5 gün)" },
  { value: "active",      label: "Aktif (haftada 6-7 gün)" },
  { value: "very-active", label: "Çok aktif (günlük yoğun)" },
] as const;

const inputCls = "w-full bg-steel/40 border border-white/8 focus:border-crimson/50 text-white placeholder-white/15 px-3 py-2.5 text-sm outline-none transition-all duration-300";
const labelCls = "block text-xs text-white/35 tracking-widest uppercase mb-1.5";

export default function SaglikPage() {
  const { student } = useAuth();
  const [data, setData] = useState<HealthData>({ profile: null, weightLog: [], calorieLog: [], waterLog: [] });
  const [profileForm, setProfileForm] = useState<HealthProfile>({
    height: 175, weight: 70, age: 25, gender: "male", activityLevel: "moderate",
  });
  const [todayWeight, setTodayWeight] = useState("");
  const [todayCalIn, setTodayCalIn] = useState("");
  const [todayCalBurned, setTodayCalBurned] = useState("");
  const [profileTab, setProfileTab] = useState(false);

  useEffect(() => {
    if (!student) return;
    const d = getHealthData(student.id);
    setData(d);
    if (d.profile) setProfileForm(d.profile);
  }, [student]);

  const save = (updated: HealthData) => {
    if (!student) return;
    setData(updated);
    saveHealthData(student.id, updated);
  };

  const saveProfile = () => {
    save({ ...data, profile: profileForm });
    setProfileTab(false);
  };

  const logWeight = () => {
    if (!todayWeight) return;
    const entry = { date: today(), weight: Number(todayWeight) };
    const existing = data.weightLog.filter(e => e.date !== today());
    save({ ...data, weightLog: [...existing, entry].sort((a, b) => a.date.localeCompare(b.date)) });
    setTodayWeight("");
  };

  const logCalories = () => {
    if (!todayCalIn) return;
    const target = data.profile ? calcTDEE(data.profile) : 2000;
    const entry = { date: today(), consumed: Number(todayCalIn), burned: Number(todayCalBurned || 0), target };
    const existing = data.calorieLog.filter(e => e.date !== today());
    save({ ...data, calorieLog: [...existing, entry].sort((a, b) => a.date.localeCompare(b.date)) });
    setTodayCalIn("");
    setTodayCalBurned("");
  };

  const addWater = () => {
    const todayEntry = data.waterLog.find(e => e.date === today());
    const updated = todayEntry
      ? data.waterLog.map(e => e.date === today() ? { ...e, glasses: e.glasses + 1 } : e)
      : [...data.waterLog, { date: today(), glasses: 1 }];
    save({ ...data, waterLog: updated });
  };

  const removeWater = () => {
    const todayEntry = data.waterLog.find(e => e.date === today());
    if (!todayEntry || todayEntry.glasses === 0) return;
    const updated = data.waterLog.map(e => e.date === today() ? { ...e, glasses: Math.max(0, e.glasses - 1) } : e);
    save({ ...data, waterLog: updated });
  };

  // Hesaplamalar
  const profile = data.profile;
  const bmi = profile ? calcBMI(profile.weight, profile.height) : null;
  const bmiCat = bmi ? bmiCategory(bmi) : null;
  const tdee = profile ? calcTDEE(profile) : null;

  const todayWater = data.waterLog.find(e => e.date === today())?.glasses ?? 0;
  const todayCal = data.calorieLog.find(e => e.date === today());
  const lastWeight = data.weightLog.length > 0 ? data.weightLog[data.weightLog.length - 1] : null;

  // 30 günlük kilo grafiği
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    const entry = data.weightLog.find(e => e.date === d);
    return { date: format(parseISO(d), "dd MMM", { locale: tr }), kilo: entry?.weight ?? null };
  }).filter(d => d.kilo !== null);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Sağlık Takibi"
        subtitle="BMI, kalori, su ve kilo takip sistemi"
        accent="Öğrenci Paneli"
        actions={
          <button
            onClick={() => setProfileTab(v => !v)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-gold tracking-widest uppercase border border-white/10 hover:border-gold/30 px-3 py-2 transition-all duration-200"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            <Activity size={14} />
            Profil {profileTab ? "Kapat" : "Düzenle"}
          </button>
        }
      />

      {/* Profil formu */}
      <AnimatePresence>
        {profileTab && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6">
              <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
                Sağlık Profiliniz
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Boy (cm)</label>
                  <input type="number" value={profileForm.height} onChange={e => setProfileForm(p => ({ ...p, height: Number(e.target.value) }))} className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kilo (kg)</label>
                  <input type="number" value={profileForm.weight} onChange={e => setProfileForm(p => ({ ...p, weight: Number(e.target.value) }))} className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yaş</label>
                  <input type="number" value={profileForm.age} onChange={e => setProfileForm(p => ({ ...p, age: Number(e.target.value) }))} className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
                </div>
                <div>
                  <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Cinsiyet</label>
                  <select value={profileForm.gender} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value as "male"|"female" }))} className={`${inputCls} appearance-none`} style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="male" className="bg-carbon">Erkek</option>
                    <option value="female" className="bg-carbon">Kadın</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} style={{ fontFamily: "var(--font-barlow-condensed)" }}>Aktivite Seviyesi</label>
                  <select value={profileForm.activityLevel} onChange={e => setProfileForm(p => ({ ...p, activityLevel: e.target.value as HealthProfile["activityLevel"] }))} className={`${inputCls} appearance-none`} style={{ fontFamily: "var(--font-inter)" }}>
                    {activityOptions.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveProfile} className="mt-4 flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all duration-300" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Save size={14} />Profili Kaydet
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>BMI</span>
            <Scale size={16} className="text-crimson" />
          </div>
          <div className="text-3xl font-display text-white mb-1" style={{ fontFamily: "var(--font-bebas)" }}>
            {bmi ?? "—"}
          </div>
          {bmiCat && <span className={`text-xs ${bmiCat.color}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>{bmiCat.label}</span>}
          {!bmi && <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Profil girin</span>}
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Günlük Kalori</span>
            <Flame size={16} className="text-gold" />
          </div>
          <div className="text-3xl font-display text-gold-bright" style={{ fontFamily: "var(--font-bebas)" }}>
            {tdee ?? "—"}
          </div>
          <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>kcal / gün (TDEE)</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bugün Su</span>
            <Droplets size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-display text-blue-400" style={{ fontFamily: "var(--font-bebas)" }}>
            {todayWater}<span className="text-base text-white/30">/8</span>
          </div>
          <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>bardak (250ml)</span>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Son Kilo</span>
            <TrendingUp size={16} className="text-green-400" />
          </div>
          <div className="text-3xl font-display text-green-400" style={{ fontFamily: "var(--font-bebas)" }}>
            {lastWeight ? `${lastWeight.weight}` : "—"}
          </div>
          <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{lastWeight ? `${lastWeight.date}` : "Kayıt yok"}</span>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Su takibi */}
        <Card className="p-5">
          <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Su Tüketimi</h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <button onClick={removeWater} className="w-8 h-8 border border-white/10 text-white/40 hover:border-crimson/40 hover:text-crimson transition-all text-lg leading-none flex items-center justify-center">−</button>
            <div className="flex-1 text-center">
              <div className="text-5xl font-display text-blue-400" style={{ fontFamily: "var(--font-bebas)" }}>{todayWater}</div>
              <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>/ 8 bardak hedef</div>
            </div>
            <button onClick={addWater} className="w-8 h-8 border border-blue-400/30 text-blue-400 hover:border-blue-400/60 hover:bg-blue-400/8 transition-all text-lg leading-none flex items-center justify-center">+</button>
          </div>
          <ProgressBar value={todayWater} max={8} color="green" />
          <div className="mt-3 grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`h-6 rounded-sm transition-all duration-300 ${i < todayWater ? "bg-blue-400/70" : "bg-iron/50"}`} />
            ))}
          </div>
        </Card>

        {/* Kalori takibi */}
        <Card className="p-5">
          <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Kalori Takibi</h3>
          {todayCal ? (
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Alınan</span>
                <span className="text-gold-bright" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{todayCal.consumed} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yakılan</span>
                <span className="text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{todayCal.burned} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Net</span>
                <span className={`font-semibold ${todayCal.consumed - todayCal.burned > todayCal.target ? "text-crimson" : "text-white"}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {todayCal.consumed - todayCal.burned} / {todayCal.target} kcal
                </span>
              </div>
              <ProgressBar value={Math.min(todayCal.consumed - todayCal.burned, todayCal.target)} max={todayCal.target} color={todayCal.consumed - todayCal.burned > todayCal.target ? "red" : "gold"} />
            </div>
          ) : (
            <p className="text-xs text-white/25 mb-4 text-center py-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bugün kayıt yok</p>
          )}
          <div className="space-y-2">
            <input type="number" value={todayCalIn} onChange={e => setTodayCalIn(e.target.value)} placeholder="Alınan kalori (kcal)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
            <input type="number" value={todayCalBurned} onChange={e => setTodayCalBurned(e.target.value)} placeholder="Antrenman yakımı (kcal)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
            <button onClick={logCalories} className="w-full flex items-center justify-center gap-2 bg-gold/15 hover:bg-gold/25 border border-gold/25 text-gold text-xs font-semibold tracking-widest uppercase py-2 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <Plus size={13} />Kaydet
            </button>
          </div>
        </Card>

        {/* Kilo girişi */}
        <Card className="p-5">
          <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>Kilo Kaydı</h3>
          <div className="space-y-2 mb-4">
            <input type="number" step="0.1" value={todayWeight} onChange={e => setTodayWeight(e.target.value)} placeholder="Bugünkü kilonuz (kg)" className={inputCls} style={{ fontFamily: "var(--font-inter)" }} />
            <button onClick={logWeight} className="w-full flex items-center justify-center gap-2 bg-crimson/12 hover:bg-crimson/20 border border-crimson/25 text-crimson text-xs font-semibold tracking-widest uppercase py-2 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <Plus size={13} />Kaydet
            </button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {data.weightLog.slice(-5).reverse().map(e => (
              <div key={e.date} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                <span className="text-xs text-white/35" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{e.date}</span>
                <span className="text-xs text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{e.weight} kg</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Kilo grafiği */}
      {last30.length >= 2 && (
        <Card className="p-6">
          <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
            Kilo Değişim Grafiği
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "var(--font-barlow-condensed)" }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 0 }} labelStyle={{ color: "#fff" }} />
              <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* BMI tablosu */}
      {bmi && (
        <Card className="p-5">
          <h3 className="text-base font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>BMI Referans Tablosu</h3>
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
            Mevcut BMI&apos;nız: <strong className={bmiCat?.color}>{bmi}</strong> — {bmiCat?.label}
          </p>
        </Card>
      )}
    </div>
  );
}
