import { useEffect, useState } from 'react';
import { Bookmark, Check, Info, ListPlus, Play } from 'lucide-react';
import type { MediaItem } from '../types/cinema';
import { BRAND_ASSETS } from '../data/showcaseCatalog';
import { HandDrawnDivider, SketchCorners } from './HandDrawnOrnaments';

interface HeroShowcaseProps {
  items: MediaItem[];
  serverName: string;
  isFavorite: (id: string) => boolean;
  isInQueue: (id: string) => boolean;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onToggleQueue: (id: string) => void;
}

export function HeroShowcase({
  items,
  serverName,
  isFavorite,
  isInQueue,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  onToggleQueue,
}: HeroShowcaseProps) {
  const featured = items.slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedBackdropIds, setFailedBackdropIds] = useState<Record<string, boolean>>({});

  const safeIndex = activeIndex < featured.length ? activeIndex : 0;
  const current = featured[safeIndex];

  useEffect(() => {
    if (featured.length <= 1 || paused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featured.length);
    }, 7500);
    return () => window.clearInterval(timer);
  }, [featured.length, paused]);

  if (!current) return null;

  const fav = isFavorite(current.id);
  const inQueue = isInQueue(current.id);
  const backdropUrl = current.backdrop || current.poster;
  const showBackdropImg = Boolean(backdropUrl) && !failedBackdropIds[current.id];

  return (
    <section
      aria-label="العروض السينمائية المميزة"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative isolate min-h-[480px] w-full overflow-hidden border-b border-[#D9A441]/25 bg-[#0B0907] sm:min-h-[550px] lg:min-h-[600px]"
    >
      {/* Bespoke Hand-Drawn Copperplate Dragon Proscenium Arch Base Layer */}
      <img
        src={BRAND_ASSETS.heroEngraving}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left opacity-45"
      />

      {/* Real Official Movie/Series Backdrop Softly Blended Into Hand-Drawn Engraving */}
      {showBackdropImg && (
        <img
          key={current.id}
          src={backdropUrl}
          alt={current.title}
          referrerPolicy="no-referrer"
          onError={() =>
            setFailedBackdropIds((prev) => ({ ...prev, [current.id]: true }))
          }
          className="absolute inset-0 h-full w-full object-cover object-center opacity-55 mix-blend-lighten transition-opacity duration-500"
        />
      )}

      {/* Warm Obsidian Ink Scrims for Museum-Grade Arabic Typography Contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-l from-[#0B0907] via-[#0B0907]/84 to-[#0B0907]/28"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0B0907] via-[#0B0907]/35 to-transparent"
      />

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex min-h-[480px] max-w-[1440px] flex-col justify-end px-4 pb-10 pt-20 sm:min-h-[550px] sm:px-6 lg:min-h-[600px] lg:px-10 lg:pb-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-4">
            {/* Editorial Kicker */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#D9A441] sm:text-sm">
              <span>مختارات دار فالدريون</span>
              <span aria-hidden="true" className="text-[#D9A441]/45">
                ◆
              </span>
              <span className="text-[#C8B99F]">{serverName}</span>
            </div>

            {/* Calligraphic Display Title */}
            <h1 className="font-calligraphy text-4xl font-bold leading-[1.15] tracking-tight text-[#F8F0DC] sm:text-5xl lg:text-[60px]">
              {current.title}
            </h1>

            {/* Unboxed Editorial Metadata Line */}
            <div className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#DFD3BB]">
              {current.quality && (
                <span className="text-[#F0C975]">{current.quality}</span>
              )}
              {current.year && (
                <>
                  <span aria-hidden="true" className="text-[#D9A441]/40">
                    ·
                  </span>
                  <span className="tabular-nums">{current.year}</span>
                </>
              )}
              {current.rating && (
                <>
                  <span aria-hidden="true" className="text-[#D9A441]/40">
                    ·
                  </span>
                  <span className="tabular-nums text-[#F0C975]">
                    تقييم {current.rating}
                  </span>
                </>
              )}
              {current.maturity && (
                <>
                  <span aria-hidden="true" className="text-[#D9A441]/40">
                    ·
                  </span>
                  <span>{current.maturity}</span>
                </>
              )}
              {current.genres && current.genres.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-[#D9A441]/40">
                    ·
                  </span>
                  <span className="text-[#B5A78F]">
                    {current.genres.slice(0, 3).join(' / ')}
                  </span>
                </>
              )}
            </div>

            {/* Editorial Synopsis */}
            <p className="max-w-xl text-sm leading-relaxed text-[#D8CBB2] sm:text-base">
              {current.desc ||
                'مشاهدة سينمائية عالية الجودة عبر مشغل فالدريون الاحترافي مع ترجمة ذكية ومشاهدة جماعية وحماية عائلية.'}
            </p>

            {/* Primary + Secondary Artisanal Action Cluster */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onPlay(current)}
                className="sketch-btn-wax inline-flex items-center gap-2.5 whitespace-nowrap px-6 py-3 text-sm font-extrabold sm:text-base"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>
                  {current.kind === 'series' ? 'ابدأ المشاهدة' : 'تشغيل الآن'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDetails(current)}
                className="sketch-btn-ink inline-flex items-center gap-2 whitespace-nowrap px-5 py-3 text-sm font-bold backdrop-blur-md"
              >
                <Info className="h-4 w-4 text-[#D9A441]" aria-hidden="true" />
                <span>التفاصيل</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleFavorite(current.id)}
                aria-pressed={fav}
                className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors ${
                  fav ? 'sketch-btn-gold' : 'sketch-btn-ink'
                }`}
              >
                {fav ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-4 w-4 text-[#D9A441]" aria-hidden="true" />
                )}
                <span>{fav ? 'في قائمتي' : 'قائمتي'}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleQueue(current.id)}
                aria-pressed={inQueue}
                className={`inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors ${
                  inQueue ? 'sketch-btn-gold' : 'sketch-btn-ink'
                }`}
              >
                <ListPlus className="h-4 w-4 text-[#D9A441]" aria-hidden="true" />
                <span>{inQueue ? 'في السهرة' : '+ للسهرة'}</span>
              </button>
            </div>
          </div>

          {/* Hand-Framed Official Poster Bookplate on Desktop */}
          {showBackdropImg && current.poster && (
            <div className="relative hidden shrink-0 lg:block">
              <div className="relative rounded-xl border border-[#D9A441]/45 bg-[#120E0A] p-2 shadow-2xl">
                <SketchCorners size={16} className="text-[#D9A441]/80" />
                <img
                  src={current.poster}
                  alt={`ملصق ${current.title}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="h-64 w-44 rounded-lg object-cover"
                />
              </div>
            </div>
          )}
        </div>

        {/* Hand-Drawn Ink Divider & Editorial Slide Selector */}
        {featured.length > 1 && (
          <div className="mt-8 space-y-3">
            <HandDrawnDivider />
            <div
              className="flex flex-wrap items-center gap-3"
              role="tablist"
              aria-label="اختيار العرض المميز"
            >
              {featured.map((item, idx) => {
                const selected = idx === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveIndex(idx)}
                    className={`group flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-right text-xs font-bold transition-colors ${
                      selected
                        ? 'border-[#D9A441]/60 bg-[#1B150E]/90 text-[#F8F0DC]'
                        : 'border-transparent text-[#B5A78F] hover:border-[#D9A441]/25 hover:text-[#F6ECDA]'
                    }`}
                  >
                    <span
                      className={`font-mono-tabular text-[11px] ${
                        selected ? 'text-[#D9A441]' : 'text-[#8E816C]'
                      }`}
                    >
                      0{idx + 1}
                    </span>
                    <span className="max-w-[160px] truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
