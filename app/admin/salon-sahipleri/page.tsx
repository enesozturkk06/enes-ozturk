"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSalonOwners, createSalonOwner, updateSalonOwner, deleteSalonOwner,
  getSalonOwnerStudentIds, assignStudentToSalonOwner, removeStudentFromSalonOwner,
  getStudents,
} from "@/lib/db";
import type { SalonOwner, Student } from "@/lib/types";
import { useToast } from "@/app/components/shared/Toast";
import {
  Plus, Trash2, Users, Shield, Power, Copy, ChevronDown, ChevronUp,
  AlertTriangle, X, UserPlus, UserMinus, RefreshCw, Eye, EyeOff,
} from "lucide-react";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
/* gradient-border-quiet taşıyan elemanlar için: opacity'yi CSS yönetir (0.22),
   Framer Motion sadece y/scale/filter animasyonu yapar. */
const fadeUpNoOpacity = {
  initial: { y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

/* ── Helpers ─────────────────────────────────────────── */
const copyText = (t: string) => navigator.clipboard.writeText(t).catch(() => {});

/* ── Badge ───────────────────────────────────────────── */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{
      background: active ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.15)",
      color: active ? "var(--color-success)" : "rgba(148,163,184,0.8)",
      fontFamily:"var(--font-label)", letterSpacing:"0.06em",
    }}>
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

/* ── Create Modal ────────────────────────────────────── */
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (o: SalonOwner) => void }) {
  const [name, setName]   = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy]   = useState(false);
  const { toast }      = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const owner = await createSalonOwner(name.trim(), notes.trim() || undefined);
      toast(`${owner.name} oluşturuldu. Kod: ${owner.accessCode}`, "success");
      onCreate(owner);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast("Hata: " + msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
      <motion.div initial={{ scale:0.94, opacity:0, filter:"blur(6px)" }} animate={{ scale:1, opacity:1, filter:"blur(0px)" }} exit={{ scale:0.94, opacity:0 }} transition={{ duration:0.25, ease:[0.22,1,0.36,1] }}
        className="glass-strong relative w-full max-w-sm rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-animated gradient-slow gradient-violet-pink-orange" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-lg" style={{ fontFamily:"var(--font-display)", letterSpacing:"0.1em" }}>Yeni Salon Sahibi</h3>
            <button onClick={onClose} style={{ color:"rgba(255,255,255,0.25)" }}><X size={18}/></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-1.5 text-white/40" style={{ fontFamily:"var(--font-label)" }}>Ad Soyad *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmet Yılmaz" required
                className="glass w-full text-white px-3 py-2.5 text-sm outline-none rounded-lg" style={{ fontFamily:"var(--font-label)" }} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-1.5 text-white/40" style={{ fontFamily:"var(--font-label)" }}>Notlar</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opsiyonel..."
                className="glass w-full text-white px-3 py-2.5 text-sm outline-none resize-none rounded-lg" style={{ fontFamily:"var(--font-label)" }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="glass flex-1 py-2.5 text-sm text-white/40 hover:text-white rounded-lg transition-colors" style={{ fontFamily:"var(--font-label)" }}>İptal</button>
              <button type="submit" disabled={!name.trim() || busy}
                className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 py-2.5 text-sm flex items-center justify-center gap-2 text-white rounded-lg transition-transform hover:scale-[1.02] disabled:opacity-40" style={{ fontFamily:"var(--font-label)" }}>
                {busy ? <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" /> : <Plus size={14}/>}
                Oluştur
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Delete Confirm ──────────────────────────────────── */
function DeleteConfirm({ owner, onClose, onDelete }: { owner: SalonOwner; onClose: () => void; onDelete: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast }    = useToast();

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteSalonOwner(owner.id);
      toast(`${owner.name} silindi`, "success");
      onDelete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast("Hata: " + msg, "error");
    } finally { setBusy(false); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
      <motion.div initial={{ scale:0.94, opacity:0, filter:"blur(6px)" }} animate={{ scale:1, opacity:1, filter:"blur(0px)" }} exit={{ scale:0.94, opacity:0 }}
        className="glass-strong w-full max-w-xs rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:"rgba(239,68,68,0.12)" }}>
            <AlertTriangle size={18} style={{ color: "var(--color-error)" }} />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{owner.name}</p>
            <p className="text-xs text-white/30">Bu salon sahibi kalıcı silinecek.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="glass flex-1 py-2 text-sm text-white/40 hover:text-white rounded-lg transition-colors" style={{ fontFamily:"var(--font-label)" }}>İptal</button>
          <button onClick={confirm} disabled={busy} className="flex-1 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-transform hover:scale-[1.02]" style={{ background:"var(--color-error)", fontFamily:"var(--font-label)" }}>
            {busy ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Assign Students Modal ───────────────────────────── */
function AssignModal({ owner, allStudents, onClose, onSave }: {
  owner: SalonOwner; allStudents: Student[]; onClose: () => void; onSave: () => void;
}) {
  const [assigned, setAssigned]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const { toast }              = useToast();

  useEffect(() => {
    getSalonOwnerStudentIds(owner.id).then(ids => { setAssigned(new Set(ids)); setLoading(false); });
  }, [owner.id]);

  const toggle = (id: string) => {
    setAssigned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const save = async () => {
    setSaving(true);
    try {
      const prev = await getSalonOwnerStudentIds(owner.id);
      const prevSet = new Set(prev);
      const toAdd    = [...assigned].filter(id => !prevSet.has(id));
      const toRemove = prev.filter(id => !assigned.has(id));
      await Promise.all([
        ...toAdd.map(id => assignStudentToSalonOwner(owner.id, id)),
        ...toRemove.map(id => removeStudentFromSalonOwner(owner.id, id)),
      ]);
      toast(`${assigned.size} öğrenci atandı`, "success");
      onSave();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast("Hata: " + msg, "error");
    } finally { setSaving(false); }
  };

  const active = allStudents.filter(s => s.isActive);
  const filtered = active.filter(s => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
      <motion.div initial={{ scale:0.94, opacity:0, filter:"blur(6px)" }} animate={{ scale:1, opacity:1, filter:"blur(0px)" }} exit={{ scale:0.94, opacity:0 }}
        className="glass-strong w-full max-w-md flex flex-col relative overflow-hidden rounded-2xl" style={{ maxHeight:"90vh" }}>
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-animated gradient-slow gradient-violet-pink-orange" />

        <div className="p-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
          <div>
            <h3 className="text-white text-lg" style={{ fontFamily:"var(--font-display)", letterSpacing:"0.1em" }}>Öğrenci Ata</h3>
            <p className="text-xs mt-0.5 text-white/30" style={{ fontFamily:"var(--font-label)" }}>{owner.name} · {assigned.size} seçili</p>
          </div>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.25)" }}><X size={18}/></button>
        </div>

        <div className="px-4 py-3 flex-shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Öğrenci ara..."
            className="glass w-full text-white px-3 py-2 text-sm outline-none rounded-lg" style={{ fontFamily:"var(--font-label)" }} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-white/20" style={{ fontFamily:"var(--font-label)" }}>Öğrenci bulunamadı</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(s => {
                const sel = assigned.has(s.id);
                return (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className="glass w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                    style={{ borderColor: sel ? "rgba(139,92,246,0.5)" : undefined, background: sel ? "rgba(139,92,246,0.1)" : undefined }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: sel ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.06)", color: sel ? "#fff" : "rgba(255,255,255,0.4)", fontFamily:"var(--font-display)", fontSize:"0.9rem" }}>
                      {s.fullName.split(" ").map((w:string) => w[0]).slice(0,2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white" style={{ fontFamily:"var(--font-label)" }}>{s.fullName}</p>
                      <p className="text-xs text-white/25" style={{ fontFamily:"var(--font-label)" }}>{s.code} · {s.remainingLessons} ders kalan</p>
                    </div>
                    {sel ? <UserMinus size={14} style={{ color:"#A78BFA", flexShrink:0 }}/> : <UserPlus size={14} style={{ color:"rgba(255,255,255,0.2)", flexShrink:0 }}/>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 flex gap-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <button onClick={onClose} className="glass flex-1 py-2.5 text-sm text-white/40 hover:text-white rounded-lg transition-colors" style={{ fontFamily:"var(--font-label)" }}>İptal</button>
          <button onClick={save} disabled={saving}
            className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 py-2.5 text-sm flex items-center justify-center gap-2 text-white rounded-lg transition-transform hover:scale-[1.02] disabled:opacity-40">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"/> : <Users size={14}/>}
            <span style={{ fontFamily:"var(--font-label)" }}>Kaydet ({assigned.size})</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Owner Row ───────────────────────────────────────── */
function OwnerRow({ owner, allStudents, onRefresh }: {
  owner: SalonOwner; allStudents: Student[]; onRefresh: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCode, setShowCode]   = useState(false);
  const [assignedCount, setAssignedCount] = useState<number|null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const { toast }              = useToast();

  const loadCount = useCallback(async () => {
    const ids = await getSalonOwnerStudentIds(owner.id);
    setAssignedCount(ids.length);
  }, [owner.id]);

  useEffect(() => { if (open && assignedCount === null) loadCount(); }, [open, assignedCount, loadCount]);

  const toggleActive = async () => {
    setTogglingActive(true);
    try {
      await updateSalonOwner(owner.id, { isActive: !owner.isActive });
      toast(owner.isActive ? "Pasif yapıldı" : "Aktif yapıldı", "success");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast("Hata: " + msg, "error");
    } finally { setTogglingActive(false); }
  };

  return (
    <>
      <motion.div layout variants={fadeUp} className="glass-strong rounded-2xl overflow-hidden"
        style={{ borderColor: open ? "rgba(139,92,246,0.4)" : undefined }}>
        {/* Row header */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
            <Shield size={16} style={{ color:"#A78BFA" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium" style={{ fontFamily:"var(--font-label)", letterSpacing:"0.04em" }}>{owner.name}</span>
              <ActiveBadge active={owner.isActive} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono" style={{ color:"#A78BFA", letterSpacing:"0.1em" }}>
                {showCode ? owner.accessCode : owner.accessCode.replace(/./g, "•")}
              </span>
              <button onClick={() => setShowCode(v => !v)} style={{ color:"rgba(255,255,255,0.2)" }}>
                {showCode ? <EyeOff size={10}/> : <Eye size={10}/>}
              </button>
              {showCode && (
                <button onClick={() => { copyText(owner.accessCode); toast("Kod kopyalandı", "success"); }} style={{ color:"rgba(255,255,255,0.2)" }}>
                  <Copy size={10}/>
                </button>
              )}
            </div>
          </div>

          <button onClick={() => { setOpen(o => !o); }}
            className="p-1.5 transition-colors text-white/25 hover:text-white">
            {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
        </div>

        {/* Expanded */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:"hidden" }}>
              <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
                {owner.notes && (
                  <p className="text-xs mt-3 italic text-white/30" style={{ fontFamily:"var(--font-label)" }}>{owner.notes}</p>
                )}

                <div className="flex items-center gap-2 pt-1 text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                  <Users size={11}/>
                  {assignedCount === null ? "Yükleniyor..." : `${assignedCount} öğrenci atanmış`}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => setShowAssign(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-transform hover:scale-105"
                    style={{ background:"rgba(139,92,246,0.15)", color:"#A78BFA", fontFamily:"var(--font-label)" }}>
                    <Users size={12}/> Öğrenci Ata
                  </button>

                  <button onClick={toggleActive} disabled={togglingActive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-transform hover:scale-105 disabled:opacity-50"
                    style={{
                      background: owner.isActive ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                      color: owner.isActive ? "var(--color-achievement)" : "var(--color-success)",
                      fontFamily:"var(--font-label)",
                    }}>
                    <Power size={12}/> {owner.isActive ? "Pasif Yap" : "Aktif Yap"}
                  </button>

                  <button onClick={() => setShowDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-transform hover:scale-105"
                    style={{ background:"rgba(239,68,68,0.12)", color:"var(--color-error)", fontFamily:"var(--font-label)" }}>
                    <Trash2 size={12}/> Sil
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showAssign && (
          <AssignModal owner={owner} allStudents={allStudents} onClose={() => setShowAssign(false)} onSave={() => { setAssignedCount(null); loadCount(); }} />
        )}
        {showDelete && (
          <DeleteConfirm owner={owner} onClose={() => setShowDelete(false)} onDelete={() => { onRefresh(); setShowDelete(false); }} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function SalonSahipleriPage() {
  const [owners, setOwners]     = useState<SalonOwner[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, s] = await Promise.all([getSalonOwners(), getStudents()]);
    setOwners(o);
    setStudents(s.filter(st => st.isActive));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCount = owners.filter(o => o.isActive).length;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Hero */}
      <motion.div variants={fadeUpNoOpacity} className="relative rounded-3xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
        <div className="glass-strong relative rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily:"var(--font-display)", letterSpacing:"0.08em" }}>Salon Sahipleri</h1>
              <p className="text-sm mt-0.5 text-white/35" style={{ fontFamily:"var(--font-label)" }}>
                Gözlemci hesaplarını yönet · {owners.length} toplam · {activeCount} aktif
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => load()} className="glass p-2 rounded-lg text-white/30 hover:text-white transition-colors">
                <RefreshCw size={15}/>
              </button>
              <button onClick={() => setShowCreate(true)}
                className="gradient-animated gradient-slow gradient-violet-pink-orange flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl transition-transform hover:scale-105"
                style={{ fontFamily:"var(--font-label)", letterSpacing:"0.06em" }}>
                <Plus size={14}/> Yeni Salon Sahibi
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label:"Toplam",  value: owners.length,   color:"#A78BFA" },
              { label:"Aktif",   value: activeCount,      color:"var(--color-success)" },
              { label:"Pasif",   value: owners.length - activeCount, color:"rgba(148,163,184,0.9)" },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 sm:p-5 text-center">
                <div className="text-2xl sm:text-3xl" style={{ color:s.color, fontFamily:"var(--font-display)", lineHeight:1 }}><CountUp value={s.value} /></div>
                <div className="text-xs mt-1 uppercase tracking-widest text-white/25" style={{ fontFamily:"var(--font-label)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bilgi */}
      <motion.div variants={fadeUp} className="glass rounded-2xl flex items-start gap-3 p-4">
        <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color:"#A78BFA" }}/>
        <div className="text-xs leading-relaxed text-white/40" style={{ fontFamily:"var(--font-label)" }}>
          Salon sahipleri <strong className="text-white/70">/salon-login</strong> adresinden SALON-XXXX kodu ile giriş yapar.
          Sadece kendilerine atanan öğrencileri görür ve herhangi bir değişiklik yapamaz (salt okunur erişim).
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"#8B5CF6", borderTopColor:"transparent" }} />
        </div>
      ) : owners.length === 0 ? (
        <motion.div variants={fadeUp} className="glass rounded-2xl flex flex-col items-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:"rgba(139,92,246,0.1)" }}>
            <Shield size={28} style={{ color:"rgba(167,139,250,0.5)" }} />
          </div>
          <div className="text-center">
            <p className="text-white" style={{ fontFamily:"var(--font-label)" }}>Henüz salon sahibi yok</p>
            <p className="text-sm mt-1 text-white/30" style={{ fontFamily:"var(--font-label)" }}>Yukarıdan ilk salon sahibini ekleyin.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div layout variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
          {owners.map(o => (
            <OwnerRow key={o.id} owner={o} allStudents={students} onRefresh={load} />
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreate={(o) => setOwners(prev => [o, ...prev])}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
