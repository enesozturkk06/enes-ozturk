"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { loginSalonOwner, saveSalonOwnerSession } from "@/lib/auth";
import { Eye, EyeOff, Shield, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Logo from "@/app/components/shared/Logo";
import Link from "next/link";

export default function SalonLoginPage() {
  const [code, setCode]         = useState("");
  const [visible, setVisible]   = useState(false);
  const [status, setStatus]     = useState<"idle"|"loading"|"error"|"success">("idle");
  const [shake, setShake]       = useState(false);
  const { salonOwner, loaded, setSalonOwner } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded && salonOwner) router.replace("/salon-panel");
  }, [loaded, salonOwner, router]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");

    await new Promise(r => setTimeout(r, 600));
    const owner = await loginSalonOwner(code);

    if (owner) {
      setStatus("success");
      saveSalonOwnerSession(owner);
      setSalonOwner(owner);
      await new Promise(r => setTimeout(r, 500));
      router.push("/salon-panel");
    } else {
      setStatus("error");
      setShake(true);
      setTimeout(() => { setShake(false); setStatus("idle"); setCode(""); inputRef.current?.focus(); }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden px-4">
      {/* BG */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] rounded-full pointer-events-none" style={{ background:"radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 65%)", filter:"blur(120px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full pointer-events-none" style={{ background:"radial-gradient(circle,rgba(217,70,239,0.06) 0%,transparent 65%)", filter:"blur(100px)" }} />

      <motion.div
        initial={{ opacity:0, y:28 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
        className="relative z-10 w-full max-w-[390px]"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale:0.85, opacity:0 }}
          animate={{ scale:1, opacity:1 }}
          transition={{ delay:0.12, duration:0.5, ease:"backOut" }}
          className="flex flex-col items-center mb-10"
        >
          <Logo size={72} priority className="mb-5" />
          <div className="text-center">
            <div className="text-white text-2xl tracking-[0.2em]" style={{ fontFamily:"var(--font-bebas)" }}>ENES ÖZTÜRK</div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-px w-8" style={{ background:"rgba(139,92,246,0.4)" }} />
              <span className="text-xs tracking-[0.45em] uppercase" style={{ color:"#8B5CF6", fontFamily:"var(--font-barlow-condensed)" }}>Salon Gözlemci Girişi</span>
              <span className="h-px w-8" style={{ background:"rgba(139,92,246,0.4)" }} />
            </div>
          </div>
        </motion.div>

        {/* Kart */}
        <motion.div
          animate={shake ? { x:[-10,10,-8,8,-4,4,0] } : {}}
          transition={{ duration:0.48 }}
          className="relative bg-carbon border overflow-hidden"
          style={{ borderColor: status==="error" ? "rgba(220,38,38,0.5)" : status==="success" ? "rgba(34,197,94,0.4)" : "rgba(139,92,246,0.2)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.5),transparent)" }} />
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor:"rgba(139,92,246,0.5)" }} />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor:"rgba(139,92,246,0.5)" }} />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2" style={{ borderColor:"rgba(139,92,246,0.3)" }} />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2" style={{ borderColor:"rgba(139,92,246,0.3)" }} />

          <div className="p-8">
            {/* Durum */}
            <div className="flex items-center justify-center mb-6">
              <AnimatePresence mode="wait">
                {status === "idle" && (
                  <motion.div key="idle" initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:5 }}
                    className="flex items-center gap-2 px-3 py-1.5 border"
                    style={{ background:"rgba(139,92,246,0.06)", borderColor:"rgba(139,92,246,0.2)" }}>
                    <Shield size={13} style={{ color:"#8B5CF6" }} />
                    <span className="text-xs tracking-widest uppercase" style={{ color:"rgba(139,92,246,0.8)", fontFamily:"var(--font-barlow-condensed)" }}>Gözlemci Girişi</span>
                  </motion.div>
                )}
                {status === "loading" && (
                  <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
                    <span className="text-xs tracking-widest" style={{ color:"rgba(139,92,246,0.6)", fontFamily:"var(--font-barlow-condensed)" }}>Doğrulanıyor...</span>
                  </motion.div>
                )}
                {status === "error" && (
                  <motion.div key="error" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
                    className="flex items-center gap-2 px-3 py-1.5 border"
                    style={{ background:"rgba(220,38,38,0.08)", borderColor:"rgba(220,38,38,0.3)" }}>
                    <AlertCircle size={13} className="text-crimson" />
                    <span className="text-xs tracking-widest" style={{ color:"#ef4444", fontFamily:"var(--font-barlow-condensed)" }}>Geçersiz veya Pasif Kod</span>
                  </motion.div>
                )}
                {status === "success" && (
                  <motion.div key="success" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
                    className="flex items-center gap-2 px-3 py-1.5 border"
                    style={{ background:"rgba(34,197,94,0.08)", borderColor:"rgba(34,197,94,0.25)" }}>
                    <CheckCircle size={13} className="text-green-400" />
                    <span className="text-xs tracking-widest text-green-400" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Erişim Onaylandı</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs tracking-[0.3em] uppercase" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                  Erişim Kodu
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={visible ? "text" : "password"}
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); if (status==="error") setStatus("idle"); }}
                    placeholder="SALON-XXXX"
                    disabled={status==="loading" || status==="success"}
                    className="w-full bg-steel/40 border px-4 py-3.5 pr-11 text-sm outline-none transition-all duration-300"
                    style={{
                      borderColor: status==="error" ? "rgba(220,38,38,0.45)" : status==="success" ? "rgba(34,197,94,0.45)" : "rgba(139,92,246,0.2)",
                      color:"#fff",
                      fontFamily:"var(--font-bebas)",
                      fontSize:"1.1rem",
                      letterSpacing:"0.2em",
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = "rgba(139,92,246,0.5)"; }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = status==="error" ? "rgba(220,38,38,0.45)" : "rgba(139,92,246,0.2)"; }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setVisible(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color:"rgba(255,255,255,0.25)" }}>
                    {visible ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                <AnimatePresence>
                  {status === "error" && (
                    <motion.p initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                      className="text-xs text-red-400 pt-0.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Girdiğiniz kod geçersiz veya pasif. Antrenörden doğru kodu alın.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <motion.button type="submit"
                disabled={!code.trim() || status==="loading" || status==="success"}
                whileTap={{ scale: status==="idle" ? 0.97 : 1 }}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 font-semibold tracking-widest uppercase text-sm transition-all duration-300 disabled:cursor-not-allowed"
                style={{
                  background: status==="success" ? "rgba(34,197,94,0.7)" : "linear-gradient(135deg,#8B5CF6,#A855F7)",
                  color:"#fff",
                  fontFamily:"var(--font-barlow-condensed)",
                  opacity: !code.trim() ? 0.4 : 1,
                  boxShadow: status==="idle" && code.trim() ? "0 0 20px rgba(139,92,246,0.3)" : "none",
                }}>
                {status === "loading" ? (
                  <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Doğrulanıyor...</>
                ) : status === "success" ? (
                  <><CheckCircle size={16}/>Yönlendiriliyor...</>
                ) : (
                  <><Shield size={16}/>Panele Gir</>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Geri */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
          className="flex items-center justify-center mt-7">
          <Link href="/giris"
            className="group flex items-center gap-2 text-xs tracking-widest uppercase transition-all duration-300"
            style={{ color:"rgba(255,255,255,0.18)", fontFamily:"var(--font-barlow-condensed)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.18)"; }}>
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            Öğrenci Girişine Dön
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
