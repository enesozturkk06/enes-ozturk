"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Edit, Users, QrCode, Trash2, RotateCcw, Phone, Zap,
} from "lucide-react";
import type { Student } from "@/lib/types";
import type { Badge as EarnedBadge } from "@/lib/badges";
import { PAYMENT_LABELS, LEVEL_LABELS } from "@/lib/constants";
import { getDaysRemaining, getPackageUrgency } from "@/lib/packageDuration";
import { getLevelForXP } from "@/lib/xp";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import ProgressRing from "./ProgressRing";

interface Props {
  student: Student;
  xpTotal: number;
  badges: EarnedBadge[];
  lastLessonDate: string | null;
  lastPaymentDate: string | null;
  onEdit: (s: Student) => void;
  onPartner: (s: Student) => void;
  onQr: (s: Student) => void;
  onDelete: (s: Student) => void;
  onRenew: (s: Student) => void;
}

export default function StudentCard({
  student: s, xpTotal, badges, lastLessonDate, lastPaymentDate,
  onEdit, onPartner, onQr, onDelete, onRenew,
}: Props) {
  const [hover, setHover] = useState(false);
  const initials = s.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const days = getDaysRemaining(s.packageEndDate);
  const urgency = days !== null ? getPackageUrgency(days) : null;
  const { current: xpLevel } = getLevelForXP(xpTotal);
  const isUnlimited = s.subscriptionType === "monthly";

  const paymentColor = s.paymentStatus === "odendi" ? "#4ADE80" : s.paymentStatus === "kismi" ? "#FBBF24" : "#F87171";

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
    >
      <div className="glass-strong relative rounded-2xl p-5 h-full flex flex-col gap-4"
        style={{ boxShadow: hover ? "0 0 32px rgba(139,92,246,0.22)" : "none", transition: "box-shadow 0.25s" }}>

        {/* Üst: avatar + isim + kod + seviye + ödeme rozeti */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ background: `radial-gradient(circle, ${xpLevel.gradFrom}55, ${xpLevel.gradTo}22)`, border: `1.5px solid ${xpLevel.borderColor}` }}>
              {s.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-white" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white font-semibold truncate" style={{ fontFamily: "var(--font-label)" }}>{s.fullName}</div>
              <div className="text-xs tracking-wider" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                {s.code} · {LEVEL_LABELS[s.level]}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${paymentColor}18`, color: paymentColor, fontFamily: "var(--font-label)" }}>
              {PAYMENT_LABELS[s.paymentStatus]}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.isActive ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.06)", color: s.isActive ? "#4ADE80" : "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)" }}>
              {s.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>

        {/* XP + Seviye */}
        <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap size={13} style={{ color: xpLevel.colorPrimary }} className="flex-shrink-0" />
            <span className="text-xs text-white/70 truncate" style={{ fontFamily: "var(--font-label)" }}>
              {xpTotal.toLocaleString("tr-TR")} XP
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{ background: `${xpLevel.colorPrimary}18`, color: xpLevel.colorPrimary, fontFamily: "var(--font-label)" }}>
            {xpLevel.icon} {xpLevel.shortName}
          </span>
        </div>

        {/* Rozetler */}
        {badges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {badges.slice(0, 5).map(b => (
              <span key={b.id} title={b.name} className="text-base leading-none"
                style={{ filter: `drop-shadow(0 0 6px ${b.color}70)` }}>
                {b.icon}
              </span>
            ))}
            {badges.length > 5 && (
              <span className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>+{badges.length - 5}</span>
            )}
          </div>
        )}

        {/* Kalan ders + paket durumu */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ProgressRing value={s.remainingLessons} max={s.totalLessons} unlimited={isUnlimited} color={xpLevel.colorPrimary} size={48} strokeWidth={4} />
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider" style={{ fontFamily: "var(--font-label)" }}>Kalan Ders</div>
              <div className="text-xs text-white/60" style={{ fontFamily: "var(--font-label)" }}>
                {isUnlimited ? "Sınırsız" : `${s.remainingLessons} / ${s.totalLessons}`}
              </div>
            </div>
          </div>
          {urgency && (
            <span className={`text-xs px-2.5 py-1 rounded-lg ${urgency.color}`}
              style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, fontFamily: "var(--font-label)" }}>
              {days! < 0 ? "Süresi Doldu" : `${days} gün`}
            </span>
          )}
        </div>

        {/* Son ders / son ödeme */}
        <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: "var(--font-label)" }}>
          <div>
            <div className="text-white/25 text-[10px] uppercase tracking-wider">Son Ders</div>
            <div className="text-white/60 mt-0.5">
              {lastLessonDate ? format(parseISO(lastLessonDate), "dd MMM yyyy", { locale: tr }) : "—"}
            </div>
          </div>
          <div>
            <div className="text-white/25 text-[10px] uppercase tracking-wider">Son Ödeme</div>
            <div className="text-white/60 mt-0.5">
              {lastPaymentDate ? format(parseISO(lastPaymentDate), "dd MMM yyyy", { locale: tr }) : "—"}
            </div>
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => onEdit(s)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider rounded-lg transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
            <Edit size={12} />Detaya Git
          </button>
          <button onClick={() => onRenew(s)} title="Paket Yenile"
            className="p-2 rounded-lg transition-transform hover:scale-110 active:scale-95"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ADE80" }}>
            <RotateCcw size={13} />
          </button>
          <button onClick={() => onPartner(s)} title="Düet Partneri"
            className="p-2 rounded-lg transition-transform hover:scale-110 active:scale-95"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#A78BFA" }}>
            <Users size={13} />
          </button>
          <button onClick={() => onQr(s)} title="QR Kod"
            className="p-2 rounded-lg transition-transform hover:scale-110 active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
            <QrCode size={13} />
          </button>
          <a href={`https://wa.me/90${s.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" title="WhatsApp"
            className="p-2 rounded-lg transition-transform hover:scale-110 active:scale-95"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ADE80" }}>
            <Phone size={13} />
          </a>
          <button onClick={() => onDelete(s)} title="Sil"
            className="p-2 rounded-lg transition-transform hover:scale-110 active:scale-95 ml-auto"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
