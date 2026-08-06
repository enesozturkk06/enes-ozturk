"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments, getStudentAvatar,
} from "@/lib/db";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import type { StudentAvatarConfig, AvatarActivity } from "@/lib/types";
import { getEvolutionTier } from "@/lib/avatarEvolution";
import { PageHeader, Card } from "@/app/components/ui";
import LazyStudentAvatar from "@/app/components/shared/LazyStudentAvatar";
import { useInView } from "@/hooks/useInView";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { Trophy } from "lucide-react";

const ACTIVITY_ROTATION: AvatarActivity[] = ["idle", "guard", "shadowbox", "jumprope", "bagwork", "stretch", "drink", "phone"];
const ACTIVITY_LABELS: Record<AvatarActivity, string> = {
  idle: "Dinleniyor", guard: "Gard alıyor", shadowbox: "Gölge boksu yapıyor",
  jumprope: "İp atlıyor", bagwork: "Kum torbasına vuruyor", stretch: "Esniyor",
  drink: "Su içiyor", phone: "Telefonuna bakıyor",
};

export default function DijitalSalonPage() {
  const { student } = useAuth();
  const [avatarConfig, setAvatarConfig] = useState<StudentAvatarConfig | null>(null);
  const [xp, setXp] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<{ id: string; name: string; icon: string; color: string }[]>([]);
  const [daysSinceLastLesson, setDaysSinceLastLesson] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<AvatarActivity>("idle");
  const [captionIndex, setCaptionIndex] = useState(0);

  const { ref: sceneRef, inView } = useInView<HTMLDivElement>({ once: false, rootMargin: "100px" });
  const documentVisible = useDocumentVisible();
  const rotationActive = inView && documentVisible;

  useEffect(() => {
    if (!student) return;
    const season = getCurrentSeason();
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id),
      getStudentAvatar(student.id),
    ]).then(([apts, recs, xpAdj, avatar]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const xpSummary = computeFullXP(student.completedLessons, apts, sorted, season, xpAdj);
      const manualXP = sumManualXP(xpAdj);
      const badges = computeBadges(student, apts, sorted, {}, manualXP);

      setXp(xpSummary.lifetimeResult.breakdown.total);
      setEarnedBadges(badges.filter(b => b.earned).map(b => ({ id: b.id, name: b.name, icon: b.icon, color: b.color })));
      setAvatarConfig(avatar);

      const lastCompleted = apts
        .filter(a => a.status === "tamamlandi")
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      setDaysSinceLastLesson(lastCompleted ? differenceInCalendarDays(new Date(), parseISO(lastCompleted.date)) : null);
    }).finally(() => setLoading(false));
  }, [student]);

  const tier = useMemo(() => getEvolutionTier(xp), [xp]);

  // Aktivite döngüsü — SADECE sahne görünür VE sekme aktifken çalışır (Kedi Life performans kuralı).
  useEffect(() => {
    if (!rotationActive) return;
    const id = setInterval(() => {
      setActivity(ACTIVITY_ROTATION[Math.floor(Math.random() * ACTIVITY_ROTATION.length)]);
    }, 7000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, [rotationActive]);

  // Kedi AI yerel yorumları — YENİ bir AI çağrısı YOK, sadece zaten hesaplanmış veriden kısa cümleler.
  const captions = useMemo(() => {
    const list: string[] = [];
    if (daysSinceLastLesson !== null && daysSinceLastLesson >= 3) {
      list.push(`Son dersinden beri ${daysSinceLastLesson} gün geçti — antrenmana ne dersin?`);
    } else if (daysSinceLastLesson !== null && daysSinceLastLesson === 0) {
      list.push("Bugün ders yaptın, harikasın! 🔥");
    }
    if (earnedBadges.length > 0) {
      list.push(`${earnedBadges[earnedBadges.length - 1].name} rozetini kazandın, tebrikler!`);
    }
    list.push(`Şu an ${tier.level.name} seviyesindesin — avatarın buna göre gelişiyor.`);
    return list.length > 0 ? list : ["Antrenmana devam ettikçe avatarın gelişecek."];
  }, [daysSinceLastLesson, earnedBadges, tier]);

  useEffect(() => {
    if (!rotationActive || captions.length < 2) return;
    const id = setInterval(() => setCaptionIndex(i => (i + 1) % captions.length), 8000);
    return () => clearInterval(id);
  }, [rotationActive, captions.length]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28">
      <PageHeader title="Dijital Salon" subtitle="Avatarın burada yaşıyor ve gelişiyor" accent="Kedi Life" />

      <div ref={sceneRef}>
        <Card className="p-8 relative overflow-hidden">
          {/* Salon zemini — düz vektör, ağır asset yok */}
          <div aria-hidden className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(220,38,38,0.06), transparent 60%), linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.25) 100%)" }} />
          <div aria-hidden className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)" }} />

          <div className="relative flex flex-col items-center gap-4 py-6">
            {avatarConfig ? (
              <LazyStudentAvatar config={avatarConfig} tier={tier} activity={activity} size={180} />
            ) : (
              <div className="text-center py-10">
                <p className="text-white/40 text-sm mb-3">Henüz bir avatarın yok.</p>
                <a href="/ogrenci/avatar" className="text-gold-bright text-sm underline">Avatarını oluştur →</a>
              </div>
            )}
            {avatarConfig && (
              <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {ACTIVITY_LABELS[activity]}
              </span>
            )}
          </div>

          {avatarConfig && (
            <AnimatePresence mode="wait">
              <motion.div
                key={captionIndex}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="relative flex items-center gap-2 justify-center mt-2 px-4 py-2.5 rounded-xl mx-auto max-w-md"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}
              >
                <span className="text-base flex-shrink-0">🐈</span>
                <p className="text-xs sm:text-sm text-white/70 text-center" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {captions[captionIndex]}
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </Card>
      </div>

      {earnedBadges.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-gold-bright" />
            <h3 className="text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Rozet Vitrini</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {earnedBadges.map(b => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${b.color}30` }}>
                <span className="text-lg">{b.icon}</span>
                <span className="text-xs text-white/70" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{b.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
