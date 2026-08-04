"use client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { X as XIcon } from "lucide-react";

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, children, className = "", ...props }: BtnProps) {
  const reduced = useReducedMotion();
  const base = "inline-flex items-center justify-center gap-2 font-semibold tracking-widest uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-4 py-2 text-xs", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-base" };
  const variants = {
    primary: "bg-crimson hover:bg-crimson-bright text-white hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]",
    secondary: "border border-white/20 text-white/70 hover:border-white/40 hover:text-white",
    ghost: "text-white/50 hover:text-white",
    danger: "bg-red-700 hover:bg-red-600 text-white",
    gold: "bg-gold hover:bg-gold-bright text-obsidian hover:shadow-[0_0_25px_rgba(217,119,6,0.4)]",
  };
  return (
    <motion.button
      whileTap={!reduced ? { scale: 0.97 } : undefined}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: "var(--font-label)" }}
      disabled={loading || props.disabled}
      {...(props as Parameters<typeof motion.button>[0])}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
// Hover (translateY + kenarlık parlaması) artık .glass-strong CSS kuralının
// kendisinde — tüm kartlarda otomatik ve tutarlı, ayrı bir motion.hover'a
// gerek yok.
interface CardProps { children: ReactNode; className?: string; glow?: "red" | "gold"; id?: string }
export function Card({ children, className = "", glow, id }: CardProps) {
  const glowClass = glow === "red" ? "hover:border-crimson/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.08)]"
    : glow === "gold" ? "hover:border-gold/30 hover:shadow-[0_0_30px_rgba(217,119,6,0.08)]" : "";
  return (
    <div id={id} className={`glass-strong ${glowClass} ${className}`}>
      {children}
    </div>
  );
}

// ── StatCard — proje genelindeki tüm KPI kutularının ortak temeli ───────────
// AdminStatCard/PaketStatCard/SalonStatCard/TakvimStatCard bunun ince birer
// adapter'ı. Zemin/kenarlık/radius/gölge/hover .glass'tan geliyor (bkz.
// globals.css) — burada sadece semantik değer/ikon rengi ve layout var.
// Gradient sadece dış p-[1px] kenarlık halkası olarak kalır, kart gövdesi
// (.glass) hiçbir zaman gradient/dolgu içermez. Hover CSS'ten geliyor; ayrı
// bir JS glow veya whileHover yok (inline stil CSS'i kalıcı ezerdi).
const STATCARD_NAMED_COLORS: Record<string, string> = {
  red: "#dc2626", gold: "#f59e0b", white: "#ffffff", green: "#22c55e",
};
function useCountUp(value: number, enabled: boolean) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, enabled]);
  return enabled ? display : value;
}
interface StatCardProps {
  label: string; value: string | number; sub?: string;
  prefix?: string; suffix?: string; countUp?: boolean; // value sayısal ise saydırarak göster
  color?: string; // "red"|"gold"|"white"|"green" veya herhangi bir CSS rengi (hex/rgb/var(...))
  gradientVariant?: string; // dış kenarlık halkasının gradient class'ı
  icon?: ReactNode;
  pulse?: boolean;
  href?: string;       // yönlendirilecek sayfa
  onClick?: () => void; // veya tıklama aksiyonu
  index?: number;      // grid içindeki sırası — girişte hafif kademeli gecikme için
}
export function StatCard({
  label, value, sub, prefix = "", suffix = "", countUp = false,
  color, gradientVariant = "gradient-violet-pink-orange", icon, pulse, href, onClick, index = 0,
}: StatCardProps) {
  const text = color ? (STATCARD_NAMED_COLORS[color] ?? color) : "#ffffff";
  const isClickable = !!(href || onClick);
  const numericValue = typeof value === "number" ? value : Number(value);
  const display = useCountUp(Number.isFinite(numericValue) ? numericValue : 0, countUp);
  const renderedValue = countUp ? `${prefix}${display.toLocaleString("tr-TR")}${suffix}` : value;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.04 }}
      className={`relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow ${gradientVariant} gradient-border-quiet`}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <div className="glass relative overflow-hidden h-full" style={{ minHeight: 88 }}>
        {pulse && (
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full animate-neon-pulse" style={{ background: text }} />
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] sm:text-xs text-zinc-400 tracking-widest uppercase leading-tight"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {label}
            </span>
            {icon && <div style={{ color: text }} className="flex-shrink-0">{icon}</div>}
          </div>
          <div className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-bebas)", color: text }}>
            {renderedValue}
          </div>
          {sub && (
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-1 leading-tight"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {sub}
            </div>
          )}
          {isClickable && (
            <div className="absolute bottom-3 right-3 opacity-40" style={{ color: text, fontSize: 12 }}>→</div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  if (onClick) {
    return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  }
  return inner;
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {label}
        </label>
      )}
      <input
        className={`w-full bg-carbon border ${error ? "border-crimson/60" : "border-white/10"} focus:border-crimson/60 text-white placeholder-white/20 px-4 py-3 text-sm outline-none transition-all duration-300 ${className}`}
        style={{ fontFamily: "var(--font-inter)" }}
        {...props}
      />
      {error && <p className="text-xs text-crimson" style={{ fontFamily: "var(--font-inter)" }}>{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps { label?: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; className?: string }
export function Select({ label, options, value, onChange, className = "" }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white px-4 py-3 text-sm outline-none transition-all duration-300 appearance-none ${className}`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeColor = "red" | "gold" | "green" | "gray" | "blue" | "purple";
interface BadgeProps { children: ReactNode; color?: BadgeColor }
export function Badge({ children, color = "gray" }: BadgeProps) {
  const styles: Record<BadgeColor, string> = {
    red: "bg-crimson/10 text-crimson border border-crimson/20",
    gold: "bg-gold/10 text-gold border border-gold/20",
    green: "bg-green-500/10 text-green-400 border border-green-500/20",
    gray: "bg-white/8 text-white/50 border border-white/10",
    blue: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase rounded-md ${styles[color]}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
      {children}
    </span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; color?: "red" | "gold" | "green"; label?: string; showValue?: boolean }
export function ProgressBar({ value, max = 100, color = "red", label, showValue }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const gradients = {
    red: "from-crimson to-crimson-bright",
    gold: "from-gold to-gold-bright",
    green: "from-green-600 to-green-400",
  };
  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {label && <span>{label}</span>}
          {showValue && <span>{value}/{max}</span>}
        </div>
      )}
      <div className="h-1.5 bg-iron rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradients[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; maxWidth?: string }
export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  // AnimatePresence burada, component içinde tutuluyor — açık/kapalı mantığı
  // (caller'ın `open` prop'unu ne zaman true/false yaptığı) hiç değişmiyor,
  // sadece kapanış artık anında unmount yerine yumuşak bir fade ile çıkıyor.
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, scale: 0.94, filter: "blur(6px)" }}
            animate={{ y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 28 } }}
            exit={{ y: 20, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.2, ease: "easeIn" } }}
            className={`relative z-10 w-full sm:${maxWidth} gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet rounded-t-2xl sm:rounded-2xl p-[1px] overflow-hidden`}
            style={{ maxHeight: "90svh" }}
          >
            <div className="glass-strong relative flex flex-col rounded-t-2xl sm:rounded-2xl h-full" style={{ maxHeight: "90svh" }}>
              {/* Sabit başlık */}
              <div className="flex-shrink-0 flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 className="text-xl text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors duration-200 rounded-full p-1 hover:bg-white/5">
                  <XIcon size={18} />
                </button>
              </div>
              {/* Kaydırılabilir içerik */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-5" style={{ WebkitOverflowScrolling: "touch" }}>
                {children}
              </div>
              {/* Sabit alt buton alanı — safe-area altında hiçbir zaman kırpılmaz */}
              {footer && (
                <div className="flex-shrink-0 px-5 pt-4 rounded-b-2xl"
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
                  }}>
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; accent?: string; actions?: ReactNode }
export function PageHeader({ title, subtitle, accent, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ y: 16, scale: 0.98, filter: "blur(6px)" }}
      animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px] mb-6 sm:mb-8"
    >
      <div className="glass-strong relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          {accent && (
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-px gradient-animated gradient-slow gradient-violet-pink-orange" />
              <span className="text-[10px] sm:text-xs tracking-[0.4em] uppercase"
                style={{ fontFamily: "var(--font-label)", color: "#A78BFA" }}>{accent}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-tight break-words"
            style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
          {subtitle && (
            <p className="text-white/40 text-xs sm:text-sm mt-1"
              style={{ fontFamily: "var(--font-label)" }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 sm:gap-3 flex-wrap flex-shrink-0">{actions}</div>}
      </div>
    </motion.div>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "from-green-600 to-green-400" : score >= 6 ? "from-gold to-gold-bright" : "from-crimson to-crimson-bright";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        <span className="text-white/50">{label}</span>
        <span className={score >= 8 ? "text-green-400" : score >= 6 ? "text-gold-bright" : "text-crimson"}>{score}/10</span>
      </div>
      <div className="h-1.5 bg-iron rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }} animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps { label?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }
export function Textarea({ label, value, onChange, rows = 3, placeholder }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white placeholder-white/20 px-4 py-3 text-sm outline-none transition-all duration-300 resize-none"
        style={{ fontFamily: "var(--font-inter)" }}
      />
    </div>
  );
}
