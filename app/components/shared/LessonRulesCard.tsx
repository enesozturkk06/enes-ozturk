"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Timer, MapPin, Backpack, Ban, XCircle, Clock, HeartPulse, Dumbbell,
} from "lucide-react";
import { CANCEL_LIMIT_HOURS, LESSON_DURATION_MINUTES, LESSON_RULES_REMINDER_TEXT } from "@/lib/constants";

const GOLD = "#d97706";
const RED  = "#ef4444";

function Section({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color, flexShrink: 0 }}>{icon}</span>
        <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {title}
        </span>
      </div>
      <div className="pl-6 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-barlow-condensed)" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Randevu sayfasının en üstünde gösterilen ders bilgilendirme kartı.
 * Öğrenci onaylamadıysa tam kart + onay kutusu, onayladıysa küçük hatırlatma gösterilir.
 */
export default function LessonRulesCard({
  accepted, onAccept,
}: {
  /** Kural onayı veritabanında zaten kayıtlı mı — true olunca kart küçük hatırlatmaya döner */
  accepted: boolean;
  onAccept: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  if (accepted) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
        style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35` }}>
        <Timer size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
        <p className="text-sm min-w-0" style={{ color: `${GOLD}dd`, fontFamily: "var(--font-barlow-condensed)" }}>
          {LESSON_RULES_REMINDER_TEXT}
        </p>
      </div>
    );
  }

  const handleToggle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onAccept();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 w-full">
      <div className="rounded-2xl overflow-hidden w-full relative"
        style={{ background: "rgba(15,15,22,0.95)", border: `1px solid ${GOLD}30` }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${GOLD},${RED},transparent)` }} />

        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: `${GOLD}20` }}>
          <Dumbbell size={16} style={{ color: GOLD, flexShrink: 0 }} />
          <span className="text-base font-bold text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            🥊 Ders Bilgilendirmesi
          </span>
        </div>

        <div className="px-4 pt-1">
          <Section icon={<Timer size={15} />} title="Antrenman Süresi" color={GOLD}>
            Tüm özel dersler {LESSON_DURATION_MINUTES} dakika sürmektedir.
          </Section>

          <Section icon={<MapPin size={15} />} title="Derse Geliş" color={GOLD}>
            Lütfen dersten en az 20 dakika önce salonda hazır bulunun.<br />
            Isınma ve hazırlık süresi ders süresine dahildir.
          </Section>

          <Section icon={<Backpack size={15} />} title="Yanınızda Getirmeniz Gerekenler" color={GOLD}>
            Su · Havlu · Bandaj · Eldiven (varsa) · Ağızlık (varsa)
          </Section>

          <Section icon={<XCircle size={15} />} title="Ders İptali" color={RED}>
            Dersinizi en geç {CANCEL_LIMIT_HOURS} saat öncesine kadar iptal edebilirsiniz.<br />
            {CANCEL_LIMIT_HOURS} saatten daha kısa süre kala iptal işlemi yapılamaz.
          </Section>

          <Section icon={<Ban size={15} />} title="Derse Katılmama" color={RED}>
            Haber verilmeden veya zamanında iptal edilmeden gelinmeyen dersler yapılmış sayılır.
            Bu durumda paketinizden 1 ders düşülür. Bu kural diğer öğrencilerin randevu hakkını
            korumak ve antrenman planının düzenini sağlamak amacıyla uygulanmaktadır.
          </Section>

          <Section icon={<Clock size={15} />} title="Geç Kalma" color={GOLD}>
            Geç kalınan süre ders süresine dahildir. Ders bitiş saati uzatılamaz.
          </Section>

          <Section icon={<HeartPulse size={15} />} title="Sağlık Durumu" color={GOLD}>
            Herhangi bir sakatlık veya sağlık probleminiz varsa ders başlamadan önce antrenörünüze
            bilgi veriniz.
          </Section>

          <Section icon={<Dumbbell size={15} />} title="Antrenman Kuralları" color={GOLD}>
            Antrenörün talimatlarına uyunuz. Salon ve ekipmanlara özen gösteriniz.
            Telefonunuzu sessize almanız tavsiye edilir.
          </Section>
        </div>

        <div className="px-4 pb-4 pt-2">
          <button type="button" onClick={handleToggle} disabled={saving}
            className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all disabled:opacity-60"
            style={{
              background: saving ? `${GOLD}15` : "rgba(255,255,255,0.03)",
              border: saving ? `1px solid ${GOLD}50` : "1px solid rgba(255,255,255,0.1)",
            }}>
            <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5"
              style={{
                background: saving ? GOLD : "transparent",
                border: `1.5px solid ${saving ? GOLD : "rgba(255,255,255,0.3)"}`,
              }}>
              {saving && <span style={{ color: "#0f0f16", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </span>
            <span className="text-xs sm:text-sm" style={{ color: saving ? "#fff" : "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
              ☑️ {saving ? "Kaydediliyor..." : "Ders bilgilendirmesini okudum ve kuralları kabul ediyorum."}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
