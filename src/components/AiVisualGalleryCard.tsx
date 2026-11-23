import { useMemo, useState } from 'react';
import { Download, ExternalLink, Image as ImageIcon, Maximize2, Sparkles } from 'lucide-react';
import type { AiGeneratedImageBundle } from '../types/cinema';

interface AiVisualGalleryCardProps {
  bundle: AiGeneratedImageBundle;
  onOpenInStage?: (svgCode: string, title: string) => void;
  onToast: (msg: string) => void;
}

export function AiVisualGalleryCard({
  bundle,
  onOpenInStage,
  onToast,
}: AiVisualGalleryCardProps) {
  const [exportingPng, setExportingPng] = useState(false);
  const [showVectorFallback, setShowVectorFallback] = useState(false);

  const svgDataUrl = useMemo(() => {
    const encoded = encodeURIComponent(bundle.svgCode);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }, [bundle.svgCode]);

  const extendedBundle = bundle as AiGeneratedImageBundle & { generatedImageUrl?: string };
  const primaryPhotoUrl =
    extendedBundle.generatedImageUrl ||
    bundle.webPhotos?.[0]?.fullUrl ||
    bundle.webPhotos?.[0]?.thumbUrl ||
    '';
  const activeHeroUrl = !showVectorFallback && primaryPhotoUrl ? primaryPhotoUrl : svgDataUrl;

  const handleDownloadSvg = () => {
    const blob = new Blob([bundle.svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valdrion-art-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تحميل التصميم بصيغة SVG الأصلية بنجاح.');
  };

  const handleDownloadPng = async () => {
    if (exportingPng) return;
    setExportingPng(true);
    try {
      if (!showVectorFallback && primaryPhotoUrl) {
        const a = document.createElement('a');
        a.href = primaryPhotoUrl;
        a.download = `valdrion-hd-${Date.now()}.png`;
        a.click();
        onToast('تم تحميل الصورة الحقيقية عالية الدقة بنجاح!');
        return;
      }

      const img = new Image();
      const width =
        bundle.aspectRatio === '16:9' ? 1920 : bundle.aspectRatio === '9:16' ? 1080 : 1600;
      const height =
        bundle.aspectRatio === '16:9' ? 1080 : bundle.aspectRatio === '9:16' ? 1920 : 1600;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG render failed'));
        img.src = svgDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, 0, 0, width, height);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `valdrion-hd-${Date.now()}.png`;
      a.click();
      onToast(`تم تصدير وتحميل الصورة بدقة عالية (${width}×${height} PNG)!`);
    } catch {
      onToast('تعذّر تحويل الصورة إلى PNG — يمكنك تحميل نسخة SVG المباشرة.');
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#60A5FA]/30 bg-[#121724] shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#161D2E] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#F5C76B]" aria-hidden="true" />
          <div>
            <p className="text-xs font-extrabold text-white">{bundle.title}</p>
            <p className="text-[11px] text-[#94A3B8]">
              {extendedBundle.generatedImageUrl
                ? 'تصوير وتصميم فائق التفاصيل HD'
                : primaryPhotoUrl
                ? 'صور واقعية عالية التفاصيل · HD'
                : 'استوديو الصور والتصميم الفني'}{' '}
              · {bundle.aspectRatio}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {primaryPhotoUrl && (
            <button
              type="button"
              onClick={() => setShowVectorFallback((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1B2336] px-2.5 py-1.5 text-[11px] font-bold text-[#CBD5E1] hover:text-white"
            >
              <span>{showVectorFallback ? 'عرض الصورة الحقيقية' : 'عرض المخطط الفني'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={exportingPng}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{exportingPng ? 'جاري التصدير...' : 'تحميل PNG HD'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1B2336] px-2.5 py-1.5 text-[11px] font-bold text-[#CBD5E1] hover:text-white"
          >
            <span>SVG</span>
          </button>
          {onOpenInStage && (
            <button
              type="button"
              onClick={() => onOpenInStage(bundle.svgCode, bundle.title)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1B2336] px-2.5 py-1.5 text-[11px] font-bold text-[#93C5FD] hover:border-[#60A5FA]"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>تكبير</span>
            </button>
          )}
        </div>
      </div>

      {/* Main High-Detail Visual Artwork (Real HD Render / Real High-Res Photo First!) */}
      <div className="flex items-center justify-center bg-[#090C14] p-4">
        <img
          src={activeHeroUrl}
          alt={bundle.title}
          className={`rounded-xl border border-white/10 object-cover shadow-2xl ${
            bundle.aspectRatio === '9:16'
              ? 'max-h-[460px] w-auto'
              : 'max-h-[420px] w-full'
          }`}
        />
      </div>

      {/* Verified Real High-Res Photos Gallery */}
      {bundle.webPhotos && bundle.webPhotos.length > 0 && (
        <div className="border-t border-white/[0.08] bg-[#101521] p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#93C5FD]">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>معرض الصور الحقيقية عالية الدقة ({bundle.webPhotos.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {bundle.webPhotos.map((photo) => (
              <a
                key={photo.id}
                href={photo.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0A0D14]"
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2 py-1 text-[10px] text-white/90">
                  <span className="truncate">{photo.title}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
