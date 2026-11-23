import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { NovelBook, NovelChapter, NovelReaderTheme } from '../utils/novelsUtils';
import {
  getNovelCountryLabel,
  paginateChapterToBookPages,
  playPaperFlipSound,
} from '../utils/book4dUtils';
import { buildNovelCharacterProfiles } from '../utils/mediaCharacters';

interface Book4DReaderProps {
  novel: NovelBook;
  chapter: NovelChapter;
  chapterIndex: number;
  totalChapters: number;
  theme: NovelReaderTheme;
  fontSizePx: number;
  lineHeight: number;
  flipSoundEnabled: boolean;
  onToggleFlipSound: () => void;
  onChangeChapter: (nextChapterIndex: number) => void;
}

const BOOK_PALETTES: Record<
  NovelReaderTheme,
  {
    pageBg: string;
    pageBgAlt: string;
    text: string;
    muted: string;
    border: string;
    spineShadow: string;
  }
> = {
  dark: {
    pageBg: 'linear-gradient(105deg, #1E1929 0%, #171320 55%, #120E19 100%)',
    pageBgAlt: 'linear-gradient(255deg, #1C1726 0%, #15111D 60%, #100C17 100%)',
    text: 'text-[#F5EFE3]',
    muted: 'text-[#B5A9C2]',
    border: 'border-[#D9A441]/30',
    spineShadow: 'rgba(0,0,0,0.65)',
  },
  sepia: {
    pageBg: 'linear-gradient(105deg, #FCF6E8 0%, #F5EBCE 58%, #EADAB3 100%)',
    pageBgAlt: 'linear-gradient(255deg, #FAF3E2 0%, #F2E5C6 60%, #E4D2A8 100%)',
    text: 'text-[#2B2014]',
    muted: 'text-[#6F5B42]',
    border: 'border-[#C9B182]',
    spineShadow: 'rgba(92,64,28,0.28)',
  },
  paper: {
    pageBg: 'linear-gradient(105deg, #FFFFFF 0%, #F9FAFB 60%, #EEF2F6 100%)',
    pageBgAlt: 'linear-gradient(255deg, #FFFFFF 0%, #F6F8FA 60%, #E7ECF2 100%)',
    text: 'text-[#0F172A]',
    muted: 'text-[#64748B]',
    border: 'border-slate-300',
    spineShadow: 'rgba(15,23,42,0.18)',
  },
  oled: {
    pageBg: 'linear-gradient(105deg, #0D1017 0%, #07090D 60%, #030406 100%)',
    pageBgAlt: 'linear-gradient(255deg, #0C0F16 0%, #06080C 60%, #020304 100%)',
    text: 'text-[#E5E7EB]',
    muted: 'text-[#8B95A5]',
    border: 'border-white/15',
    spineShadow: 'rgba(0,0,0,0.85)',
  },
};

export const Book4DReader: React.FC<Book4DReaderProps> = ({
  novel,
  chapter,
  chapterIndex,
  totalChapters,
  theme,
  fontSizePx,
  lineHeight,
  flipSoundEnabled,
  onToggleFlipSound,
  onChangeChapter,
}) => {
  const pages = useMemo(
    () => paginateChapterToBookPages(chapter, chapterIndex, fontSizePx),
    [chapter, chapterIndex, fontSizePx]
  );
  const characters = useMemo(() => buildNovelCharacterProfiles(novel), [novel]);
  const countryLabel = useMemo(() => getNovelCountryLabel(novel), [novel]);

  const [coverOpen, setCoverOpen] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [flipState, setFlipState] = useState<'idle' | 'next' | 'prev'>('idle');
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  // Reset to page 0 and open directly to readable pages when chapter or novel changes
  useEffect(() => {
    setPageIdx(0);
    setFlipState('idle');
    setDragDeltaX(0);
    setCoverOpen(true);
  }, [novel.id, chapter.id]);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    };
  }, []);

  const triggerPageFlip = useCallback(
    (direction: 'next' | 'prev') => {
      if (flipState !== 'idle') return;
      if (direction === 'next') {
        if (pageIdx < pages.length - 1) {
          playPaperFlipSound(flipSoundEnabled);
          setFlipState('next');
          flipTimerRef.current = window.setTimeout(() => {
            setPageIdx((p) => Math.min(pages.length - 1, p + 1));
            setFlipState('idle');
          }, 420);
        } else if (chapterIndex < totalChapters - 1) {
          playPaperFlipSound(flipSoundEnabled);
          setFlipState('next');
          flipTimerRef.current = window.setTimeout(() => {
            onChangeChapter(chapterIndex + 1);
            setFlipState('idle');
          }, 420);
        }
      } else {
        if (pageIdx > 0) {
          playPaperFlipSound(flipSoundEnabled);
          setFlipState('prev');
          flipTimerRef.current = window.setTimeout(() => {
            setPageIdx((p) => Math.max(0, p - 1));
            setFlipState('idle');
          }, 420);
        } else if (chapterIndex > 0) {
          playPaperFlipSound(flipSoundEnabled);
          setFlipState('prev');
          flipTimerRef.current = window.setTimeout(() => {
            onChangeChapter(chapterIndex - 1);
            setFlipState('idle');
          }, 420);
        } else {
          playPaperFlipSound(flipSoundEnabled);
          setCoverOpen(false);
        }
      }
    },
    [chapterIndex, flipSoundEnabled, flipState, onChangeChapter, pageIdx, pages.length, totalChapters]
  );

  // Keyboard arrow navigation inside the 4D book
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!coverOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowLeft' || e.key === ' ') {
          e.preventDefault();
          playPaperFlipSound(flipSoundEnabled);
          setCoverOpen(true);
        }
        return;
      }
      // RTL Arabic book: ArrowLeft advances to next page, ArrowRight goes back
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerPageFlip('next');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerPageFlip('prev');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coverOpen, flipSoundEnabled, triggerPageFlip]);

  // Hand-drag / touch-swipe page turning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = e.clientX;
    setDragDeltaX(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    const dx = e.clientX - dragStartRef.current;
    setDragDeltaX(Math.max(-160, Math.min(160, dx)));
  };

  const handlePointerUp = () => {
    if (dragStartRef.current === null) return;
    const dx = dragDeltaX;
    dragStartRef.current = null;
    setDragDeltaX(0);
    // In RTL Arabic books, dragging right-to-left (dx > 55 or dx < -55) flips the page
    if (dx >= 52) {
      triggerPageFlip('next');
    } else if (dx <= -52) {
      triggerPageFlip('prev');
    }
  };

  const palette = BOOK_PALETTES[theme];
  const currentPage = pages[Math.min(pageIdx, pages.length - 1)] || pages[0];
  const nextPage = pages[pageIdx + 1] || null;

  // Interactive 4D leaf tilt while dragging or flipping
  const dynamicAngle =
    flipState === 'next'
      ? 162
      : flipState === 'prev'
      ? -162
      : Math.max(-35, Math.min(35, dragDeltaX * 0.24));

  return (
    <div className="space-y-5">
      {/* 4D Book Mode Header & Flip Sound Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#D9A441]/25 bg-black/25 px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441]/15 px-2.5 py-1 font-black text-[#F5D68A]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>قارئ الكتاب الحقيقي 4D</span>
          </span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-bold text-slate-300">
            أدب {countryLabel}
          </span>
          <span className="text-[11px] text-slate-400">
            اسحب الصفحة بيدك أو استخدم الأسهم للتقليب
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFlipSound}
            aria-pressed={flipSoundEnabled}
            data-testid="toggle-flip-sound"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-extrabold transition-colors ${
              flipSoundEnabled
                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                : 'border-white/15 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {flipSoundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {flipSoundEnabled ? 'صوت تقليب الصفحات: مفعّل' : 'صوت تقليب الصفحات: صامت'}
            </span>
          </button>

          {coverOpen && (
            <button
              type="button"
              onClick={() => {
                playPaperFlipSound(flipSoundEnabled);
                setCoverOpen(false);
              }}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-[#D9A441]/60 hover:text-white"
            >
              إغلاق للغلاف
            </button>
          )}
        </div>
      </div>

      {/* 3D / 4D PHYSICAL BOOK STAGE */}
      <div
        className="relative mx-auto flex min-h-[540px] max-w-4xl items-center justify-center py-3 select-none"
        style={{ perspective: '1800px' }}
      >
        {!coverOpen ? (
          /* REALISTIC 3D HARDBOUND BOOK COVER */
          <div
            onClick={() => {
              playPaperFlipSound(flipSoundEnabled);
              setCoverOpen(true);
            }}
            role="button"
            tabIndex={0}
            data-testid="book-4d-cover"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playPaperFlipSound(flipSoundEnabled);
                setCoverOpen(true);
              }
            }}
            className="group relative flex min-h-[510px] w-full max-w-[390px] cursor-pointer flex-col justify-between overflow-hidden rounded-l-md rounded-r-3xl border-2 border-[#D9A441]/60 p-7 text-right transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(217,164,65,0.28)]"
            style={{
              background: `linear-gradient(145deg, ${novel.coverFrom}, ${novel.coverTo})`,
              transformStyle: 'preserve-3d',
              transform: 'rotateY(-8deg)',
              boxShadow:
                '-14px 18px 36px rgba(0,0,0,0.68), inset -16px 0 24px rgba(0,0,0,0.45), inset 4px 0 0 rgba(255,255,255,0.16)',
            }}
          >
            {/* Physical Book Spine Crease (Right Side for Arabic RTL Hardcover) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-7"
              style={{
                background:
                  'linear-gradient(270deg, rgba(0,0,0,0.55) 0%, rgba(255,255,255,0.14) 38%, rgba(0,0,0,0.35) 75%, transparent 100%)',
              }}
            />
            {/* Stacked Paper Edge Thickness on Left */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-2 left-0 w-2.5 rounded-l-sm"
              style={{
                background:
                  'repeating-linear-gradient(90deg, #EDE4CF 0px, #EDE4CF 1px, #C7B99B 2px)',
              }}
            />

            <div className="relative z-10 flex items-center justify-between gap-2 pr-4">
              <span
                className="rounded-lg px-2.5 py-1 text-[11px] font-black text-[#120D08]"
                style={{ backgroundColor: novel.accentColor }}
              >
                {novel.genre} · {countryLabel}
              </span>
              <span className="rounded-lg border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-bold text-[#F5D68A]">
                ★ {novel.rating.toFixed(1)}
              </span>
            </div>

            <div className="relative z-10 my-auto space-y-4 pr-4">
              <div className="h-[2px] w-16 bg-gradient-to-l from-[#F5D68A] to-transparent" />
              <h2 className="font-imperial text-3xl font-black leading-snug text-white drop-shadow-md">
                {novel.title}
              </h2>
              <p className="text-sm font-bold text-[#F5D68A]/95">بقلم: {novel.author}</p>
              <p className="line-clamp-4 text-xs leading-relaxed text-white/80">
                {novel.synopsis}
              </p>
            </div>

            <div className="relative z-10 space-y-3 border-t border-white/15 pt-4 pr-4">
              <div className="flex items-center justify-between text-[11px] text-white/75">
                <span>{novel.chapters.length} فصول</span>
                <span>إصدار فالدريون 4D</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-3 text-xs font-black text-[#120D08] shadow-lg transition-transform group-hover:scale-[1.02]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>افتح غلاف الكتاب وابدأ القراءة</span>
              </div>
            </div>
          </div>
        ) : (
          /* OPEN 4D PHYSICAL BOOK SPREAD WITH REAL PAGE-FLIP CURL */
          <div
            data-testid="book-4d-open"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative w-full overflow-hidden rounded-3xl border-2 shadow-[0_24px_65px_rgba(0,0,0,0.6)] touch-pan-y ${palette.border}`}
            style={{
              transformStyle: 'preserve-3d',
              background: palette.pageBg,
            }}
          >
            {/* Outer Stacked Paper Depth Edges */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-3 right-0 w-2 opacity-60"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(217,164,65,0.45) 0px, transparent 2px)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-3 left-0 w-2 opacity-60"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(217,164,65,0.45) 0px, transparent 2px)',
              }}
            />

            {/* Center Book Spine Gutter Shadow (Visible on Desktop Spread) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-12 -translate-x-1/2 lg:block"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${palette.spineShadow} 50%, transparent 100%)`,
              }}
            />

            {/* Animated 4D Flipping Page Leaf */}
            <div
              className="relative grid min-h-[520px] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-cols-2"
              style={{
                transformOrigin: flipState === 'prev' ? 'left center' : 'right center',
                transform:
                  flipState === 'idle' && dragDeltaX === 0
                    ? 'rotateY(0deg)'
                    : `rotateY(${dynamicAngle}deg) scale(${flipState !== 'idle' ? 0.985 : 1})`,
                backfaceVisibility: 'hidden',
              }}
            >
              {/* RIGHT PAGE (Primary Current Page in Arabic RTL) */}
              <div
                className="flex flex-col justify-between p-6 sm:p-9 lg:pl-11"
                style={{ background: palette.pageBg }}
              >
                <div className={`mb-4 flex items-center justify-between border-b pb-2.5 text-[11px] font-bold ${palette.border} ${palette.muted}`}>
                  <span className="truncate">{novel.title}</span>
                  <span>
                    الفصل {chapter.number} · صفحة {currentPage.pageNumber} / {currentPage.totalPages}
                  </span>
                </div>

                <div
                  className={`flex-1 space-y-4 ${palette.text}`}
                  style={{ fontSize: `${fontSizePx}px`, lineHeight }}
                >
                  {pageIdx === 0 && (
                    <h3 className="mb-3 font-imperial text-xl font-black text-[#D9A441]">
                      {chapter.title}
                    </h3>
                  )}
                  {currentPage.paragraphs.map((para, i) => (
                    <p key={i} className="text-justify indent-4">
                      {para}
                    </p>
                  ))}
                </div>

                <div className={`mt-6 flex items-center justify-between pt-3 text-[11px] ${palette.muted}`}>
                  <span>{novel.author}</span>
                  <span className="font-mono font-bold">
                    {currentPage.pageNumber}
                  </span>
                </div>
              </div>

              {/* LEFT PAGE (Next Page Preview on Desktop Spread — feels like holding an open 2-page book!) */}
              <div
                className="hidden flex-col justify-between border-r p-9 pr-11 lg:flex"
                style={{ background: palette.pageBgAlt, borderColor: 'rgba(217,164,65,0.18)' }}
              >
                <div className={`mb-4 flex items-center justify-between border-b pb-2.5 text-[11px] font-bold ${palette.border} ${palette.muted}`}>
                  <span>{nextPage ? `معاينة الصفحة ${nextPage.pageNumber}` : 'نهاية الفصل'}</span>
                  <span>أدب {countryLabel}</span>
                </div>

                {nextPage ? (
                  <div
                    className={`flex-1 space-y-4 opacity-90 ${palette.text}`}
                    style={{ fontSize: `${Math.max(15, fontSizePx - 1)}px`, lineHeight }}
                  >
                    {nextPage.paragraphs.map((para, i) => (
                      <p key={i} className="text-justify indent-4">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
                    <Sparkles className="h-9 w-9 text-[#D9A441]" aria-hidden="true" />
                    <p className={`text-base font-black ${palette.text}`}>
                      وصلت إلى نهاية الفصل {chapter.number}
                    </p>
                    <p className={`max-w-xs text-xs leading-relaxed ${palette.muted}`}>
                      {chapterIndex < totalChapters - 1
                        ? 'اقلب الصفحة للانتقال مباشرة إلى الفصل التالي مع تأثير 4D.'
                        : 'أتممت آخر فصل متاح حالياً — يمكنك توليد فصل جديد من الشريط السفلي.'}
                    </p>
                  </div>
                )}

                <div className={`mt-6 flex items-center justify-between pt-3 text-[11px] ${palette.muted}`}>
                  <span className="font-mono font-bold">
                    {nextPage ? nextPage.pageNumber : '✦'}
                  </span>
                  <span>فالدريون · قراءة 4D</span>
                </div>
              </div>
            </div>

            {/* Interactive Corner Page Curl Indicators */}
            <button
              type="button"
              onClick={() => triggerPageFlip('prev')}
              aria-label="الصفحة السابقة"
              className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-xl border border-[#D9A441]/35 bg-black/55 px-3 py-1.5 text-xs font-extrabold text-[#F5D68A] backdrop-blur-sm transition-all hover:bg-[#D9A441] hover:text-[#110D08]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span>{pageIdx === 0 && chapterIndex === 0 ? 'الغلاف' : 'السابقة'}</span>
            </button>

            <button
              type="button"
              onClick={() => triggerPageFlip('next')}
              disabled={pageIdx >= pages.length - 1 && chapterIndex >= totalChapters - 1}
              aria-label="الصفحة التالية"
              data-testid="book-4d-next-page"
              className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-xl border border-[#D9A441]/55 bg-[#D9A441] px-3.5 py-1.5 text-xs font-black text-[#110D08] shadow-lg transition-all hover:brightness-110 disabled:opacity-35"
            >
              <span>
                {pageIdx >= pages.length - 1 && chapterIndex < totalChapters - 1
                  ? 'الفصل التالي'
                  : 'اقلب الصفحة'}
              </span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* CHARACTER PROFILES SECTION RIGHT BELOW THE BOOK */}
      <section className="rounded-2xl border border-[#D9A441]/25 bg-black/25 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#F5D68A]">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span>التعريف بالشخصيات الرئيسية في «{novel.title}»</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((ch, idx) => (
            <div
              key={`${ch.name}_${idx}`}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-right"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-white">{ch.name}</p>
                <span className="rounded-md bg-[#D9A441]/15 px-2 py-0.5 text-[10px] font-bold text-[#F5D68A]">
                  {ch.role}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{ch.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
