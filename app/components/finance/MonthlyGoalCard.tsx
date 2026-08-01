"use client";

import { useEffect, useState } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { getAppSetting, setAppSetting } from "@/lib/db";
import CircularProgress from "./CircularProgress";
import CountUpNumber from "./CountUpNumber";

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
  const ringColor = pct >= 100 ? "#4ADE80" : "#FBBF24";

  const startEdit = () => { setDraft(String(goal)); setEditing(true); };
  const save = async () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0) { setEditing(false); return; }
    setGoal(n);
    setEditing(false);
    await setAppSetting(GOAL_KEY, String(n));
  };

  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-gold gradient-border-quiet">
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} style={{ color: "#FBBF24" }} />
          <h3 className="text-sm uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>
            Aylık Hedef
          </h3>
        </div>
        {!editing && (
          <button onClick={startEdit} className="text-white/25 hover:text-white transition-colors" title="Hedefi düzenle">
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <CircularProgress percent={loaded ? pct : 0} size={104} strokeWidth={9} color={ringColor}>
          <span className="text-xl font-bold" style={{ color: ringColor, fontFamily: "var(--font-display)" }}>%{pct}</span>
        </CircularProgress>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-label)" }}>
              Gerçekleşen
            </div>
            <div className="text-xl sm:text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>
              <CountUpNumber value={currentRevenue} prefix="₺" />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-label)" }}>
              Hedef
            </div>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                  className="glass w-24 px-2 py-1 text-sm outline-none text-right rounded"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)" }} />
                <button onClick={save} style={{ color: "var(--color-success)" }}><Check size={15} /></button>
                <button onClick={() => setEditing(false)} className="text-white/30 hover:text-white"><X size={15} /></button>
              </div>
            ) : (
              <div className="text-lg sm:text-xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)" }}>
                ₺{goal.toLocaleString("tr-TR")}
              </div>
            )}
          </div>
          <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
            {remaining > 0 ? `₺${remaining.toLocaleString("tr-TR")} kaldı` : "Hedef tamamlandı 🎉"}
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
