"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Phone, MapPin, MessageCircle } from "lucide-react";

const WA = "905389714459";

const INFO = [
  { icon: <Phone size={16}/>, label: "WhatsApp / Telefon", val: "0538 971 44 59", href: `https://wa.me/${WA}`, accent: "#22c55e" },
  { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, label: "Kişisel Instagram", val: "@enesozturkkq", href: "https://instagram.com/enesozturkkq", accent: "#8B5CF6" },
  { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, label: "PT Instagram", val: "@p.t.enesozturk", href: "https://instagram.com/p.t.enesozturk", accent: "#D946EF" },
  { icon: <MapPin size={16}/>, label: "Konum", val: "Ankara", href: undefined, accent: "#8B5CF6" },
];

const BRANCHES = ["Kickboks","Boks","Muay Thai","Karate","Genel Bilgi"];

const fieldStyle = {
  background: "rgba(18,18,26,0.9)",
  border: "1px solid rgba(139,92,246,0.18)",
  color: "#fff",
  outline: "none",
  transition: "border-color 0.25s, box-shadow 0.25s",
};

export default function Contact() {
  const [name, setName] = useState("");
  const [interest, setInterest] = useState("kickboks");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  const waMsg = encodeURIComponent(
    `Merhaba Antrenör Enes,\nAdım: ${name||"(belirtilmedi)"}\nBranş: ${interest}\n${message?"Not: "+message:""}\n\nÖzel ders hakkında bilgi almak istiyorum.`
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(`https://wa.me/${WA}?text=${waMsg}`, "_blank", "noopener");
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderColor = "rgba(139,92,246,0.55)";
    (e.target as HTMLElement).style.boxShadow = "0 0 20px rgba(139,92,246,0.12)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderColor = "rgba(139,92,246,0.18)";
    (e.target as HTMLElement).style.boxShadow = "none";
  };

  return (
    <section id="contact" className="relative py-24 lg:py-36 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#0D0D14" }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)" }} />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 65%)", filter: "blur(80px)" }} />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(217,70,239,0.05) 0%,transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <motion.div ref={headRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="h-px w-10" style={{ background: "linear-gradient(to right,transparent,#8B5CF6)" }} />
            <span className="text-xs tracking-[0.4em] uppercase"
              style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}>İletişim</span>
            <span className="h-px w-10" style={{ background: "linear-gradient(to left,transparent,#8B5CF6)" }} />
          </div>
          <h2 className="font-display leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,7vw,88px)" }}>
            RANDEVU{" "}
            <span style={{
              background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF,#A855F7,#8B5CF6)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-violet 3s linear infinite",
            }}>ALIN</span>
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm"
            style={{ color: "rgba(255,255,255,0.38)", fontFamily: "var(--font-inter)" }}>
            WhatsApp üzerinden hızlı iletişim. Branşınızı ve sorularınızı belirtin.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Sol: İletişim */}
          <div className="lg:col-span-2 space-y-4">
            {INFO.map((c, i) => (
              <motion.div key={c.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}>
                {c.href ? (
                  <motion.a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02, borderColor: `${c.accent}40` }}
                    className="flex gap-4 p-4 rounded-xl transition-all"
                    style={{ background: "rgba(15,15,22,0.9)", border: "1px solid rgba(139,92,246,0.1)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: `${c.accent}12`, border: `1px solid ${c.accent}22`, color: c.accent }}>
                      {c.icon}
                    </div>
                    <div>
                      <div className="text-[10px] tracking-widest uppercase mb-0.5"
                        style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)" }}>{c.label}</div>
                      <div className="text-sm" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-barlow-condensed)" }}>{c.val}</div>
                    </div>
                  </motion.a>
                ) : (
                  <div className="flex gap-4 p-4 rounded-xl"
                    style={{ background: "rgba(15,15,22,0.9)", border: "1px solid rgba(139,92,246,0.1)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${c.accent}12`, border: `1px solid ${c.accent}22`, color: c.accent }}>{c.icon}</div>
                    <div>
                      <div className="text-[10px] tracking-widest uppercase mb-0.5"
                        style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)" }}>{c.label}</div>
                      <div className="text-sm" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-barlow-condensed)" }}>{c.val}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Direkt WhatsApp */}
            <motion.a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(34,197,94,0.22)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 w-full p-4 rounded-xl transition-all mt-2"
              style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>WhatsApp ile Yaz</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)" }}>0538 971 44 59</div>
              </div>
              <motion.div className="ml-auto text-green-400" animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.div>
            </motion.a>
          </div>

          {/* Sağ: Form */}
          <motion.div className="lg:col-span-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}>
            <div className="relative rounded-2xl p-8 overflow-hidden"
              style={{ background: "rgba(15,15,22,0.95)", border: "1px solid rgba(139,92,246,0.2)", backdropFilter: "blur(20px)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.5),rgba(217,70,239,0.3),transparent)" }} />
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 rounded-tl-2xl"
                style={{ borderColor: "rgba(139,92,246,0.5)" }} />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 rounded-br-2xl"
                style={{ borderColor: "rgba(217,70,239,0.4)" }} />

              <h3 className="text-xl font-display text-white tracking-wider mb-6"
                style={{ fontFamily: "var(--font-bebas)" }}>RANDEVU MESAJI OLUŞTUR</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase mb-1.5"
                      style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>Ad Soyad</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Adınız" onFocus={onFocus} onBlur={onBlur}
                      className="w-full px-4 py-3 text-sm rounded-xl"
                      style={{ ...fieldStyle, fontFamily: "var(--font-inter)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase mb-1.5"
                      style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>Branş</label>
                    <select value={interest} onChange={e => setInterest(e.target.value)}
                      onFocus={onFocus} onBlur={onBlur}
                      className="w-full px-4 py-3 text-sm rounded-xl appearance-none"
                      style={{ ...fieldStyle, fontFamily: "var(--font-inter)" }}>
                      {BRANCHES.map(b => (
                        <option key={b} value={b.toLowerCase().replace(" ","-")} style={{ background: "#0D0D14" }}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] tracking-widest uppercase mb-1.5"
                    style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>Mesajınız</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                    placeholder="Seviyeniz, hedefiniz, sorularınız..."
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full px-4 py-3 text-sm rounded-xl resize-none"
                    style={{ ...fieldStyle, fontFamily: "var(--font-inter)" }} />
                </div>
                <motion.button type="submit"
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(34,197,94,0.35)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 text-white text-sm font-semibold tracking-widest uppercase rounded-xl transition-all"
                  style={{
                    background: sent ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.85)",
                    border: sent ? "1px solid rgba(34,197,94,0.4)" : "none",
                    fontFamily: "var(--font-barlow-condensed)",
                    boxShadow: "0 0 20px rgba(34,197,94,0.2)",
                  }}>
                  <MessageCircle size={16} />
                  {sent ? "WhatsApp Açıldı! ✓" : "WhatsApp'ta Mesaj Gönder"}
                </motion.button>
                <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-inter)" }}>
                  Mesajınız WhatsApp&apos;ta önceden doldurulmuş olarak açılır.
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
