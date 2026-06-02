"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { loginAdmin, saveAdminSession } from "@/lib/auth";
import { Shield, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [shake, setShake] = useState(false);
  const { isAdmin, loaded, setAdmin } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded && isAdmin) router.replace("/admin");
  }, [loaded, isAdmin, router]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");
    await new Promise(r => setTimeout(r, 650));

    if (loginAdmin(code)) {
      setStatus("success");
      saveAdminSession();
      setAdmin();
      await new Promise(r => setTimeout(r, 500));
      router.push("/admin");
    } else {
      setStatus("error");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setStatus("idle");
        setCode("");
        inputRef.current?.focus();
      }, 1200);
    }
  };

  const borderColor =
    status === "error" ? "border-crimson/60" :
    status === "success" ? "border-green-500/50" :
    "border-gold/15 hover:border-gold/25";

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden px-4">
      {/* BG */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[500px] bg-gold/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-crimson/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-[35%] w-px h-full" style={{ background: "linear-gradient(to bottom, transparent, rgba(217,119,6,0.1), transparent)" }} />
      <div className="absolute top-0 right-[35%] w-px h-full" style={{ background: "linear-gradient(to bottom, transparent, rgba(217,119,6,0.07), transparent)" }} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[390px]"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: "backOut" }}
          className="flex flex-col items-center mb-10"
        >
          <div className="relative w-20 h-20 mb-5">
            <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
              <polygon points="40,4 74,22 74,58 40,76 6,58 6,22" stroke="rgba(217,119,6,0.55)" strokeWidth="1.5" fill="rgba(217,119,6,0.05)" />
              <polygon points="40,12 68,27 68,53 40,68 12,53 12,27" stroke="rgba(217,119,6,0.18)" strokeWidth="0.8" fill="none" />
              <text x="40" y="46" textAnchor="middle" fill="rgba(217,119,6,0.9)" fontSize="18" fontFamily="var(--font-bebas)">EÖ</text>
            </svg>
            <motion.div
              animate={{ scale: [1, 1.14, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[-8px] border border-gold/25 rounded-full"
            />
          </div>
          <div className="text-center">
            <div className="text-white text-2xl tracking-[0.25em]" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-px w-8 bg-gold/35" />
              <span className="text-gold text-xs tracking-[0.5em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Antrenör Girişi</span>
              <span className="h-px w-8 bg-gold/35" />
            </div>
          </div>
        </motion.div>

        {/* Kart */}
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.48 }}
          className={`relative bg-carbon border transition-all duration-400 ${borderColor}`}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-gold/55" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-gold/55" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-gold/35" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-gold/35" />

          <div className="p-8">
            {/* Durum */}
            <div className="flex items-center justify-center mb-6">
              <AnimatePresence mode="wait">
                {status === "idle" && (
                  <motion.div key="idle" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gold/5 border border-gold/15">
                    <Shield size={13} className="text-gold" />
                    <span className="text-xs text-gold/75 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Güvenli Giriş</span>
                  </motion.div>
                )}
                {status === "loading" && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gold/55 tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Doğrulanıyor...</span>
                  </motion.div>
                )}
                {status === "error" && (
                  <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-crimson/8 border border-crimson/25">
                    <AlertCircle size={13} className="text-crimson" />
                    <span className="text-xs text-crimson tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Giriş Kodu Hatalı</span>
                  </motion.div>
                )}
                {status === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-500/8 border border-green-500/25">
                    <CheckCircle size={13} className="text-green-400" />
                    <span className="text-xs text-green-400 tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Erişim Onaylandı</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs text-white/30 tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Giriş Kodu</label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={visible ? "text" : "password"}
                    value={code}
                    onChange={e => { setCode(e.target.value); if (status === "error") setStatus("idle"); }}
                    placeholder="••••••••"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={status === "loading" || status === "success"}
                    className={`w-full bg-steel/40 border text-white placeholder-white/12 px-4 py-3.5 pr-11 text-sm outline-none transition-all duration-300 ${
                      status === "error" ? "border-crimson/45 focus:border-crimson" :
                      status === "success" ? "border-green-500/45" :
                      "border-white/8 focus:border-gold/45"
                    }`}
                    style={{ fontFamily: "var(--font-bebas)", fontSize: "1.15rem", letterSpacing: "0.25em" }}
                  />
                  <button type="button" onClick={() => setVisible(v => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <AnimatePresence>
                  {status === "error" && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-crimson/75 pt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      Girdiğiniz kod geçersiz. Büyük/küçük harf önemli değildir.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                type="submit"
                disabled={!code.trim() || status === "loading" || status === "success"}
                whileTap={{ scale: status === "idle" ? 0.97 : 1 }}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 font-semibold tracking-widest uppercase text-sm transition-all duration-300 disabled:cursor-not-allowed ${
                  status === "success" ? "bg-green-600 text-white" :
                  status === "error" ? "bg-crimson/10 text-crimson/50 border border-crimson/15" :
                  "bg-gold hover:bg-gold-bright text-obsidian hover:shadow-[0_0_25px_rgba(217,119,6,0.3)] disabled:opacity-40"
                }`}
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {status === "loading" ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Doğrulanıyor...</>
                ) : status === "success" ? (
                  <><CheckCircle size={16} />Panele Yönlendiriliyor...</>
                ) : status === "error" ? (
                  <><AlertCircle size={16} />Hatalı Kod</>
                ) : (
                  <><Shield size={16} />Admin Paneline Gir</>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Geri link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center justify-center mt-7">
          <Link href="/giris" className="group flex items-center gap-2 text-xs text-white/18 hover:text-white/45 tracking-widest uppercase transition-all duration-300" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            Öğrenci Girişi
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
