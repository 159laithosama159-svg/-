import { useState } from 'react';
import {
  ArrowUpLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ApexVerificationReport } from '../utils/apexEngine';

interface AiApexVerificationCardProps {
  report: ApexVerificationReport;
  onSelectFollowUp: (prompt: string) => void;
}

export function AiApexVerificationCard({
  report,
  onSelectFollowUp,
}: AiApexVerificationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3 pt-1">
      {/* Compact Self-Verification Accordion */}
      <div className="overflow-hidden rounded-xl border border-emerald-400/25 bg-[#0F1724]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-right transition-colors hover:bg-white/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="truncate text-xs font-extrabold text-emerald-200">
              {report.verificationStatus === 'refined'
                ? 'تم التدقيق النقدي والتحسين الذاتي للإجابة'
                : 'إجابة مدقّقة بوضع APEX متعدد المراحل'}
            </span>
            <span className="hidden text-[11px] font-medium text-[#94A3B8] sm:inline">
              · {report.improvementsApplied.length} تحسينات
              {report.sourcesCount > 0 ? ` · ${report.sourcesCount} مصادر حيّة` : ''}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          )}
        </button>

        {expanded && (
          <div className="grid gap-4 border-t border-white/[0.07] px-4 py-3.5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-extrabold text-[#F5C76B]">
                ملاحظات الناقد الذاتي قبل الاعتماد
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-[#CBD5E1]">
                {report.critiquePoints.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5C76B]" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-extrabold text-emerald-300">
                التحسينات المُطبّقة في الإجابة النهائية
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-[#CBD5E1]">
                {report.improvementsApplied.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Smart Next-Step Follow-up Actions */}
      {report.followUpPrompts.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#94A3B8]">
            <Sparkles className="h-3.5 w-3.5 text-[#60A5FA]" aria-hidden="true" />
            <span>خطوات متابعة ذكية مقترحة:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {report.followUpPrompts.slice(0, 3).map((fp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectFollowUp(fp)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#141B2B] px-3 py-1.5 text-right text-xs font-semibold text-[#DBEAFE] transition-colors hover:border-[#60A5FA]/60 hover:bg-[#1A2540] hover:text-white"
              >
                <span>{fp}</span>
                <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#60A5FA]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
