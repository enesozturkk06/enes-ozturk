"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const WA = "905389714459";

interface Props { message?: string; fixed?: boolean; label?: string }

export default function WhatsAppButton({ message, fixed = true, label = "WhatsApp" }: Props) {
  const text = encodeURIComponent(message || "Merhaba Antrenör Enes! Özel ders hakkında bilgi almak istiyorum.");
  const url  = `https://wa.me/${WA}?text=${text}`;

  const constraintRef             = useRef<HTMLDivElement>(null);
  const [appeared, setAppeared]   = useState(false);
  const [didDrag, setDidDrag]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const WaIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );

  /* Inline (non-fixed) varyant — bağlantı sayfaları için */
  if (!fixed) {
    return (
      <motion.a href={url} target="_blank" rel="noopener noreferrer"
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold tracking-widest uppercase px-6 py-3 text-sm transition-all duration-300"
        style={{ fontFamily:"var(--font-barlow-condensed)" }}>
        <WaIcon />{label}
      </motion.a>
    );
  }

  return (
    <>
      {/* Drag sınırı */}
      <div ref={constraintRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:44 }} />

      <motion.a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        drag
        dragMomentum={false}
        dragConstraints={constraintRef}
        dragElastic={0.05}
        onDragStart={() => setDidDrag(true)}
        onDragEnd={() => setTimeout(() => setDidDrag(false), 100)}
        onClick={e => { if (didDrag) e.preventDefault(); }}
        initial={false}
        animate={{ scale: appeared ? 1 : 0, opacity: appeared ? 0.65 : 0 }}
        whileHover={{ opacity: 1, scale: 1.08 }}
        whileTap={{ opacity: 1, scale: 0.92 }}
        transition={{ type:"spring", stiffness:300, damping:22 }}
        aria-label="WhatsApp ile iletişime geç"
        className="dbg-floating-ui"
        style={{
          position:     "fixed",
          bottom:       "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          right:        20,
          zIndex:       45,
          width:        52,
          height:       52,
          borderRadius: "50%",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          color:        "#fff",
          background:   "#25D366",
          boxShadow:    "0 0 18px rgba(37,211,102,0.3), 0 4px 16px rgba(0,0,0,0.4)",
          cursor:       "grab",
          touchAction:  "none",
        }}
      >
        <WaIcon />
      </motion.a>
    </>
  );
}
