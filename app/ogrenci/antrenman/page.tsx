"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { generateWorkout } from "@/lib/workout-generator";
import type { WorkoutInput, WorkoutPlan } from "@/lib/types";
import { Card, Button, Select, PageHeader } from "@/app/components/ui";
import { Dumbbell, Zap, Target, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

const levelOpts = [
  { value: "baslangic", label: "Başlangıç" },
  { value: "orta", label: "Orta Seviye" },
  { value: "ileri", label: "İleri Seviye" },
];
const goalOpts = [
  { value: "kondisyon", label: "Kondisyon Geliştir" },
  { value: "teknik", label: "Teknik İyileştir" },
  { value: "guc", label: "Güç Artır" },
  { value: "kilo-verme", label: "Kilo Ver" },
  { value: "musabaka", label: "Müsabakaya Hazırlan" },
];
const daysOpts = [
  { value: "2", label: "Haftada 2 gün" },
  { value: "3", label: "Haftada 3 gün" },
  { value: "4", label: "Haftada 4 gün" },
  { value: "5", label: "Haftada 5 gün" },
  { value: "6", label: "Haftada 6 gün" },
];

function ExerciseCard({ ex }: { ex: { icon: string; name: string; sets?: number; reps?: string; duration?: string; rest?: string; description: string } }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 p-3 bg-steel/30 border border-white/5 hover:border-crimson/20 transition-colors duration-200">
      <span className="text-2xl flex-shrink-0">{ex.icon}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{ex.name}</span>
          {ex.sets && <span className="text-xs text-gold bg-gold/10 px-2 py-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{ex.sets} set × {ex.reps || ex.duration}</span>}
          {!ex.sets && ex.duration && <span className="text-xs text-gold bg-gold/10 px-2 py-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{ex.duration}</span>}
          {ex.rest && <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Dinlenme: {ex.rest}</span>}
        </div>
        <p className="text-xs text-white/40 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{ex.description}</p>
      </div>
    </motion.div>
  );
}

function Section({ title, icon, children, color = "red" }: { title: string; icon: React.ReactNode; children: React.ReactNode; color?: "red" | "gold" }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className={`w-full flex items-center justify-between p-4 border-l-2 ${color === "red" ? "border-crimson" : "border-gold"}`}>
        <div className="flex items-center gap-2">
          <span className={color === "red" ? "text-crimson" : "text-gold"}>{icon}</span>
          <span className="text-sm font-semibold tracking-wider text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 pt-0 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function AntrenmanPage() {
  const { student } = useAuth();
  const [input, setInput] = useState<WorkoutInput>({
    level: student?.level ?? "baslangic",
    goal: "kondisyon",
    weight: student?.weight ?? 70,
    hasEquipment: false,
    daysPerWeek: 3,
  });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    setPlan(null);
    setTimeout(() => {
      setPlan(generateWorkout(input));
      setGenerating(false);
    }, 1400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="AI Antrenman Sistemi" subtitle="Kişiselleştirilmiş günlük program oluşturun" accent="Ev Antrenmanı" />

      {/* Input form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap size={18} className="text-gold" />
          <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            Programınızı Kişiselleştirin
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Select label="Seviyeniz" options={levelOpts} value={input.level} onChange={v => setInput(p => ({ ...p, level: v as WorkoutInput["level"] }))} />
          <Select label="Hedefiniz" options={goalOpts} value={input.goal} onChange={v => setInput(p => ({ ...p, goal: v as WorkoutInput["goal"] }))} />
          <Select label="Antrenman Sıklığı" options={daysOpts} value={String(input.daysPerWeek)} onChange={v => setInput(p => ({ ...p, daysPerWeek: Number(v) }))} />

          <div className="space-y-1.5">
            <label className="block text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kilonuz (kg)</label>
            <input
              type="number" min={40} max={200} value={input.weight}
              onChange={e => setInput(p => ({ ...p, weight: Number(e.target.value) }))}
              className="w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white px-4 py-3 text-sm outline-none transition-all duration-300"
              style={{ fontFamily: "var(--font-inter)" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setInput(p => ({ ...p, hasEquipment: !p.hasEquipment }))}
            className={`w-10 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${input.hasEquipment ? "bg-crimson" : "bg-iron"}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300 ${input.hasEquipment ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <div>
            <div className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Evde Ekipman Var</div>
            <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kese torbası, atlama ipi, ağırlık vs.</div>
          </div>
        </div>

        <Button onClick={generate} loading={generating} size="lg" className="w-full sm:w-auto">
          <Dumbbell size={18} />
          {generating ? "Program Oluşturuluyor..." : "AI Antrenman Programı Oluştur"}
        </Button>
      </Card>

      {/* Generating animation */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
            <div className="w-12 h-12 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              AI sistemi programınızı hazırlıyor...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated plan */}
      <AnimatePresence>
        {plan && !generating && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                KİŞİSEL ANTRENMAN PROGRAMI
              </h2>
              <Button onClick={generate} variant="secondary" size="sm">
                <RotateCcw size={14} />
                Yenile
              </Button>
            </div>

            {/* Daily tips */}
            <Card className="p-4 border-l-2 border-gold">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-gold" />
                <span className="text-sm font-semibold text-gold tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Günlük Öneriler</span>
              </div>
              <ul className="space-y-1.5">
                {plan.dailyTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-white/50" style={{ fontFamily: "var(--font-inter)" }}>
                    <span className="text-gold/60 flex-shrink-0">›</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Section title="Isınma" icon={<Zap size={16} />} color="gold">
              {plan.warmup.map((ex, i) => <ExerciseCard key={i} ex={ex} />)}
            </Section>

            <Section title="Ana Antrenman" icon={<Dumbbell size={16} />} color="red">
              {plan.main.map((ex, i) => <ExerciseCard key={i} ex={ex} />)}
            </Section>

            <Section title="Kombinasyon Önerileri" icon={<Target size={16} />} color="gold">
              {plan.combinations.map((c, i) => (
                <div key={i} className="p-3 bg-steel/30 border border-white/5">
                  <p className="text-sm text-white/70 font-mono" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{c}</p>
                </div>
              ))}
            </Section>

            <Section title="Kardiyo Bitişi" icon={<Zap size={16} />} color="red">
              {plan.cardio.map((ex, i) => <ExerciseCard key={i} ex={ex} />)}
            </Section>

            <Section title="Soğuma ve Germe" icon={<RotateCcw size={16} />} color="gold">
              {plan.cooldown.map((ex, i) => <ExerciseCard key={i} ex={ex} />)}
            </Section>

            {/* Weekly schedule */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-crimson">📅</span>
                <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Haftalık Plan</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {plan.weeklySchedule.map((day, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/50 py-1 border-b border-white/5 last:border-0" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    <span className="w-2 h-2 bg-crimson/60 rounded-full flex-shrink-0" />
                    {day}
                  </div>
                ))}
              </div>
            </Card>

            {/* Rest advice */}
            <Card className="p-4 border-l-2 border-crimson/40">
              <div className="text-xs text-white/40 mb-1 tracking-wider uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Dinlenme Tavsiyesi</div>
              <p className="text-sm text-white/60 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{plan.restAdvice}</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
