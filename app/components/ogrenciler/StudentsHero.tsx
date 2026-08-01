"use client";
import { Plus, Users, UserCheck, AlertTriangle, Wallet } from "lucide-react";

interface Props {
  totalCount: number;
  activeCount: number;
  expiredCount: number;
  pendingPaymentCount: number;
  onAddStudent: () => void;
}

export default function StudentsHero({ totalCount, activeCount, expiredCount, pendingPaymentCount, onAddStudent }: Props) {
  const stats = [
    { label: "Toplam Öğrenci", value: totalCount, icon: Users, color: "#A78BFA" },
    { label: "Aktif Öğrenci", value: activeCount, icon: UserCheck, color: "#4ADE80" },
    { label: "Süresi Dolan", value: expiredCount, icon: AlertTriangle, color: "#F87171" },
    { label: "Ödeme Bekleyen", value: pendingPaymentCount, icon: Wallet, color: "#FBBF24" },
  ];

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl">
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              ÖĞRENCİ YÖNETİMİ
            </h1>
            <p className="text-xs sm:text-sm text-white/40 mt-1" style={{ fontFamily: "var(--font-label)" }}>
              Tüm öğrencilerini tek yerden yönet
            </p>
          </div>
          <button onClick={onAddStudent}
            className="gradient-animated gradient-slow gradient-violet-blue flex items-center gap-2 text-white text-xs font-semibold tracking-widest uppercase px-5 py-3 rounded-xl transition-transform hover:scale-105 active:scale-95"
            style={{ fontFamily: "var(--font-label)" }}>
            <Plus size={14} />Yeni Öğrenci
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(st => (
            <div key={st.label} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase leading-tight"
                  style={{ fontFamily: "var(--font-label)" }}>
                  {st.label}
                </span>
                <st.icon size={16} style={{ color: st.color }} />
              </div>
              <div className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-display)", color: st.color }}>
                {st.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
