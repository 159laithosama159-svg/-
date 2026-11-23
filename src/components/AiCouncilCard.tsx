import { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Crown,
  Lightbulb,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import type { AiCouncilDebateResult } from '../utils/aiPowerTools';

interface AiCouncilCardProps {
  debate: AiCouncilDebateResult;
  onRunChecklistItem?: (prompt: string) => void;
}

export function AiCouncilCard({
  debate,
  onRunChecklistItem,
}: AiCouncilCardProps) {
  const [activeMemberId, setActiveMemberId] = useState<'all' | 'architect' | 'critic' | 'visionary'>('all');

  const visibleMembers =
    activeMemberId === 'all'
      ? debate.members
      : debate.members.filter((m) => m.id === activeMemberId);

  const iconForMember = (id: 'architect' | 'critic' | 'visionary') => {
    if (id === 'architect') return <Cpu className="h-4 w-4 text-sky-400" aria-hidden="true" />;
    if (id === 'critic') return <ShieldAlert className="h-4 w-4 text-rose-400" aria-hidden="true" />;
    return <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" />;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#F5C76B]/30 bg-gradient-to-b from-[#151B2B] to-[#0F1420] shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#182035]/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-[#F5C76B]">
            <Scale className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-extrabold text-white">
              مجلس الخبراء الثلاثي · مناظرة 3 عقول متخصصة
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              المهندس المعماري × الناقد المنطقي × المبدع الاستراتيجي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-extrabold text-emerald-300">
            ثقة القرار: {Math.max(50, Math.min(99, debate.confidenceScore))}%
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-4 py-2">
        {(
          [
            { id: 'all', label: 'كل العقول (3)' },
            { id: 'architect', label: 'المهندس المعماري' },
            { id: 'critic', label: 'الناقد الأمني' },
            { id: 'visionary', label: 'المبدع الاستراتيجي' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveMemberId(tab.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              activeMemberId === tab.id
                ? 'bg-[#2563EB] text-white'
                : 'bg-white/[0.04] text-[#94A3B8] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3 Expert Minds Grid */}
      <div className="grid gap-3 p-4 md:grid-cols-3">
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#121826] p-3.5"
            style={{ borderTopColor: member.accentHex, borderTopWidth: 2 }}
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                {iconForMember(member.id)}
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-white">
                    {member.nameAr}
                  </p>
                  <p className="truncate text-[10px] text-[#8C96AA]">
                    {member.roleTitle}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#E2E8F0]">
                {member.stance}
              </p>
              {member.keyPoints.length > 0 && (
                <ul className="mt-2.5 space-y-1.5 text-[11px] text-[#B8C4D8]">
                  {member.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: member.accentHex }}
                      />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {member.riskOrOpportunity && (
              <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-[#CBD5E1]">
                <span className="font-bold text-[#F5C76B]">نقطة الحسم: </span>
                {member.riskOrOpportunity}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final Executive Verdict */}
      <div className="border-t border-[#F5C76B]/25 bg-[#171E30] p-4">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-[#F5C76B]">
          <Crown className="h-4 w-4" aria-hidden="true" />
          <span>القرار التنفيذي الموحّد: {debate.verdictTitle}</span>
        </div>
        <p className="text-xs leading-relaxed text-[#F1F5F9]">
          {debate.verdictSummary}
        </p>

        {debate.actionChecklist.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-bold text-[#93C5FD]">
              خطوات التنفيذ الفوري (اضغط على أي خطوة لتنفيذها فوراً):
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {debate.actionChecklist.map((step, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onRunChecklistItem?.(`نفّذ هذه الخطوة بالتفصيل العملي: ${step}`)}
                  className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#0F1420] px-3 py-2 text-right text-[11px] font-semibold text-[#E2E8F0] transition-colors hover:border-[#60A5FA] hover:text-white"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{step}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
