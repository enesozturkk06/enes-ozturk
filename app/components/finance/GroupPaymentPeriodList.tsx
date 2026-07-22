"use client";

import { useState } from "react";
import { Check, BellRing, Send } from "lucide-react";
import type { GroupLessonMember, GroupLessonPayment } from "@/lib/types";
import { STATUS_CFG, StatusBadge } from "./StatusBadge";

export default function GroupPaymentPeriodList({
  groupName, members, payments, onMarkPaid, onSendReminder,
}: {
  groupName: string;
  members: GroupLessonMember[];
  payments: GroupLessonPayment[];
  onMarkPaid: (id: string) => Promise<void>;
  onSendReminder: (studentId: string, groupName: string, amount: number) => Promise<void>;
}) {
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const byMember = new Map(payments.map(p => [p.memberId, p]));

  const handleReminder = async (memberId: string, studentId: string, amount: number) => {
    setBusy(memberId);
    try {
      await onSendReminder(studentId, groupName, amount);
      setSentTo(prev => new Set(prev).add(memberId));
    } finally {
      setBusy(null);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    setBusy(paymentId);
    await onMarkPaid(paymentId);
    setBusy(null);
  };

  if (members.length === 0) {
    return <p className="text-xs text-white/25 text-center py-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci yok</p>;
  }

  return (
    <div className="space-y-1.5">
      {members.map(m => {
        const payment = byMember.get(m.id);
        const c = payment ? STATUS_CFG[payment.status] : STATUS_CFG.beklemede;
        const isUnpaid = !payment || payment.status !== "odendi";
        return (
          <div key={m.id} className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${c.bar}` }}>
            <span className="text-xs text-white truncate flex-1 min-w-0" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {m.fullName}
            </span>
            {payment ? (
              <>
                <span className="text-xs font-bold text-white tabular-nums flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                  ₺{payment.amount.toLocaleString("tr-TR")}
                </span>
                <StatusBadge status={payment.status} />
                {isUnpaid && (
                  <button onClick={() => handleMarkPaid(payment.id)} disabled={busy === payment.id}
                    className="text-[10px] px-2 py-1 rounded-md font-semibold disabled:opacity-40 flex-shrink-0"
                    style={{ background: "rgba(74,222,128,0.12)", color: "#4ADE80", fontFamily: "var(--font-barlow-condensed)" }}>
                    <Check size={11} className="inline -mt-0.5 mr-0.5" /> Ödendi
                  </button>
                )}
                {isUnpaid && m.studentId && (
                  sentTo.has(m.id) ? (
                    <span className="text-[10px] text-white/25 flex-shrink-0 flex items-center gap-1">
                      <Send size={10} /> Gönderildi
                    </span>
                  ) : (
                    <button onClick={() => handleReminder(m.id, m.studentId!, payment.amount)} disabled={busy === m.id}
                      className="text-[10px] px-2 py-1 rounded-md font-semibold disabled:opacity-40 flex-shrink-0"
                      style={{ background: "rgba(251,191,36,0.12)", color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}
                      title="Push bildirimi ile hatırlat">
                      <BellRing size={11} className="inline -mt-0.5 mr-0.5" /> Hatırlat
                    </button>
                  )
                )}
              </>
            ) : (
              <span className="text-[10px] text-white/20 flex-shrink-0">Dönem henüz oluşmadı</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
