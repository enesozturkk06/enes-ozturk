"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, Plus, Pencil, Trash2, Search, X, ArrowUpDown, Users, CalendarCheck2, Gauge, Check } from "lucide-react";
import type { Gym, Student, GroupLesson, GroupLessonMember, GroupLessonPayment, GroupLessonSession } from "@/lib/types";
import { computeAllGroupPerformance } from "@/lib/groupLessonFinance";
import GroupPerformanceCard from "./GroupPerformanceCard";
import GroupMemberRoster from "./GroupMemberRoster";
import GroupPaymentPeriodList from "./GroupPaymentPeriodList";
import GroupLessonForm, { type GroupLessonFormData } from "./GroupLessonForm";
import FinanceKpiCard from "./FinanceKpiCard";

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const FILTERS: [string, string][] = [["all", "Tümü"], ["active", "Aktif"], ["inactive", "Pasif"]];
type SortOrder = "name" | "members" | "occupancy";
const SORT_OPTIONS: [SortOrder, string][] = [
  ["name", "İsme Göre (A-Z)"],
  ["members", "Katılımcıya Göre ↓"],
  ["occupancy", "Dolulukça Göre ↓"],
];

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");

  const performances = computeAllGroupPerformance(groups, members, payments, sessions);
  const periodMonth = currentMonthKey();

  const kpis = useMemo(() => {
    const activeGroups = groups.filter(g => g.isActive);
    const totalMembers = performances.reduce((sum, p) => sum + p.activeMemberCount, 0);
    const withOccupancy = performances.filter(p => p.occupancyRate !== null);
    const avgOccupancy = withOccupancy.length > 0
      ? Math.round(withOccupancy.reduce((sum, p) => sum + (p.occupancyRate ?? 0), 0) / withOccupancy.length)
      : 0;
    const monthlySessionTotal = sessions
      .filter(s => s.periodMonth === periodMonth)
      .reduce((sum, s) => sum + s.sessionCount, 0);
    return {
      totalGroups: groups.length,
      activeGroups: activeGroups.length,
      monthlySessionTotal,
      totalMembers,
      avgOccupancy,
    };
  }, [groups, performances, sessions, periodMonth]);

  const filteredPerformances = useMemo(() => {
    let list = performances;
    if (filter === "active") list = list.filter(p => p.group.isActive);
    if (filter === "inactive") list = list.filter(p => !p.group.isActive);
    if (search.trim()) {
      const q = search.trim().toLocaleLowerCase("tr-TR");
      list = list.filter(p => p.group.name.toLocaleLowerCase("tr-TR").includes(q));
    }
    const sorted = [...list];
    if (sortOrder === "members") sorted.sort((a, b) => b.activeMemberCount - a.activeMemberCount);
    else if (sortOrder === "occupancy") sorted.sort((a, b) => (b.occupancyRate ?? -1) - (a.occupancyRate ?? -1));
    else sorted.sort((a, b) => a.group.name.localeCompare(b.group.name, "tr"));
    return sorted;
  }, [performances, filter, search, sortOrder]);

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
    <motion.div variants={stagger} initial="initial" animate="animate">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative rounded-3xl overflow-hidden mb-4 gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
        <div className="glass-strong relative rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers size={14} style={{ color: "#4ADE80" }} />
                <span className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-label)", color: "var(--color-violet-bright)" }}>
                  Finans Merkezi
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                GRUP DERSLERİ YÖNETİMİ
              </h2>
              <p className="text-white/35 text-xs sm:text-sm mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
                Grup derslerini oluştur, üyeleri ve aidat tahsilatını buradan yönet
              </p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 gradient-animated gradient-slow gradient-violet-pink-orange text-white text-xs font-semibold tracking-widest uppercase px-4 py-2.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
              style={{ fontFamily: "var(--font-label)" }}>
              <Plus size={14} /> Yeni Grup
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <FinanceKpiCard index={0} label="Toplam Grup" value={kpis.totalGroups}
              sub="Tüm zamanlar" deltaLabel="Kayıtlı grup" deltaPositive={null}
              icon={<Layers size={16} />} color="#A78BFA" />
            <FinanceKpiCard index={1} label="Aktif Grup" value={kpis.activeGroups}
              sub="Şu an aktif" deltaLabel="Faaliyette" deltaPositive={null}
              icon={<Check size={16} />} color="#4ADE80" />
            <FinanceKpiCard index={2} label="Bu Ay Toplam Ders" value={kpis.monthlySessionTotal}
              sub="Ders başı ücretli gruplar" deltaLabel="Aylık sayaç" deltaPositive={null}
              icon={<CalendarCheck2 size={16} />} color="#FBBF24" />
            <FinanceKpiCard index={3} label="Toplam Katılımcı" value={kpis.totalMembers}
              sub="Tüm gruplarda" deltaLabel="Aktif üye" deltaPositive={null}
              icon={<Users size={16} />} color="#60A5FA" />
            <FinanceKpiCard index={4} label="Ortalama Doluluk" value={kpis.avgOccupancy} suffix="%"
              sub="Kapasiteli gruplar" deltaLabel="Ortalama" deltaPositive={null}
              icon={<Gauge size={16} />} color="#F0ABFC" />
          </div>
        </div>
      </motion.div>

      {/* ── ARAMA + FİLTRE + SIRALAMA ────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Grup ara..."
            className="glass w-full text-white pl-8 pr-3 py-2.5 text-xs outline-none rounded-xl"
            style={{ fontFamily: "var(--font-label)" }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 glass rounded-xl p-1">
          {FILTERS.map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value as typeof filter)}
              className="relative px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{ fontFamily: "var(--font-label)", color: filter === value ? "#fff" : "rgba(255,255,255,0.4)" }}>
              {filter === value && (
                <motion.div layoutId="grup-dersleri-filter-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
              )}
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="glass text-white pl-7 pr-3 py-2.5 text-xs outline-none appearance-none rounded-xl"
            style={{ fontFamily: "var(--font-label)" }}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value} className="bg-carbon">{label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* ── Grup listesi ─────────────────────────────────────────── */}
      {filteredPerformances.length === 0 ? (
        <motion.div variants={fadeUp} className="glass text-center py-10 rounded-xl">
          <Layers size={28} className="text-white/10 mx-auto mb-2" />
          <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>
            {groups.length === 0 ? "Henüz grup dersi yok" : "Aramaya uyan grup yok"}
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPerformances.map((perf, i) => {
            const expanded = expandedId === perf.group.id;
            const groupMembers = members.filter(m => m.groupId === perf.group.id && m.isActive);
            const groupPayments = payments.filter(p => p.groupId === perf.group.id && p.periodMonth === periodMonth);
            const gymName = gyms.find(g => g.id === perf.group.gymId)?.name;
            return (
              <div key={perf.group.id} className={expanded ? "sm:col-span-2 lg:col-span-3" : ""}>
                <GroupPerformanceCard perf={perf} index={i} expanded={expanded} gymName={gymName}
                  onToggle={() => setExpandedId(expanded ? null : perf.group.id)} />

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="glass-strong rounded-2xl mt-2 p-4 sm:p-5 space-y-5">

                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(perf.group)}
                            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white transition-colors">
                            <Pencil size={11} /> Düzenle
                          </button>
                          <button onClick={() => onDeactivateGroup(perf.group.id)}
                            className="flex items-center gap-1 text-[11px] text-white/40 transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                            <Trash2 size={11} /> Grubu Kapat
                          </button>
                        </div>

                        {perf.group.shareType === "fixed_per_lesson" && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
                              Bu ay kaç ders yapıldı?
                            </span>
                            <input type="number" min="0"
                              value={sessionDraft[perf.group.id] ?? String(sessions.find(s => s.groupId === perf.group.id && s.periodMonth === periodMonth)?.sessionCount ?? "")}
                              onChange={e => setSessionDraft(prev => ({ ...prev, [perf.group.id]: e.target.value }))}
                              className="glass w-20 text-white px-2 py-1 text-xs outline-none rounded" />
                            <button onClick={() => handleSessionSave(perf.group.id)}
                              className="text-[10px] px-2 py-1 rounded-md font-semibold transition-transform hover:scale-[1.03] active:scale-95"
                              style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
                              Kaydet
                            </button>
                          </div>
                        )}

                        <GroupMemberRoster members={groupMembers} students={students}
                          onAdd={data => onAddMember(perf.group.id, data)} onRemove={onRemoveMember} />

                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-white/30 mb-2 block" style={{ fontFamily: "var(--font-label)" }}>
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
    </motion.div>
  );
}
