"use client";

import type { ReactNode } from "react";
import { Card } from "@/app/components/ui";
import type { KediProgram } from "@/lib/types";
import { SPORT_LABELS, GOAL_LABELS } from "@/lib/kediProgramLabels";
import {
  Dumbbell, Apple, ShoppingCart, TrendingUp, CalendarDays, ShieldAlert, Lightbulb,
} from "lucide-react";

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="glass rounded-xl px-3 py-2 text-center flex-1 min-w-[70px]">
      <div className="text-lg font-bold" style={{ color, fontFamily: "var(--font-bebas)" }}>{value}{unit}</div>
      <div className="text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>{label}</div>
    </div>
  );
}

/**
 * Kedi AI programının salt-okunur, premium kart görünümü — hem öğrenci
 * paneli (KediAiProgramPanel) hem admin Koç Merkezi BURADAN render eder.
 * İki farklı yerde aynı JSX'i kopyalamak yerine tek gerçek kaynak.
 */
export default function KediProgramCards({ program, headerActions }: { program: KediProgram; headerActions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
          {SPORT_LABELS[program.sport]} · {GOAL_LABELS[program.goalType]}
        </h2>
        {headerActions}
      </div>

      {/* Nutrition targets */}
      <Card className="p-4 border-l-2 border-gold">
        <div className="flex items-center gap-2 mb-3">
          <Apple size={16} className="text-gold" />
          <span className="text-sm font-semibold text-gold tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Günlük Beslenme Hedefi</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <MacroBadge label="Kalori" value={program.dailyCalories} unit=" kcal" color="#F59E0B" />
          <MacroBadge label="Protein" value={program.proteinG} unit="g" color="#4ADE80" />
          <MacroBadge label="Karbonhidrat" value={program.carbsG} unit="g" color="#38BDF8" />
          <MacroBadge label="Yağ" value={program.fatG} unit="g" color="#F87171" />
        </div>
      </Card>

      {/* Rationale — why this program was built this way */}
      {program.analysis.rationale && (
        <Card className="p-4 border-l-2 border-gold/60">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-gold" />
            <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Neden Bu Program?</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{program.analysis.rationale}</p>
        </Card>
      )}

      {/* Analysis */}
      <Card className="p-4 border-l-2 border-crimson">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-crimson" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kedi&apos;nin Analizi</span>
        </div>
        <p className="text-xs text-white/50 mb-2" style={{ fontFamily: "var(--font-inter)" }}>{program.analysis.attendanceSummary}</p>
        <p className="text-xs text-white/50 mb-3" style={{ fontFamily: "var(--font-inter)" }}>{program.analysis.performanceSummary}</p>
        <ul className="space-y-1.5">
          {program.analysis.recommendations.map((r, i) => (
            <li key={i} className="flex gap-2 text-xs text-white/60" style={{ fontFamily: "var(--font-inter)" }}>
              <span className="text-gold/60 flex-shrink-0">›</span><span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Weekly training */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell size={16} className="text-white" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Haftalık Antrenman Programı</span>
        </div>
        <div className="space-y-3">
          {program.trainingDays.map((day, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{day.day}</span>
                <span className="text-xs text-gold/70">{day.focus}</span>
              </div>
              <div className="space-y-1">
                {day.exercises.map((ex, j) => (
                  <div key={j} className="text-xs text-white/50 flex flex-wrap gap-x-2" style={{ fontFamily: "var(--font-inter)" }}>
                    <span className="text-white/70">{ex.name}</span>
                    {ex.sets && <span className="text-white/30">{ex.sets} set{ex.reps ? ` × ${ex.reps}` : ""}</span>}
                    {ex.duration && <span className="text-white/30">{ex.duration}</span>}
                    {ex.notes && <span className="text-white/25 italic">— {ex.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly progression */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-white" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Aylık İlerleme Planı</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {program.monthlyProgression.map((week, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5">
              <div className="text-xs text-gold tracking-widest uppercase mb-1" style={{ fontFamily: "var(--font-label)" }}>Hafta {week.weekNumber}</div>
              <div className="text-sm text-white/80 mb-1" style={{ fontFamily: "var(--font-inter)" }}>{week.focus}</div>
              <div className="text-xs text-white/40" style={{ fontFamily: "var(--font-inter)" }}>{week.intensityNote}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Meals */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Apple size={16} className="text-white" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğün Planı</span>
        </div>
        <div className="space-y-2">
          {program.meals.map((meal, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{meal.name}</span>
                <span className="text-xs text-gold/70">{meal.calories} kcal</span>
              </div>
              <p className="text-xs text-white/50" style={{ fontFamily: "var(--font-inter)" }}>{meal.items.join(", ")}</p>
              <div className="text-[10px] text-white/25 mt-1">P:{meal.protein}g K:{meal.carbs}g Y:{meal.fat}g</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Shopping list */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={16} className="text-white" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Alışveriş Listesi</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {program.shoppingList.map((item, i) => (
            <span key={i} className="text-xs text-white/60 bg-white/5 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-inter)" }}>{item}</span>
          ))}
        </div>
      </Card>

      {/* Safety note — always shown regardless of model output */}
      <Card className="p-4 border-l-2 border-white/10">
        <div className="flex items-start gap-2">
          <ShieldAlert size={14} className="text-white/30 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/35 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{program.safetyNote}</p>
        </div>
      </Card>
    </div>
  );
}
