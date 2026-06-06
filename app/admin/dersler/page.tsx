"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getLessonRecords, getStudents } from "@/lib/db";
import type { LessonRecord, Student } from "@/lib/types";
import { Card, PageHeader, Badge, ScoreBar } from "@/app/components/ui";
import { SCORE_LABELS } from "@/lib/constants";
import { BookOpen, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const scoreKeys = ["conditioning", "punch", "kick", "defense", "combination", "sparring"] as const;

export default function DerslerPage() {
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getLessonRecords(), getStudents()]).then(([r, s]) => { setRecords(r); setStudents(s); });
  }, []);

  const filtered = records.filter(r => {
    const s = students.find(st => st.id === r.studentId);
    const matchStudent = selectedStudent === "all" || r.studentId === selectedStudent;
    const matchSearch = !search || s?.fullName.toLowerCase().includes(search.toLowerCase()) || s?.code.toLowerCase().includes(search.toLowerCase());
    return matchStudent && matchSearch;
  });

  const selectedStudentObj = selectedStudent !== "all" ? students.find(s => s.id === selectedStudent) : null;
  const studentRecords = selectedStudent !== "all" ? records.filter(r => r.studentId === selectedStudent) : [];
  const avgScore = selectedStudentObj && studentRecords.length
    ? scoreKeys.map(k => ({ subject: SCORE_LABELS[k].split(" ")[0], A: Math.round(studentRecords.reduce((s, r) => s + r[k], 0) / studentRecords.length * 10) / 10, fullMark: 10 }))
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title="Ders Notları" subtitle="Tüm ders kayıtları ve gelişim analizi" accent="Admin" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Öğrenci ara..."
            className="w-full bg-carbon border border-white/10 text-white placeholder-white/20 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-crimson/60 transition-all"
            style={{ fontFamily: "var(--font-inter)" }}
          />
        </div>
        <select
          value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
          className="bg-carbon border border-white/10 text-white px-4 py-2.5 text-sm outline-none focus:border-crimson/60 transition-all"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <option value="all" className="bg-carbon">Tüm Öğrenciler</option>
          {students.map(s => <option key={s.id} value={s.id} className="bg-carbon">{s.fullName} ({s.code})</option>)}
        </select>
      </div>

      {/* Student radar if selected */}
      {avgScore && selectedStudentObj && (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson font-display" style={{ fontFamily: "var(--font-bebas)" }}>
              {selectedStudentObj.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>{selectedStudentObj.fullName}</div>
              <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{studentRecords.length} ders kaydı · Ortalama radar</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={avgScore}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "var(--font-barlow-condensed)" }} />
              <Radar name="Ortalama" dataKey="A" stroke="#d97706" fill="#d97706" fillOpacity={0.12} dot={{ fill: "#d97706", r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Records */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders kaydı bulunamadı</p>
          </div>
        ) : filtered.map((r, i) => {
          const student = students.find(s => s.id === r.studentId);
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-xs text-crimson font-display flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                      {student?.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{student?.fullName}</div>
                      <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {format(parseISO(r.date), "dd MMMM yyyy (EEEE)", { locale: tr })} · {r.durationMinutes} dk
                      </div>
                    </div>
                  </div>
                  <Badge color={r.overall >= 8 ? "green" : r.overall >= 6 ? "gold" : "red"}>
                    Genel: {r.overall}/10
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {scoreKeys.map(k => <ScoreBar key={k} label={SCORE_LABELS[k]} score={r[k]} />)}
                </div>

                {r.trainerNotes && (
                  <div className="p-3 bg-steel/30 border-l-2 border-gold/40">
                    <div className="text-xs text-gold/60 mb-1 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Antrenör Notu</div>
                    <p className="text-xs text-white/50 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{r.trainerNotes}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
