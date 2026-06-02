"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { loginStudent, saveStudentSession } from "@/lib/auth";
import { Button, Input } from "@/app/components/ui";

export default function GirisPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { student, isAdmin, loaded, setStudent } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;
    if (student) router.replace("/ogrenci");
    if (isAdmin) router.replace("/admin");
  }, [loaded, student, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError("Lütfen giriş kodunuzu girin."); return; }
    setLoading(true);
    setError("");
    try {
      const found = await loginStudent(code);
      if (found) {
        saveStudentSession(found);
        setStudent(found);
        router.push("/ogrenci");
      } else {
        setError("Geçersiz giriş kodu. Lütfen antrenörünüzle iletişime geçin.");
      }
    } catch {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden">
      {/* BG effects */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-crimson/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-[400px] h-[400px] bg-gold/6 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 opacity-4" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16">
              <svg viewBox="0 0 44 44" fill="none" className="w-full h-full">
                <polygon points="22,2 42,12 42,32 22,42 2,32 2,12" stroke="#dc2626" strokeWidth="2" fill="rgba(220,38,38,0.1)" />
                <text x="22" y="28" textAnchor="middle" fill="#dc2626" fontSize="13" fontFamily="var(--font-bebas)">EÖ</text>
              </svg>
            </div>
            <div>
              <div className="text-2xl text-white tracking-[0.2em]" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
              <div className="text-crimson text-xs tracking-[0.4em]" style={{ fontFamily: "var(--font-bebas)" }}>ANTRENÖR · KİCKBOKS</div>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-carbon border border-white/8 p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-crimson to-transparent" />
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-crimson" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-crimson" />

          <h1 className="text-3xl text-white font-display tracking-wider mb-1" style={{ fontFamily: "var(--font-bebas)" }}>
            ÖĞRENCİ GİRİŞİ
          </h1>
          <p className="text-white/40 text-sm mb-8" style={{ fontFamily: "var(--font-inter)" }}>
            Size verilen kodu girerek panele erişin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Giriş Kodu"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
              placeholder="ENES001"
              error={error}
              autoFocus
              style={{ letterSpacing: "0.2em", fontFamily: "var(--font-bebas)", fontSize: "1.2rem" }}
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Panele Gir
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Kodunuz yok mu? Antrenörünüzle iletişime geçin.
            </p>
            <a
              href={`https://wa.me/905389714459?text=${encodeURIComponent("Merhaba, giriş kodum için yardım istiyorum.")}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-xs tracking-wider transition-colors duration-200"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp ile yardım al
            </a>
          </div>
        </div>

        {/* Admin link */}
        <div className="text-center mt-6">
          <Link href="/admin/giris" className="text-xs text-white/15 hover:text-white/30 tracking-widest transition-colors duration-200" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Antrenör Girişi →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
