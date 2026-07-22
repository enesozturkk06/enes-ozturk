"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import type { Gym, Student, GroupLesson, GroupLessonMember, GroupLessonPayment, GroupLessonSession } from "@/lib/types";
import { computeAllGroupPerformance } from "@/lib/groupLessonFinance";
import GroupPerformanceCard from "./GroupPerformanceCard";
import GroupMemberRoster from "./GroupMemberRoster";
import GroupPaymentPeriodList from "./GroupPaymentPeriodList";
import GroupLessonForm, { type GroupLessonFormData } from "./GroupLessonForm";

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export default function GroupLessonsSection({
  groups, members, payments, sessions, gyms, students,
  onCreateGroup, onUpdateGroup, onDeactivateGroup,
  onAddMember, onRemoveMember, onMarkPaid, onSendReminder, onSetSessionCount,
}: {
  groups: GroupLesson[]; members: GroupLessonMember[]; payments: GroupLessonPayment[];
  sessions: GroupLessonSession[]; gyms: Gym[]; students: Student[];
  onCreateGroup: (data: GroupLessonFormData) => Promise<void>;
  onUpdateGroup: (id: string, data: GroupLessonFormData) => Promise<void>;
  onDeactivateGroup: (id: string) => Promise<void>;
  onAddMember: (groupId: string, data: { fullName: string; studentId?: string; phone?: string }) => Promise<void>;
  onRemoveMember: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  onSendReminder: (studentId: string, groupName: string, amount: number) => Promise<void>;
  onSetSessionCount: (groupId: string, periodMonth: string, count: number) => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupLesson | null>(null);
  const [sessionDraft, setSessionDraft] = useState<Record<string, string>>({});

  const performances = computeAllGroupPerformance(groups, members, payments, sessions);
  const periodMonth = currentMonthKey();

  const openCreate = () => { setEditingGroup(null); setFormOpen(true); };
  const openEdit = (g: GroupLesson) => { setEditingGroup(g); setFormOpen(true); };

  const handleSave = async (data: GroupLessonFormData) => {
    if (editingGroup) await onUpdateGroup(editingGroup.id, data);
    else await onCreateGroup(data);
    setFormOpen(false);
  };

  const handleSessionSave = async (groupId: string) => {
    const count = Number(sessionDraft[groupId]);
    if (!Number.isFinite(count) || count < 0) return;
    await onSetSessionCount(groupId, periodMonth, count);
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-1 pb-2">
        <Layers size={13} style={{ color: "#4ADE80" }} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
          Grup Dersleri
        </span>
        <div className="h-px flex-1 bg-white/5" />
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80", fontFamily: "var(--font-barlow-condensed)" }}>
          <Plus size={13} /> Yeni Grup
        </button>
      </div>

      {performances.length === 0 ? (
        <div className="text-center py-10 stat-card-glass rounded-xl" style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>
          <Layers size={28} className="text-white/10 mx-auto mb-2" />
          <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz grup dersi yok</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {performances.map((perf, i) => {
            const expanded = expandedId === perf.group.id;
            const groupMembers = members.filter(m => m.groupId === perf.group.id && m.isActive);
            const groupPayments = payments.filter(p => p.groupId === perf.group.id && p.periodMonth === periodMonth);
            return (
              <div key={perf.group.id} className={expanded ? "sm:col-span-2 lg:col-span-3" : ""}>
                <GroupPerformanceCard perf={perf} index={i} expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : perf.group.id)} />

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="stat-card-glass rounded-2xl mt-2 p-4 sm:p-5 space-y-5"
                        style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>

                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(perf.group)}
                            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors">
                            <Pencil size={11} /> Düzenle
                          </button>
                          <button onClick={() => onDeactivateGroup(perf.group.id)}
                            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-crimson transition-colors">
                            <Trash2 size={11} /> Grubu Kapat
                          </button>
                        </div>

                        {perf.group.shareType === "fixed_per_lesson" && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              Bu ay kaç ders yapıldı?
                            </span>
                            <input type="number" min="0"
                              value={sessionDraft[perf.group.id] ?? String(sessions.find(s => s.groupId === perf.group.id && s.periodMonth === periodMonth)?.sessionCount ?? "")}
                              onChange={e => setSessionDraft(prev => ({ ...prev, [perf.group.id]: e.target.value }))}
                              className="w-20 bg-steel/60 border border-white/10 text-white px-2 py-1 text-xs outline-none rounded" />
                            <button onClick={() => handleSessionSave(perf.group.id)}
                              className="text-[10px] px-2 py-1 rounded-md font-semibold"
                              style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", fontFamily: "var(--font-barlow-condensed)" }}>
                              Kaydet
                            </button>
                          </div>
                        )}

                        <GroupMemberRoster members={groupMembers} students={students}
                          onAdd={data => onAddMember(perf.group.id, data)} onRemove={onRemoveMember} />

                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-white/30 mb-2 block" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                            Bu Ayki Aidat Durumu
                          </span>
                          <GroupPaymentPeriodList groupName={perf.group.name} members={groupMembers}
                            payments={groupPayments} onMarkPaid={onMarkPaid} onSendReminder={onSendReminder} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <GroupLessonForm open={formOpen} onClose={() => setFormOpen(false)} gyms={gyms} editing={editingGroup} onSave={handleSave} />
    </div>
  );
}
