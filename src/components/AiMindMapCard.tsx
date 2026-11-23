import { useMemo, useState } from 'react';
import {
  Download,
  GitBranch,
  Maximize2,
  Network,
  Sparkles,
} from 'lucide-react';
import {
  buildMindMapSvgMarkup,
  type AiMindMapData,
} from '../utils/aiPowerTools';

interface AiMindMapCardProps {
  data: AiMindMapData;
  onOpenInStage?: (title: string, svgMarkup: string) => void;
  onToast?: (msg: string) => void;
}

export function AiMindMapCard({
  data,
  onOpenInStage,
  onToast,
}: AiMindMapCardProps) {
  const [layout, setLayout] = useState<'radial' | 'tree'>('radial');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    data.branches[0]?.id || ''
  );

  const svgMarkup = useMemo(
    () => buildMindMapSvgMarkup(data, layout),
    [data, layout]
  );

  const svgDataUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup]
  );

  const activeBranch = useMemo(
    () => data.branches.find((b) => b.id === selectedBranchId) || data.branches[0],
    [data.branches, selectedBranchId]
  );

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethermind-mindmap-${Date.now()}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast?.('تم تنزيل الخريطة الذهنية بصيغة SVG عالية الدقة.');
  };

  const handleDownloadPng = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1206;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0A0E18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aethermind-mindmap-hd-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onToast?.('تم حفظ الخريطة الذهنية كصورة PNG بدقة 1920px.');
      }, 'image/png');
    };
    img.src = svgDataUrl;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#60A5FA]/30 bg-[#121726] shadow-xl">
      {/* Header & Layout Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#161E31] px-4 py-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[#60A5FA]" aria-hidden="true" />
          <div>
            <p className="text-xs font-extrabold text-white">{data.title}</p>
            <p className="text-[11px] text-[#94A3B8]">{data.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLayout('radial')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              layout === 'radial'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white/[0.05] text-[#94A3B8] hover:text-white'
            }`}
          >
            <Network className="h-3 w-3" aria-hidden="true" />
            <span>شعاعي</span>
          </button>
          <button
            type="button"
            onClick={() => setLayout('tree')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
              layout === 'tree'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white/[0.05] text-[#94A3B8] hover:text-white'
            }`}
          >
            <GitBranch className="h-3 w-3" aria-hidden="true" />
            <span>هرمي</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/25"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            <span>PNG HD</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-[#CBD5E1] hover:bg-white/10"
          >
            <span>SVG</span>
          </button>

          {onOpenInStage && (
            <button
              type="button"
              onClick={() => onOpenInStage(data.title, svgMarkup)}
              aria-label="تكبير الخريطة الذهنية"
              className="inline-flex items-center gap-1 rounded-lg border border-[#60A5FA]/40 bg-[#1B2A47] px-2.5 py-1 text-[11px] font-bold text-[#DBEAFE] hover:bg-[#2563EB] hover:text-white"
            >
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
              <span>تكبير</span>
            </button>
          )}
        </div>
      </div>

      {/* Live SVG Preview */}
      <div className="bg-[#0A0E18] p-2">
        <img
          src={svgDataUrl}
          alt={data.title}
          className="w-full rounded-xl border border-white/[0.07] object-contain"
        />
      </div>

      {/* Interactive Branch Explorer */}
      <div className="border-t border-white/[0.08] p-3.5">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {data.branches.map((br) => (
            <button
              key={br.id}
              type="button"
              onClick={() => setSelectedBranchId(br.id)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                activeBranch?.id === br.id
                  ? 'border-white/40 bg-white/12 text-white'
                  : 'border-white/10 bg-[#161D2E] text-[#94A3B8] hover:text-white'
              }`}
              style={{ borderRightColor: br.color, borderRightWidth: 3 }}
            >
              {br.title}
            </button>
          ))}
        </div>

        {activeBranch && (
          <div className="rounded-xl border border-white/[0.07] bg-[#0F1420] p-3">
            <p className="text-xs font-extrabold text-white">{activeBranch.title}</p>
            {activeBranch.note && (
              <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8]">
                {activeBranch.note}
              </p>
            )}
            {activeBranch.children.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeBranch.children.map((ch, idx) => (
                  <span
                    key={idx}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#E2E8F0]"
                  >
                    • {ch}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[#F5C76B]/25 bg-[#1B1710] px-3 py-2 text-[11px] text-[#FDE68A]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#F5C76B]" aria-hidden="true" />
          <span>
            <strong>الخلاصة التنفيذية:</strong> {data.keyTakeaway}
          </span>
        </div>
      </div>
    </div>
  );
}
