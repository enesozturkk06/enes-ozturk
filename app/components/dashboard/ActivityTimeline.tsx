"use client";
import { motion } from "framer-motion";
import { BookOpen, Bell, Zap, type LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export interface TimelineItem {
  id: string;
  type: "record" | "notification" | "xp";
  date: string; // ISO datetime, sıralama için
  title: string;
  subtitle?: string;
}

const ICONS: Record<TimelineItem["type"], { icon: LucideIcon; color: string }> = {
  record:       { icon: BookOpen, color: "#8B5CF6" },
  notification: { icon: Bell,     color: "#FB923C" },
  xp:           { icon: Zap,      color: "#F59E0B" },
};

interface Props { items: TimelineItem[] }

export default function ActivityTimeline({ items }: Props) {
  return (
    <div className="glass-strong rounded-2xl p-5 sm:p-6">
      <h3 className="text-lg text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-display)" }}>SON AKTİVİTELER</h3>

      {items.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-6" style={{ fontFamily: "var(--font-label)" }}>
          Henüz bir aktivite yok.
        </p>
      ) : (
        <motion.div
          initial="initial" animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
        >
          {items.map((item, i) => {
            const { icon: Icon, color } = ICONS[item.type];
            let dateLabel = "";
            try { dateLabel = format(parseISO(item.date), "dd MMM", { locale: tr }); } catch { /* geçersiz tarih — boş bırak */ }
            return (
              <motion.div key={item.id}
                variants={{ initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 } }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex gap-3 py-3"
                style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate" style={{ fontFamily: "var(--font-label)" }}>{item.title}</div>
                  {item.subtitle && (
                    <div className="text-xs text-white/30 truncate" style={{ fontFamily: "var(--font-label)" }}>{item.subtitle}</div>
                  )}
                </div>
                <div className="text-[10px] text-white/25 flex-shrink-0 whitespace-nowrap pt-0.5" style={{ fontFamily: "var(--font-label)" }}>
                  {dateLabel}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
