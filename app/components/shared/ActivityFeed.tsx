"use client";
import { useEffect, useState } from "react";
import {
  getAllXPAdjustments, getAllGiftLessonRequests, getAppSetting,
} from "@/lib/db";
import type { XPAdjustment, GiftLessonRequest } from "@/lib/types";

/* ── Yardımcı: ismi kısalt ─────────────────────────────────── */
function shortName(full: string): string {
  const p = full.trim().split(/\s+/);
  return p.length >= 2 ? `${p[0]} ${p[1][0]}.` : p[0];
}

/* ── XP → kısa metin ───────────────────────────────────────── */
function fmtXP(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `${v}`;
}

/* ── Olayları birleştir ─────────────────────────────────────── */
function buildItems(
  adjs: XPAdjustment[],
  gifts: GiftLessonRequest[],
): string[] {
  const items: string[] = [];

  // Haftalık XP: en çok XP kazanan öğrenci (bu haftanın Pazartesi'nden itibaren)
  const now = new Date();
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Pzt=0
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day);
  const wStart = weekStart.toISOString().slice(0, 10);
  const weekAdjs = adjs.filter(a => a.createdAt.slice(0, 10) >= wStart);
  if (weekAdjs.length > 0) {
    const totals: Record<string, number> = {};
    for (const a of weekAdjs) {
      if (a.amount > 0) totals[a.studentName] = (totals[a.studentName] ?? 0) + a.amount;
    }
    const topEntry = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    if (topEntry) {
      items.push(`🏆  Bu haftanın XP lideri: ${shortName(topEntry[0])}  (${fmtXP(topEntry[1])} XP)`);
    }
  }

  // Son 20 pozitif XP ayarlaması
  const recentXP = adjs.filter(a => a.amount > 0).slice(0, 20);
  for (const adj of recentXP) {
    items.push(`⚡  ${shortName(adj.studentName)} +${fmtXP(adj.amount)} XP  ·  ${adj.reason}`);
  }

  // Onaylanan hediye ders talepleri (son 10)
  const approvedGifts = gifts
    .filter(g => g.status === "approved")
    .slice(0, 10);
  for (const g of approvedGifts) {
    const medal = g.threshold >= 10000 ? "💎" : "🥇";
    items.push(`${medal}  ${shortName(g.studentName)} ${g.threshold.toLocaleString()} XP hediye ders kazandı!`);
  }

  // Bekleyen hediye talepleri
  const pendingGifts = gifts.filter(g => g.status === "pending").slice(0, 5);
  for (const g of pendingGifts) {
    items.push(`🎁  ${shortName(g.studentName)} hediye ders hakkı kazandı — onay bekleniyor`);
  }

  return items;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    // Önce admin toggle'ı kontrol et
    getAppSetting("activity_feed_enabled")
      .then(val => {
        if (val === "false") return; // Admin devre dışı bırakmış

        return Promise.all([
          getAllXPAdjustments().catch(() => [] as XPAdjustment[]),
          getAllGiftLessonRequests().catch(() => [] as GiftLessonRequest[]),
        ]).then(([adjs, gifts]) => {
          const built = buildItems(adjs, gifts);
          if (built.length >= 2) setItems(built);
        });
      })
      .catch(() => {
        // app_settings tablosu yoksa (SQL henüz çalıştırılmadı)
        // Yine de XP adjustments'ı göster
        getAllXPAdjustments()
          .then(adjs => {
            const fallback = adjs
              .filter(a => a.amount > 0)
              .slice(0, 15)
              .map(a => `⚡  ${shortName(a.studentName)} +${fmtXP(a.amount)} XP  ·  ${a.reason}`);
            if (fallback.length >= 2) setItems(fallback);
          })
          .catch(() => {});
      });
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: 38,
        background:
          "linear-gradient(90deg,rgba(139,92,246,0.07),rgba(217,70,239,0.04))",
        border: "1px solid rgba(139,92,246,0.16)",
        borderRadius: 6,
        // Android Chrome'da overflow:hidden + sürekli çalışan will-change:transform
        // animasyonu birleşince kırpma sınırı bazen "sızıyor" (kayan yazı alttaki
        // kartın üzerine biniyor gibi görünüyor). Kapsayıcıyı kendi katmanına
        // sabitleyip bu render hatasını önlüyoruz.
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      {/* Sol soluk */}
      <div
        className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(90deg,rgba(17,17,20,0.97),transparent)",
        }}
      />
      {/* Sağ soluk */}
      <div
        className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(270deg,rgba(17,17,20,0.97),transparent)",
        }}
      />

      {/* Canlı göstergesi */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-1.5 h-1.5 rounded-full animate-neon-pulse"
        style={{
          background: "#8B5CF6",
          boxShadow: "0 0 8px #8B5CF6, 0 0 16px rgba(139,92,246,0.4)",
        }}
      />

      {/* Kayan içerik */}
      <div
        className="flex items-center h-full pl-7 animate-marquee whitespace-nowrap will-change-transform"
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center mr-14"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color:
                i % 3 === 0
                  ? "rgba(255,255,255,0.55)"
                  : i % 3 === 1
                  ? "rgba(196,181,253,0.58)"
                  : "rgba(249,168,212,0.5)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
