import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaItem, WatchProgressEntry } from '../types/cinema';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  ranked?: boolean;
  isFavorite: (id: string) => boolean;
  progressMap: Record<string, WatchProgressEntry>;
  onOpenItem: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}

export function MediaRow({
  title,
  subtitle,
  items,
  ranked = false,
  isFavorite,
  progressMap,
  onOpenItem,
  onToggleFavorite,
  onSeeAll,
  seeAllLabel = 'عرض الكل',
}: MediaRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  if (!items.length) return null;

  const visibleItems = items.slice(0, visibleCount);

  const scrollRow = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(320, el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'next' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b border-[#D9A441]/18 pb-3">
        <div>
          <h2 className="font-calligraphy text-xl font-bold tracking-tight text-[#F8F0DC] sm:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[#B5A78F]">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              className="whitespace-nowrap px-2.5 py-1.5 text-xs font-bold text-[#D9A441] transition-colors hover:text-[#F4D383]"
            >
              {seeAllLabel}
            </button>
          )}
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollRow('prev')}
              aria-label={`تمرير ${title} لليمين`}
              className="sketch-btn-ink flex h-8 w-8 items-center justify-center"
            >
              <ChevronRight className="h-4 w-4 text-[#D9A441]" />
            </button>
            <button
              type="button"
              onClick={() => scrollRow('next')}
              aria-label={`تمرير ${title} لليسار`}
              className="sketch-btn-ink flex h-8 w-8 items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4 text-[#D9A441]" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth"
      >
        {visibleItems.map((item, idx) => (
          <div
            key={item.id}
            className={
              ranked
                ? 'shrink-0'
                : item.kind === 'live'
                ? 'w-[240px] shrink-0 sm:w-[260px]'
                : 'w-[168px] shrink-0 sm:w-[192px]'
            }
          >
            <MediaCard
              item={item}
              rank={ranked ? idx + 1 : undefined}
              isFavorite={isFavorite(item.id)}
              progress={progressMap[item.id]}
              onOpen={onOpenItem}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}

        {items.length > visibleItems.length && (
          <div className="flex w-[140px] shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 12)}
              className="rounded-xl border border-[#D9A441]/45 bg-[#16120D] px-4 py-3 text-xs font-bold text-[#F5C76B] hover:bg-[#D9A441] hover:text-[#0B0907]"
            >
              + تحميل المزيد ({items.length - visibleItems.length})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

