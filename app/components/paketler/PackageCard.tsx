"use client";
import { motion } from "framer-motion";
import { Star, Eye, EyeOff, Edit2, Trash2 } from "lucide-react";
import type { LessonPackage } from "@/lib/packages";
import PackageCircularScope from "./PackageCircularScope";

interface Props {
  pkg: LessonPackage;
  maxLessonCount: number;
  isEditing: boolean;
  index: number;
  onToggleHighlight: (id: string) => void;
  onToggleActive: (id: string) => void;
  onEdit: (pkg: LessonPackage) => void;
  onDeleteRequest: (id: string) => void;
}

export default function PackageCard({
  pkg, maxLessonCount, isEditing, index,
  onToggleHighlight, onToggleActive, onEdit, onDeleteRequest,
}: Props) {
  const accentColor = pkg.highlight ? "var(--color-achievement)" : "#8B5CF6";

  return (
    <motion.div
      initial={{ y: 16, scale: 0.96, filter: "blur(6px)" }}
      animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className={`relative rounded-2xl overflow-hidden ${pkg.highlight ? "p-[1px] gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet" : "p-px"}`}
      style={{ background: pkg.highlight ? undefined : "rgba(255,255,255,0.06)" }}
    >
      <div className={`glass-strong relative rounded-2xl h-full flex flex-col ${!pkg.isActive ? "opacity-50" : ""}`}
        style={{
          borderColor: isEditing ? "rgba(139,92,246,0.5)" : undefined,
          boxShadow: isEditing ? "0 0 24px rgba(139,92,246,0.15)" : "none",
        }}>
        <div className="p-5 flex-1">
          {/* Başlık satırı */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-xl text-white tracking-wider leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
                {pkg.name}
              </h3>
              <div className="text-xs text-white/30 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
                {pkg.durationDays} gün geçerli
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {pkg.highlight && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.15)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                  ★ Popüler
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: pkg.isActive ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                  color: pkg.isActive ? "var(--color-success)" : "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-label)",
                }}>
                {pkg.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
          </div>

          {/* Kapsam halkası + Fiyat */}
          <div className="flex items-center gap-3 mb-4">
            <PackageCircularScope lessonCount={pkg.lessonCount} maxLessonCount={maxLessonCount} color={accentColor} size={56} strokeWidth={5} />
            <div className="min-w-0">
              <div className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
                Ders · 50 dk
              </div>
              <div className="text-xs text-white/50" style={{ fontFamily: "var(--font-label)" }}>
                Katalogdaki en kapsamlı pakete göre
              </div>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <div className="text-2xl" style={{ fontFamily: "var(--font-display)", color: accentColor }}>
                ₺{pkg.price.toLocaleString("tr-TR")}
              </div>
              <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                ₺{Math.round(pkg.price / pkg.lessonCount).toLocaleString("tr-TR")} / ders
              </div>
            </div>
          </div>

          {pkg.description && (
            <p className="text-xs text-white/35 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>
              {pkg.description}
            </p>
          )}
        </div>

        {/* Alt işlem çubuğu */}
        <div className="flex items-center gap-0.5 px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => onToggleHighlight(pkg.id)}
            title={pkg.highlight ? "Öne çıkarı kaldır" : "Öne çıkar"}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-transform hover:scale-110 active:scale-95"
            style={{ color: pkg.highlight ? "var(--color-achievement)" : "rgba(255,255,255,0.25)" }}>
            <Star size={13} fill={pkg.highlight ? "currentColor" : "none"} />
          </button>

          <button onClick={() => onToggleActive(pkg.id)}
            title={pkg.isActive ? "Gizle" : "Göster"}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/25 hover:text-white/60 transition-transform hover:scale-110 active:scale-95 rounded-lg">
            {pkg.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <div className="flex-1" />

          <button onClick={() => onEdit(pkg)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-transform hover:scale-105 active:scale-95"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-achievement)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
            <Edit2 size={12} />
            Düzenle
          </button>

          <button onClick={() => onDeleteRequest(pkg.id)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/25 transition-transform hover:scale-110 active:scale-95 rounded-lg"
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
