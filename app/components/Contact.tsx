"use client";

import { useState } from "react";
import { Phone, MapPin, MessageCircle } from "lucide-react";

const WHATSAPP = "905389714459";

export default function Contact() {
  const [name, setName] = useState("");
  const [interest, setInterest] = useState("kickboks");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const waMsg = encodeURIComponent(
    `Merhaba Antrenör Enes,\nAdım: ${name || "(belirtilmedi)"}\nBranş: ${interest}\n${message ? "Not: " + message : ""}\n\nÖzel ders hakkında bilgi almak istiyorum.`
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(`https://wa.me/${WHATSAPP}?text=${waMsg}`, "_blank", "noopener,noreferrer");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const inputBase = "w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white placeholder-white/20 px-4 py-3 text-sm outline-none transition-all duration-300";

  return (
    <section id="contact" className="relative py-24 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-obsidian" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-crimson/25 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-crimson/4 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gold/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>İletişim</span>
            <span className="w-10 h-px bg-crimson" />
          </div>
          <h2 className="font-display text-[clamp(40px,7vw,88px)] leading-none tracking-wide text-white" style={{ fontFamily: "var(--font-bebas)" }}>
            RANDEVU{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#d97706,#fbbf24,#d97706)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer-gold 3s linear infinite",
              }}
            >
              ALIN
            </span>
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-white/40 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
            WhatsApp üzerinden hızlı iletişim. Seviniz ve sorularınızı belirtin, en kısa sürede dönüş yapılır.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Sol: İletişim bilgileri */}
          <div className="lg:col-span-2 space-y-5">
            {[
              { icon: <Phone size={18} />, label: "Telefon / WhatsApp", val: "0538 971 44 59", href: `https://wa.me/${WHATSAPP}` },
              { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, label: "Kişisel Instagram", val: "@enesozturkkq", href: "https://instagram.com/enesozturkkq" },
              { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, label: "Eğitim / PT Instagram", val: "@p.t.enesozturk", href: "https://www.instagram.com/p.t.enesozturk" },
              { icon: <MapPin size={18} />, label: "Konum", val: "Ankara", href: undefined },
            ].map((c) => (
              <div key={c.label} className="flex gap-4 group">
                <div className="w-10 h-10 flex-shrink-0 bg-carbon border border-white/6 group-hover:border-crimson/30 flex items-center justify-center text-crimson group-hover:text-gold-bright transition-all duration-300">
                  {c.icon}
                </div>
                <div>
                  <div className="text-xs text-white/30 tracking-widest uppercase mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{c.label}</div>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="text-sm text-white/70 hover:text-white transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {c.val}
                    </a>
                  ) : (
                    <div className="text-sm text-white/70" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{c.val}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Direkt WhatsApp */}
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full p-4 bg-green-600/10 border border-green-600/25 hover:border-green-500/50 hover:bg-green-600/15 transition-all duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <div>
                <div className="text-sm text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>WhatsApp ile Yaz</div>
                <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>0538 971 44 59</div>
              </div>
            </a>
          </div>

          {/* Sağ: Form */}
          <div className="lg:col-span-3">
            <div className="relative bg-carbon border border-white/8 p-8">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-crimson/40 to-transparent" />
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-crimson/60" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-gold/40" />

              <h3 className="text-xl font-display text-white tracking-wider mb-6" style={{ fontFamily: "var(--font-bebas)" }}>
                RANDEVU MESAJI OLUŞTUR
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ad Soyad</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Adınız" className={inputBase} style={{ fontFamily: "var(--font-inter)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Branş</label>
                    <select value={interest} onChange={e => setInterest(e.target.value)} className={`${inputBase} appearance-none`} style={{ fontFamily: "var(--font-inter)" }}>
                      <option value="kickboks" className="bg-carbon">Kickboks</option>
                      <option value="boks" className="bg-carbon">Boks</option>
                      <option value="muay-thai" className="bg-carbon">Muay Thai</option>
                      <option value="karate" className="bg-carbon">Karate</option>
                      <option value="genel" className="bg-carbon">Genel Bilgi</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Eklemek İstedikleriniz</label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    placeholder="Seviyeniz, hedefiniz, soru..."
                    className={`${inputBase} resize-none`}
                    style={{ fontFamily: "var(--font-inter)" }}
                  />
                </div>
                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold tracking-widest uppercase px-8 py-3.5 text-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.35)]"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  <MessageCircle size={16} />
                  {sent ? "WhatsApp Açıldı!" : "WhatsApp&apos;ta Mesaj Gönder"}
                </button>
                <p className="text-center text-xs text-white/20" style={{ fontFamily: "var(--font-inter)" }}>
                  Mesajınız WhatsApp&apos;ta önceden doldurulmuş olarak açılır.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
