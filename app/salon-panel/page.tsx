"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getSalonOwnerStudents } from "@/lib/db";
import type { Student } from "@/lib/types";
import { logout as doLogout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Logo from "@/app/components/shared/Logo";
import {
  Users, LogOut, RefreshCw, ChevronRight, Phone, Calendar, BookOpen,
  Clock, Shield, CheckCircle2, AlertCircle, Search, X,
} from "lucide-react";

const LEVEL_MAP: Record<string, string> = {
  baslangic: "Başlangıç", orta: "Orta", ileri: "İleri"
};
const PKG_MAP: Record<string, string> = {
  savasci: "Savaşçı", sampiyon: "Şampiyon", efsane: "Efsane"
};
const PAY_MAP: Record<string, string> = {
  odendi: "Ödendi", kismi: "Kısmi", beklemede: "Beklemede"
};
const PAY_COLOR: Record<string, string> = {
  odendi: "rgba(34,197,94,0.8)", kismi: "rgba(234,179,8,0.8)", beklemede: "rgba(220,38,38,0.8)"
};

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string,string> = {
    baslangic:"rgba(59,130,246,0.15)", orta:"rgba(139,92,246,0.15)", ileri:"rgba(217,70,239,0.15)"
  };
  const text: Record<string,string> = {
    baslangic:"#60A5FA", orta:"#A78BFA", ileri:"#E879F9"
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: colors[level]||"rgba(255,255,255,0.07)", color: text[level]||"#aaa", fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.06em" }}>
      {LEVEL_MAP[level] || level}
    </span>
  );
}

function ProgressBar({ value, max, color = "#8B5CF6" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
      <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.7, ease:"easeOut" }}
        className="h-full rounded-full" style={{ background: color }} />
    </div>
  );
}

function StudentCard({ student, index }: { student: Student; index: number }) {
  const [open, setOpen] = useState(false);
  const remaining = student.remainingLessons;
  const total     = student.totalLessons;
  const pct       = total > 0 ? Math.round((student.completedLessons / total) * 100) : 0;
  const barColor  = remaining <= 2 ? "#ef4444" : remaining <= 5 ? "#eab308" : "#8B5CF6";

  return (
    <motion.div
      initial={{ opacity:0, y:14 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.06, duration:0.4, ease:[0.22,1,0.36,1] }}
      className="relative bg-carbon border overflow-hidden cursor-pointer select-none"
      style={{ borderColor: open ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.12)" }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: open ? "linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent)" : "transparent", transition:"background 0.3s" }} />

      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ background:"linear-gradient(135deg,rgba(139,92,246,0.4),rgba(217,70,239,0.3))", border:"1px solid rgba(139,92,246,0.25)", fontFamily:"var(--font-bebas)", fontSize:"1.15rem", letterSpacing:"0.05em" }}>
          {student.fullName.split(" ").map(w => w[0]).slice(0,2).join("")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm" style={{ fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.04em" }}>{student.fullName}</span>
            <LevelBadge level={student.level} />
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>{student.code}</span>
            <span className="text-xs" style={{ color: PAY_COLOR[student.paymentStatus] ?? "#aaa", fontFamily:"var(--font-barlow-condensed)" }}>
              {PAY_MAP[student.paymentStatus] ?? student.paymentStatus}
            </span>
          </div>
        </div>

        {/* Kalan ders */}
        <div className="text-right flex-shrink-0 mr-1">
          <div className="text-lg font-bold" style={{ color: barColor, fontFamily:"var(--font-bebas)", lineHeight:1 }}>{remaining}</div>
          <div className="text-xs" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-barlow-condensed)" }}>kalan</div>
        </div>

        <ChevronRight size={15} style={{ color:"rgba(255,255,255,0.2)", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.25s", flexShrink:0 }} />
      </div>

      {/* Progress */}
      <div className="px-4 pb-3">
        <ProgressBar value={student.completedLessons} max={total} color={barColor} />
      </div>

      {/* Detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.28 }}
            style={{ overflow:"hidden" }}
          >
            <div className="px-4 pb-4 pt-1 border-t grid grid-cols-2 gap-3" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
              <InfoRow icon={<BookOpen size={12}/>} label="Paket" value={PKG_MAP[student.packageType] || student.packageType} />
              <InfoRow icon={<CheckCircle2 size={12}/>} label="Tamamlanan" value={`${student.completedLessons} / ${total}`} />
              <InfoRow icon={<Calendar size={12}/>} label="Başlangıç" value={student.packageStartDate || "—"} />
              <InfoRow icon={<Clock size={12}/>} label="Bitiş" value={student.packageEndDate || "—"} />
              {student.phone && <InfoRow icon={<Phone size={12}/>} label="Telefon" value={student.phone} />}
              <InfoRow icon={<Shield size={12}/>} label="İlerleme" value={`%${pct}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1" style={{ color:"rgba(255,255,255,0.28)" }}>
        {icon}
        <span className="text-xs tracking-wide uppercase" style={{ fontFamily:"var(--font-barlow-condensed)", fontSize:"0.65rem" }}>{label}</span>
      </div>
      <span className="text-sm text-white" style={{ fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.02em" }}>{value}</span>
    </div>
  );
}

export default function SalonPanelPage() {
  const { salonOwner, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const router = useRouter();

  const load = async () => {
    if (!salonOwner) return;
    setLoading(true);
    const list = await getSalonOwnerStudents(salonOwner.id);
    setStudents(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [salonOwner]);

  const handleLogout = () => {
    logout();
    router.replace("/salon-login");
  };

  const filtered = students.filter(s =>
    !query || s.fullName.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())
  );

  const active   = students.filter(s => s.isActive).length;
  const avgRemain = students.length ? Math.round(students.reduce((a, s) => a + s.remainingLessons, 0) / students.length) : 0;

  return (
    <div className="min-h-screen bg-obsidian" style={{ paddingBottom:"env(safe-area-inset-bottom,16px)" }}>
      {/* BG */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
      <div className="fixed top-0 right-0 w-[600px] h-[400px] pointer-events-none" style={{ background:"radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 65%)", filter:"blur(100px)" }} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-obsidian/95 border-b" style={{ borderColor:"rgba(139,92,246,0.15)", backdropFilter:"blur(20px)", paddingTop:"env(safe-area-inset-top,0px)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Logo size={34} />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium tracking-wide" style={{ fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.06em" }}>{salonOwner?.name}</div>
            <div className="flex items-center gap-1.5">
              <Shield size={9} style={{ color:"rgba(139,92,246,0.7)" }} />
              <span className="text-xs tracking-widest uppercase" style={{ color:"rgba(139,92,246,0.6)", fontFamily:"var(--font-barlow-condensed)", fontSize:"0.62rem" }}>Salon Gözlemci</span>
            </div>
          </div>
          <button onClick={() => load()} title="Yenile"
            className="p-2 transition-colors" style={{ color:"rgba(255,255,255,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(139,92,246,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
            <RefreshCw size={15} />
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-widest uppercase border transition-all duration-200"
            style={{ color:"rgba(255,255,255,0.35)", borderColor:"rgba(255,255,255,0.1)", fontFamily:"var(--font-barlow-condensed)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}>
            <LogOut size={11}/> Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-8">
        {/* Stat */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label:"Öğrenci", value: students.length, color:"#8B5CF6" },
            { label:"Aktif",   value: active,           color:"#22C55E" },
            { label:"Ort. Kalan", value: avgRemain,     color:"#A855F7" },
          ].map((s,i) => (
            <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
              className="bg-carbon border p-3 text-center" style={{ borderColor:"rgba(139,92,246,0.12)" }}>
              <div className="text-2xl font-bold" style={{ color:s.color, fontFamily:"var(--font-bebas)", lineHeight:1 }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.06em" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Arama */}
        {students.length > 3 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }} className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.2)" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Öğrenci ara..."
              className="w-full bg-carbon border pl-9 pr-9 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor:"rgba(139,92,246,0.15)", color:"#fff", fontFamily:"var(--font-barlow-condensed)", fontSize:"0.9rem" }}
              onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.15)")} />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.2)" }}>
                <X size={13}/>
              </button>
            )}
          </motion.div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
            <span className="text-sm tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>Öğrenciler yükleniyor...</span>
          </div>
        ) : students.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex flex-col items-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.15)" }}>
              <Users size={28} style={{ color:"rgba(139,92,246,0.4)" }} />
            </div>
            <div className="text-center">
              <p className="text-white text-base" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Henüz öğrenci atanmadı</p>
              <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>Antrenör bu hesaba öğrenci atayana kadar burada görünür.</p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-[0.3em] uppercase" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>
                {query ? `${filtered.length} sonuç` : `${students.length} öğrenci`}
              </span>
              {query && filtered.length !== students.length && (
                <button onClick={() => setQuery("")} className="text-xs" style={{ color:"rgba(139,92,246,0.6)", fontFamily:"var(--font-barlow-condensed)" }}>
                  Temizle
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div key="no-result" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    className="flex items-center justify-center gap-2 py-10" style={{ color:"rgba(255,255,255,0.25)" }}>
                    <AlertCircle size={15}/>
                    <span className="text-sm" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Eşleşen öğrenci yok</span>
                  </motion.div>
                ) : (
                  filtered.map((s, i) => <StudentCard key={s.id} student={s} index={i} />)
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Code badge */}
        <div className="flex justify-center mt-10">
          <div className="flex items-center gap-2 px-3 py-1.5 border" style={{ borderColor:"rgba(139,92,246,0.1)", background:"rgba(139,92,246,0.04)" }}>
            <Shield size={10} style={{ color:"rgba(139,92,246,0.35)" }} />
            <span className="text-xs" style={{ color:"rgba(255,255,255,0.15)", fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.12em" }}>
              {salonOwner?.accessCode} · Sadece okuma
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
