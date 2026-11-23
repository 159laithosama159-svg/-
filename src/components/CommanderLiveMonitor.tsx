import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  GripHorizontal,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Navigation,
  Search,
  Send,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import type { AiExecutionStep } from '../types/cinema';
import { clampFloatingPosition } from '../utils/deviceModeUtils';

interface CommanderLiveMonitorProps {
  isStreaming: boolean;
  liveStatus: string;
  webSearchEnabled: boolean;
  onToggleWebSearch: (enabled: boolean) => void;
  steps: AiExecutionStep[];
  searchQueries: string[];
  sources: Array<{ title: string; uri: string }>;
  liveThoughtPreview: string;
  onStopExecution: () => void;
  onSteerMission: (instruction: string) => void;
  onOpenSecurityShield?: () => void;
}

export const CommanderLiveMonitor: React.FC<CommanderLiveMonitorProps> = ({
  isStreaming,
  liveStatus,
  webSearchEnabled,
  onToggleWebSearch,
  steps,
  searchQueries,
  sources,
  liveThoughtPreview,
  onStopExecution,
  onSteerMission,
  onOpenSecurityShield,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [steerInput, setSteerInput] = useState('');
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);

  // Draggable floating position
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('valdrion_commander_monitor_pos_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
      }
    } catch {
      // ignore
    }
    return {
      x: 16,
      y: typeof window !== 'undefined' ? Math.max(90, window.innerHeight - 190) : 520,
    };
  });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => clampFloatingPosition(p, 340, 180, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const width = expanded ? 480 : 340;
    const height = expanded ? 420 : 160;
    const next = clampFloatingPosition(
      { x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy },
      width,
      height,
      window.innerWidth,
      window.innerHeight
    );
    setPos(next);
  };

  const handleDragEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      localStorage.setItem('valdrion_commander_monitor_pos_v1', JSON.stringify(pos));
    } catch {
      // ignore
    }
  };

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        aria-label="إظهار شاشة القائد الحية"
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-xl border border-[#D9A441]/55 bg-[#0E1320]/95 px-3.5 py-2 text-xs font-black text-[#F6ECDA] shadow-2xl transition-colors hover:border-[#F5C76B]"
      >
        <Monitor className="h-4 w-4 text-[#F5C76B]" aria-hidden="true" />
        <span>شاشة القائد</span>
        {isStreaming && (
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        )}
      </button>
    );
  }

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalCount = Math.max(steps.length, isStreaming ? 3 : 1);
  const pct = isStreaming
    ? Math.min(94, Math.max(15, Math.round((doneCount / totalCount) * 100)))
    : steps.length > 0
    ? 100
    : 0;

  const activeStep =
    steps.find((s) => s.status === 'running') || steps[steps.length - 1] || null;
  const selectedSource = sources[selectedSourceIdx] || sources[0] || null;

  const handleSteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = steerInput.trim();
    if (!clean) return;
    setSteerInput('');
    onSteerMission(clean);
  };

  // Compact Manus-style Floating Mini-Screen (PiP)
  if (!expanded) {
    return (
      <aside
        dir="rtl"
        aria-label="شاشة القائد المصغّرة للبحث المباشر"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className="fixed z-40 w-[300px] overflow-hidden rounded-2xl border border-[#D9A441]/40 bg-[#0B101B]/95 text-slate-100 shadow-2xl sm:w-[340px]"
      >
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          title="اسحب لتحريك الشاشة لأي مكان"
          className="flex cursor-grab items-center justify-between gap-2 border-b border-slate-800 bg-[#101726] px-3 py-2 active:cursor-grabbing select-none"
        >
          <div className="flex min-w-0 items-center gap-2">
            <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            {isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-400" aria-hidden="true" />
            ) : (
              <Monitor className="h-3.5 w-3.5 shrink-0 text-[#F5C76B]" aria-hidden="true" />
            )}
            <span className="truncate text-[11px] font-black text-white">
              شاشة القائد الحية {isStreaming ? '· يبحث ويعمل الآن' : '· اسحب للتحريك'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isStreaming && (
              <button
                type="button"
                onClick={onStopExecution}
                aria-label="إيقاف القائد فوراً"
                title="إيقاف التنفيذ"
                className="rounded-md bg-rose-500/20 p-1 text-rose-300 hover:bg-rose-500/35"
              >
                <Square className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="تكبير شاشة القائد والتحكم بها"
              title="تكبير والتحكم المباشر"
              className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setHidden(true)}
              aria-label="تصغير شاشة القائد"
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-900">
          <div
            className="h-full bg-gradient-to-l from-emerald-400 via-[#F5C76B] to-sky-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-bold text-slate-200">
              {liveStatus || activeStep?.label || 'افتح للتوجيه المباشر أو مراقبة البحث الحر'}
            </span>
            <button
              type="button"
              onClick={() => onToggleWebSearch(!webSearchEnabled)}
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                webSearchEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {webSearchEnabled ? 'بحث حر: ON' : 'بحث حر: OFF'}
            </button>
          </div>

          {searchQueries.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070B14] px-2.5 py-1.5 text-[10px] text-sky-300">
              <Search className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{searchQueries[searchQueries.length - 1]}</span>
            </div>
          )}

          {sources.length > 0 && (
            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
              <span className="truncate">
                المصادر المفحوصة: <strong className="text-amber-300">{sources.length}</strong> · آخر مصدر: {sources[0]?.title}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="shrink-0 font-bold text-[#F5C76B] hover:underline"
              >
                تحكم كامل
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Expanded Manus-style Live Interactive Control Console
  return (
    <aside
      dir="rtl"
      aria-label="شاشة التحكم الحية في القائد الشامل"
      className="fixed bottom-4 left-4 z-50 flex max-h-[80vh] w-[calc(100vw-2rem)] max-w-[480px] flex-col overflow-hidden rounded-2xl border border-[#D9A441]/45 bg-[#0A0F1A] text-slate-100 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#101829] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="truncate text-xs font-black text-white">
              شاشة القائد الحية — مراقبة وتحكم مباشر (Manus Mode)
            </h3>
            <p className="truncate text-[10px] text-slate-400">
              {isStreaming ? liveStatus || 'جاري التنفيذ والبحث الحي...' : 'جاهز لاستقبال توجيهك المباشر'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onOpenSecurityShield && (
            <button
              type="button"
              onClick={onOpenSecurityShield}
              aria-label="درع الأمان"
              title="درع الأمان الفائق"
              className="rounded-lg p-1.5 text-emerald-300 hover:bg-white/10"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="تصغير الشاشة"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setHidden(true);
            }}
            aria-label="إخفاء الشاشة"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Live Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#0D1422] px-4 py-2 text-[11px]">
        <button
          type="button"
          onClick={() => onToggleWebSearch(!webSearchEnabled)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold ${
            webSearchEnabled
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{webSearchEnabled ? 'البحث الحر مفتوح بدون قيود' : 'تفعيل البحث الحر'}</span>
        </button>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStopExecution}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-500"
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            <span>إيقاف فوري</span>
          </button>
        ) : (
          <span className="font-mono text-[10px] text-slate-400">
            التقدم: {pct}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* Step-by-Step Live Execution Feed */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-400">مسار العمل الحالي ({steps.length} خطوات)</p>
          {steps.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-[#070B14] px-3 py-2.5 text-xs text-slate-400">
              أرسل أي مهمة أو سؤال للقائد، وستشاهد هنا خطوة بخطوة أين يبحث وما المواقع التي يقرأها ويمكنك توجيهه مباشرة.
            </p>
          ) : (
            <div className="space-y-1.5">
              {steps.map((st) => (
                <div
                  key={st.id}
                  className="flex items-start gap-2 rounded-lg border border-slate-800 bg-[#0E1626] px-3 py-2 text-xs"
                >
                  {st.status === 'running' ? (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-100">{st.label}</p>
                    {st.detail && <p className="truncate text-[10px] text-slate-400">{st.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Search Queries */}
        {searchQueries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400">استعلامات البحث المفتوح</p>
            <div className="flex flex-wrap gap-1.5">
              {searchQueries.map((q, idx) => (
                <span
                  key={`${q}_${idx}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200"
                >
                  <Search className="h-3 w-3" aria-hidden="true" />
                  <span>{q}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Live Inspected Sources Browser */}
        {sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400">
              المواقع والمصادر التي فحصها القائد ({sources.length})
            </p>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#070B14] p-2">
              {sources.map((src, idx) => (
                <div
                  key={`${src.uri}_${idx}`}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                    selectedSourceIdx === idx ? 'bg-slate-800/90 text-white' : 'text-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSourceIdx(idx)}
                    className="min-w-0 flex-1 truncate text-right font-semibold hover:text-amber-300"
                  >
                    {src.title}
                  </button>
                  <a
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`فتح ${src.title}`}
                    className="shrink-0 text-sky-400 hover:text-sky-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
            {selectedSource && (
              <p dir="ltr" className="truncate font-mono text-[10px] text-slate-500">
                {selectedSource.uri}
              </p>
            )}
          </div>
        )}

        {/* Live Thinking / Reading Stream Preview */}
        {liveThoughtPreview && (
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400">ما يقرأه ويفكّر به القائد الآن</p>
            <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-800 bg-[#070B14] p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
              {liveThoughtPreview.slice(-600)}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Takeover & Live Steering Bar (Manus-style Take Control!) */}
      <form
        onSubmit={handleSteerSubmit}
        className="flex items-center gap-2 border-t border-slate-800 bg-[#0E1525] p-3"
      >
        <Navigation className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
        <input
          type="text"
          value={steerInput}
          onChange={(e) => setSteerInput(e.target.value)}
          placeholder="وجّه القائد الآن (مثلاً: ابحث أكثر عن... أو اعمل رواية...)"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#070B14] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#F5C76B]"
        />
        <button
          type="submit"
          disabled={!steerInput.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#D9A441] px-3 py-2 text-xs font-black text-[#0B0907] hover:bg-[#F5C76B] disabled:opacity-45"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>توجيه</span>
        </button>
      </form>
    </aside>
  );
};
