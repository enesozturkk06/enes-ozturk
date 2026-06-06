"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getLessonRecords } from "@/lib/db";
import type { LessonRecord } from "@/lib/types";
import { Card, PageHeader, ScoreBar, Badge } from "@/app/components/ui";
import { SCORE_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp, BookOpen } from "lucide-react";

const scoreKeys = ["conditioning", "punch", "kick", "defense", "combination", "sparring"] as const;

export default function GelisimPage() {
  const { student } = useAuth();
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    getLessonRecords(student.id).then(r => { setRecords(r); setLoading(false); });
  }, [student]);

  if (!student || loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" /></div>;

  const last = records[0];
  const avg = (key: typeof scoreKeys[number]) => records.length ? Math.round(records.reduce((s, r) => s + r[key], 0) / records.length * 10) / 10 : 0;

  const radarData = scoreKeys.map(k => ({ subject: SCORE_LABELS[k].split(" ")[0], A: last?.[k] ?? 0, fullMark: 10 }));

  const lineData = [...records].reverse().map((r, i) => ({
    name: format(parseISO(r.date), "dd MMM", { locale: tr }),
    Genel: r.overall,
    Yumruk: r.punch,
    Tekme: r.kick,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Gelişim Takibi" subtitle="Ders notlarınız ve beceri gelişiminiz" accent="Performans" />

      {records.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz ders kaydınız bulunmuyor.</p>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Toplam Ders", value: records.length, color: "text-crimson" },
              { label: "Genel Ortalama", value: `${avg("conditioning")}`, color: "text-gold-bright" },
              { label: "En İyi Yumruk", value: `${Math.max(...records.map(r => r.punch))}/10`, color: "text-green-400" },
              { label: "Son Genel", value: last ? `${last.overall}/10` : "—", color: "text-white" },
            ].map(s => (
              <Card key={s.label} className="p-4 text-center">
                <div className={`text-3xl font-display ${s.color}`} style={{ fontFamily: "var(--font-bebas)" }}>{s.value}</div>
                <div className="text-xs text-white/30 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Radar chart */}
            <Card className="p-6">
              <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
                Son Ders Radar
              </h3>
              {last && (
                <div className="text-xs text-white/30 mb-4" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {format(parseISO(last.date), "dd MMMM yyyy", { locale: tr })}
                </div>
              )}
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "var(--font-barlow-condensed)" }} />
                  <Radar name="Skor" dataKey="A" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} dot={{ fill: "#dc2626", r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* Progress trend */}
            <Card className="p-6">
              <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
                Gelişim Trendi
              </h3>
              {lineData.length < 2 ? (
                <div className="flex items-center justify-center h-56 text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  En az 2 ders kaydı gerekli
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--font-barlow-condensed)" }} />
                    <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }} labelStyle={{ color: "#fff" }} />
                    <Line type="monotone" dataKey="Genel" stroke="#dc2626" strokeWidth={2} dot={{ fill: "#dc2626", r: 3 }} />
                    <Line type="monotone" dataKey="Yumruk" stroke="#d97706" strokeWidth={2} dot={{ fill: "#d97706", r: 3 }} />
                    <Line type="monotone" dataKey="Tekme" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Lesson records list */}
          <Card className="p-6">
            <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
              Ders Geçmişi
            </h3>
            <div className="space-y-4">
              {records.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 bg-steel/30 border border-white/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {format(parseISO(r.date), "dd MMMM yyyy (EEEE)", { locale: tr })}
                      </div>
                      <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {r.durationMinutes} dakika
                      </div>
                    </div>
                    <Badge color={r.overall >= 8 ? "green" : r.overall >= 6 ? "gold" : "red"}>
                      Genel: {r.overall}/10
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {scoreKeys.map(k => (
                      <ScoreBar key={k} label={SCORE_LABELS[k]} score={r[k]} />
                    ))}
                  </div>

                  {r.trainerNotes && (
                    <div className="mt-3 p-3 bg-carbon/60 border-l-2 border-gold/40">
                      <div className="text-xs text-gold/60 mb-1 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Antrenör Notu</div>
                      <p className="text-xs text-white/50 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{r.trainerNotes}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
