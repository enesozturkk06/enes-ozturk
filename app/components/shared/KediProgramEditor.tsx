"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/app/components/ui";
import type { KediProgram, KediProgramTrainingDay, KediProgramMeal } from "@/lib/types";
import { Plus, Trash2, Save, X, Dumbbell, Apple, ShoppingCart, TrendingUp } from "lucide-react";

const inputCls = "w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white px-3 py-2 text-xs outline-none transition-all duration-200 rounded-lg";
const textareaCls = `${inputCls} resize-none`;
const labelCls = "block text-[10px] text-white/40 tracking-widest uppercase mb-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls} style={{ fontFamily: "var(--font-label)" }}>{label}</label>{children}</div>;
}

/**
 * Antrenörün bir taslak programı elle düzenlemesi için yapılandırılmış
 * (raw JSON değil) form. Tamamen yerel state üzerinde çalışır — "Kaydet"e
 * basılana kadar hiçbir şey Supabase'e yazılmaz, "Vazgeç" ile atılır.
 */
export default function KediProgramEditor({
  program, onSave, onCancel, saving,
}: {
  program: KediProgram;
  onSave: (updated: KediProgram, changeNote: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<KediProgram>(structuredClone(program));
  const [changeNote, setChangeNote] = useState("");

  const patch = (fn: (d: KediProgram) => void) => {
    setDraft(prev => { const next = structuredClone(prev); fn(next); return next; });
  };

  const updateDay = (i: number, fn: (d: KediProgramTrainingDay) => void) =>
    patch(d => fn(d.trainingDays[i]));
  const updateMeal = (i: number, fn: (m: KediProgramMeal) => void) =>
    patch(d => fn(d.meals[i]));

  return (
    <div className="space-y-4">
      {/* Macros */}
      <Card className="p-4 border-l-2 border-gold">
        <div className="flex items-center gap-2 mb-3">
          <Apple size={16} className="text-gold" />
          <span className="text-sm font-semibold text-gold tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Günlük Beslenme Hedefi</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Kalori"><input type="number" className={inputCls} value={draft.dailyCalories} onChange={e => patch(d => { d.dailyCalories = Number(e.target.value); })} /></Field>
          <Field label="Protein (g)"><input type="number" className={inputCls} value={draft.proteinG} onChange={e => patch(d => { d.proteinG = Number(e.target.value); })} /></Field>
          <Field label="Karbonhidrat (g)"><input type="number" className={inputCls} value={draft.carbsG} onChange={e => patch(d => { d.carbsG = Number(e.target.value); })} /></Field>
          <Field label="Yağ (g)"><input type="number" className={inputCls} value={draft.fatG} onChange={e => patch(d => { d.fatG = Number(e.target.value); })} /></Field>
        </div>
      </Card>

      {/* Analysis */}
      <Card className="p-4 border-l-2 border-crimson">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-crimson" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Analiz</span>
        </div>
        <div className="space-y-3">
          <Field label="Devamlılık Özeti">
            <textarea rows={2} className={textareaCls} value={draft.analysis.attendanceSummary}
              onChange={e => patch(d => { d.analysis.attendanceSummary = e.target.value; })} />
          </Field>
          <Field label="Performans Özeti">
            <textarea rows={2} className={textareaCls} value={draft.analysis.performanceSummary}
              onChange={e => patch(d => { d.analysis.performanceSummary = e.target.value; })} />
          </Field>
          <Field label="Neden Bu Program? (Rationale)">
            <textarea rows={2} className={textareaCls} value={draft.analysis.rationale ?? ""}
              onChange={e => patch(d => { d.analysis.rationale = e.target.value; })} />
          </Field>
          <Field label="Öneriler (her satır bir öneri)">
            <textarea rows={3} className={textareaCls} value={draft.analysis.recommendations.join("\n")}
              onChange={e => patch(d => { d.analysis.recommendations = e.target.value.split("\n").filter(Boolean); })} />
          </Field>
        </div>
      </Card>

      {/* Training days */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Dumbbell size={16} className="text-white" />
            <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Haftalık Antrenman Programı</span>
          </div>
          <button onClick={() => patch(d => { d.trainingDays.push({ day: "Yeni Gün", focus: "", exercises: [] }); })}
            className="text-xs text-gold flex items-center gap-1 hover:text-gold/70">
            <Plus size={13} /> Gün Ekle
          </button>
        </div>
        <div className="space-y-3">
          {draft.trainingDays.map((day, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5 space-y-2">
              <div className="flex gap-2">
                <input className={inputCls} value={day.day} placeholder="Gün"
                  onChange={e => updateDay(i, d => { d.day = e.target.value; })} />
                <input className={inputCls} value={day.focus} placeholder="Odak"
                  onChange={e => updateDay(i, d => { d.focus = e.target.value; })} />
                <button onClick={() => patch(d => { d.trainingDays.splice(i, 1); })} className="text-white/30 hover:text-crimson flex-shrink-0 px-2">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="space-y-1.5 pl-2">
                {day.exercises.map((ex, j) => (
                  <div key={j} className="flex flex-wrap gap-1.5 items-center">
                    <input className={`${inputCls} flex-1 min-w-[140px]`} value={ex.name} placeholder="Egzersiz adı"
                      onChange={e => updateDay(i, d => { d.exercises[j].name = e.target.value; })} />
                    <input className={`${inputCls} w-16`} value={ex.sets ?? ""} placeholder="Set"
                      onChange={e => updateDay(i, d => { d.exercises[j].sets = e.target.value; })} />
                    <input className={`${inputCls} w-16`} value={ex.reps ?? ""} placeholder="Tekrar"
                      onChange={e => updateDay(i, d => { d.exercises[j].reps = e.target.value; })} />
                    <input className={`${inputCls} w-20`} value={ex.duration ?? ""} placeholder="Süre"
                      onChange={e => updateDay(i, d => { d.exercises[j].duration = e.target.value; })} />
                    <button onClick={() => updateDay(i, d => { d.exercises.splice(j, 1); })} className="text-white/20 hover:text-crimson flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button onClick={() => updateDay(i, d => { d.exercises.push({ name: "" }); })}
                  className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1">
                  <Plus size={11} /> Egzersiz Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly progression */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Aylık İlerleme Planı</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {draft.monthlyProgression.map((week, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5 space-y-1.5">
              <div className="text-xs text-gold tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>Hafta {week.weekNumber}</div>
              <input className={inputCls} value={week.focus} placeholder="Odak"
                onChange={e => patch(d => { d.monthlyProgression[i].focus = e.target.value; })} />
              <input className={inputCls} value={week.intensityNote} placeholder="Yoğunluk notu"
                onChange={e => patch(d => { d.monthlyProgression[i].intensityNote = e.target.value; })} />
            </div>
          ))}
        </div>
      </Card>

      {/* Meals */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Apple size={16} className="text-white" />
            <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğün Planı</span>
          </div>
          <button onClick={() => patch(d => { d.meals.push({ name: "Yeni Öğün", items: [], calories: 0, protein: 0, carbs: 0, fat: 0 }); })}
            className="text-xs text-gold flex items-center gap-1 hover:text-gold/70">
            <Plus size={13} /> Öğün Ekle
          </button>
        </div>
        <div className="space-y-2">
          {draft.meals.map((meal, i) => (
            <div key={i} className="p-3 bg-steel/30 border border-white/5 space-y-1.5">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={meal.name} placeholder="Öğün adı"
                  onChange={e => updateMeal(i, m => { m.name = e.target.value; })} />
                <input type="number" className={`${inputCls} w-20`} value={meal.calories} placeholder="kcal"
                  onChange={e => updateMeal(i, m => { m.calories = Number(e.target.value); })} />
                <button onClick={() => patch(d => { d.meals.splice(i, 1); })} className="text-white/30 hover:text-crimson flex-shrink-0 px-2">
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea rows={2} className={textareaCls} value={meal.items.join(", ")} placeholder="Besinler (virgülle ayır)"
                onChange={e => updateMeal(i, m => { m.items = e.target.value.split(",").map(s => s.trim()).filter(Boolean); })} />
              <div className="grid grid-cols-3 gap-1.5">
                <input type="number" className={inputCls} value={meal.protein} placeholder="Protein g"
                  onChange={e => updateMeal(i, m => { m.protein = Number(e.target.value); })} />
                <input type="number" className={inputCls} value={meal.carbs} placeholder="Karb g"
                  onChange={e => updateMeal(i, m => { m.carbs = Number(e.target.value); })} />
                <input type="number" className={inputCls} value={meal.fat} placeholder="Yağ g"
                  onChange={e => updateMeal(i, m => { m.fat = Number(e.target.value); })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Shopping list */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={16} className="text-white" />
          <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Alışveriş Listesi (virgülle ayır)</span>
        </div>
        <textarea rows={3} className={textareaCls} value={draft.shoppingList.join(", ")}
          onChange={e => patch(d => { d.shoppingList = e.target.value.split(",").map(s => s.trim()).filter(Boolean); })} />
      </Card>

      {/* Change note + actions */}
      <Card className="p-4">
        <Field label="Değişiklik Notu (opsiyonel — geçmişte görünür)">
          <Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Örn: Kilo hedefine göre kalori düşürüldü" />
        </Field>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onSave(draft, changeNote)} loading={saving} size="md">
            <Save size={15} /> Değişiklikleri Kaydet
          </Button>
          <Button onClick={onCancel} variant="secondary" size="md" disabled={saving}>
            Vazgeç
          </Button>
        </div>
      </Card>
    </div>
  );
}
