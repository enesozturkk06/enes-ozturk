"use client";
import { motion } from "framer-motion";
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, children, className = "", ...props }: BtnProps) {
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
      whileTap={{ scale: 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
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
interface CardProps { children: ReactNode; className?: string; hover?: boolean; glow?: "red" | "gold" }
export function Card({ children, className = "", hover, glow }: CardProps) {
  const glowClass = glow === "red" ? "hover:border-crimson/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.08)]"
    : glow === "gold" ? "hover:border-gold/30 hover:shadow-[0_0_30px_rgba(217,119,6,0.08)]" : "";
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={`bg-carbon border border-white/8 ${glowClass} transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: string | number; sub?: string; color?: "red" | "gold" | "white" | "green"; icon?: ReactNode }
export function StatCard({ label, value, sub, color = "white", icon }: StatCardProps) {
  const colors = { red: "text-crimson", gold: "text-gold-bright", white: "text-white", green: "text-green-400" };
  return (
    <Card hover glow={color === "red" ? "red" : color === "gold" ? "gold" : undefined}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {label}
          </span>
          {icon && <div className={colors[color]}>{icon}</div>}
        </div>
        <div className={`text-3xl font-display ${colors[color]}`} style={{ fontFamily: "var(--font-bebas)" }}>
          {value}
        </div>
        {sub && <div className="text-xs text-white/30 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{sub}</div>}
      </div>
    </Card>
  );
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
    <span className={`inline-flex items-center px-2 py-0.5 text-xs tracking-widest uppercase ${styles[color]}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
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
      <div className="h-2 bg-iron rounded-full overflow-hidden">
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
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string }
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className={`relative z-10 w-full ${maxWidth} bg-carbon border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)]`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h3 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>{title}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; accent?: string; actions?: ReactNode }
export function PageHeader({ title, subtitle, accent, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        {accent && <div className="flex items-center gap-3 mb-2"><span className="w-8 h-px bg-crimson" /><span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{accent}</span></div>}
        <h1 className="text-3xl lg:text-4xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>{title}</h1>
        {subtitle && <p className="text-white/40 text-sm mt-1" style={{ fontFamily: "var(--font-inter)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
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
