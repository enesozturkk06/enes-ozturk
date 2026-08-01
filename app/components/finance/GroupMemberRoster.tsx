"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Link2 } from "lucide-react";
import type { Student, GroupLessonMember } from "@/lib/types";

export default function GroupMemberRoster({
  members, students, onAdd, onRemove,
}: {
  members: GroupLessonMember[];
  students: Student[];
  onAdd: (data: { fullName: string; studentId?: string; phone?: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const linkedStudent = students.find(s => s.id === studentId);

  const handleAdd = async () => {
    const name = linkedStudent ? linkedStudent.fullName : fullName.trim();
    if (!name) return;
    setSaving(true);
    await onAdd({ fullName: name, studentId: studentId || undefined, phone: phone.trim() || undefined });
    setFullName(""); setStudentId(""); setPhone("");
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <UserPlus size={13} style={{ color: "#4ADE80" }} />
        <span className="text-[10px] uppercase tracking-widest text-white/30" style={{ fontFamily: "var(--font-label)" }}>
          Öğrenci Ekle
        </span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <select value={studentId} onChange={e => setStudentId(e.target.value)}
          className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg"
          style={{ fontFamily: "var(--font-label)" }}>
          <option value="" className="bg-carbon">Uygulama hesabından seç (opsiyonel)</option>
          {students.filter(s => s.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
            <option key={s.id} value={s.id} className="bg-carbon">{s.fullName} ({s.code})</option>
          ))}
        </select>
        <input value={linkedStudent ? linkedStudent.fullName : fullName} onChange={e => setFullName(e.target.value)}
          disabled={!!linkedStudent} placeholder="Ad Soyad"
          className="glass text-white px-2 py-2 text-xs outline-none rounded-lg disabled:opacity-50"
          style={{ fontFamily: "var(--font-label)" }} />
        <div className="flex gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon (ops.)"
            className="glass flex-1 text-white px-2 py-2 text-xs outline-none rounded-lg"
            style={{ fontFamily: "var(--font-label)" }} />
          <button onClick={handleAdd} disabled={saving || (!fullName.trim() && !studentId)}
            className="px-3 py-2 text-xs font-semibold rounded-lg disabled:opacity-40 flex-shrink-0 transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)", color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
            Ekle
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-white/25 text-center py-3" style={{ fontFamily: "var(--font-label)" }}>
          Henüz öğrenci eklenmedi
        </p>
      ) : (
        <div className="space-y-1.5">
          {members.map(m => (
            <div key={m.id} className="glass flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-white truncate" style={{ fontFamily: "var(--font-label)" }}>{m.fullName}</span>
                {m.studentId && <Link2 size={11} style={{ color: "#A78BFA" }} className="flex-shrink-0" />}
                {m.phone && <span className="text-[10px] text-white/25 flex-shrink-0">{m.phone}</span>}
              </div>
              <button onClick={() => onRemove(m.id)} className="text-white/20 transition-colors flex-shrink-0"
                style={{ transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                title="Gruptan çıkar">
                <UserMinus size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
