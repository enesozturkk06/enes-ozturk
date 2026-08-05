"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getKediVisionAnalyses } from "@/lib/db";
import { compressImageToDataUrl, extractVideoFrames } from "@/lib/kediVisionClient";
import type { KediVisionAnalysis, KediVisionCategoryScores } from "@/lib/types";
import { Card, Button, ProgressBar } from "@/app/components/ui";
import KediAvatar from "./KediAvatar";
import {
  Camera, Video, AlertTriangle, TrendingUp, CheckCircle2,
  ListChecks, CalendarDays, ClipboardList, Sparkles,
} from "lucide-react";

const CATEGORY_LABELS: Record<keyof KediVisionCategoryScores, string> = {
  gard: "Gard", hiz: "Hız", guc: "Güç", denge: "Denge",
  ayakCalismasi: "Ayak Çalışması", rotasyon: "Rotasyon", savunma: "Savunma",
};

const STEPS_PHOTO = [
  "Fotoğraf yükleniyor…",
  "Gard duruşu ve ayak pozisyonu inceleniyor…",
  "Kalça rotasyonu ve denge değerlendiriliyor…",
  "Teknik skor hesaplanıyor…",
];
const STEPS_VIDEO = [
  "Videodan kareler çıkarılıyor…",
  "Kareler kare kare inceleniyor…",
  "Teknikler (yumruk/tekme) değerlendiriliyor…",
  "Teknik skor hesaplanıyor…",
];

function scoreColor(score: number): "green" | "gold" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "gold";
  return "red";
}

export default function KediVisionPanel() {
  const { student } = useAuth();
  const [history, setHistory] = useState<KediVisionAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<string[]>(STEPS_PHOTO);
  const [result, setResult] = useState<KediVisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!student) return;
    getKediVisionAnalyses(student.id).then(setHistory).finally(() => setLoadingHistory(false));
  }, [student]);

  const runSteps = (s: string[]) => {
    setSteps(s);
    setStepIndex(0);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, s.length - 1));
    }, 4000);
  };

  const submit = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/kedi-ai/vision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analiz oluşturulamadı");
    const analysis = data.analysis as KediVisionAnalysis;
    setResult(analysis);
    setHistory(h => [analysis, ...h]);
  };

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !student) return;
    if (!file.type.startsWith("image/")) { setError("Sadece görsel dosyalar desteklenir."); return; }

    setAnalyzing(true); setError(null); setResult(null);
    runSteps(STEPS_PHOTO);
    try {
      const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
      await submit({ studentId: student.id, mediaType: "photo", imageDataUrl: dataUrl, createdBy: "student" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu, lütfen tekrar dene.");
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setAnalyzing(false);
    }
  };

  const handleVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !student) return;
    if (!file.type.startsWith("video/")) { setError("Sadece video dosyaları desteklenir."); return; }

    setAnalyzing(true); setError(null); setResult(null);
    runSteps(STEPS_VIDEO);
    try {
      const frames = await extractVideoFrames(file, 5, 480);
      await submit({ studentId: student.id, mediaType: "video", frameDataUrls: frames, createdBy: "student" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu, lütfen tekrar dene.");
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <KediAvatar size={28} state={analyzing ? "thinking" : "idle"} />
          <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
            Kedi AI Vision — Teknik Analiz
          </h3>
        </div>
        <p className="text-sm text-white/40 mb-5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Bir duruş fotoğrafı ya da kısa bir antrenman videosu yükle — Kedi gard, ayak pozisyonu, denge ve daha fazlasını analiz etsin.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => photoInputRef.current?.click()} loading={analyzing} size="lg" className="flex-1">
            <Camera size={18} />
            Fotoğraf Analiz Et
          </Button>
          <Button onClick={() => videoInputRef.current?.click()} loading={analyzing} variant="secondary" size="lg" className="flex-1">
            <Video size={18} />
            Video Analiz Et
          </Button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-crimson">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
            <KediAvatar size={56} state="thinking" />
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="text-white/50 text-sm mt-4"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {steps[stepIndex]}
              </motion.p>
            </AnimatePresence>
            <p className="text-white/20 text-xs mt-2" style={{ fontFamily: "var(--font-label)" }}>Bu işlem 30-90 saniye sürebilir</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !analyzing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Teknik Skor</h4>
                <span className={`text-3xl font-bold ${scoreColor(result.overallScore) === "green" ? "text-green-400" : scoreColor(result.overallScore) === "gold" ? "text-gold-bright" : "text-crimson"}`}
                  style={{ fontFamily: "var(--font-bebas)" }}>
                  {result.overallScore}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {(Object.keys(CATEGORY_LABELS) as (keyof KediVisionCategoryScores)[]).map(key => (
                  <ProgressBar key={key} label={CATEGORY_LABELS[key]} value={result.categories[key]} showValue
                    color={scoreColor(result.categories[key])} />
                ))}
              </div>
              {result.progressNote && (
                <div className="mt-4 flex items-start gap-2 text-sm text-gold-bright bg-gold/10 rounded-lg p-3">
                  <TrendingUp size={16} className="flex-shrink-0 mt-0.5" />
                  <p>{result.progressNote}</p>
                </div>
              )}
              <p className="mt-4 text-sm text-white/60" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{result.rawSummary}</p>
            </Card>

            {result.deficiencies.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks size={18} className="text-crimson" />
                  <h4 className="text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Geliştirilecek Noktalar</h4>
                </div>
                <div className="space-y-3">
                  {result.deficiencies.map((d, i) => (
                    <div key={i} className="border-l-2 border-crimson/50 pl-3">
                      <p className="text-white text-sm font-medium">{d.area}</p>
                      <p className="text-white/50 text-xs mt-0.5">{d.issue}</p>
                      <p className="text-gold-bright text-xs mt-1">→ {d.fix}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {result.coachNotes.strengths.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-green-400" />
                    <h5 className="text-white text-sm font-medium">Güçlü Yönler</h5>
                  </div>
                  <ul className="space-y-1.5 text-sm text-white/50">
                    {result.coachNotes.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </Card>
              )}
              {result.coachNotes.homework.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={16} className="text-gold" />
                    <h5 className="text-white text-sm font-medium">Ev Ödevi</h5>
                  </div>
                  <ul className="space-y-1.5 text-sm text-white/50">
                    {result.coachNotes.homework.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </Card>
              )}
              {result.coachNotes.weeklyPlan.length > 0 && (
                <Card className="p-5 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-violet-400" />
                    <h5 className="text-white text-sm font-medium">Haftalık Çalışma Planı</h5>
                  </div>
                  <ul className="space-y-1.5 text-sm text-white/50">
                    {result.coachNotes.weeklyPlan.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loadingHistory && history.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-white/40" />
            <h4 className="text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Geçmiş Analizler</h4>
          </div>
          <div className="space-y-2">
            {history.slice(0, 8).map((a, i) => (
              <button key={a.id ?? i} onClick={() => setResult(a)}
                className="w-full flex items-center justify-between text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-sm text-white/60">
                  {a.mediaType === "photo" ? "📷" : "🎥"} {a.createdAt ? new Date(a.createdAt).toLocaleDateString("tr-TR") : ""}
                </span>
                <span className={`text-sm font-bold ${scoreColor(a.overallScore) === "green" ? "text-green-400" : scoreColor(a.overallScore) === "gold" ? "text-gold-bright" : "text-crimson"}`}>
                  {a.overallScore}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
