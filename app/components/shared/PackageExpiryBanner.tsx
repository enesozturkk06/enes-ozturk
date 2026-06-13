"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";
import { getDaysRemaining, getPackageUrgency } from "@/lib/packageDuration";
import { PACKAGE_DURATION_INFO_TEXT, PACKAGE_EXPIRED_TEXT } from "@/lib/constants";

/** Randevu sayfasının üst kısmında paket süresi uyarısı + bilgi modalı */
export default function PackageExpiryBanner({ endDate }: { endDate?: string }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const daysRemaining = getDaysRemaining(endDate);

  if (daysRemaining === null || daysRemaining > 14) return null;

  const urgency = getPackageUrgency(daysRemaining);
  const message = daysRemaining < 0
    ? PACKAGE_EXPIRED_TEXT
    : daysRemaining === 0
    ? "Paketin bugün sona eriyor."
    : `Paketinin bitmesine ${daysRemaining} gün kaldı.`;

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
        style={{ background: urgency.bg, border: `1px solid ${urgency.border}` }}>
        <AlertTriangle size={16} className={`${urgency.color} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm min-w-0 flex-1 ${urgency.color}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {message}
        </p>
        <button onClick={() => setInfoOpen(true)} className={`${urgency.color} flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity`}
          title="Paket süresi hakkında bilgi">
          <Info size={16} />
        </button>
      </div>

      <AnimatePresence>
        {infoOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setInfoOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  PAKET SÜRESİ
                </h3>
                <button onClick={() => setInfoOpen(false)} className="text-white/25 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-white/60 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
                {PACKAGE_DURATION_INFO_TEXT}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
