"use client";

import { useState } from "react";

const students = [
  {
    name: "Ahmet K.",
    level: "Orta Seviye",
    rank: "Mavi Kuşak",
    streak: 22,
    sessions: 87,
    progress: 72,
    discipline: "Kickboks",
    lastClass: "Bugün",
    trend: "+%8",
  },
  {
    name: "Defne Y.",
    level: "İleri Seviye",
    rank: "Mor Kuşak",
    streak: 45,
    sessions: 203,
    progress: 91,
    discipline: "MMA",
    lastClass: "Dün",
    trend: "+%12",
  },
  {
    name: "Murat S.",
    level: "Başlangıç",
    rank: "Beyaz Kuşak",
    streak: 7,
    sessions: 14,
    progress: 31,
    discipline: "Boks",
    lastClass: "2 gün önce",
    trend: "+%24",
  },
];

const weeklyData = [65, 82, 58, 91, 74, 88, 96];
const weekDays = ["P", "S", "Ç", "P", "C", "C", "P"];

export default function StudentTracking() {
  const [activeStudent, setActiveStudent] = useState(0);
  const student = students[activeStudent];

  return (
    <section
      id="tracking"
      className="relative py-24 lg:py-36 bg-pitch overflow-hidden"
    >
      {/* Arka plan ışığı */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-gold/4 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Sol: İçerik */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-12 h-px bg-gold" />
              <span
                className="text-gold text-xs tracking-[0.4em] uppercase"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Dijital İlerleme Sistemi
              </span>
            </div>

            <h2
              className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white mb-6"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              GELİŞİMİNİ{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #d97706, #fbbf24, #d97706)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "shimmer-gold 3s linear infinite",
                }}
              >
                TAKİP ET
              </span>
            </h2>

            <p
              className="text-white/50 text-base leading-relaxed mb-8"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Her üye, özel öğrenci takip panelimize erişim hakkı kazanır.
              Katılım durumunuzu, beceri gelişiminizi, kuşak derecenizi ve
              performans analizlerinizi gerçek zamanlı olarak izleyin.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Ders katılımı ve seri takibi",
                "Teknik bazında beceri değerlendirme puanları",
                "Kuşak ilerleme kilometre taşları",
                "Antrenör notları ve geri bildirim günlüğü",
                "Yarışma sonuçları ve dövüş kayıtları",
                "Aylık performans raporları",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-gold rotate-45 flex-shrink-0" />
                  <span
                    className="text-sm text-white/60"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#membership"
              className="inline-flex items-center gap-2 text-sm tracking-widest text-gold hover:text-gold-bright uppercase transition-colors duration-300 border-b border-gold/30 hover:border-gold pb-1"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Her üyelik ile erişim sağlayın
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Dashboard Önizlemesi */}
          <div className="relative">
            {/* Dış ışık çerçevesi */}
            <div className="absolute inset-0 bg-gradient-to-r from-crimson/10 via-transparent to-gold/10 blur-xl rounded-lg pointer-events-none" />

            <div className="relative bg-carbon border border-white/10 rounded-sm overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
              {/* Dashboard üst çubuğu */}
              <div className="flex items-center justify-between px-4 py-3 bg-steel/80 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-crimson/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-gold/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span
                    className="text-xs text-white/30 tracking-wider ml-2"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    ENES ÖZTÜRK · ÖĞRENCİ PANELİ
                  </span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>

              <div className="p-4 lg:p-6">
                {/* Öğrenci seçici sekmeler */}
                <div className="flex gap-2 mb-5">
                  {students.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setActiveStudent(i)}
                      className={`text-xs px-3 py-1.5 tracking-wider uppercase transition-all duration-200 ${
                        activeStudent === i
                          ? "bg-crimson text-white"
                          : "bg-iron text-white/30 hover:text-white/60"
                      }`}
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                {/* Öğrenci başlığı */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/5">
                  <div className="w-12 h-12 bg-crimson/20 border border-crimson/30 flex items-center justify-center">
                    <span
                      className="text-crimson text-lg font-display"
                      style={{ fontFamily: "var(--font-bebas)" }}
                    >
                      {student.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <div
                      className="text-white font-semibold tracking-wider text-sm"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      {student.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs text-gold tracking-wider"
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}
                      >
                        {student.rank}
                      </span>
                      <span className="text-white/20 text-xs">·</span>
                      <span
                        className="text-xs text-white/30"
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}
                      >
                        {student.discipline}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div
                      className="text-xs text-white/30 mb-0.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      Son ders
                    </div>
                    <div
                      className="text-xs text-white/60"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      {student.lastClass}
                    </div>
                  </div>
                </div>

                {/* İstatistik satırı */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Gün Serisi", value: `${student.streak}`, unit: "gün", color: "text-crimson" },
                    { label: "Toplam Seans", value: `${student.sessions}`, unit: "", color: "text-gold-bright" },
                    { label: "Aylık Trend", value: student.trend, unit: "", color: "text-green-400" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-steel/60 p-3 border border-white/5"
                    >
                      <div
                        className={`text-2xl font-display ${stat.color}`}
                        style={{ fontFamily: "var(--font-bebas)" }}
                      >
                        {stat.value}
                        <span className="text-sm text-white/30">{stat.unit}</span>
                      </div>
                      <div
                        className="text-xs text-white/30 tracking-wider"
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}
                      >
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Beceri ilerlemesi */}
                <div className="mb-5">
                  <div
                    className="text-xs text-white/30 tracking-widest uppercase mb-3"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    Genel İlerleme
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-iron rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${student.progress}%`,
                          background: "linear-gradient(90deg, #dc2626, #d97706)",
                        }}
                      />
                    </div>
                    <span
                      className="text-xs text-gold font-semibold w-8 text-right"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    >
                      %{student.progress}
                    </span>
                  </div>
                </div>

                {/* Haftalık grafik */}
                <div>
                  <div
                    className="text-xs text-white/30 tracking-widest uppercase mb-3"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    Haftalık Aktivite
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {weeklyData.map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full rounded-sm transition-all duration-500"
                          style={{
                            height: `${(val / 100) * 64}px`,
                            background:
                              i === 6
                                ? "linear-gradient(180deg, #dc2626, #b91c1c)"
                                : "rgba(255,255,255,0.08)",
                          }}
                        />
                        <span
                          className="text-xs text-white/20"
                          style={{ fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {weekDays[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
