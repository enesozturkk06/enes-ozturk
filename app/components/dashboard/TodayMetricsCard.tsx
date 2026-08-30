"use client";
import Link from "next/link";
import { Droplets, Flame, Scale, Activity } from "lucide-react";
import { GOLD_BRIGHT } from "./theme";

/** "Bugün" — Su/Kalori/Kilo/BMI 4 kompakt metrik. Sağlık sayfasındaki
 * gerçek verilerle birebir aynı hesap, sadece görüntüleme. */
export default function TodayMetricsCard({
  waterGlasses, calories, weightKg, bmi, bmiLabel,
}: {
  waterGlasses: number;
  calories: number | null;
  weightKg: number | null;
  bmi: number | null;
  bmiLabel?: string;
}) {
  const tiles = [
    { icon: Droplets, color: "#60A5FA", value: `${waterGlasses}/8`, label: "Su" },
    { icon: Flame, color: GOLD_BRIGHT, value: calories !== null ? String(calories) : "—", label: "Kalori" },
    { icon: Scale, color: "var(--color-success)", value: weightKg !== null ? `${weightKg}kg` : "—", label: "Kilo" },
    { icon: Activity, color: "#A78BFA", value: bmi !== null ? bmi.toFixed(1) : "—", label: bmiLabel ? `BMI · ${bmiLabel}` : "BMI" },
  ];

  return (
    <div className="card-gold rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>Bugün</h3>
        <Link href="/ogrenci/saglik" className="text-xs tracking-wider transition-colors" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>Tümü →</Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map(t => (
          <div key={t.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <t.icon size={14} className="mx-auto mb-1" style={{ color: t.color }} />
            <div className="text-sm font-bold" style={{ color: "#fff", fontFamily: "var(--font-display)" }}>{t.value}</div>
            <div className="text-[8px] uppercase tracking-widest mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
