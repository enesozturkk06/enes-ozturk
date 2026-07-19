"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Pencil, Check, X } from "lucide-react";
import { getAppSetting, setAppSetting } from "@/lib/db";

const GOAL_KEY = "finance_monthly_goal";
const DEFAULT_GOAL = 150_000;

export default function MonthlyGoalCard({ currentRevenue }: { currentRevenue: number }) {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(DEFAULT_GOAL));

  useEffect(() => {
    getAppSetting(GOAL_KEY).then(v => {
      const n = v ? Number(v) : DEFAULT_GOAL;
      setGoal(Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL);
      setLoaded(true);
    });
  }, []);

  const pct = goal > 0 ? Math.min(100, Math.round((currentRevenue / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - currentRevenue);

  const startEdit = () => { setDraft(String(goal)); setEditing(true); };
  const save = async () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0) { setEditing(false); return; }
    setGoal(n);
    setEditing(false);
    await setAppSetting(GOAL_KEY, String(n));
  };

  return (
    <div className="stat-card-glass rounded-2xl p-4 sm:p-5 relative overflow-hidden"
      style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #FBBF24aa, transparent)" }} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: "#FBBF24" }} />
          <h3 className="text-sm uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Aylık Hedef
          </h3>
        </div>
        {!editing && (
          <button onClick={startEdit} className="text-white/25 hover:text-white transition-colors" title="Hedefi düzenle">
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Gerçekleşen
          </div>
          <div className="text-2xl sm:text-3xl font-display text-white" style={{ fontFamily: "var(--font-bebas)" }}>
            ₺{currentRevenue.toLocaleString("tr-TR")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Hedef
          </div>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input type="number" min="0" value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                className="w-24 bg-steel/60 border border-amber-500/40 text-amber-300 px-2 py-1 text-sm outline-none text-right rounded"
                style={{ fontFamily: "var(--font-bebas)" }} />
              <button onClick={save} className="text-green-400 hover:text-green-300"><Check size={15} /></button>
              <button onClick={() => setEditing(false)} className="text-white/30 hover:text-white"><X size={15} /></button>
            </div>
          ) : (
            <div className="text-xl sm:text-2xl font-display" style={{ fontFamily: "var(--font-bebas)", color: "#FBBF24" }}>
              ₺{goal.toLocaleString("tr-TR")}
            </div>
          )}
        </div>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: loaded ? `${pct}%` : 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: pct >= 100 ? "linear-gradient(90deg,#22C55E,#4ADE80)" : "linear-gradient(90deg,#F59E0B,#FBBF24)" }}
        />
      </div>

      <div className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        <span className="font-bold" style={{ color: pct >= 100 ? "#4ADE80" : "#FBBF24" }}>%{pct}</span>
        <span className="text-white/30">
          {remaining > 0 ? `₺${remaining.toLocaleString("tr-TR")} kaldı` : "Hedef tamamlandı 🎉"}
        </span>
      </div>
    </div>
  );
}
