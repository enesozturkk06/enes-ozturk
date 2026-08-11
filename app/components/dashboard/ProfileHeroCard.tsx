"use client";
import { memo } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CreditCard, CalendarRange } from "lucide-react";
import type { Student, StudentAvatarConfig } from "@/lib/types";
import type { XPResult } from "@/lib/xp";
import { PAYMENT_LABELS } from "@/lib/constants";
import { GOLD_BRIGHT, GOLD_BORDER_SOFT, GOLD_BG_SOFT, TEXT_SECONDARY } from "./theme";

interface Props {
  student: Student;
  xpResult: XPResult;
  packageLabel: string;
  dateLabel?: string;
  aiTip?: string;
  /** Kedi Avatar Sistemi (2D Dijital Salon) — null ise (henüz oluşturulmadıysa)
   * "Avatarını Oluştur" CTA'sı, doluysa "Düzenle" bağlantısı gösterilir. */
  avatarConfig?: StudentAvatarConfig | null;
  /** Faz 1 — sezon özeti, page.tsx'te ZATEN hesaplanmış xpSummary.seasonResult'tan
   * geliyor, burada yeni bir hesap yapılmıyor (sadece görüntüleme). */
  seasonXP?: number;
  seasonDaysLeft?: number;
}

/** Ödeme durumuna göre membership rozetinin rengi — Paket kartındaki
 * (page.tsx) AYNI ternary'nin bire bir kopyası, mantık değişmedi. */
function paymentColor(status: Student["paymentStatus"]): string {
  return status === "odendi" ? "#22c55e" : status === "kismi" ? GOLD_BRIGHT : "#ef4444";
}

function ProfileHeroCard({ student, xpResult, packageLabel, dateLabel, aiTip, avatarConfig, seasonXP, seasonDaysLeft }: Props) {
  const reduced = useReducedMotion();
  const { current, next, progressPct, xpInLevel, xpToNext } = xpResult.level;
  const initials = student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card-gold-hero relative overflow-hidden rounded-3xl"
    >
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
          {/* Avatar */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle, ${current.gradFrom}55, ${current.gradTo}22)`,
              border: `2px solid ${current.borderColor}`,
              boxShadow: `0 0 24px ${current.glowColor}`,
            }}>
            {student.avatarUrl ? (
              <Image src={student.avatarUrl} alt={student.fullName} fill sizes="80px" className="object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
            )}
          </div>

          {/* Kedi Avatar Sistemi (2D Dijital Salon) — foto/baş harf kutusunun
              AYRISI, biri diğerini silmez. 3D önizleme kaldırıldı ("3D Avatar
              Temizliği" turu) — avatarConfig sadece "oluşturuldu mu" bayrağı
              olarak kullanılıyor, CTA metni buna göre değişiyor. */}
          <a href="/ogrenci/avatar" className="flex-shrink-0 text-[11px] px-3 py-2 rounded-lg text-gold-bright/80 hover:text-gold-bright transition-colors"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontFamily: "var(--font-label)" }}>
            {avatarConfig ? "🐈 Avatarımı Düzenle →" : "🐈 Avatarını Oluştur →"}
          </a>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>
              Hoş Geldin, {student.fullName.split(" ")[0]}!
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-label)" }}>
              {student.code} · {packageLabel}{dateLabel ? ` · ${dateLabel}` : ""}
            </p>
          </div>

          {/* Seviye rozeti */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 self-start sm:self-center"
            style={{ background: `linear-gradient(135deg, ${current.gradFrom}33, ${current.gradTo}1a)`, border: `1px solid ${current.borderColor}` }}>
            <span className="text-lg">{current.icon}</span>
            <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase" style={{ color: current.colorPrimary, fontFamily: "var(--font-label)" }}>
              {current.shortName}
            </span>
          </div>
        </div>

        {/* Üyelik + Sezon özet rozetleri — Faz 1: mevcut paket/ödeme/sezon
            verisinin (page.tsx'te zaten hesaplanmış) kompakt önizlemesi.
            Detaylı Paket kartı aşağıda AYNEN duruyor, bu sadece hero'daki
            özet. Gerçek bir "VIP" sistemi yok — sadece mevcut paket adı +
            ödeme durumu "üyelik" gibi giydiriliyor. */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: GOLD_BG_SOFT, border: `1px solid ${GOLD_BORDER_SOFT}` }}>
            <CreditCard size={12} style={{ color: paymentColor(student.paymentStatus) }} />
            <span className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-label)" }}>
              {packageLabel}
            </span>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: paymentColor(student.paymentStatus), fontFamily: "var(--font-label)" }}>
              · {PAYMENT_LABELS[student.paymentStatus]}
            </span>
          </div>
          {typeof seasonXP === "number" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: GOLD_BG_SOFT, border: `1px solid ${GOLD_BORDER_SOFT}` }}>
              <CalendarRange size={12} style={{ color: GOLD_BRIGHT }} />
              <span className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "var(--font-label)" }}>
                Bu sezon {seasonXP.toLocaleString("tr-TR")} XP
              </span>
              {typeof seasonDaysLeft === "number" && (
                <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_SECONDARY, fontFamily: "var(--font-label)" }}>
                  · {seasonDaysLeft} gün kaldı
                </span>
              )}
            </div>
          )}
        </div>

        {/* XP Bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-xs sm:text-sm" style={{ fontFamily: "var(--font-label)" }}>
            <span className="text-white/50">{xpInLevel.toLocaleString("tr-TR")} XP</span>
            <span className="text-white/30">
              {next ? `${xpToNext.toLocaleString("tr-TR")} XP kaldı → ${next.shortName}` : "Zirvedesin 👑"}
            </span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative h-full rounded-full overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`,
                boxShadow: `0 0 16px ${current.glowColor}`,
              }}
            >
              {!reduced && <div className="xp-bar-shimmer" />}
            </motion.div>
          </div>
        </div>

        {/* Kedi AI mini tavsiye — tam kart aşağıdaki Kedi AI bölümünde, burada sadece tek satır önizleme */}
        {aiTip && (
          <div className="flex items-center gap-2 mt-5 pt-4" style={{ borderTop: `1px solid ${GOLD_BORDER_SOFT}` }}>
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs sm:text-sm truncate" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-label)" }}>
              {aiTip}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ProfileHeroCard);
