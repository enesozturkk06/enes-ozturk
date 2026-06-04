"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  getAdminNotifications, markNotificationRead, markAllAdminNotificationsRead,
} from "@/lib/db";
import type { Notification } from "@/lib/types";
import { PageHeader } from "@/app/components/ui";
import { Bell, CheckCheck, Filter, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

type FilterType = "hepsi" | "okunmamis" | "info" | "warning" | "success";

const TYPE_LABEL: Record<string, string> = {
  info: "Bilgi", warning: "Uyarı", success: "Başarı", reminder: "Hatırlatma",
};
const TYPE_COLOR: Record<string, string> = {
  info: "#8B5CF6", warning: "#d97706", success: "#22c55e", reminder: "#60a5fa",
};

export default function BildirimlerPage() {
  const [notifs, setNotifs]     = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterType>("hepsi");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAdminNotifications(100);
    setNotifs(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (n: Notification) => {
    if (n.isRead) return;
    await markNotificationRead(n.id);
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllAdminNotificationsRead();
    setNotifs(prev => prev.map(x => ({ ...x, isRead: true })));
    setMarkingAll(false);
  };

  const filtered = notifs.filter(n => {
    if (filter === "okunmamis") return !n.isRead;
    if (filter === "info")    return n.type === "info";
    if (filter === "warning") return n.type === "warning";
    if (filter === "success") return n.type === "success";
    return true;
  });

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Bildirimler"
          subtitle={`${notifs.length} toplam · ${unreadCount} okunmamış`}
          accent="Admin Paneli"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => load()}
            className="p-2 border transition-colors"
            style={{ borderColor:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)" }}>
            <RefreshCw size={14}/>
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border transition-colors disabled:opacity-50"
              style={{ borderColor:"rgba(139,92,246,0.25)", color:"rgba(139,92,246,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
              <CheckCheck size={13}/>
              {markingAll ? "İşleniyor..." : "Tümünü Okundu Yap"}
            </button>
          )}
        </div>
      </div>

      {/* Filtre chipleri */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "hepsi",      label: "Tümü" },
          { key: "okunmamis",  label: `Okunmamış (${unreadCount})` },
          { key: "info",       label: "Randevu" },
          { key: "warning",    label: "İptal/Uyarı" },
          { key: "success",    label: "Onay" },
        ] as { key: FilterType; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              borderColor: filter === f.key ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)",
              background:  filter === f.key ? "rgba(139,92,246,0.1)" : "transparent",
              color:       filter === f.key ? "#8B5CF6" : "rgba(255,255,255,0.3)",
            }}>
            {filter === f.key && <Filter size={10}/>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)" }}>
            <Bell size={24} style={{ color:"rgba(139,92,246,0.3)" }}/>
          </div>
          <p className="text-sm" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>
            Bu filtrede bildirim yok
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n, i) => {
            const accent = TYPE_COLOR[n.type] ?? "#8B5CF6";
            return (
              <motion.div key={n.id}
                initial={{ opacity:0, y:6 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.03 }}
                className="flex gap-3 p-4 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: n.isRead ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${n.isRead ? "rgba(255,255,255,0.05)" : accent + "28"}`,
                }}
                onClick={() => handleRead(n)}>
                {/* Renkli çubuk */}
                <div className="w-1 flex-shrink-0 rounded-full self-stretch"
                  style={{ background: n.isRead ? "rgba(255,255,255,0.06)" : accent }} />

                {/* İkon */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: `${accent}14`, border:`1px solid ${accent}28` }}>
                  <Bell size={13} style={{ color: accent }}/>
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold leading-tight"
                      style={{ color: n.isRead ? "rgba(255,255,255,0.4)" : "#fff", fontFamily:"var(--font-barlow-condensed)" }}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5"
                        style={{ background:`${accent}14`, color: accent, fontFamily:"var(--font-barlow-condensed)", border:`1px solid ${accent}28` }}>
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {!n.isRead && <div className="w-2 h-2 rounded-full" style={{ background: accent }}/>}
                    </div>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed"
                    style={{ color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {n.message}
                  </p>
                  <p className="text-[10px] mt-1.5"
                    style={{ color:"rgba(255,255,255,0.15)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {n.createdAt ? format(parseISO(n.createdAt), "dd MMMM yyyy HH:mm", { locale: tr }) : ""}
                    {!n.isRead && <span className="ml-2" style={{ color: accent }}>· Okunmadı — tıkla</span>}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
