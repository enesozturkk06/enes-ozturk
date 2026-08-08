"use client";

/**
 * WeightChart.tsx — Sağlık sayfasının kilo grafiği, `recharts`'ı kendi
 * dosyasında izole eder. Sağlık sayfası bunu `next/dynamic({ssr:false})`
 * ile yükler — `recharts` (ağır bir bağımlılık) sadece bu kart gerçekten
 * render edilirken (weightLogs.length >= 2) indirilir, sayfanın ilk yükünde
 * DEĞİL.
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { WeightEntry } from "@/lib/health";

export default function WeightChart({ weightLogs }: { weightLogs: WeightEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
      <LineChart data={weightLogs.map(e => ({ tarih: format(parseISO(e.date), "dd MMM", { locale: tr }), kilo: e.weight }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="tarih" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "rgba(20,14,35,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 10 }} labelStyle={{ color: "#fff" }} />
        <Line type="monotone" dataKey="kilo" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
