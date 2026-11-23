import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Download,
  Gamepad2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { buildSandboxedPlayableHtml } from '../utils/godotEngineUtils';

export interface RunnableArtifact {
  id: string;
  kind: 'html' | 'svg' | 'code';
  title: string;
  language: string;
  code: string;
}

interface LiveCodeGameRunnerProps {
  artifact: RunnableArtifact;
  onClose: () => void;
  onRequestAiFix: (prompt: string) => void;
  onConvertToGodot?: (prompt: string) => void;
  onToast: (msg: string) => void;
}

export function LiveCodeGameRunner({
  artifact,
  onClose,
  onRequestAiFix,
  onConvertToGodot,
  onToast,
}: LiveCodeGameRunnerProps) {
  const [viewTab, setViewTab] = useState<'preview' | 'editor'>('preview');
  const [editedCode, setEditedCode] = useState(artifact.code);
  const [runNonce, setRunNonce] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [runtimeErrors, setRuntimeErrors] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setEditedCode(artifact.code);
    setRuntimeErrors([]);
    setRunNonce((n) => n + 1);
    setViewTab(artifact.kind === 'code' ? 'editor' : 'preview');
  }, [artifact.id, artifact.code, artifact.kind]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string; message?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'VALDRION_SANDBOX_ERROR' && typeof data.message === 'string') {
        setRuntimeErrors((prev) =>
          prev.includes(data.message!) ? prev : [...prev.slice(-4), data.message!]
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const sandboxHtml = useMemo(() => {
    if (artifact.kind === 'html') {
      return buildSandboxedPlayableHtml(editedCode);
    }
    if (artifact.kind === 'svg') {
      return buildSandboxedPlayableHtml(
        `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0b0e14;padding:16px;">${editedCode}</div>`
      );
    }
    return '';
  }, [artifact.kind, editedCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
      setCopied(true);
      onToast('تم نسخ الكود بالكامل.');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      onToast('تعذّر النسخ للحافظة.');
    }
  };

  const handleDownloadSource = () => {
    const ext = artifact.kind === 'svg' ? 'svg' : artifact.kind === 'html' ? 'html' : 'txt';
    const mime =
      artifact.kind === 'svg'
        ? 'image/svg+xml;charset=utf-8'
        : artifact.kind === 'html'
        ? 'text/html;charset=utf-8'
        : 'text/plain;charset=utf-8';
    const blob = new Blob([editedCode], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valdrion-${artifact.kind}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`تم تحميل الملف (.${ext}) بنجاح.`);
  };

  const handleExportHdPng = async () => {
    if (artifact.kind !== 'svg') return;
    try {
      const svgBlob = new Blob([editedCode], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = img.naturalHeight > 0 ? img.naturalHeight / img.naturalWidth : 1;
        canvas.width = 1920;
        canvas.height = Math.max(720, Math.round(1920 * ratio));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const outUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = outUrl;
            a.download = `valdrion-art-hd-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(outUrl);
            onToast('تم تصدير الصورة بدقة فائقة 1920px HD PNG!');
          }, 'image/png');
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch {
      onToast('تعذّر تصدير HD PNG.');
    }
  };

  const handleAutoFix = () => {
    const errSummary = runtimeErrors.join('\n- ');
    onRequestAiFix(
      `اللعبة/الكود التالي ظهر فيه خطأ أثناء التشغيل داخل المتصفح:\n- ${errSummary}\n\nأصلح الكود بالكامل وأعد كتابته في كتلة \`\`\`html ... \`\`\` واحدة مكتملة 100% تعمل فوراً بدون أي أخطاء، مع ضمان ضبط مقاس الـ Canvas واستجابة لوحة المفاتيح:\n\n\`\`\`html\n${editedCode.slice(
        0,
        9000
      )}\n\`\`\``
    );
  };

  return (
    <div
      className={`flex flex-col overflow-hidden border border-white/10 bg-[#10141F] text-[#E8ECF4] ${
        fullscreen
          ? 'fixed inset-3 z-50 rounded-2xl shadow-2xl'
          : 'h-full rounded-2xl'
      }`}
    >
      {/* Top IDE Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#141926] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Gamepad2 className="h-4 w-4 shrink-0 text-[#60A5FA]" />
          <span className="truncate text-xs font-bold text-white">{artifact.title}</span>
          <span className="font-mono text-[11px] text-[#94A3B8]">
            · {artifact.kind.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {artifact.kind !== 'code' && (
            <div className="flex rounded-lg border border-white/10 bg-[#0D1018] p-0.5">
              <button
                type="button"
                onClick={() => {
                  setViewTab('preview');
                  setRuntimeErrors([]);
                  setRunNonce((n) => n + 1);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                  viewTab === 'preview' ? 'bg-[#2563EB] text-white' : 'text-[#94A3B8]'
                }`}
              >
                <Play className="h-3 w-3" />
                <span>تشغيل حي</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab('editor')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                  viewTab === 'editor' ? 'bg-[#2563EB] text-white' : 'text-[#94A3B8]'
                }`}
              >
                <Code2 className="h-3 w-3" />
                <span>محرر الكود</span>
              </button>
            </div>
          )}

          {viewTab === 'preview' && (
            <button
              type="button"
              onClick={() => {
                setRuntimeErrors([]);
                setRunNonce((n) => n + 1);
                setTimeout(() => iframeRef.current?.focus(), 120);
              }}
              title="إعادة تشغيل اللعبة / الكود"
              className="rounded-lg border border-white/10 bg-[#192030] p-1.5 text-[#CBD5E1] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopy()}
            title="نسخ الكود"
            className="rounded-lg border border-white/10 bg-[#192030] p-1.5 text-[#CBD5E1] hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {artifact.kind === 'svg' && (
            <button
              type="button"
              onClick={() => void handleExportHdPng()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1D4ED8]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>HD PNG</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadSource}
            title="تحميل الملف"
            className="rounded-lg border border-white/10 bg-[#192030] p-1.5 text-[#CBD5E1] hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'تصغير' : 'ملء الشاشة'}
            className="rounded-lg border border-white/10 bg-[#192030] p-1.5 text-[#CBD5E1] hover:text-white"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق اللوحة"
            className="rounded-lg border border-white/10 bg-[#192030] p-1.5 text-[#94A3B8] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Runtime Error Banner with 1-Click AI Auto-Fix */}
      {runtimeErrors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/30 bg-rose-950/50 px-3.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span dir="ltr" className="truncate font-mono text-[11px]">
              {runtimeErrors[runtimeErrors.length - 1]}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoFix}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-400"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>إصلاح الخطأ تلقائياً بالذكاء</span>
          </button>
        </div>
      )}

      {/* Main Preview or Live Code Editor */}
      <div className="relative flex-1 bg-[#090C12]">
        {viewTab === 'preview' && artifact.kind !== 'code' ? (
          <iframe
            key={`${artifact.id}_${runNonce}`}
            ref={iframeRef}
            title={artifact.title}
            srcDoc={sandboxHtml}
            sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
            onClick={() => iframeRef.current?.focus()}
            className="h-full min-h-[420px] w-full border-0 bg-[#090C12]"
          />
        ) : (
          <div className="flex h-full flex-col">
            <textarea
              dir="ltr"
              spellCheck={false}
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="flex-1 resize-none bg-[#0B0F19] p-4 font-mono text-xs leading-relaxed text-[#E2E8F0] focus:outline-none"
            />
            {artifact.kind !== 'code' && (
              <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#141926] px-4 py-2">
                <span className="text-[11px] text-[#94A3B8]">
                  يمكنك تعديل أي سطر برمجي وتشغيله مباشرة
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRuntimeErrors([]);
                    setViewTab('preview');
                    setRunNonce((n) => n + 1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>تطبيق وتشغيل التعديل</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick AI Game/Code Upgrade Bar */}
      {artifact.kind === 'html' && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.08] bg-[#141926] px-3.5 py-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]">
            <Sparkles className="h-3 w-3 text-[#60A5FA]" />
            <span>ترقية سريعة:</span>
          </span>
          <button
            type="button"
            onClick={() =>
              onRequestAiFix(
                `حسّن هذه اللعبة بإضافة مؤثرات صوتية مبرمجة بـ Web Audio API + جسيمات انفجار + تحكم لمس على الشاشة، وأعد كتابة الكود كاملاً في كتلة \`\`\`html ... \`\`\` تعمل 100%:\n\n\`\`\`html\n${editedCode.slice(
                  0,
                  8000
                )}\n\`\`\``
              )
            }
            className="rounded-lg border border-white/10 bg-[#1B2233] px-2.5 py-1 text-[11px] font-semibold text-[#CBD5E1] hover:border-[#60A5FA]/50 hover:text-white"
          >
            + أصوات وجسيمات ولمس
          </button>
          <button
            type="button"
            onClick={() =>
              onRequestAiFix(
                `طوّر هذه اللعبة بإضافة مراحل متعددة وزعيم نهائي (Boss) ونظام ترقيات وأعد كتابة الكود كاملاً في كتلة \`\`\`html ... \`\`\` تعمل 100%:\n\n\`\`\`html\n${editedCode.slice(
                  0,
                  8000
                )}\n\`\`\``
              )
            }
            className="rounded-lg border border-white/10 bg-[#1B2233] px-2.5 py-1 text-[11px] font-semibold text-[#CBD5E1] hover:border-[#60A5FA]/50 hover:text-white"
          >
            + مراحل وزعيم نهائي
          </button>
          {onConvertToGodot && (
            <button
              type="button"
              onClick={() =>
                onConvertToGodot(
                  `حوّل فكرة هذه اللعبة (${artifact.title}) إلى مشروع لعبة متكامل لمحرك Godot 4.3+ بلغة GDScript 2.0 ومشهد .tscn جاهز للتشغيل!`
                )
              }
              className="rounded-lg border border-[#60A5FA]/35 bg-[#60A5FA]/15 px-2.5 py-1 text-[11px] font-bold text-[#BFDBFE] hover:bg-[#60A5FA]/25"
            >
              حوّلها إلى Godot 4 (.zip)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
