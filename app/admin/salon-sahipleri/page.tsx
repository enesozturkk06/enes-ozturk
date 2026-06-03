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

/* ── Helpers ─────────────────────────────────────────── */
const copyText = (t: string) => navigator.clipboard.writeText(t).catch(() => {});

/* ── Badge ───────────────────────────────────────────── */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{
      background: active ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
      color: active ? "rgba(34,197,94,0.9)" : "rgba(100,116,139,0.7)",
      fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.06em",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(9,9,11,0.85)", backdropFilter:"blur(12px)" }}>
      <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }} transition={{ duration:0.22 }}
        className="bg-carbon border w-full max-w-sm relative overflow-hidden" style={{ borderColor:"rgba(139,92,246,0.25)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.5),transparent)" }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-lg" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>Yeni Salon Sahibi</h3>
            <button onClick={onClose} style={{ color:"rgba(255,255,255,0.25)" }}><X size={18}/></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>Ad Soyad *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmet Yılmaz" required
                className="w-full bg-steel/40 border px-3 py-2.5 text-sm outline-none" style={{ borderColor:"rgba(139,92,246,0.2)", color:"#fff" }}
                onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.2)")} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>Notlar</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opsiyonel..."
                className="w-full bg-steel/40 border px-3 py-2.5 text-sm outline-none resize-none" style={{ borderColor:"rgba(139,92,246,0.2)", color:"#fff" }}
                onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.2)")} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border transition-colors" style={{ borderColor:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>İptal</button>
              <button type="submit" disabled={!name.trim() || busy}
                className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40" style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", color:"#fff", fontFamily:"var(--font-barlow-condensed)" }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(9,9,11,0.85)", backdropFilter:"blur(12px)" }}>
      <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
        className="bg-carbon border w-full max-w-xs p-6 space-y-4" style={{ borderColor:"rgba(220,38,38,0.3)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.25)" }}>
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{owner.name}</p>
            <p className="text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>Bu salon sahibi kalıcı silinecek.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm border" style={{ borderColor:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>İptal</button>
          <button onClick={confirm} disabled={busy} className="flex-1 py-2 text-sm text-white disabled:opacity-50" style={{ background:"rgba(220,38,38,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(9,9,11,0.85)", backdropFilter:"blur(12px)" }}>
      <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
        className="bg-carbon border w-full max-w-md flex flex-col relative overflow-hidden" style={{ borderColor:"rgba(139,92,246,0.25)", maxHeight:"90vh" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(139,92,246,0.5),transparent)" }} />

        <div className="p-5 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
          <div>
            <h3 className="text-white text-lg" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>Öğrenci Ata</h3>
            <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>{owner.name} · {assigned.size} seçili</p>
          </div>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.25)" }}><X size={18}/></button>
        </div>

        <div className="px-4 py-3 flex-shrink-0">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Öğrenci ara..."
            className="w-full bg-steel/40 border px-3 py-2 text-sm outline-none" style={{ borderColor:"rgba(139,92,246,0.2)", color:"#fff" }}
            onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.45)")}
            onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.2)")} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>Öğrenci bulunamadı</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(s => {
                const sel = assigned.has(s.id);
                return (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all duration-150"
                    style={{ borderColor: sel ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)", background: sel ? "rgba(139,92,246,0.08)" : "transparent" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: sel ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)", color: sel ? "#fff" : "rgba(255,255,255,0.4)", fontFamily:"var(--font-bebas)", fontSize:"0.9rem" }}>
                      {s.fullName.split(" ").map((w:string) => w[0]).slice(0,2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.fullName}</p>
                      <p className="text-xs" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-barlow-condensed)" }}>{s.code} · {s.remainingLessons} ders kalan</p>
                    </div>
                    {sel ? <UserMinus size={14} style={{ color:"rgba(139,92,246,0.7)", flexShrink:0 }}/> : <UserPlus size={14} style={{ color:"rgba(255,255,255,0.2)", flexShrink:0 }}/>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border" style={{ borderColor:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>İptal</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40" style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", color:"#fff", fontFamily:"var(--font-barlow-condensed)" }}>
            {saving ? <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"/> : <Users size={14}/>}
            Kaydet ({assigned.size})
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
      <motion.div layout className="bg-carbon border overflow-hidden" style={{ borderColor: open ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.1)" }}>
        {/* Row header */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.2)" }}>
            <Shield size={16} style={{ color:"rgba(139,92,246,0.7)" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium" style={{ fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.04em" }}>{owner.name}</span>
              <ActiveBadge active={owner.isActive} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono" style={{ color:"rgba(139,92,246,0.6)", letterSpacing:"0.1em" }}>
                {showCode ? owner.accessCode : owner.accessCode.replace(/./g, "•")}
              </span>
              <button onClick={() => setShowCode(v => !v)} style={{ color:"rgba(255,255,255,0.15)" }}>
                {showCode ? <EyeOff size={10}/> : <Eye size={10}/>}
              </button>
              {showCode && (
                <button onClick={() => { copyText(owner.accessCode); toast("Kod kopyalandı", "success"); }} style={{ color:"rgba(255,255,255,0.15)" }}>
                  <Copy size={10}/>
                </button>
              )}
            </div>
          </div>

          <button onClick={() => { setOpen(o => !o); }}
            className="p-1.5 transition-colors" style={{ color:"rgba(255,255,255,0.2)" }}>
            {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
          </button>
        </div>

        {/* Expanded */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:"hidden" }}>
              <div className="px-4 pb-4 pt-0 border-t space-y-3" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
                {owner.notes && (
                  <p className="text-xs mt-3 italic" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>{owner.notes}</p>
                )}

                <div className="flex items-center gap-2 pt-1 text-xs" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                  <Users size={11}/>
                  {assignedCount === null ? "Yükleniyor..." : `${assignedCount} öğrenci atanmış`}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => setShowAssign(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all"
                    style={{ borderColor:"rgba(139,92,246,0.25)", color:"rgba(139,92,246,0.8)", fontFamily:"var(--font-barlow-condensed)" }}>
                    <Users size={12}/> Öğrenci Ata
                  </button>

                  <button onClick={toggleActive} disabled={togglingActive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all disabled:opacity-50"
                    style={{ borderColor: owner.isActive ? "rgba(234,179,8,0.25)" : "rgba(34,197,94,0.25)", color: owner.isActive ? "rgba(234,179,8,0.8)" : "rgba(34,197,94,0.8)", fontFamily:"var(--font-barlow-condensed)" }}>
                    <Power size={12}/> {owner.isActive ? "Pasif Yap" : "Aktif Yap"}
                  </button>

                  <button onClick={() => setShowDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all"
                    style={{ borderColor:"rgba(220,38,38,0.2)", color:"rgba(220,38,38,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-3xl" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.1em" }}>Salon Sahipleri</h1>
          <p className="text-sm mt-0.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
            Gözlemci hesaplarını yönet · {owners.length} toplam · {activeCount} aktif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="p-2 border transition-all" style={{ borderColor:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(139,92,246,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm transition-all"
            style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", color:"#fff", fontFamily:"var(--font-barlow-condensed)", letterSpacing:"0.06em", boxShadow:"0 0 18px rgba(139,92,246,0.3)" }}>
            <Plus size={14}/> Yeni Salon Sahibi
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Toplam",  value: owners.length,   color:"#8B5CF6" },
          { label:"Aktif",   value: activeCount,      color:"#22C55E" },
          { label:"Pasif",   value: owners.length - activeCount, color:"#64748B" },
        ].map(s => (
          <div key={s.label} className="bg-carbon border p-4 text-center" style={{ borderColor:"rgba(139,92,246,0.1)" }}>
            <div className="text-3xl font-bold" style={{ color:s.color, fontFamily:"var(--font-bebas)", lineHeight:1 }}>{s.value}</div>
            <div className="text-xs mt-1 uppercase tracking-widest" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-barlow-condensed)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bilgi */}
      <div className="flex items-start gap-3 p-4 border" style={{ background:"rgba(139,92,246,0.04)", borderColor:"rgba(139,92,246,0.15)" }}>
        <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color:"rgba(139,92,246,0.6)" }}/>
        <div className="text-xs leading-relaxed" style={{ color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>
          Salon sahipleri <strong style={{ color:"rgba(255,255,255,0.6)" }}>/salon-login</strong> adresinden SALON-XXXX kodu ile giriş yapar.
          Sadece kendilerine atanan öğrencileri görür ve herhangi bir değişiklik yapamaz (salt okunur erişim).
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
        </div>
      ) : owners.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.15)" }}>
            <Shield size={28} style={{ color:"rgba(139,92,246,0.35)" }} />
          </div>
          <div className="text-center">
            <p className="text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Henüz salon sahibi yok</p>
            <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>Yukarıdan ilk salon sahibini ekleyin.</p>
          </div>
        </div>
      ) : (
        <motion.div layout className="space-y-2.5">
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
    </div>
  );
}
