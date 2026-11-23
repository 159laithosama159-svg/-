import { Check, ChevronDown, ChevronUp, Cpu, FileCode2, Layers, Sparkles } from 'lucide-react';
import {
  APP_DECONSTRUCTOR_LENSES,
  POPULAR_APP_BLUEPRINTS,
  type AppDeconstructionLensId,
} from '../utils/appDeconstructorUtils';

interface AppDeconstructorPanelProps {
  appName: string;
  onChangeAppName: (val: string) => void;
  selectedLenses: AppDeconstructionLensId[];
  onToggleLens: (id: AppDeconstructionLensId) => void;
  hasAttachedFile: boolean;
  attachedFileName?: string;
  onTriggerUploadFile: () => void;
  onRunDeconstruct: () => void;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function AppDeconstructorPanel({
  appName,
  onChangeAppName,
  selectedLenses,
  onToggleLens,
  hasAttachedFile,
  attachedFileName,
  onTriggerUploadFile,
  onRunDeconstruct,
  disabled = false,
  collapsed = false,
  onToggleCollapsed,
}: AppDeconstructorPanelProps) {
  if (collapsed && onToggleCollapsed) {
    return (
      <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#D9A441]/28 bg-[#120E0A] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Cpu className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" aria-hidden="true" />
          <span className="truncate font-extrabold text-[#F6ECDA]">
            مفكّك التطبيقات{appName.trim() ? `: ${appName.trim()}` : ''}
          </span>
          <span className="hidden text-[11px] text-[#B5A78F] sm:inline">
            · {selectedLenses.length} محاور محددة
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="sketch-btn-gold inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px] font-bold"
        >
          <span>تفكيك تطبيق آخر</span>
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-[#D9A441]/30 bg-[#120E0A] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9A441]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D9A441]/40 bg-[#1E1710] text-[#F0C975]">
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-extrabold text-[#F6ECDA]">
              مفكّك التطبيقات والأنظمة الشامل (بأسلوب كلود)
            </p>
            <p className="text-[11px] text-[#B5A78F]">
              اكتب اسم أي تطبيق أو فكرة (أو أرفق ملف كود) ليقوم القائد والوكلاء بتفكيك معماريته وقاعدة بياناته ورسم مخططه الحي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTriggerUploadFile}
            className="sketch-btn-ink inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#E6D6B8]"
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#D9A441]" aria-hidden="true" />
            <span>
              {hasAttachedFile && attachedFileName
                ? `ملف مرفق: ${attachedFileName}`
                : 'إرفاق كود / JSON / HTML'}
            </span>
          </button>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="طي لوحة تفكيك التطبيقات"
              className="sketch-btn-ink inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#B5A78F]"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* App Target Input + Quick Presets */}
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={appName}
          onChange={(e) => onChangeAppName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && (appName.trim() || hasAttachedFile)) {
              e.preventDefault();
              onRunDeconstruct();
            }
          }}
          aria-label="اسم التطبيق أو النظام المراد تفكيكه"
          placeholder="اكتب اسم التطبيق المراد تفكيكه (مثلاً: Uber، TikTok، تطبيق توصيل طلبات...)"
          className="flex-1 rounded-lg border border-[#D9A441]/28 bg-[#0C0907] px-3 py-2 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
        />
        <button
          type="button"
          disabled={disabled || (!appName.trim() && !hasAttachedFile)}
          onClick={onRunDeconstruct}
          className="sketch-btn-wax inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold disabled:opacity-45"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>فكّك التطبيق الآن</span>
        </button>
      </div>

      {/* Quick Iconic Apps */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-[#9F9179]">تطبيقات جاهزة للتفكيك:</span>
        {POPULAR_APP_BLUEPRINTS.map((preset) => {
          const isPicked = appName.trim().toLowerCase() === preset.name.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeAppName(preset.name)}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                isPicked
                  ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                  : 'border-[#D9A441]/20 bg-[#17120C] text-[#C8B99D] hover:border-[#D9A441]/55 hover:text-[#F6ECDA]'
              }`}
            >
              {preset.arabicLabel}
            </button>
          );
        })}
      </div>

      {/* Selectable Deconstruction Lenses */}
      <div className="mt-2.5 border-t border-[#D9A441]/12 pt-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-[#B5A78F]">
          <Layers className="h-3 w-3 text-[#D9A441]" aria-hidden="true" />
          <span>محاور التفكيك المطلوبة ({selectedLenses.length}):</span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {APP_DECONSTRUCTOR_LENSES.map((lens) => {
            const active = selectedLenses.includes(lens.id);
            return (
              <button
                key={lens.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleLens(lens.id)}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-right transition-colors ${
                  active
                    ? 'border-[#D9A441]/75 bg-[#D9A441]/14 text-[#F8F0DC]'
                    : 'border-[#D9A441]/16 bg-[#17120C] text-[#A89A82] hover:border-[#D9A441]/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                    active
                      ? 'border-[#D9A441] bg-[#D9A441] text-[#0B0907]'
                      : 'border-[#D9A441]/35 bg-transparent'
                  }`}
                >
                  {active && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-extrabold">
                    {lens.label}
                  </span>
                  <span className="block truncate text-[10px] text-[#9F9179]">
                    {lens.shortHint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
