import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Download,
  Gamepad2,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import type { GodotAgentActionPlan } from '../utils/godotAgentCommands';

interface GodotAgentPermissionCardProps {
  plan: GodotAgentActionPlan;
  connectedEngines: number;
  hasActiveProject: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDownloadBridgePlugin: () => void;
}

const ACTION_BADGE_AR: Record<string, string> = {
  add_node: 'إضافة عقدة',
  set_property: 'تعديل خاصية',
  delete_node: 'حذف عقدة',
  write_file: 'كتابة ملف',
  attach_script: 'إرفاق سكربت',
  open_scene: 'فتح مشهد',
  save_scene: 'حفظ المشهد',
  run_scene: 'تشغيل اللعبة F5',
  stop_scene: 'إيقاف التشغيل',
  get_scene_tree: 'قراءة المشهد',
};

export function GodotAgentPermissionCard({
  plan,
  connectedEngines,
  hasActiveProject,
  onApprove,
  onReject,
  onDownloadBridgePlugin,
}: GodotAgentPermissionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isPending = plan.status === 'awaiting_permission';
  const isExecuting = plan.status === 'executing';
  const isDone = plan.status === 'executed' || plan.status === 'applied_locally';
  const isRejected = plan.status === 'rejected';
  const isEngineLive = connectedEngines > 0;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#60A5FA]/35 bg-[#111827] text-[#E8EAED] shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#152036] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              plan.riskLevel === 'destructive'
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-[#2563EB]/25 text-[#93C5FD]'
            }`}
          >
            {plan.riskLevel === 'destructive' ? (
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-xs font-extrabold text-white">
              طلب إذن للتحكم المباشر في محرك Godot 4 (بعد إذنك)
            </p>
            <p className="text-[11px] text-[#93C5FD]">{plan.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          {isEngineLive ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              <span>محرر Godot متصل حيّاً</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-200">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {hasActiveProject ? 'سيُطبّق على مشروعك المحلي + جاهز للربط' : 'بانتظار ربط إضافة Godot'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <p className="text-xs leading-relaxed text-[#CBD5E1]">{plan.explanation}</p>

        {/* Commands Checklist */}
        <div className="space-y-1.5">
          {plan.commands.map((cmd, idx) => (
            <div
              key={cmd.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0C111C] px-3 py-2 text-xs"
            >
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#1E293B] font-mono text-[10px] font-bold text-[#93C5FD]">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#F1F5F9]">{cmd.labelAr}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-[#94A3B8]">
                    {cmd.action === 'add_node' &&
                      `${cmd.nodeType} "${cmd.nodeName}" -> parent: ${cmd.parentPath || '.'}${
                        cmd.position ? ` @ (${cmd.position.join(', ')})` : ''
                      }`}
                    {cmd.action === 'set_property' &&
                      `${cmd.nodePath}.${cmd.property} = ${JSON.stringify(cmd.value)}`}
                    {cmd.action === 'delete_node' && `delete ${cmd.nodePath}`}
                    {(cmd.action === 'write_file' || cmd.action === 'attach_script') &&
                      `res://${cmd.filePath}${cmd.nodePath ? ` -> ${cmd.nodePath}` : ''}`}
                    {cmd.action === 'run_scene' && 'EditorInterface.play_main_scene()'}
                    {cmd.action === 'save_scene' && 'EditorInterface.save_scene()'}
                    {cmd.action === 'get_scene_tree' && 'EditorInterface.get_edited_scene_root()'}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-[#1E293B] px-2 py-0.5 text-[10px] font-bold text-[#CBD5E1]">
                {ACTION_BADGE_AR[cmd.action] || cmd.action}
              </span>
            </div>
          ))}
        </div>

        {/* Toggle Raw Scripts/JSON Preview */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#93C5FD] hover:underline"
        >
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{showDetails ? 'إخفاء تفاصيل الأوامر والأكواد' : 'معاينة تفاصيل الأوامر والأكواد قبل الموافقة'}</span>
          {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showDetails && (
          <pre
            dir="ltr"
            className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-[#070A10] p-3 text-left font-mono text-[11px] text-[#CBD5E1]"
          >
            {JSON.stringify(plan.commands, null, 2)}
          </pre>
        )}

        {/* Action Controls or Status Result */}
        {isPending && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-[#1D4ED8]"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>
                  {isEngineLive
                    ? 'أسمح له — نفّذ داخل Godot 4 الآن'
                    : hasActiveProject
                    ? 'أسمح له — طبّق على مشروعي وجهّزه لـ Godot'
                    : 'أسمح له — نفّذ الأمر الآن'}
                </span>
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B2230] px-3.5 py-2 text-xs font-bold text-[#CBD5E1] transition-colors hover:border-rose-400/50 hover:text-rose-300"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>رفض الإذن</span>
              </button>
            </div>

            {!isEngineLive && (
              <button
                type="button"
                onClick={onDownloadBridgePlugin}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#60A5FA]/35 bg-[#172554]/50 px-3 py-2 text-[11px] font-bold text-[#BFDBFE] hover:bg-[#1E3A8A]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>تحميل إضافة جسر جودوت v2</span>
              </button>
            )}
          </div>
        )}

        {isExecuting && (
          <div className="flex items-center gap-2 rounded-xl border border-[#60A5FA]/30 bg-[#172554]/40 px-3.5 py-2.5 text-xs font-bold text-[#BFDBFE]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>تم منح الإذن — جاري تنفيذ الأوامر داخل محرك Godot 4...</span>
          </div>
        )}

        {isRejected && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-200">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <span>تم رفض الإذن — لم يتم إجراء أي تعديل داخل محرك Godot 4.</span>
          </div>
        )}

        {isDone && plan.executionResult && (
          <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-emerald-200">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>
                  {plan.executionResult.target === 'godot_live'
                    ? `تم التنفيذ المباشر داخل محرر Godot 4 (${plan.executionResult.succeeded} نجح · ${plan.executionResult.failed} ملاحظات)`
                    : `تم التطبيق على مشروع Godot المحلي (${plan.executionResult.succeeded} تعديلات جاهزة للتصدير)`}
                </span>
              </span>
              <Gamepad2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            </div>
            {plan.executionResult.logs.length > 0 && (
              <div className="space-y-1 rounded-lg bg-[#090D16] p-2.5 font-mono text-[11px] text-[#CBD5E1]">
                {plan.executionResult.logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
