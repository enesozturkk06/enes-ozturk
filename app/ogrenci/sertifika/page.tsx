"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments,
} from "@/lib/db";
import type { Appointment, LessonRecord } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getLevelForXP, sumManualXP, XP_LEVELS,
} from "@/lib/xp";
import { PageHeader } from "@/app/components/ui";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Award, Printer, Lock } from "lucide-react";
import { triggerConfetti } from "@/app/components/shared/ConfettiEffect";

/* ── Sertifika tanımları ─────────────────────────────────── */

interface CertDef {
  id:          string;
  title:       string;
  subtitle:    string;
  icon:        string;
  color:       string;
  glow:        string;
  condition:   (completedLessons: number, xp: number) => boolean;
  earnedLabel: (completedLessons: number, xp: number) => string;
}

const CERT_DEFS: CertDef[] = [
  {
    id: "first_lesson",
    title: "İlk Ders",
    subtitle: "Yolculuğun başladı!",
    icon: "🥊",
    color: "#22C55E",
    glow: "rgba(34,197,94,0.4)",
    condition: (l) => l >= 1,
    earnedLabel: (l) => `${l} ders tamamlandı`,
  },
  {
    id: "lessons_10",
    title: "10 Ders Tamamlandı",
    subtitle: "Tutarlılığın ödülü",
    icon: "🏅",
    color: "#CD7F32",
    glow: "rgba(205,127,50,0.4)",
    condition: (l) => l >= 10,
    earnedLabel: (l) => `${l} ders tamamlandı`,
  },
  {
    id: "lessons_25",
    title: "25 Ders Tamamlandı",
    subtitle: "Ciddi bir sporcu",
    icon: "⭐",
    color: "#D1D5DB",
    glow: "rgba(209,213,219,0.4)",
    condition: (l) => l >= 25,
    earnedLabel: (l) => `${l} ders tamamlandı`,
  },
  {
    id: "lessons_50",
    title: "50 Ders Tamamlandı",
    subtitle: "Yarı yüzyıl!",
    icon: "🥇",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.4)",
    condition: (l) => l >= 50,
    earnedLabel: (l) => `${l} ders tamamlandı`,
  },
  {
    id: "lessons_100",
    title: "100 Ders Sertifikası",
    subtitle: "Bağlılık ve disiplinin kanıtı",
    icon: "🏆",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.5)",
    condition: (l) => l >= 100,
    earnedLabel: (l) => `${l} ders tamamlandı`,
  },
  {
    id: "altın_sporcu",
    title: "Altın Sporcu Sertifikası",
    subtitle: "Üst düzey performans",
    icon: "🥇",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.5)",
    condition: (_l, xp) => xp >= (XP_LEVELS.find(l => l.id === "altin")?.threshold ?? 4000),
    earnedLabel: (_l, xp) => `${xp.toLocaleString()} XP`,
  },
  {
    id: "elmas_sporcu",
    title: "Elmas Sporcu Sertifikası",
    subtitle: "Elit seviye",
    icon: "💎",
    color: "#67E8F9",
    glow: "rgba(103,232,249,0.5)",
    condition: (_l, xp) => xp >= (XP_LEVELS.find(l => l.id === "elmas")?.threshold ?? 8000),
    earnedLabel: (_l, xp) => `${xp.toLocaleString()} XP`,
  },
  {
    id: "efsane_sporcu",
    title: "Efsane Sporcu Sertifikası",
    subtitle: "Zirvede bir isim",
    icon: "👑",
    color: "#C084FC",
    glow: "rgba(192,132,252,0.5)",
    condition: (_l, xp) => xp >= (XP_LEVELS.find(l => l.id === "efsane")?.threshold ?? 15000),
    earnedLabel: (_l, xp) => `${xp.toLocaleString()} XP`,
  },
];

/* ── Yazdırılabilir sertifika bileşeni ───────────────────── */

function PrintCert({ def, studentName, earnedText, date }: {
  def: CertDef; studentName: string; earnedText: string; date: string;
}) {
  return (
    <div id={`cert-${def.id}`} style={{
      width: 794, minHeight: 562,
      background: "#0a0a14",
      border: `3px solid ${def.color}`,
      boxShadow: `0 0 60px ${def.glow}, inset 0 0 80px rgba(0,0,0,0.6)`,
      padding: "48px 60px",
      position: "relative",
      overflow: "hidden",
      fontFamily: "serif",
    }}>
      {/* Corner decorations */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 40, height: 40,
          borderTop:    i < 2  ? `2px solid ${def.color}80` : "none",
          borderBottom: i >= 2 ? `2px solid ${def.color}80` : "none",
          borderLeft:   i % 2 === 0 ? `2px solid ${def.color}80` : "none",
          borderRight:  i % 2 === 1 ? `2px solid ${def.color}80` : "none",
          top:    i < 2  ? 12 : undefined,
          bottom: i >= 2 ? 12 : undefined,
          left:   i % 2 === 0 ? 12 : undefined,
          right:  i % 2 === 1 ? 12 : undefined,
        }} />
      ))}

      {/* Background glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${def.glow.replace("0.4","0.06")} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Issuer */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: `${def.color}aa`, textTransform: "uppercase", fontFamily: "sans-serif" }}>
          ENES ÖZTÜRK KİŞİSEL ANTRENÖR
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${def.color}60, transparent)`, margin: "12px 0 24px" }} />

      {/* Certificate text */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", marginBottom: 16 }}>
          BU SERTİFİKA
        </div>

        <div style={{
          fontSize: 38, fontWeight: 700,
          background: `linear-gradient(135deg, ${def.color}, #fff, ${def.color})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: 8,
          fontFamily: "var(--font-bebas, sans-serif)",
          letterSpacing: "0.06em",
        }}>
          {studentName}
        </div>

        <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", fontFamily: "sans-serif", marginBottom: 28 }}>
          ADLI SPORCUya
        </div>

        {/* Icon */}
        <div style={{ fontSize: 64, marginBottom: 16, filter: `drop-shadow(0 0 20px ${def.color})` }}>
          {def.icon}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 28, fontWeight: 700,
          color: def.color,
          letterSpacing: "0.08em",
          fontFamily: "var(--font-bebas, sans-serif)",
          textShadow: `0 0 24px ${def.glow}`,
          marginBottom: 8,
        }}>
          {def.title.toUpperCase()}
        </div>

        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "sans-serif", marginBottom: 32 }}>
          {def.subtitle}
        </div>

        {/* Stat */}
        <div style={{
          display: "inline-block",
          padding: "6px 20px",
          border: `1px solid ${def.color}60`,
          borderRadius: 20,
          fontSize: 12,
          color: `${def.color}cc`,
          fontFamily: "sans-serif",
          letterSpacing: "0.08em",
          marginBottom: 32,
        }}>
          {earnedText}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${def.color}60, transparent)`, margin: "0 0 16px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>
          Tarih: {date}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>
          enesozturkantrenman.com
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif", letterSpacing: "0.1em" }}>
          ENES ÖZTÜRK
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANA SAYFA
   ═══════════════════════════════════════════════════════════════ */
export default function SertifikaPage() {
  const { student } = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [xp,       setXp]       = useState(0);
  const [selected, setSelected] = useState<CertDef | null>(null);

  useEffect(() => {
    if (!student) return;
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id).catch(() => []),
    ]).then(([apts, recs, adjs]) => {
      const fullXP = computeFullXP(student.completedLessons, apts, recs, getCurrentSeason(), adjs);
      setXp(fullXP.lifetimeResult.breakdown.total);
      setLoading(false);
    });
  }, [student]);

  const handlePrint = useCallback((def: CertDef) => {
    setSelected(def);
    setTimeout(() => window.print(), 300);
  }, []);

  const handleCardClick = useCallback((def: CertDef, earned: boolean) => {
    if (!earned) return;
    triggerConfetti("certificate");
    setSelected(def);
  }, []);

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completedLessons = student.completedLessons;
  const today = format(new Date(), "d MMMM yyyy", { locale: tr });

  const certs = CERT_DEFS.map(def => ({
    def,
    earned: def.condition(completedLessons, xp),
    earnedText: def.earnedLabel(completedLessons, xp),
  }));

  const earnedCount = certs.filter(c => c.earned).length;

  return (
    <>
      {/* ── Yazdırma bölümü (sadece print'te görünür) ───────── */}
      {selected && (
        <div className="hidden print-only" style={{ padding: 20 }}>
          <PrintCert
            def={selected}
            studentName={student.fullName}
            earnedText={selected.earnedLabel(completedLessons, xp)}
            date={today}
          />
        </div>
      )}

      {/* ── Sayfa içeriği ────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto space-y-6 no-print">
        <PageHeader title="Sertifikalarım" subtitle="Kazandığın başarı sertifikaları" accent="Başarı" />

        {/* Özet */}
        <div className="flex items-center gap-4 p-4 border"
          style={{ background: "rgba(139,92,246,0.04)", borderColor: "rgba(139,92,246,0.18)", borderRadius: 8 }}>
          <Award size={24} style={{ color: "#A78BFA" }} />
          <div>
            <div className="text-xl font-bold" style={{ color: "#A78BFA", fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" }}>
              {earnedCount} / {certs.length} SERTİFİKA KAZANILDI
            </div>
            <div className="text-xs text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {completedLessons} ders · {xp.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Sertifika kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certs.map(({ def, earned, earnedText }, i) => (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleCardClick(def, earned)}
              className={`relative p-5 border transition-all duration-300 ${earned ? "cursor-pointer" : "opacity-50 cursor-default"}`}
              style={{
                background:   earned ? `linear-gradient(135deg, ${def.glow.replace("0.4","0.06")}, rgba(0,0,0,0))` : "rgba(255,255,255,0.02)",
                borderColor:  earned ? `${def.color}50` : "rgba(255,255,255,0.07)",
                boxShadow:    earned ? `0 0 24px ${def.glow.replace("0.4","0.15")}` : "none",
                borderRadius: 10,
              }}
            >
              {/* Earned shine strip */}
              {earned && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${def.color}, transparent)`,
                  borderRadius: "10px 10px 0 0",
                }} />
              )}

              {/* Lock overlay */}
              {!earned && (
                <div className="absolute top-3 right-3">
                  <Lock size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              )}

              <div className="flex items-start gap-4">
                <div style={{ fontSize: 44, filter: earned ? `drop-shadow(0 0 12px ${def.color})` : "grayscale(1) opacity(0.4)" }}>
                  {def.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold" style={{
                    color: earned ? def.color : "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-bebas)", letterSpacing: "0.06em",
                  }}>
                    {def.title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                    {def.subtitle}
                  </div>
                  {earned && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5" style={{
                        background: `${def.color}20`, border: `1px solid ${def.color}40`,
                        color: def.color, borderRadius: 12, fontFamily: "var(--font-barlow-condensed)",
                      }}>
                        {earnedText}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Print button */}
              {earned && (
                <button
                  onClick={e => { e.stopPropagation(); handlePrint(def); }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all"
                  style={{
                    background: `${def.color}15`,
                    border: `1px solid ${def.color}40`,
                    color: def.color,
                    borderRadius: 6,
                    fontFamily: "var(--font-barlow-condensed)",
                    letterSpacing: "0.06em",
                  }}
                >
                  <Printer size={12} /> YAZDIR / PDF KAYDET
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Sertifika önizleme */}
        {selected && (
          <div className="mt-8">
            <div className="text-xs text-white/30 uppercase tracking-widest mb-4 text-center" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Sertifika Önizleme
            </div>
            <div className="overflow-x-auto rounded-lg">
              <div style={{ transform: "scale(0.7)", transformOrigin: "top left", width: "max-content" }}>
                <PrintCert
                  def={selected}
                  studentName={student.fullName}
                  earnedText={selected.earnedLabel(completedLessons, xp)}
                  date={today}
                />
              </div>
            </div>
          </div>
        )}

        <div className="pb-20">
          <p className="text-center text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Sertifikanı basmak için "Yazdır / PDF Kaydet" butonuna bas
          </p>
        </div>
      </div>
    </>
  );
}
