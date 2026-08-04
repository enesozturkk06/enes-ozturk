"use client";
import { motion } from "framer-motion";
import { UserRound, Edit2, Trash2, Eye, EyeOff, Users, CalendarCheck2 } from "lucide-react";
import type { Gym } from "@/lib/types";
import { TRAINER_NAME } from "@/lib/constants";
import GymActivityBar from "./GymActivityBar";

interface Props {
  gym: Gym;
  badge: { label: string; color: string; bg: string; border: string };
  activeStudents: number;
  weeklyLessons: number;
  maxWeeklyLessons: number;
  isEditing: boolean;
  index: number;
  onToggleActive: (gym: Gym) => void;
  onEdit: (gym: Gym) => void;
  onDeleteRequest: (id: string) => void;
}

export default function GymCard({
  gym, badge, activeStudents, weeklyLessons, maxWeeklyLessons, isEditing, index,
  onToggleActive, onEdit, onDeleteRequest,
}: Props) {
  return (
    <motion.div
      initial={{ y: 16, scale: 0.96, filter: "blur(6px)" }}
      animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className={`relative rounded-2xl overflow-hidden ${isEditing ? "p-[1px] gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet" : "p-px"}`}
      style={{ background: isEditing ? undefined : "rgba(255,255,255,0.06)" }}
    >
      <div className={`glass-strong relative rounded-2xl h-full flex flex-col ${!gym.isActive ? "opacity-50" : ""}`}>
        <div className="p-5 flex-1">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-xl text-white tracking-wider leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
              {gym.name}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: gym.isActive ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                color: gym.isActive ? "var(--color-success)" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-label)",
              }}>
              {gym.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>

          <span className="inline-block text-[11px] px-2 py-1 rounded-lg mb-3"
            style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontFamily: "var(--font-label)" }}>
            {badge.label}
          </span>

          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
            <UserRound size={13} className="flex-shrink-0" />
            {TRAINER_NAME}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/30 mb-1">
                <Users size={11} />
                <span className="text-[9px] uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>Aktif Öğrenci</span>
              </div>
              <div className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>{activeStudents}</div>
            </div>
            <div className="glass rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-white/30 mb-1">
                <CalendarCheck2 size={11} />
                <span className="text-[9px] uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>Haftalık Ders</span>
              </div>
              <div className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>{weeklyLessons}</div>
            </div>
          </div>

          <GymActivityBar weeklyLessons={weeklyLessons} maxWeeklyLessons={maxWeeklyLessons} color="#8B5CF6" />

          {gym.notes && (
            <p className="text-xs text-white/35 leading-relaxed mt-3" style={{ fontFamily: "var(--font-label)" }}>{gym.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-0.5 px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => onToggleActive(gym)}
            title={gym.isActive ? "Pasifleştir" : "Aktifleştir"}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-white/25 hover:text-white/60 transition-transform hover:scale-110 active:scale-95 rounded-lg">
            {gym.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <div className="flex-1" />

          <button onClick={() => onEdit(gym)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-transform hover:scale-105 active:scale-95"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-achievement)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
            <Edit2 size={12} />
            Düzenle
          </button>

          <button onClick={() => onDeleteRequest(gym.id)}
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
