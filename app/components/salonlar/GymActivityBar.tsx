"use client";

/** "Bu Haftaki Yoğunluk" barı — bu salonun haftalık ders sayısının, tüm
 *  salonlar arasındaki EN YOĞUN salona oranını gösterir (kapasiteye göre
 *  doluluk DEĞİL — Gym veri modelinde kapasite alanı yok; bu sadece
 *  salonlar arası göreli yoğunluk). */
interface Props {
  weeklyLessons: number;
  maxWeeklyLessons: number;
  color?: string;
}

export default function GymActivityBar({ weeklyLessons, maxWeeklyLessons, color = "#8B5CF6" }: Props) {
  const pct = maxWeeklyLessons > 0 ? Math.min(100, Math.round((weeklyLessons / maxWeeklyLessons) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
          Bu Haftaki Yoğunluk
        </span>
        <span className="text-[10px] font-semibold text-white/50" style={{ fontFamily: "var(--font-label)" }}>%{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}
