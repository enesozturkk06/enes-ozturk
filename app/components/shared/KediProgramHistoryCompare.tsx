"use client";

import { useState } from "react";
import { Card, Badge, Button } from "@/app/components/ui";
import type { KediProgram, KediProgramStatus } from "@/lib/types";
import { SPORT_LABELS, GOAL_LABELS } from "@/lib/kediProgramLabels";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Eye, GitCompareArrows, CheckCircle2 } from "lucide-react";

const STATUS_BADGE: Record<KediProgramStatus, { label: string; color: "green" | "gold" | "gray" }> = {
  published: { label: "Yayında", color: "green" },
  draft: { label: "Taslak", color: "gold" },
  archived: { label: "Arşiv", color: "gray" },
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm", { locale: tr }); } catch { return iso; }
}

function DiffRow({ label, before, after }: { label: string; before: string | number; after: string | number }) {
  const changed = String(before) !== String(after);
  return (
    <div className="flex items-center justify-between py-1.5 text-xs" style={{ fontFamily: "var(--font-inter)" }}>
      <span className="text-white/40 flex-shrink-0 w-28">{label}</span>
      <span className={changed ? "text-white/40 line-through" : "text-white/60"}>{before}</span>
      {changed && <span className="text-gold/50">→</span>}
      <span className={changed ? "text-gold font-semibold" : "text-white/60"}>{after}</span>
    </div>
  );
}

/**
 * Program sürüm geçmişi listesi + iki sürümü seçip özet karşılaştırma.
 * Tam JSON diff yerine anlamlı, okunabilir alan bazlı karşılaştırma —
 * antrenörün "ne değişmiş" sorusuna hızlı cevap vermesi hedefleniyor.
 */
export default function KediProgramHistoryCompare({
  history, onView, onPublish, publishingId,
}: {
  history: KediProgram[];
  onView: (program: KediProgram) => void;
  onPublish: (program: KediProgram) => void;
  publishingId: string | null;
}) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const [olderId, newerId] = [...compareIds].sort((a, b) => {
    const va = history.find(h => h.id === a)?.version ?? 0;
    const vb = history.find(h => h.id === b)?.version ?? 0;
    return va - vb;
  });
  const before = history.find(h => h.id === olderId);
  const after = history.find(h => h.id === newerId);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-white tracking-wider mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Program Geçmişi ({history.length} sürüm)
        </div>
        <div className="space-y-1.5">
          {history.map(p => {
            const badge = STATUS_BADGE[p.status ?? "archived"];
            const checked = !!p.id && compareIds.includes(p.id);
            return (
              <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${checked ? "border-gold/40 bg-gold/5" : "border-white/5 bg-steel/20"}`}>
                <input type="checkbox" checked={checked} onChange={() => p.id && toggleCompare(p.id)}
                  className="flex-shrink-0 accent-crimson" title="Karşılaştırmak için seç" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>v{p.version}</span>
                    <Badge color={badge.color}>{badge.label}</Badge>
                    <span className="text-[10px] text-white/30">{p.createdBy === "admin" ? "Antrenör" : "Öğrenci"}{p.isEdited ? " · düzenlendi" : ""}</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    {SPORT_LABELS[p.sport]} · {GOAL_LABELS[p.goalType]} · {fmtDate(p.updatedAt ?? p.createdAt)}
                  </div>
                  {p.changeNote && <div className="text-[11px] text-gold/60 italic mt-0.5">&quot;{p.changeNote}&quot;</div>}
                </div>
                <button onClick={() => onView(p)} className="flex-shrink-0 text-white/30 hover:text-white p-1.5" title="Görüntüle">
                  <Eye size={15} />
                </button>
                {p.status === "draft" && p.id && (
                  <Button onClick={() => onPublish(p)} loading={publishingId === p.id} size="sm" variant="secondary">
                    <CheckCircle2 size={13} /> Onayla
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {before && after && (
        <Card className="p-4 border-l-2 border-gold">
          <div className="flex items-center gap-2 mb-3">
            <GitCompareArrows size={16} className="text-gold" />
            <span className="text-sm font-semibold text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Karşılaştırma: v{before.version} → v{after.version}
            </span>
          </div>
          <DiffRow label="Spor Dalı" before={SPORT_LABELS[before.sport]} after={SPORT_LABELS[after.sport]} />
          <DiffRow label="Hedef" before={GOAL_LABELS[before.goalType]} after={GOAL_LABELS[after.goalType]} />
          <DiffRow label="Kalori" before={before.dailyCalories} after={after.dailyCalories} />
          <DiffRow label="Protein" before={`${before.proteinG}g`} after={`${after.proteinG}g`} />
          <DiffRow label="Karbonhidrat" before={`${before.carbsG}g`} after={`${after.carbsG}g`} />
          <DiffRow label="Yağ" before={`${before.fatG}g`} after={`${after.fatG}g`} />
          <DiffRow label="Antrenman Günü" before={before.trainingDays.length} after={after.trainingDays.length} />
          <DiffRow label="Öğün Sayısı" before={before.meals.length} after={after.meals.length} />
          <DiffRow label="Alışveriş Maddesi" before={before.shoppingList.length} after={after.shoppingList.length} />
        </Card>
      )}
    </div>
  );
}
