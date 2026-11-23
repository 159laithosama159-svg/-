import { useEffect, useState } from 'react';
import { Bookmark, Check, Film, Play, Radio } from 'lucide-react';
import type { MediaItem, WatchProgressEntry } from '../types/cinema';
import { calculateProgressPercent } from '../utils/cinemaLogic';
import { fetchOfficialArtwork } from '../services/xtreamApi';

interface MediaCardProps {
  item: MediaItem;
  isFavorite: boolean;
  progress?: WatchProgressEntry;
  rank?: number;
  onOpen: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
}

export function MediaCard({
  item,
  isFavorite,
  progress,
  rank,
  onOpen,
  onToggleFavorite,
}: MediaCardProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(item.poster || '');
  const [attemptedLookup, setAttemptedLookup] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setResolvedUrl(item.poster || '');
    setImgError(false);
    setAttemptedLookup(false);
  }, [item.id, item.poster]);

  useEffect(() => {
    if (resolvedUrl || attemptedLookup) return;
    let cancelled = false;
    setAttemptedLookup(true);
    fetchOfficialArtwork(item.title, item.originalTitle, item.kind).then((art) => {
      if (cancelled) return;
      if (art.posterUrl) {
        setResolvedUrl(art.posterUrl);
        setImgError(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl, attemptedLookup, item.title, item.originalTitle, item.kind]);

  const handleImgError = () => {
    if (!attemptedLookup) {
      setAttemptedLookup(true);
      fetchOfficialArtwork(item.title, item.originalTitle, item.kind).then((art) => {
        if (art.posterUrl && art.posterUrl !== resolvedUrl) {
          setResolvedUrl(art.posterUrl);
          setImgError(false);
        } else {
          setImgError(true);
        }
      });
    } else {
      setImgError(true);
    }
  };

  const progressPct = progress ? calculateProgressPercent(progress.t, progress.d) : 0;
  const isLive = item.kind === 'live';
  const isLogoLike =
    isLive && /(\.svg|logo|mubasher|france24|al_jazeera)/i.test(resolvedUrl);

  const cardCore = (
    <article className="sketch-card group relative flex h-full flex-col overflow-hidden hover:-translate-y-1">
      {/* Main Clickable Media Surface */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex flex-1 flex-col text-right focus-visible:outline-none"
        aria-label={`فتح ${item.title}`}
      >
        <div
          className={`relative w-full overflow-hidden bg-[#17120D] ${
            isLive ? 'aspect-[16/10]' : 'aspect-[2/3]'
          }`}
        >
          {resolvedUrl && !imgError ? (
            <div
              className={`h-full w-full ${
                isLogoLike
                  ? 'flex items-center justify-center bg-gradient-to-br from-[#1C1610] via-[#120E0A] to-[#1D1213] p-6'
                  : ''
              }`}
            >
              <img
                src={resolvedUrl}
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleImgError}
                className={
                  isLogoLike
                    ? 'max-h-full max-w-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] transition-transform duration-300 group-hover:scale-105'
                    : 'h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                }
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-[#1C160F] via-[#120E0A] to-[#1F1114] p-4 text-center">
              {isLive ? (
                <Radio className="h-8 w-8 text-[#D9A441]/80" aria-hidden="true" />
              ) : (
                <Film className="h-8 w-8 text-[#D9A441]/80" aria-hidden="true" />
              )}
              <span className="line-clamp-2 text-xs font-extrabold text-[#F3EBD8]">
                {item.title}
              </span>
              {item.originalTitle && (
                <span className="line-clamp-1 text-[10px] font-semibold tracking-wide text-[#B5A78F]">
                  {item.originalTitle}
                </span>
              )}
            </div>
          )}

          {/* Subtle Bottom Ink Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#110D0A] via-transparent to-black/25"
          />

          {/* Crimson Wax-Seal Live Stamp */}
          {isLive && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded border border-[#F0C975]/40 bg-[#B8243A] px-2 py-0.5 text-[11px] font-bold text-[#FDF8EC]">
              بث مباشر
            </span>
          )}

          {/* Hover Play Medallion */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full border border-[#F0C975]/60 bg-[#B8243A]/95 text-[#FDF8EC] opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100"
          >
            <Play className="mr-[-2px] h-5 w-5 fill-current" />
          </span>
        </div>

        {/* Watch Progress Line */}
        {progressPct > 0 && (
          <div className="h-1 w-full bg-[#241D15]">
            <div
              className="h-full bg-gradient-to-l from-[#D9A441] to-[#B8243A]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Clean Unboxed Card Metadata */}
        <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#F6ECDA] transition-colors group-hover:text-[#F0C975]">
            {item.title}
          </h3>

          {isLive && item.epg ? (
            <p className="line-clamp-1 text-xs text-[#B5A78F]">
              الآن: {item.epg.title}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#B5A78F]">
              <span>
                {item.kind === 'series'
                  ? 'مسلسل'
                  : item.kind === 'live'
                  ? 'قناة'
                  : 'فيلم'}
              </span>
              {item.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{item.year}</span>
                </>
              )}
              {item.rating && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums text-[#D9A441]">
                    ★ {item.rating}
                  </span>
                </>
              )}
              {progressPct > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-semibold text-[#D9A441]">
                    {progressPct}%
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Independent Accessible Favorite Action */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(item.id);
        }}
        aria-label={
          isFavorite
            ? `إزالة ${item.title} من قائمتي`
            : `إضافة ${item.title} إلى قائمتي`
        }
        aria-pressed={isFavorite}
        className={`absolute left-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-md transition-colors ${
          isFavorite
            ? 'border-[#D9A441] bg-[#D9A441] text-[#0B0907]'
            : 'border-[#D9A441]/45 bg-[#0B0907]/92 text-[#F6ECDA] hover:border-[#D9A441] hover:bg-[#19140E]'
        }`}
      >
        {isFavorite ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </article>
  );

  if (typeof rank === 'number') {
    return (
      <div className="flex shrink-0 items-end gap-1 pl-1 pr-1">
        <span
          aria-hidden="true"
          className="rank-numeral z-0 -ml-2 select-none text-[82px] font-bold leading-[0.82] tracking-tighter"
        >
          {rank}
        </span>
        <div className="relative z-10 w-[176px] sm:w-[190px]">{cardCore}</div>
      </div>
    );
  }

  return cardCore;
}
