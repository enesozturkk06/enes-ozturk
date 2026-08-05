"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getPublishedKediProgram } from "@/lib/db";
import type { KediProgram, KediSport, KediProgramGoal } from "@/lib/types";
import { SPORT_OPTS, GOAL_OPTS, DAYS_PER_WEEK_OPTS } from "@/lib/kediProgramLabels";
import { exportKediProgramPdf } from "@/lib/kediProgramPdf";
import { Card, Button, Select } from "@/app/components/ui";
import KediAvatar from "./KediAvatar";
import KediProgramCards from "./KediProgramCards";
import { Dumbbell, Download, RotateCcw, AlertTriangle } from "lucide-react";

const GENERATING_STEPS = [
  "Devamsızlık ve performans geçmişin analiz ediliyor…",
  "Spora özel antrenman programı hazırlanıyor…",
  "Kalori ve makro hedeflerin hesaplanıyor…",
  "Beslenme planı ve alışveriş listesi oluşturuluyor…",
  "Son rötuşlar yapılıyor…",
];

export default function KediAiProgramPanel() {
  const { student } = useAuth();
  const [program, setProgram] = useState<KediProgram | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [sport, setSport] = useState<KediSport>("kickboks");
  const [goal, setGoal] = useState<KediProgramGoal>("kondisyon");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!student) return;
    getPublishedKediProgram(student.id)
      .then(p => {
        if (p) { setProgram(p); setSport(p.sport); setGoal(p.goalType); }
      })
      .finally(() => setLoadingExisting(false));
  }, [student]);

  const generate = async () => {
    if (!student) return;
    setGenerating(true);
    setError(null);
    setStepIndex(0);
    stepTimerRef.current = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, GENERATING_STEPS.length - 1));
    }, 12000);

    try {
      const res = await fetch("/api/kedi-ai/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: student.id, sport, goal, daysPerWeek,
          createdBy: "student", status: "published",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Program oluşturulamadı");
      setProgram(data.program as KediProgram);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu, lütfen tekrar dene.");
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setGenerating(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <KediAvatar size={28} state={generating ? "thinking" : "idle"} />
          <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            Kedi AI Premium Program
          </h3>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Select label="Spor Dalı" options={SPORT_OPTS} value={sport} onChange={v => setSport(v as KediSport)} />
          <Select label="Hedefin" options={GOAL_OPTS} value={goal} onChange={v => setGoal(v as KediProgramGoal)} />
          <Select label="Antrenman Sıklığı" options={DAYS_PER_WEEK_OPTS} value={String(daysPerWeek)} onChange={v => setDaysPerWeek(Number(v))} />
        </div>

        <Button onClick={generate} loading={generating} size="lg" className="w-full sm:w-auto">
          <Dumbbell size={18} />
          {generating ? "Kedi Program Hazırlıyor…" : program ? "Programı Yenile" : "Premium Program Oluştur"}
        </Button>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-crimson">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              {error.includes("Sağlık sayfasından") && (
                <Link href="/ogrenci/saglik" className="underline text-gold text-xs">Sağlık sayfasına git →</Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Generating state */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
            <KediAvatar size={56} state="thinking" />
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="text-white/50 text-sm mt-4"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {GENERATING_STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
            <p className="text-white/20 text-xs mt-2" style={{ fontFamily: "var(--font-label)" }}>Bu işlem 1-3 dakika sürebilir</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Program display */}
      <AnimatePresence>
        {program && !generating && student && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <KediProgramCards
              program={program}
              headerActions={
                <Button onClick={() => exportKediProgramPdf(program, student)} variant="secondary" size="sm">
                  <Download size={14} />
                  PDF İndir
                </Button>
              }
            />
            <div className="flex justify-center pt-4">
              <Button onClick={generate} variant="secondary" size="sm">
                <RotateCcw size={14} />
                Yenile
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
