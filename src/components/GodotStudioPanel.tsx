import { useState } from 'react';
import {
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Gamepad2,
  Plug,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  GODOT_GAME_TEMPLATES,
  type GodotDimension,
  type GodotRenderer,
} from '../utils/godotEngineUtils';

interface GodotStudioPanelProps {
  gamePrompt: string;
  onChangeGamePrompt: (val: string) => void;
  dimension: GodotDimension;
  onChangeDimension: (dim: GodotDimension) => void;
  renderer: GodotRenderer;
  onChangeRenderer: (r: GodotRenderer) => void;
  pairCode: string;
  onRegeneratePairCode: () => void;
  bridgeWsUrl: string;
  wsReady: boolean;
  connectedEngines: number;
  connectedGodotVersion: string;
  onDownloadBridgePlugin: () => void;
  onRunBuild: () => void;
  onLaunchRobloxGta6?: () => void;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onToast: (msg: string) => void;
}

export function GodotStudioPanel({
  gamePrompt,
  onChangeGamePrompt,
  dimension,
  onChangeDimension,
  renderer,
  onChangeRenderer,
  pairCode,
  onRegeneratePairCode,
  bridgeWsUrl,
  wsReady,
  connectedEngines,
  connectedGodotVersion,
  onDownloadBridgePlugin,
  onRunBuild,
  onLaunchRobloxGta6,
  disabled = false,
  collapsed = false,
  onToggleCollapsed,
  onToast,
}: GodotStudioPanelProps) {
  const [bridgeGuideOpen, setBridgeGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isEngineLive = connectedEngines > 0;

  const handleCopyPairInfo = async () => {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopiedCode(true);
      onToast(`تم نسخ رمز ربط جودوت: ${pairCode}`);
      setTimeout(() => setCopiedCode(false), 1600);
    } catch {
      onToast('تعذّر النسخ التلقائي');
    }
  };

  if (collapsed && onToggleCollapsed) {
    return (
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D9A441]/28 bg-[#120E0A] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" aria-hidden="true" />
          <span className="truncate font-extrabold text-[#F6ECDA]">
            استوديو محرك جودوت 4 ({dimension.toUpperCase()})
          </span>
          <span className="hidden font-mono-tabular text-[11px] text-[#B5A78F] sm:inline">
            · رمز الجسر: {pairCode}
          </span>
          <span
            className={`text-[11px] font-bold ${
              isEngineLive ? 'text-emerald-400' : 'text-[#B5A78F]'
            }`}
          >
            · {isEngineLive ? `متصل بـ Godot ${connectedGodotVersion || '4'}` : 'جاهز للتصدير .zip والربط الحي'}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="sketch-btn-gold inline-flex shrink-0 items-center gap-1 px-2.5 py-1 text-[11px] font-bold"
        >
          <span>بناء لعبة جديدة في جودوت</span>
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-[#D9A441]/30 bg-[#120E0A] p-3">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9A441]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D9A441]/40 bg-[#1E1710] text-[#F0C975]">
            <Gamepad2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-extrabold text-[#F6ECDA]">
              مُصنّع ألعاب محرك جودوت 4 والجسر الحي (Godot 4.3+ Forge)
            </p>
            <p className="text-[11px] text-[#B5A78F]">
              اكتب فكرة أي لعبة ليتم توليد مشروع Godot 4 كامل (project.godot + مشاهد .tscn + سكربتات GDScript) مع مزامنة حيّة أو تحميل فوري .zip
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 2D / 3D Segmented Control */}
          <div className="flex items-center rounded-lg border border-[#D9A441]/25 bg-[#0D0A07] p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => onChangeDimension('2d')}
              aria-pressed={dimension === '2d'}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                dimension === '2d'
                  ? 'bg-[#D9A441] text-[#0B0907]'
                  : 'text-[#B5A78F] hover:text-[#F6ECDA]'
              }`}
            >
              2D ثنائي
            </button>
            <button
              type="button"
              onClick={() => onChangeDimension('3d')}
              aria-pressed={dimension === '3d'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${
                dimension === '3d'
                  ? 'bg-[#D9A441] text-[#0B0907]'
                  : 'text-[#B5A78F] hover:text-[#F6ECDA]'
              }`}
            >
              <Box className="h-3 w-3" aria-hidden="true" />
              <span>3D ثلاثي</span>
            </button>
          </div>

          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="طي لوحة محرك جودوت"
              className="sketch-btn-ink inline-flex items-center px-2 py-1.5 text-[11px] font-bold text-[#B5A78F]"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Prompt Input + Build CTA */}
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={gamePrompt}
          onChange={(e) => onChangeGamePrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && gamePrompt.trim()) {
              e.preventDefault();
              onRunBuild();
            }
          }}
          aria-label="فكرة اللعبة المطلوب بناؤها داخل محرك جودوت"
          placeholder="اكتب فكرة اللعبة (مثلاً: سوي لعبة منصات فارس يجمع جواهر ويقاتل وحوش في جودوت...)"
          className="flex-1 rounded-lg border border-[#D9A441]/28 bg-[#0C0907] px-3 py-2 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
        />
        <button
          type="button"
          disabled={disabled || !gamePrompt.trim()}
          onClick={onRunBuild}
          className="sketch-btn-wax inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold whitespace-nowrap disabled:opacity-45"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>ابني اللعبة في جودوت</span>
        </button>
      </div>

      {/* Quick Game Templates + Instant Flagship Roblox x GTA 6 3D */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {onLaunchRobloxGta6 && (
          <button
            type="button"
            onClick={onLaunchRobloxGta6}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#60A5FA]/55 bg-[#2563EB]/20 px-2.5 py-1 text-[11px] font-extrabold text-[#BFDBFE] transition-colors hover:bg-[#2563EB] hover:text-white"
          >
            <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>تشغيل فوري: لعبة Roblox × GTA 6 (3D Godot 4)</span>
          </button>
        )}
        <span className="text-[10px] font-bold text-[#9F9179]">أفكار ألعاب جاهزة:</span>
        {GODOT_GAME_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => {
              onChangeDimension(tpl.dimension);
              onChangeGamePrompt(tpl.prompt);
            }}
            className="rounded-md border border-[#D9A441]/22 bg-[#17120C] px-2 py-0.5 text-[11px] font-bold text-[#D8CBB2] transition-colors hover:border-[#D9A441]/60 hover:text-[#F6ECDA]"
          >
            {tpl.title}
          </button>
        ))}
      </div>

      {/* Live Godot Editor WebSocket Bridge Strip */}
      <div className="mt-2.5 border-t border-[#D9A441]/14 pt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {isEngineLive ? (
              <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-400">
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  محرك جودوت متصل حيّاً ({connectedGodotVersion || 'Godot 4'})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-bold text-[#C8B99D]">
                <WifiOff className="h-3.5 w-3.5 text-[#D9A441]" aria-hidden="true" />
                <span>
                  {wsReady
                    ? 'جسر جودوت الحي جاهز بانتظار اتصال المحرر'
                    : 'جاري تهيئة قناة الربط الحي...'}
                </span>
              </span>
            )}
            <span aria-hidden="true" className="text-[#6F6350]">·</span>
            <span className="font-mono-tabular text-[11px] font-bold text-[#F0C975]">
              رمز الربط: {pairCode}
            </span>
            <button
              type="button"
              onClick={handleCopyPairInfo}
              aria-label="نسخ رمز ربط جودوت"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B5A78F] hover:text-[#F6ECDA]"
            >
              {copiedCode ? (
                <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{copiedCode ? 'تم' : 'نسخ'}</span>
            </button>
            <button
              type="button"
              onClick={onRegeneratePairCode}
              aria-label="توليد رمز ربط جديد"
              title="توليد رمز ربط جديد"
              className="text-[#9E917B] hover:text-[#F0C975]"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="محرك الرسم في جودوت"
              value={renderer}
              onChange={(e) => onChangeRenderer(e.target.value as GodotRenderer)}
              className="rounded-md border border-[#D9A441]/24 bg-[#0D0A07] px-2 py-1 text-[11px] font-bold text-[#D8CBB2] focus:border-[#D9A441]"
            >
              <option value="gl_compatibility">Compatibility (الأسرع لكل الأجهزة)</option>
              <option value="mobile">Mobile (للهواتف والويب)</option>
              <option value="forward_plus">Forward+ (رسوميات فائقة PC)</option>
            </select>

            <button
              type="button"
              onClick={onDownloadBridgePlugin}
              className="sketch-btn-gold inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              <span>تحميل إضافة الربط لجودوت</span>
            </button>

            <button
              type="button"
              onClick={() => setBridgeGuideOpen((v) => !v)}
              aria-expanded={bridgeGuideOpen}
              className="sketch-btn-ink inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#E6D6B8] whitespace-nowrap"
            >
              <Plug className="h-3 w-3 text-[#D9A441]" aria-hidden="true" />
              <span>{bridgeGuideOpen ? 'إخفاء خطوات الربط' : 'كيف أربط جودوت؟'}</span>
            </button>
          </div>
        </div>

        {/* Step-by-step Live Godot Connection Instructions */}
        {bridgeGuideOpen && (
          <div className="mt-2.5 space-y-2 rounded-lg border border-[#D9A441]/22 bg-[#0D0A07] p-3 text-[11px] leading-relaxed text-[#D8CBB2]">
            <p className="font-extrabold text-[#F0C975]">
              طريقتان لتشغيل اللعبة مباشرة داخل محرك Godot 4.3+:
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-bold text-[#F6ECDA]">
                  ١. التشغيل السريع (بدون إعداد مسبق):
                </p>
                <p>
                  اضغط <strong className="text-[#F0C975]">«تحميل مشروع جودوت (.zip)»</strong> بعد توليد أي لعبة، فك الضغط ثم افتح ملف <code className="font-mono text-[#E6BC66]">project.godot</code> من Godot 4 واضغط <strong className="text-[#F0C975]">F5</strong> لتلعب فوراً.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[#F6ECDA]">
                  ٢. الربط الحي المباشر داخل محرر جودوت (Live Sync):
                </p>
                <p>
                  حمّل إضافة <code className="font-mono text-[#E6BC66]">addons/valdrion_bridge</code> بالأعلى، ضعها داخل مشروعك في جودوت، فعّلها من <code className="font-mono text-[#E6BC66]">Project Settings → Plugins</code>، وسيستقبل محرك جودوت الألعاب والمشاهد تلقائياً عبر الجسر الحي ويشغّلها فوراً!
                </p>
              </div>
            </div>
            <p className="border-t border-[#D9A441]/14 pt-1.5 font-mono text-[10px] text-[#9F9179]" dir="ltr">
              Bridge WS Endpoint: {bridgeWsUrl} · Pair Code: {pairCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
