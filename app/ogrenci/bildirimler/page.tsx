"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentNotifications, markNotificationRead } from "@/lib/db";
import type { Notification } from "@/lib/types";
import { Card, PageHeader, Badge } from "@/app/components/ui";
import { Bell, CheckCircle, AlertTriangle, Info, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const TYPE_ICON: Record<string, React.ReactNode> = {
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
  success: <CheckCircle size={16} />,
  reminder: <Bell size={16} />,
};
const TYPE_COLOR: Record<string, "red" | "gold" | "green" | "blue"> = {
  info: "blue", warning: "gold", success: "green", reminder: "red",
};
const TYPE_LABEL: Record<string, string> = {
  info: "Bilgi", warning: "Uyarı", success: "Başarı", reminder: "Hatırlatıcı",
};

export default function BildirimlerPage() {
  const { student } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!student) return;
    getStudentNotifications(student.id).then(setNotifs);
  }, [student]);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unread = notifs.filter(n => !n.isRead);
  const read = notifs.filter(n => n.isRead);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Bildirimler"
        subtitle={`${unread.length} okunmamış bildirim`}
        accent="Panel"
      />

      {notifs.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bildiriminiz yok</p>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Okunmamış ({unread.length})
              </div>
              {unread.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="p-4 border border-l-2 border-crimson hover:border-crimson/60 cursor-pointer bg-carbon transition-all duration-300" onClick={() => handleRead(n.id)}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 ${TYPE_COLOR[n.type] === "gold" ? "text-gold" : TYPE_COLOR[n.type] === "green" ? "text-green-400" : TYPE_COLOR[n.type] === "blue" ? "text-blue-400" : "text-crimson"}`}>
                        {TYPE_ICON[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{n.title}</span>
                          <Badge color={TYPE_COLOR[n.type]}>{TYPE_LABEL[n.type]}</Badge>
                          <div className="w-2 h-2 bg-crimson rounded-full ml-auto" />
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed mb-2" style={{ fontFamily: "var(--font-inter)" }}>{n.message}</p>
                        <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          {format(parseISO(n.createdAt), "dd MMMM yyyy", { locale: tr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {read.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-white/20 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Okunmuş</div>
              {read.map((n, i) => (
                <Card key={n.id} className="p-4 opacity-50">
                  <div className="flex items-start gap-3">
                    <div className="text-white/20 flex-shrink-0 mt-0.5">{TYPE_ICON[n.type]}</div>
                    <div className="flex-1">
                      <div className="text-sm text-white/60 font-semibold mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{n.title}</div>
                      <p className="text-xs text-white/30 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{n.message}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
