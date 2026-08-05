"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStudents, getPublishedProgramSummaries, getKediProgramHistory,
  updateKediProgramContent, publishKediProgram,
} from "@/lib/db";
import type { Student, KediProgram, KediSport, KediProgramGoal } from "@/lib/types";
import { SPORT_OPTS, GOAL_OPTS, DAYS_PER_WEEK_OPTS, SPORT_LABELS } from "@/lib/kediProgramLabels";
import { exportKediProgramPdf, buildWhatsAppProgramText, buildWhatsAppLink } from "@/lib/kediProgramPdf";
import { PageHeader, Card, Button, Select, Badge } from "@/app/components/ui";
import KediAvatar from "@/app/components/shared/KediAvatar";
import KediProgramCards from "@/app/components/shared/KediProgramCards";
import KediProgramEditor from "@/app/components/shared/KediProgramEditor";
import KediProgramHistoryCompare from "@/app/components/shared/KediProgramHistoryCompare";
import {
  Search, Sparkles, Download, MessageCircle, Printer, CheckCircle2,
  Pencil, History, LayoutGrid, AlertTriangle,
} from "lucide-react";

type ProgramSummary = Record<string, { sport: string; goalType: string; version: number; updatedAt: string }>;
type ViewMode = "generate" | "view" | "edit" | "history";

const GENERATING_STEPS = [
  "Yaş, boy, kilo ve hedef analiz ediliyor…",
  "Devamlılık ve ders performansı inceleniyor…",
  "Önceki programlar ve gelişim durumu karşılaştırılıyor…",
  "Spora özel antrenman programı hazırlanıyor…",
  "Beslenme planı ve alışveriş listesi oluşturuluyor…",
];

export default function KediKocMerkeziPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [summaries, setSummaries] = useState<ProgramSummary>({});
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

  const [history, setHistory] = useState<KediProgram[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewed, setViewed] = useState<KediProgram | null>(null);
  const [mode, setMode] = useState<ViewMode>("generate");

  const [sport, setSport] = useState<KediSport>("kickboks");
  const [goal, setGoal] = useState<KediProgramGoal>("kondisyon");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getStudents(), getPublishedProgramSummaries()])
      .then(([s, sum]) => { setStudents(s); setSummaries(sum); })
      .finally(() => setLoadingStudents(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => s.fullName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [students, search]);

  const loadHistory = (studentId: string) => {
    setLoadingHistory(true);
    getKediProgramHistory(studentId)
      .then(h => {
        setHistory(h);
        const published = h.find(p => p.status === "published");
        if (published) { setViewed(published); setSport(published.sport); setGoal(published.goalType); setMode("view"); }
        else { setViewed(null); setMode("generate"); }
      })
      .finally(() => setLoadingHistory(false));
  };

  const selectStudent = (s: Student) => {
    setSelected(s);
    setError(null);
    loadHistory(s.id);
  };

  /**
   * SADECE geçmiş listesini/özetleri tazeler — `viewed`/`mode`'a DOKUNMAZ.
   * `loadHistory` (yukarıda) her zaman "published" olanı otomatik seçer;
   * bunu taslak oluşturma/düzenleme sonrasında çağırmak, kullanıcının az
   * önce oluşturduğu/düzenlediği taslağı sessizce eski yayındaki sürümle
   * DEĞİŞTİRİRDİ. Sadece "öğrenci seçildiğinde" otomatik-seç davranışı
   * istenir; diğer tüm durumlarda `viewed` zaten doğru şekilde set edilmiş
   * olur, sadece arka plandaki listeler senkron kalsın yeter.
   */
  const refreshLists = (studentId: string) => {
    getKediProgramHistory(studentId).then(setHistory);
    getPublishedProgramSummaries().then(setSummaries);
  };

  const generate = async (status: "draft" | "published") => {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex(i => Math.min(i + 1, GENERATING_STEPS.length - 1)), 12000);

    try {
      const res = await fetch("/api/kedi-ai/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: selected.id, sport, goal, daysPerWeek,
          createdBy: "admin", status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Program oluşturulamadı");
      setViewed(data.program as KediProgram);
      setMode("view");
      refreshLists(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu, lütfen tekrar dene.");
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  };

  const handleSaveEdit = async (updated: KediProgram, changeNote: string) => {
    if (!updated.id || !selected) return;
    setSaving(true);
    try {
      const saved = await updateKediProgramContent(updated.id, updated, changeNote || undefined);
      setViewed(saved);
      setMode("view");
      refreshLists(selected.id);
    } catch {
      setError("Değişiklikler kaydedilemedi, lütfen tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (program: KediProgram) => {
    if (!program.id || !selected) return;
    setPublishingId(program.id);
    try {
      const published = await publishKediProgram(program.id, selected.id);
      setViewed(published);
      setMode("view");
      refreshLists(selected.id);
    } catch {
      setError("Yayınlama başarısız oldu, lütfen tekrar dene.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleWhatsApp = () => {
    if (!viewed || !selected?.phone) return;
    const text = buildWhatsAppProgramText(viewed, selected);
    window.open(buildWhatsAppLink(selected.phone, text), "_blank", "noopener");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-28">
      <PageHeader title="Kedi AI Koç Merkezi" subtitle="Öğrenciler için AI destekli premium antrenman ve beslenme programları" accent="Panel" />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* ── Öğrenci seçici ─────────────────────────────────────── */}
        <Card className="p-4 h-fit lg:sticky lg:top-4">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Öğrenci ara…"
              className="w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white placeholder-white/20 pl-9 pr-3 py-2.5 text-sm outline-none transition-all rounded-lg"
              style={{ fontFamily: "var(--font-inter)" }}
            />
          </div>

          {loadingStudents ? (
            <div className="text-center py-8"><div className="w-6 h-6 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {filtered.map(s => {
                const summary = summaries[s.id];
                const active = selected?.id === s.id;
                return (
                  <button
                    key={s.id} onClick={() => selectStudent(s)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors ${active ? "glass border border-crimson/30" : "hover:bg-white/5 border border-transparent"}`}
                  >
                    <div className="text-sm text-white font-semibold truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                    <div className="text-[11px] text-white/30 flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{s.code}</span>
                      {summary && <Badge color="green">{SPORT_LABELS[summary.sport as KediSport]}</Badge>}
                      {!summary && <span className="text-white/15">Program yok</span>}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="text-xs text-white/20 text-center py-4">Sonuç bulunamadı</p>}
            </div>
          )}
        </Card>

        {/* ── Ana panel ──────────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {!selected ? (
            <Card className="p-10 text-center">
              <Sparkles size={32} className="text-gold/40 mx-auto mb-3" />
              <p className="text-white/40 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                Başlamak için soldan bir öğrenci seç.
              </p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson font-display flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                    {selected.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-lg text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>{selected.fullName}</div>
                    <div className="text-xs text-white/30">{selected.code} · {selected.level}</div>
                  </div>
                </div>

                <div className="flex gap-1.5 no-print">
                  {(["view", "generate", "history"] as ViewMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      disabled={m === "view" && !viewed}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${mode === m ? "glass-strong text-white" : "text-white/40 hover:text-white/70"}`}
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      {m === "view" && <><LayoutGrid size={13} /> Program</>}
                      {m === "generate" && <><Sparkles size={13} /> Yeni Taslak</>}
                      {m === "history" && <><History size={13} /> Geçmiş ({history.length})</>}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-crimson">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><p>{error}</p>
                </div>
              )}

              {/* Generate */}
              {mode === "generate" && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <KediAvatar size={28} state={generating ? "thinking" : "idle"} />
                    <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                      {viewed ? "Yeni Taslak Program Oluştur" : "İlk Programı Oluştur"}
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4 mb-6">
                    <Select label="Spor Dalı" options={SPORT_OPTS} value={sport} onChange={v => setSport(v as KediSport)} />
                    <Select label="Hedef" options={GOAL_OPTS} value={goal} onChange={v => setGoal(v as KediProgramGoal)} />
                    <Select label="Antrenman Sıklığı" options={DAYS_PER_WEEK_OPTS} value={String(daysPerWeek)} onChange={v => setDaysPerWeek(Number(v))} />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => generate("draft")} loading={generating} size="lg">
                      <Sparkles size={16} /> {generating ? "Kedi Analiz Ediyor…" : "Taslak Oluştur (İnceleme İçin)"}
                    </Button>
                    <Button onClick={() => generate("published")} loading={generating} variant="secondary" size="lg">
                      Doğrudan Yayınla
                    </Button>
                  </div>
                  <p className="text-[11px] text-white/25 mt-3">
                    Taslak, sen onaylayıp yayınlayana kadar öğrenciye görünmez. &quot;Doğrudan Yayınla&quot;, incelemeden anında öğrenciye gösterir.
                  </p>

                  <AnimatePresence>
                    {generating && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
                        <KediAvatar size={48} state="thinking" />
                        <p className="text-white/50 text-sm mt-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{GENERATING_STEPS[stepIndex]}</p>
                        <p className="text-white/20 text-xs mt-1">Bu işlem 1-3 dakika sürebilir</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}

              {/* View */}
              {mode === "view" && viewed && (
                <>
                  <div className="flex flex-wrap gap-2 no-print">
                    <Badge color={viewed.status === "published" ? "green" : viewed.status === "draft" ? "gold" : "gray"}>
                      v{viewed.version} · {viewed.status === "published" ? "Yayında" : viewed.status === "draft" ? "Taslak" : "Arşiv"}
                    </Badge>
                    <Button onClick={() => setMode("edit")} variant="secondary" size="sm"><Pencil size={13} /> Düzenle</Button>
                    <Button onClick={() => exportKediProgramPdf(viewed, selected)} variant="secondary" size="sm"><Download size={13} /> PDF</Button>
                    <Button onClick={handleWhatsApp} variant="secondary" size="sm" disabled={!selected.phone}><MessageCircle size={13} /> WhatsApp</Button>
                    <Button onClick={() => window.print()} variant="secondary" size="sm"><Printer size={13} /> Yazdır</Button>
                    {viewed.status === "draft" && viewed.id && (
                      <Button onClick={() => handlePublish(viewed)} loading={publishingId === viewed.id} size="sm">
                        <CheckCircle2 size={13} /> Onayla ve Yayınla
                      </Button>
                    )}
                  </div>
                  <KediProgramCards program={viewed} />
                  <div className="hidden print-only" style={{ padding: 20 }}>
                    <KediProgramCards program={viewed} />
                  </div>
                </>
              )}

              {/* Edit */}
              {mode === "edit" && viewed && (
                <KediProgramEditor program={viewed} saving={saving} onCancel={() => setMode("view")} onSave={handleSaveEdit} />
              )}

              {/* History */}
              {mode === "history" && (
                loadingHistory
                  ? <div className="text-center py-10"><div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  : <KediProgramHistoryCompare
                      history={history}
                      publishingId={publishingId}
                      onView={p => { setViewed(p); setMode("view"); }}
                      onPublish={handlePublish}
                    />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
