"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentArenaDuels, createArenaDuel, respondArenaDuel, getStudents,
  getStudentXPAdjustments,
} from "@/lib/db";
import type { ArenaDuel, Student } from "@/lib/types";
import { computeFullXP, getCurrentSeason } from "@/lib/xp";
import { getStudentAppointments, getLessonRecords } from "@/lib/db";
import {
  Swords, Shield, Trophy, Zap, Clock,
  AlertTriangle, Check, X,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   ARENA ROZET TANIMLAMALARI
══════════════════════════════════════════════════════════ */
interface ArenaBadge { icon: string; title: string; desc: string; earned: boolean; }

function computeArenaBadges(duels: ArenaDuel[], studentId: string): ArenaBadge[] {
  const wins   = duels.filter(d => d.status === "completed" && d.winnerId === studentId).length;
  const losses = duels.filter(d => d.status === "completed" && d.winnerId !== null && d.winnerId !== studentId &&
    (d.challengerId === studentId || d.opponentId === studentId)).length;
  return [
    { icon: "🥊", title: "İlk Kan",        desc: "İlk arena zaferini kazan",         earned: wins >= 1 },
    { icon: "💀", title: "Savaşçı Ruhu",   desc: "3 arena zaferini kazan",           earned: wins >= 3 },
    { icon: "⚔️",  title: "Arena Ustası",  desc: "5 arena zaferini kazan",           earned: wins >= 5 },
    { icon: "👑",  title: "Arena Efsanesi",desc: "10 arena zaferini kazan",          earned: wins >= 10 },
    { icon: "🔥",  title: "Yenilmez",      desc: "Hiç kaybetmeden 3+ zafer kazan",   earned: wins >= 3 && losses === 0 },
  ];
}

/* ══════════════════════════════════════════════════════════
   DURUM ETIKETI
══════════════════════════════════════════════════════════ */
function StatusChip({ status }: { status: ArenaDuel["status"] }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    pending:   { label: "Cevap Bekleniyor", bg: "rgba(251,191,36,0.15)",  color: "#FBBF24" },
    accepted:  { label: "Admin Onayı",      bg: "rgba(96,165,250,0.15)",  color: "#60A5FA" },
    active:    { label: "AKTİF DÜELLO",     bg: "rgba(220,38,38,0.2)",    color: "#F87171" },
    completed: { label: "Tamamlandı",       bg: "rgba(52,211,153,0.15)",  color: "#34D399" },
    rejected:  { label: "Reddedildi",       bg: "rgba(156,163,175,0.15)", color: "#9CA3AF" },
    cancelled: { label: "İptal",            bg: "rgba(156,163,175,0.12)", color: "#6B7280" },
  };
  const c = cfg[status] ?? cfg.cancelled;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.color, fontFamily: "var(--font-barlow-condensed)" }}>
      {c.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   VS KARTI
══════════════════════════════════════════════════════════ */
function DuelCard({
  duel, myId, onAccept, onReject, accepting,
}: {
  duel: ArenaDuel; myId: string;
  onAccept?: () => void; onReject?: () => void; accepting?: boolean;
}) {
  const isChallenger = duel.challengerId === myId;
  const won          = duel.status === "completed" && duel.winnerId === myId;
  const lost         = duel.status === "completed" && duel.winnerId !== null && duel.winnerId !== myId;
  const isPending    = duel.status === "pending" && duel.opponentId === myId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl"
      style={{
        background: won
          ? "linear-gradient(135deg,rgba(52,211,153,0.1),rgba(0,0,0,0))"
          : lost
          ? "linear-gradient(135deg,rgba(220,38,38,0.08),rgba(0,0,0,0))"
          : duel.status === "active"
          ? "linear-gradient(135deg,rgba(220,38,38,0.12),rgba(124,58,237,0.08))"
          : "rgba(255,255,255,0.025)",
        border: won  ? "1px solid rgba(52,211,153,0.3)"
               : lost ? "1px solid rgba(220,38,38,0.25)"
               : duel.status === "active" ? "1px solid rgba(220,38,38,0.35)"
               : "1px solid rgba(255,255,255,0.08)",
        boxShadow: duel.status === "active" ? "0 0 20px rgba(220,38,38,0.15)" : "none",
      }}
    >
      {duel.status === "active" && (
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg,transparent,#DC2626,#7C3AED,transparent)" }} />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <StatusChip status={duel.status} />
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
            {new Date(duel.createdAt).toLocaleDateString("tr")}
          </span>
        </div>

        {/* VS Layout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Challenger */}
          <div className={`flex-1 min-w-0 text-center p-2.5 rounded-lg ${isChallenger ? "ring-1 ring-white/10" : ""}`}
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-xs font-black leading-tight truncate"
              style={{ fontFamily: "var(--font-bebas)", color: duel.winnerId === duel.challengerId ? "#34D399" : "rgba(255,255,255,0.85)", letterSpacing: "0.06em" }}>
              {duel.challengerName.split(" ")[0].toUpperCase()}
            </div>
            {isChallenger && (
              <div className="text-[8px] mt-0.5 uppercase tracking-widest" style={{ color: "#DC2626", fontFamily: "var(--font-barlow-condensed)" }}>
                sen
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="text-sm font-black leading-none"
              style={{ fontFamily: "var(--font-bebas)", color: "#DC2626", letterSpacing: "0.08em",
                textShadow: "0 0 12px rgba(220,38,38,0.8)" }}>
              VS
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              <Zap size={9} color="#FBBF24" />
              <span className="text-[9px] font-bold" style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                {duel.wagerXP} XP
              </span>
            </div>
          </div>

          {/* Opponent */}
          <div className={`flex-1 min-w-0 text-center p-2.5 rounded-lg ${!isChallenger ? "ring-1 ring-white/10" : ""}`}
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-xs font-black leading-tight truncate"
              style={{ fontFamily: "var(--font-bebas)", color: duel.winnerId === duel.opponentId ? "#34D399" : "rgba(255,255,255,0.85)", letterSpacing: "0.06em" }}>
              {duel.opponentName.split(" ")[0].toUpperCase()}
            </div>
            {!isChallenger && (
              <div className="text-[8px] mt-0.5 uppercase tracking-widest" style={{ color: "#DC2626", fontFamily: "var(--font-barlow-condensed)" }}>
                sen
              </div>
            )}
          </div>
        </div>

        {/* Winner tag */}
        {duel.status === "completed" && duel.winnerId && (
          <div className="mt-2.5 text-center text-[10px] font-bold"
            style={{ color: won ? "#34D399" : "#F87171", fontFamily: "var(--font-barlow-condensed)" }}>
            {won ? `🏆 Kazandın! +${duel.rewardXP ?? duel.wagerXP} XP` : `💀 Kaybettin. -${duel.wagerXP} XP`}
          </div>
        )}

        {/* Accept/Reject buttons */}
        {isPending && onAccept && onReject && (
          <div className="flex gap-2 mt-3">
            <button onClick={onAccept} disabled={accepting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ADE80", fontFamily: "var(--font-barlow-condensed)" }}>
              <Check size={12} /> Kabul Et
            </button>
            <button onClick={onReject} disabled={accepting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#F87171", fontFamily: "var(--font-barlow-condensed)" }}>
              <X size={12} /> Reddet
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════════════════════════ */
export default function ArenaPage() {
  const { student } = useAuth();
  const [duels, setDuels]         = useState<ArenaDuel[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [myXP, setMyXP]           = useState(0);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [err, setErr]             = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // Form state
  const [opponentId, setOpponentId] = useState("");
  const [wagerInput, setWagerInput] = useState("100");

  const reload = async () => {
    if (!student) return;
    const [d, all, apts, recs, xpAdj] = await Promise.all([
      getStudentArenaDuels(student.id),
      getStudents().catch(() => [] as typeof students),
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id),
    ]);
    setDuels(d);
    setStudents(all.filter(s => s.id !== student.id && s.isActive));
    const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
    const xp = computeFullXP(student.completedLessons, apts, sorted, getCurrentSeason(), xpAdj);
    setMyXP(xp.lifetimeResult.breakdown.total);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!student || !opponentId) { setErr("Rakip seç."); return; }
    const wager = parseInt(wagerInput, 10);
    if (isNaN(wager) || wager < 10) { setErr("Minimum 10 XP."); return; }
    if (wager > myXP) { setErr(`Yetersiz XP. Sahip olduğun: ${myXP} XP`); return; }
    setSending(true); setErr(null);
    try {
      const opp = students.find(s => s.id === opponentId);
      if (!opp) throw new Error("Rakip bulunamadı.");
      await createArenaDuel(student.id, student.fullName, opponentId, opp.fullName, wager);
      setSuccess("Düello daveti gönderildi!");
      setOpponentId(""); setWagerInput("100");
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Hata oluştu.");
    } finally { setSending(false); }
  };

  const handleRespond = async (duelId: string, resp: "accepted" | "rejected") => {
    setAccepting(duelId);
    await respondArenaDuel(duelId, resp);
    await reload();
    setAccepting(null);
    setSuccess(resp === "accepted" ? "Düello kabul edildi! Admin onayı bekleniyor." : "Düello reddedildi.");
  };

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2"
          style={{ borderColor: "rgba(220,38,38,0.3)", borderTopColor: "#DC2626" }} />
      </div>
    );
  }

  const badges     = computeArenaBadges(duels, student.id);
  const pending    = duels.filter(d => d.status === "pending" && d.opponentId === student.id);
  const active     = duels.filter(d => d.status === "active" || (d.status === "pending" && d.challengerId === student.id));
  const history    = duels.filter(d => ["completed","rejected","cancelled"].includes(d.status));
  const wins       = duels.filter(d => d.status === "completed" && d.winnerId === student.id).length;
  const losses     = duels.filter(d => d.status === "completed" && d.winnerId !== null && d.winnerId !== student.id).length;
  const wager      = parseInt(wagerInput, 10);
  const wagerValid = !isNaN(wager) && wager >= 10 && wager <= myXP;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} className="max-w-lg mx-auto pb-28 space-y-3">

      {/* ═══════════════════════════════════════════════
          ARENA HERO
      ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl py-7 px-5 text-center"
        style={{
          background: "linear-gradient(160deg,rgba(220,38,38,0.18) 0%,rgba(124,58,237,0.1) 60%,rgba(0,0,0,0) 100%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(220,38,38,0.35)",
          boxShadow: "0 0 60px rgba(220,38,38,0.2), 0 0 120px rgba(220,38,38,0.08)",
        }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: "linear-gradient(90deg,transparent,#DC2626,#7C3AED,transparent)" }} />
        <div className="text-4xl mb-2 select-none"
          style={{ filter: "drop-shadow(0 0 14px rgba(220,38,38,0.9))" }}>⚔️</div>
        <div className="text-4xl sm:text-5xl font-black tracking-widest mb-1"
          style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.15em",
            background: "linear-gradient(90deg,#DC2626,#C084FC)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 12px rgba(220,38,38,0.6))" }}>
          ARENA
        </div>
        <div className="text-[11px] mb-4"
          style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.12em" }}>
          SANAİ TEKNIK DÜELLO SİSTEMİ
        </div>
        {/* Record strip */}
        <div className="flex items-center justify-center gap-4">
          {[
            { label: "ZAFERLERİM", value: wins,   color: "#34D399" },
            { label: "XP'M",       value: myXP,   color: "#FBBF24" },
            { label: "YENILGI",    value: losses, color: "#F87171" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-2xl font-black tabular-nums leading-none"
                style={{ fontFamily: "var(--font-bebas)", color: item.color, textShadow: `0 0 12px ${item.color}55` }}>
                {item.value}
              </div>
              <div className="text-[8px] uppercase tracking-widest mt-0.5"
                style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success / Error */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-[11px]"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#4ADE80", fontFamily: "var(--font-barlow-condensed)" }}>
            <Check size={13} /> {success}
            <button onClick={() => setSuccess(null)} className="ml-auto"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════
          BEKLEYEN DAVETLER
      ═══════════════════════════════════════════════ */}
      {pending.length > 0 && (
        <div>
          <SectionHeader icon={<Clock size={12} color="#FBBF24" />} label="Bekleyen Davetler" accent="#FBBF24" count={pending.length} />
          <div className="space-y-2">
            {pending.map(d => (
              <DuelCard key={d.id} duel={d} myId={student.id}
                accepting={accepting === d.id}
                onAccept={() => handleRespond(d.id, "accepted")}
                onReject={() => handleRespond(d.id, "rejected")} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          AKTİF DÜELLOLAR
      ═══════════════════════════════════════════════ */}
      {active.length > 0 && (
        <div>
          <SectionHeader icon={<Swords size={12} color="#F87171" />} label="Aktif Düellolar" accent="#F87171" />
          <div className="space-y-2">
            {active.map(d => <DuelCard key={d.id} duel={d} myId={student.id} />)}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          DÜELLO GÖNDER
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={<Swords size={12} color="#DC2626" />} label="Düello Gönder" accent="#DC2626" />
        <div className="rounded-xl overflow-hidden p-4"
          style={{ background: "linear-gradient(135deg,rgba(220,38,38,0.1),rgba(0,0,0,0))", border: "1px solid rgba(220,38,38,0.25)" }}>
          <div className="space-y-3">
            {/* Opponent select */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1.5"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                Rakip Seç
              </label>
              <select
                value={opponentId}
                onChange={e => setOpponentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-barlow-condensed)",
                }}>
                <option value="">-- Öğrenci seç --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id} style={{ background: "#111" }}>{s.fullName}</option>
                ))}
              </select>
            </div>

            {/* Wager input */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-1.5"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                Bahis XP (Sahip: {myXP} XP)
              </label>
              <input
                type="number" min={10} max={myXP}
                value={wagerInput}
                onChange={e => setWagerInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${wagerValid || wagerInput === "" ? "rgba(255,255,255,0.1)" : "rgba(220,38,38,0.4)"}`,
                  color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-barlow-condensed)",
                }}
                placeholder="100"
              />
              {!wagerValid && wagerInput !== "" && (
                <p className="text-[10px] mt-1" style={{ color: "#F87171", fontFamily: "var(--font-barlow-condensed)" }}>
                  {wager > myXP ? "Yetersiz XP." : "Minimum 10 XP."}
                </p>
              )}
            </div>

            {err && (
              <div className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-lg"
                style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", color: "#F87171", fontFamily: "var(--font-barlow-condensed)" }}>
                <AlertTriangle size={11} /> {err}
              </div>
            )}

            <button onClick={handleSend} disabled={sending || !opponentId || !wagerValid}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-[.98] disabled:opacity-40"
              style={{
                background: "linear-gradient(90deg,rgba(220,38,38,0.8),rgba(124,58,237,0.7))",
                border: "1px solid rgba(220,38,38,0.5)", color: "white",
                fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em",
                boxShadow: "0 0 20px rgba(220,38,38,0.3)",
              }}>
              <Swords size={15} />
              {sending ? "Gönderiliyor…" : "⚔️ DÜELLO DAVETI GÖNDER"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ARENA ROZETLERİ
      ═══════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={<Trophy size={12} color="#FBBF24" />} label="Arena Rozetleri" accent="#FBBF24" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {badges.map((b, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05 }} transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center"
              style={{
                background: b.earned ? "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(0,0,0,0))" : "rgba(255,255,255,0.02)",
                border: `1px solid ${b.earned ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.06)"}`,
                opacity: b.earned ? 1 : 0.4,
              }}>
              <div className="text-2xl" style={{ filter: b.earned ? "drop-shadow(0 0 8px rgba(251,191,36,0.7))" : "grayscale(1) opacity(0.4)" }}>
                {b.icon}
              </div>
              <div className="text-[9px] font-bold leading-tight"
                style={{ color: b.earned ? "#FBBF24" : "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                {b.title}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          DÜELLO GEÇMİŞİ
      ═══════════════════════════════════════════════ */}
      {history.length > 0 && (
        <div>
          <SectionHeader icon={<Shield size={12} color="#6B7280" />} label="Düello Geçmişi" accent="#6B7280" />
          <div className="space-y-2">
            {history.slice(0, 10).map(d => <DuelCard key={d.id} duel={d} myId={student.id} />)}
          </div>
        </div>
      )}

      {duels.length === 0 && (
        <div className="text-center py-10"
          style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-barlow-condensed)", fontSize: 13 }}>
          Henüz düello yok. İlk meydan okumayı sen başlat!
        </div>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────── */
function SectionHeader({ icon, label, accent, count }: {
  icon: React.ReactNode; label: string; accent: string; count?: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1 pb-2 pt-1">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)" }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: accent + "22", color: accent, fontFamily: "var(--font-barlow-condensed)" }}>
          {count}
        </span>
      )}
      <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}
