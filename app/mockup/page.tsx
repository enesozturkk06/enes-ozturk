"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const LOGO = "/images/bf9ec1d0-7dc2-4a5d-bcb8-3f7c4a807a5f.png";

/* ── Yardımcı bileşenler ───────────────────────────────────── */
function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{
      background: "rgba(139,92,246,0.06)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(139,92,246,0.2)",
      boxShadow: glow
        ? "0 0 30px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
        : "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      {children}
    </div>
  );
}

function VBar({ h }: { h: number }) {
  return (
    <div className="flex-1 flex flex-col justify-end" style={{ height: 64 }}>
      <div className="w-full rounded-t-sm" style={{
        height: `${h}%`,
        background: "linear-gradient(to top, #8B5CF6, #D946EF)",
        opacity: 0.85,
      }} />
    </div>
  );
}

function StatPill({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl"
      style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
      <span className="text-[10px] text-white/40">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{val}</span>
    </div>
  );
}

/* ── Telefon çerçevesi ─────────────────────────────────────── */
function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 300, height: 620 }}>
        {/* Dış çerçeve */}
        <div className="absolute inset-0 rounded-[44px]" style={{
          border: "2px solid rgba(139,92,246,0.4)",
          boxShadow: "0 0 40px rgba(139,92,246,0.2), 0 0 80px rgba(139,92,246,0.08), inset 0 0 30px rgba(139,92,246,0.04)",
        }} />
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full" style={{ background: "rgba(139,92,246,0.4)" }} />
        {/* Ekran içeriği */}
        <div className="absolute inset-[2px] rounded-[42px] overflow-hidden" style={{ background: "#09090B" }}>
          {children}
        </div>
      </div>
      <p className="mt-4 text-xs tracking-widest text-white/40 uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        {label}
      </p>
    </div>
  );
}

/* ── Ekran 1: Ana Sayfa ────────────────────────────────────── */
function HomeScreen() {
  return (
    <div className="h-full flex flex-col" style={{ background: "#09090B" }}>
      {/* BG glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 60%)",
      }} />
      {/* Nav */}
      <div className="flex items-center justify-between px-4 pt-8 pb-3 relative z-10">
        <Image src={LOGO} alt="logo" width={32} height={32} className="object-contain" />
        <div className="flex flex-col items-end">
          <span className="text-white text-[10px] tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</span>
          <span className="text-[8px] tracking-wider" style={{ color: "#8B5CF6", fontFamily: "var(--font-bebas)" }}>KİŞİSEL ANTRENÖR</span>
        </div>
      </div>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        <div className="text-[10px] tracking-widest text-white/40 mb-3 uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Ankara · Özel Ders
        </div>
        <h1 className="text-4xl text-white text-center leading-tight mb-1" style={{ fontFamily: "var(--font-bebas)" }}>
          BİREBİR ÖZEL
        </h1>
        <h1 className="text-4xl text-center leading-tight mb-4" style={{
          fontFamily: "var(--font-bebas)",
          background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          KİCKBOKS DERSİ
        </h1>
        <p className="text-[10px] text-white/40 text-center mb-6 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
          Şampiyon dövüşçü, profesyonel antrenör. Gerçek ring deneyimi.
        </p>
        {/* CTA */}
        <button className="w-full py-3 rounded-xl text-white text-xs font-semibold tracking-widest uppercase mb-3"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily: "var(--font-barlow-condensed)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
          Randevu Al
        </button>
        <button className="w-full py-3 rounded-xl text-xs font-semibold tracking-widest uppercase"
          style={{ border: "1px solid rgba(139,92,246,0.35)", color: "rgba(139,92,246,0.8)", fontFamily: "var(--font-barlow-condensed)" }}>
          Hakkımda
        </button>
        {/* Statlar */}
        <div className="grid grid-cols-4 gap-1 w-full mt-5">
          {[["20+","Maç"],["16","Nakavt"],["2","Kemer"],["4","Dal"]].map(([n,l]) => (
            <div key={l} className="text-center py-2 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="text-sm font-bold" style={{ fontFamily: "var(--font-bebas)", color: "#8B5CF6" }}>{n}</div>
              <div className="text-[8px] text-white/35">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ekran 2: Öğrenci Paneli ───────────────────────────────── */
function DashboardScreen() {
  return (
    <div className="h-full overflow-y-auto flex flex-col gap-3 px-3 py-6" style={{ background: "#09090B" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[9px] text-white/35">Hoş geldin</p>
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}>AHMET KAYA</h2>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "#fff" }}>AK</div>
      </div>
      {/* Paket kartı */}
      <div className="rounded-2xl p-4 relative overflow-hidden" style={{
        background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(217,70,239,0.1))",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 30px rgba(139,92,246,0.12)",
      }}>
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: "rgba(139,92,246,0.15)", filter: "blur(16px)" }} />
        <p className="text-[9px] text-white/50 mb-1">Şampiyon Paketi</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-bebas)" }}>8</span>
          <span className="text-[10px] text-white/40 mb-0.5">/ 16 ders kaldı</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: "50%", background: "linear-gradient(to right,#8B5CF6,#D946EF)" }} />
        </div>
      </div>
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label:"Yaklaşan Randevu", val:"Yarın 10:00", c:"#A855F7", icon:"📅" },
          { label:"Son Gelişim",      val:"7.5 / 10",   c:"#22c55e", icon:"📈" },
          { label:"Tamamlanan",       val:"8 ders",     c:"#8B5CF6", icon:"✅" },
          { label:"Ödeme Durumu",     val:"Ödendi",     c:"#22c55e", icon:"💳" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3" style={{
            background: "rgba(139,92,246,0.05)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}>
            <div className="text-sm mb-1">{s.icon}</div>
            <div className="text-[11px] font-bold" style={{ color: s.c, fontFamily: "var(--font-barlow-condensed)" }}>{s.val}</div>
            <div className="text-[8px] text-white/35">{s.label}</div>
          </div>
        ))}
      </div>
      {/* Son ders notu */}
      <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
        <p className="text-[9px] text-white/40 mb-2">Son Ders Notu</p>
        {[["Yumruk",8],["Tekme",7],["Savunma",6],["Kondisyon",8]].map(([l,v]) => (
          <div key={String(l)} className="flex items-center gap-2 mb-1.5">
            <span className="text-[8px] text-white/40 w-16">{l}</span>
            <div className="flex-1 h-1 rounded-full bg-white/8">
              <div className="h-full rounded-full" style={{ width: `${Number(v)*10}%`, background: "linear-gradient(to right,#8B5CF6,#D946EF)" }} />
            </div>
            <span className="text-[8px] text-violet-bright">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Ekran 3: Randevu ──────────────────────────────────────── */
function AppointmentScreen() {
  const days = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
  const nums  = [2,3,4,5,6,7,8];
  const times = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00"];
  const busy  = new Set([1,3,5]);
  const [sel, setSel] = useState(4);
  const [selTime, setSelTime] = useState("");

  return (
    <div className="h-full flex flex-col px-3 py-6 gap-3" style={{ background: "#09090B" }}>
      <h2 className="text-base text-white" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}>RANDEVU AL</h2>
      {/* Haftalık bar */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d,i) => (
          <button key={d} onClick={() => setSel(i)}
            className="flex flex-col items-center py-2 rounded-xl transition-all"
            style={sel===i ? {
              background: "linear-gradient(135deg,#8B5CF6,#A855F7)",
              boxShadow: "0 0 12px rgba(139,92,246,0.5)",
            } : { background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)" }}>
            <span className="text-[7px] text-white/40">{d}</span>
            <span className="text-xs font-bold text-white" style={{ fontFamily:"var(--font-bebas)" }}>{nums[i]}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/35 tracking-widest uppercase" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
        Haziran {nums[sel]} — Müsait Saatler
      </p>
      {/* Saat grid */}
      <div className="grid grid-cols-4 gap-1.5 flex-1">
        {times.map((t,i) => {
          const isBusy = busy.has(i);
          const isSelected = selTime===t;
          return (
            <button key={t} disabled={isBusy} onClick={() => setSelTime(t)}
              className="rounded-xl py-3 text-center transition-all"
              style={isBusy ? { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", opacity:0.35 }
                : isSelected ? { background:"linear-gradient(135deg,#8B5CF6,#A855F7)", boxShadow:"0 0 12px rgba(139,92,246,0.5)" }
                : { background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.18)" }}>
              <div className="text-[11px] font-semibold text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{t}</div>
              {isBusy && <div className="text-[7px] text-white/25">Dolu</div>}
            </button>
          );
        })}
      </div>
      {/* Onayla butonu */}
      {selTime && (
        <button className="w-full py-3 rounded-xl text-white text-xs font-semibold tracking-widest uppercase"
          style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)", boxShadow:"0 0 20px rgba(139,92,246,0.4)" }}>
          {selTime} — Randevu Onayla
        </button>
      )}
    </div>
  );
}

/* ── Ekran 4: Sağlık / Profil ──────────────────────────────── */
function ProfileScreen() {
  const bars = [65,80,72,88,60,75,92];
  const days = ["P","S","Ç","P","C","C","P"];

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-3 px-3 py-6" style={{ background:"#09090B" }}>
      <h2 className="text-base text-white" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>SAĞLIK TAKİP</h2>
      {/* BMI */}
      <div className="rounded-2xl p-4 relative overflow-hidden" style={{
        background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(217,70,239,0.08))",
        border:"1px solid rgba(139,92,246,0.25)",
      }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] text-white/40">Vücut Kitle İndeksi</p>
            <span className="text-3xl font-bold text-white" style={{ fontFamily:"var(--font-bebas)" }}>23.4</span>
            <span className="text-[10px] text-green-400 ml-2">Normal</span>
          </div>
          <div className="text-3xl">⚖️</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Boy" val="175 cm" color="#8B5CF6" />
          <StatPill label="Kilo" val="71.5 kg" color="#A855F7" />
          <StatPill label="Yaş" val="27" color="#D946EF" />
        </div>
      </div>
      {/* Su + Kalori */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)" }}>
          <div className="text-lg mb-1">💧</div>
          <p className="text-[9px] text-white/40">Bugün Su</p>
          <div className="text-xl font-bold text-blue-400" style={{ fontFamily:"var(--font-bebas)" }}>6/8</div>
          <div className="flex gap-0.5 mt-1">
            {[1,2,3,4,5,6,7,8].map(n=>(
              <div key={n} className="flex-1 h-1.5 rounded-sm" style={{ background:n<=6?"#8B5CF6":"rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)" }}>
          <div className="text-lg mb-1">🔥</div>
          <p className="text-[9px] text-white/40">Kalori</p>
          <div className="text-xl font-bold text-gold" style={{ fontFamily:"var(--font-bebas)" }}>1840</div>
          <p className="text-[8px] text-white/30">/ 2200 kcal hedef</p>
        </div>
      </div>
      {/* Haftalık aktivite */}
      <div className="rounded-xl p-3" style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)" }}>
        <p className="text-[9px] text-white/40 mb-2">Haftalık Aktivite</p>
        <div className="flex items-end gap-1" style={{ height:56 }}>
          {bars.map((h,i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <VBar h={h} />
              <span className="text-[7px] text-white/25">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ana mockup sayfası ────────────────────────────────────── */
const screens = [
  { id:"home",        label:"Ana Sayfa",        component:<HomeScreen /> },
  { id:"dashboard",   label:"Öğrenci Paneli",   component:<DashboardScreen /> },
  { id:"appointment", label:"Randevu",           component:<AppointmentScreen /> },
  { id:"profile",     label:"Sağlık / Profil",  component:<ProfileScreen /> },
];

export default function MockupPage() {
  const [active, setActive] = useState("home");

  return (
    <div className="min-h-screen" style={{ background:"#09090B" }}>
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 60%)",
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* Başlık */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-12" style={{ background:"linear-gradient(to right,transparent,#8B5CF6)" }} />
            <span className="text-xs tracking-[0.4em] text-white/40 uppercase" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
              Tasarım Önizlemesi
            </span>
            <span className="h-px w-12" style={{ background:"linear-gradient(to left,transparent,#8B5CF6)" }} />
          </div>
          <h1 className="text-5xl lg:text-7xl text-white mb-3" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>
            EKRAN{" "}
            <span style={{
              background:"linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>
              MOCKUPLARI
            </span>
          </h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto" style={{ fontFamily:"var(--font-inter)" }}>
            Neon violet premium tasarım — tüm ekranların canlı önizlemesi
          </p>
        </div>

        {/* Tab seçici */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {screens.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className="px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                ...(active === s.id
                  ? { background:"linear-gradient(135deg,#8B5CF6,#A855F7)", color:"#fff", boxShadow:"0 0 16px rgba(139,92,246,0.5)" }
                  : { background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)", color:"rgba(139,92,246,0.7)" }),
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Telefon + açıklama */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12">

          {/* Telefon */}
          <AnimatePresence mode="wait">
            {screens.filter(s => s.id === active).map(s => (
              <motion.div key={s.id}
                initial={{ opacity:0, y:20, scale:0.95 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:-20, scale:0.95 }}
                transition={{ duration:0.35, ease:"easeOut" }}>
                <PhoneFrame label={s.label}>{s.component}</PhoneFrame>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Açıklama paneli */}
          <div className="max-w-sm w-full space-y-4">
            <div className="rounded-2xl p-5" style={{
              background:"rgba(139,92,246,0.06)",
              border:"1px solid rgba(139,92,246,0.18)",
              backdropFilter:"blur(20px)",
            }}>
              <h3 className="text-xl text-white mb-3" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>
                TASARIM ÖZELLİKLERİ
              </h3>
              <ul className="space-y-2.5">
                {[
                  { icon:"🌑", text:"Saf siyah arka plan (#09090B)" },
                  { icon:"💜", text:"Neon violet (#8B5CF6) ana renk" },
                  { icon:"✨", text:"Glassmorphism kartlar — blur + şeffaf" },
                  { icon:"⚡", text:"Animasyonlu neon glow efektleri" },
                  { icon:"📱", text:"Mobil öncelikli, tüm ekran boyutları" },
                  { icon:"🔮", text:"Cyberpunk gradient text efektleri" },
                  { icon:"🎯", text:"Premium sporcu uygulama hissi" },
                ].map(item => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
                    <span className="text-xs text-white/55 leading-relaxed" style={{ fontFamily:"var(--font-inter)" }}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl p-5" style={{
              background:"rgba(139,92,246,0.06)",
              border:"1px solid rgba(139,92,246,0.18)",
            }}>
              <h3 className="text-xl text-white mb-3" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>
                EKRANLAR
              </h3>
              <div className="space-y-2">
                {screens.map(s => (
                  <button key={s.id} onClick={() => setActive(s.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={active===s.id
                      ? { background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.35)" }
                      : { background:"transparent", border:"1px solid transparent" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: active===s.id ? "#8B5CF6" : "rgba(139,92,246,0.3)" }} />
                    <span className="text-xs text-white/70" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.label}</span>
                    {active===s.id && <span className="ml-auto text-[10px]" style={{ color:"#8B5CF6" }}>●</span>}
                  </button>
                ))}
              </div>
            </div>

            <a href="/"
              className="block text-center py-3 rounded-xl text-white text-xs font-semibold tracking-widest uppercase transition-all"
              style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)", boxShadow:"0 0 20px rgba(139,92,246,0.35)" }}>
              Canlı Siteye Dön →
            </a>
          </div>
        </div>

        {/* Alt not */}
        <p className="text-center text-xs text-white/20 mt-16" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
          /mockup — Bu sayfa tasarım önizlemesi içindir · Demo veriler kullanılmaktadır
        </p>
      </div>
    </div>
  );
}
