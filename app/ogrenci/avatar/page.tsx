"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments,
  getStudentAvatar, saveStudentAvatar,
} from "@/lib/db";
import { getHealthProfile, getWeightLogs } from "@/lib/health";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import type { StudentAvatarConfig, AvatarGender, AvatarBodyType } from "@/lib/types";
import {
  SKIN_TONES, EYE_COLORS, HAIR_STYLES, HAIR_COLORS, EYEBROW_STYLES, BEARD_STYLES,
  OUTFITS, GLOVE_COLORS, SHOE_STYLES, TATTOOS, AURAS, BACKGROUNDS, BELTS,
  getEvolutionTier, getEarnedBadgeIds, isOptionUnlocked, BODY_TYPE_LABELS,
  type CatalogOption,
} from "@/lib/avatarEvolution";
import { PageHeader, Card, Button } from "@/app/components/ui";
import LazyStudentAvatar from "@/app/components/shared/LazyStudentAvatar";
import { Lock, Save, Check } from "lucide-react";

const DEFAULT_CONFIG = (studentId: string): StudentAvatarConfig => ({
  studentId, gender: "male", skinTone: "tone-3", eyeColor: "brown",
  hairStyle: "short-1", hairColor: "black", eyebrowStyle: "neutral", beardStyle: "none",
  bodyType: "athletic", outfitId: "starter-kit", gloveColor: "red", shoeId: "starter",
  tattooId: "none", equippedCosmetics: {},
});

const BODY_TYPE_OPTS: { id: AvatarBodyType; label: string }[] = [
  { id: "slim", label: BODY_TYPE_LABELS.slim },
  { id: "athletic", label: BODY_TYPE_LABELS.athletic },
  { id: "heavy", label: BODY_TYPE_LABELS.heavy },
];

function isColor(v: string) { return v.startsWith("#"); }

function OptionRow({
  title, options, selected, earnedBadgeIds, onSelect,
}: {
  title: string; options: CatalogOption[]; selected: string;
  earnedBadgeIds: Set<string>; onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs uppercase tracking-widest text-white/40 mb-2" style={{ fontFamily: "var(--font-label)" }}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const unlocked = isOptionUnlocked(opt, earnedBadgeIds);
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              disabled={!unlocked}
              onClick={() => onSelect(opt.id)}
              title={!unlocked ? `Kilitli — rozet gerekiyor: ${opt.unlockBadgeId}` : opt.label}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${
                active ? "ring-2 ring-gold" : "ring-1 ring-white/10 hover:ring-white/25"
              } ${!unlocked ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
              style={{ background: isColor(opt.value) ? undefined : "rgba(255,255,255,0.04)", fontFamily: "var(--font-barlow-condensed)" }}
            >
              {isColor(opt.value) && (
                <span className="w-4 h-4 rounded-full inline-block flex-shrink-0" style={{ background: opt.value, border: "1px solid rgba(255,255,255,0.2)" }} />
              )}
              <span className="text-white/80">{opt.label}</span>
              {active && <Check size={12} className="text-gold-bright" />}
              {!unlocked && <Lock size={11} className="text-white/40" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AvatarPage() {
  const { student } = useAuth();
  const [config, setConfig] = useState<StudentAvatarConfig | null>(null);
  const [xp, setXp] = useState(0);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [heightWeight, setHeightWeight] = useState<{ height: number; weight: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!student) return;
    const season = getCurrentSeason();
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id),
      getStudentAvatar(student.id),
      getHealthProfile(student.id),
      getWeightLogs(student.id, 90),
    ]).then(([apts, recs, xpAdj, existingAvatar, health]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const xpSummary = computeFullXP(student.completedLessons, apts, sorted, season, xpAdj);
      const lifetimeXP = xpSummary.lifetimeResult.breakdown.total;
      const manualXP = sumManualXP(xpAdj);
      const badges = computeBadges(student, apts, sorted, {}, manualXP);

      setXp(lifetimeXP);
      setEarnedBadgeIds(getEarnedBadgeIds(badges));
      if (health) setHeightWeight({ height: health.height, weight: health.weight });

      if (existingAvatar) {
        setConfig(existingAvatar);
      } else {
        const base = DEFAULT_CONFIG(student.id);
        if (health) base.gender = health.gender;
        setConfig(base);
      }
    }).finally(() => setLoading(false));
  }, [student]);

  const tier = useMemo(() => getEvolutionTier(xp), [xp]);

  const update = (patch: Partial<StudentAvatarConfig>) => {
    setConfig(c => c ? { ...c, ...patch } : c);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const result = await saveStudentAvatar(config);
      setConfig(result);
      setSaved(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Kaydedilemedi, lütfen tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-crimson border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28">
      <PageHeader title="Avatarını Oluştur" subtitle="Kişiselleştirilebilir karakterin, ilerledikçe seninle birlikte gelişir" accent="Kedi Avatar" />

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 min-w-0">
        {/* Canlı önizleme — `min-w-0 w-full` mobilde ZORUNLU: grid item'ların
            varsayılan `min-width: auto`'su, içerik (canvas) küçülmek istese
            bile bu konteynerin 320px viewport'a sığacak kadar daralmasını
            ENGELLİYORDU (320px'te sağdan kesiliyordu, doğrulandı). `lg:`
            öneki YOK — sadece mobil/dar ekran davranışını düzeltiyor,
            masaüstü `lg:sticky lg:top-6 lg:self-start` AYNEN korunuyor. */}
        <div className="lg:sticky lg:top-6 lg:self-start min-w-0 w-full">
          <Card className="p-6 flex flex-col items-center gap-4 min-w-0">
            <div className="w-full rounded-2xl flex items-center justify-center py-3" style={{ background: "#0a0a0c" }}>
              <LazyStudentAvatar config={config} tier={tier} size={140} />
            </div>
            <p className="text-[10px] text-white/30 text-center -mt-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Canlı önizleme — aşağıdaki kozmetik seçimler Dijital Salon&apos;daki avatarına anında yansır.
            </p>
            <div className="text-center">
              <p className="text-white font-semibold text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{tier.level.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{xp.toLocaleString("tr-TR")} XP</p>
            </div>
            {heightWeight && (
              <p className="text-white/30 text-[11px] text-center" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Sağlık profili: {heightWeight.height}cm, {heightWeight.weight}kg —{" "}
                <Link href="/ogrenci/saglik" className="underline text-gold/70">güncelle</Link>
              </p>
            )}
            <Button onClick={handleSave} loading={saving} className="w-full">
              <Save size={16} />
              {saved ? "Kaydedildi" : "Kaydet"}
            </Button>
          </Card>
        </div>

        {/* Kategori seçimleri */}
        <Card className="p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <OptionRow title="Cinsiyet" earnedBadgeIds={earnedBadgeIds} selected={config.gender}
              options={[{ id: "male", label: "Erkek", value: "male" }, { id: "female", label: "Kadın", value: "female" }]}
              onSelect={id => update({ gender: id as AvatarGender })} />
            <OptionRow title="Ten Rengi" options={SKIN_TONES} selected={config.skinTone} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ skinTone: id })} />
            <OptionRow title="Göz Rengi" options={EYE_COLORS} selected={config.eyeColor} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ eyeColor: id })} />
            <OptionRow title="Saç Modeli" options={HAIR_STYLES} selected={config.hairStyle} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ hairStyle: id })} />
            <OptionRow title="Saç Rengi" options={HAIR_COLORS} selected={config.hairColor} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ hairColor: id })} />
            <OptionRow title="Kaş" options={EYEBROW_STYLES} selected={config.eyebrowStyle} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ eyebrowStyle: id })} />
            <OptionRow title="Sakal" options={BEARD_STYLES} selected={config.beardStyle} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ beardStyle: id })} />
            <OptionRow title="Vücut Tipi" earnedBadgeIds={earnedBadgeIds} selected={config.bodyType}
              options={BODY_TYPE_OPTS.map(o => ({ id: o.id, label: o.label, value: o.id }))}
              onSelect={id => update({ bodyType: id as AvatarBodyType })} />
            <OptionRow title="Kickboks Kıyafeti" options={OUTFITS} selected={config.outfitId} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ outfitId: id })} />
            <OptionRow title="Eldiven Rengi" options={GLOVE_COLORS} selected={config.gloveColor} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ gloveColor: id })} />
            <OptionRow title="Ayakkabı" options={SHOE_STYLES} selected={config.shoeId} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ shoeId: id })} />
            <OptionRow title="Dövme" options={TATTOOS} selected={config.tattooId ?? "none"} earnedBadgeIds={earnedBadgeIds}
              onSelect={id => update({ tattooId: id })} />

            <div className="mt-6 pt-6 border-t border-white/8">
              <p className="text-sm text-white/50 mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Premium Kozmetikler — rozet kazandıkça açılır
              </p>
              <OptionRow title="Aura" options={AURAS} selected={config.equippedCosmetics?.aura ?? "none"} earnedBadgeIds={earnedBadgeIds}
                onSelect={id => update({ equippedCosmetics: { ...config.equippedCosmetics, aura: id } })} />
              <OptionRow title="Arka Plan" options={BACKGROUNDS} selected={config.equippedCosmetics?.background ?? "none"} earnedBadgeIds={earnedBadgeIds}
                onSelect={id => update({ equippedCosmetics: { ...config.equippedCosmetics, background: id } })} />
              <OptionRow title="Kemer" options={BELTS} selected={config.equippedCosmetics?.belt ?? "none"} earnedBadgeIds={earnedBadgeIds}
                onSelect={id => update({ equippedCosmetics: { ...config.equippedCosmetics, belt: id } })} />
            </div>
          </motion.div>
        </Card>
      </div>
    </div>
  );
}
