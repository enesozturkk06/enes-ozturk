"use client";

/** "Paket Kapsamı" halkası — bu paketin ders sayısının, katalogdaki en büyük
 *  pakete oranını gösterir (bir öğrencinin kullanım yüzdesi DEĞİL — katalog
 *  şablonlarında böyle bir veri yok; bu sadece paketin göreli büyüklüğü). */
interface Props {
  lessonCount: number;
  maxLessonCount: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function PackageCircularScope({ lessonCount, maxLessonCount, size = 56, strokeWidth = 5, color = "#8B5CF6" }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = maxLessonCount > 0 ? Math.min(1, lessonCount / maxLessonCount) : 0;
  const dash = circumference * pct;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - dash} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>{lessonCount}</span>
      </div>
    </div>
  );
}
