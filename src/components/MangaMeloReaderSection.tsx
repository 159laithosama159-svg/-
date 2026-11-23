import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pause,
  Play,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import {
  MANGAMELO_SERIES_CATALOG,
  type MangaMeloSeries,
} from '../data/mangaMeloLibrary';

interface MangaMeloReaderSectionProps {
  onOpenAiStudioTab?: () => void;
  onToast: (msg: string) => void;
}

export function MangaMeloReaderSection({
  onOpenAiStudioTab,
  onToast,
}: MangaMeloReaderSectionProps) {
  const [selectedSeries, setSelectedSeries] = useState<MangaMeloSeries | null>(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<1 | 2 | 3>(1);
  const [brightness, setBrightness] = useState(100);
  const [countryFilter, setCountryFilter] = useState<'الكل' | 'كوري' | 'ياباني' | 'صيني'>('الكل');
  const readerTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoScroll || !selectedSeries) return;
    const id = window.setInterval(() => {
      window.scrollBy({ top: scrollSpeed * 2.2, behavior: 'auto' });
    }, 28);
    return () => window.clearInterval(id);
  }, [autoScroll, scrollSpeed, selectedSeries]);

  const openSeries = (series: MangaMeloSeries, ch = 0) => {
    setSelectedSeries(series);
    setChapterIdx(ch);
    setAutoScroll(false);
    setTimeout(() => {
      readerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const filteredSeries =
    countryFilter === 'الكل'
      ? MANGAMELO_SERIES_CATALOG
      : MANGAMELO_SERIES_CATALOG.filter((s) => s.country === countryFilter);

  if (selectedSeries) {
    const activeChapter = selectedSeries.chapters[chapterIdx] || selectedSeries.chapters[0];
    return (
      <div ref={readerTopRef} data-testid="mangamelo-reader" className="space-y-4">
        {/* Sticky MangaMelo Reader Control Bar */}
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-fuchsia-400/30 bg-[#0D0A14]/96 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAutoScroll(false);
                setSelectedSeries(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-extrabold text-white hover:border-[#D9A441]"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>كل المانهوا</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-white sm:text-sm">
                {selectedSeries.title}
              </p>
              <p className="truncate text-[10px] font-bold text-[#F5D68A]">
                {activeChapter.title}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {selectedSeries.chapters.length > 1 && (
              <select
                value={chapterIdx}
                onChange={(e) => {
                  setChapterIdx(Number(e.target.value));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="اختيار الفصل"
                className="rounded-xl border border-white/15 bg-[#161124] px-2.5 py-1.5 text-xs font-bold text-white"
              >
                {selectedSeries.chapters.map((ch, idx) => (
                  <option key={ch.id} value={idx}>
                    {ch.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              data-testid="mangamelo-autoscroll-btn"
              onClick={() => {
                setAutoScroll((v) => !v);
                onToast(!autoScroll ? 'تم تفعيل التمرير التلقائي لقراءة المانهوا' : 'تم إيقاف التمرير التلقائي');
              }}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-colors ${
                autoScroll
                  ? 'border-fuchsia-400 bg-fuchsia-600 text-white'
                  : 'border-white/15 bg-white/5 text-slate-200 hover:border-fuchsia-400/60'
              }`}
            >
              {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{autoScroll ? 'إيقاف التمرير' : 'تمرير تلقائي'}</span>
            </button>

            {autoScroll && (
              <button
                type="button"
                onClick={() => setScrollSpeed((s) => (s === 3 ? 1 : ((s + 1) as 1 | 2 | 3)))}
                className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1.5 text-xs font-black text-fuchsia-200"
              >
                سرعة {scrollSpeed}x
              </button>
            )}

            <label className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 sm:inline-flex">
              <Sun className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <input
                type="range"
                min={60}
                max={115}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-16 accent-[#D9A441]"
              />
            </label>
          </div>
        </div>

        {/* Seamless Edge-to-Edge Vertical MangaMelo Webtoon Strip */}
        <div
          className="mx-auto max-w-[760px] overflow-hidden rounded-3xl border border-white/10 bg-[#06050A] shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
          style={{ filter: `brightness(${brightness}%)` }}
        >
          {/* Chapter Title Banner */}
          <div className="border-b border-white/10 bg-gradient-to-l from-[#1C122E] via-[#120D1F] to-[#1D150D] px-5 py-6 text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/20 px-3 py-1 text-[11px] font-black text-fuchsia-200">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              <span>قارئ المانهوا العمودي · أسلوب مانجاميلو HD</span>
            </span>
            <h2 className="mt-2.5 text-xl font-black text-white sm:text-2xl">
              {selectedSeries.title}
            </h2>
            <p className="mt-1 text-xs font-bold text-[#F5D68A]">{activeChapter.title}</p>
          </div>

          {/* Seamless Zero-Gap Vertical Panels */}
          <div className="flex flex-col">
            {activeChapter.panels.map((panel, pIdx) => (
              <figure key={panel.id} className="relative w-full overflow-hidden border-b border-black">
                {/* Dramatic Narration Caption Strip */}
                {panel.caption && (
                  <div className="border-y border-[#D9A441]/30 bg-[#14101E] px-4 py-3 text-right text-xs font-bold leading-relaxed text-[#F8F1E3] sm:px-6 sm:text-sm">
                    {panel.caption}
                  </div>
                )}

                {/* High-Detail MangaMelo Artwork with Expressive Faces & Dynamic Lighting */}
                <div className="relative w-full bg-[#050408]">
                  <img
                    src={panel.imageUrl}
                    alt={`${selectedSeries.title} - لوحة ${pIdx + 1}`}
                    className="block w-full object-cover"
                    loading={pIdx === 0 ? 'eager' : 'lazy'}
                  />

                  {/* Expressive Comic SFX Burst (Auto-placed in unoccupied corner) */}
                  {panel.sfx && (() => {
                    const occupied = new Set(panel.bubbles.map((b) => b.position));
                    const sfxCorner = !occupied.has('bottom_left')
                      ? 'bottom-3 left-3 sm:bottom-5 sm:left-5'
                      : !occupied.has('top_left')
                      ? 'top-3 left-3 sm:top-5 sm:left-5'
                      : !occupied.has('bottom_right')
                      ? 'bottom-3 right-3 sm:bottom-5 sm:right-5'
                      : 'bottom-3 left-1/2 -translate-x-1/2';
                    return (
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute z-20 -rotate-3 select-none rounded-xl border-2 border-amber-300/85 bg-gradient-to-l from-rose-600/95 via-amber-500/95 to-fuchsia-600/95 px-3.5 py-1 text-sm font-black tracking-wide text-white shadow-[0_6px_25px_rgba(0,0,0,0.85)] sm:text-lg ${sfxCorner}`}
                      >
                        {panel.sfx}
                      </div>
                    );
                  })()}

                  {/* Crisp MangaMelo Arabic Dialogue Speech Bubbles */}
                  {panel.bubbles.map((b, bIdx) => {
                    const posClass =
                      b.position === 'top_right'
                        ? 'right-3 top-3 sm:right-5 sm:top-5'
                        : b.position === 'top_left'
                        ? 'left-3 top-3 sm:left-5 sm:top-5'
                        : b.position === 'bottom_right'
                        ? 'right-3 bottom-3 sm:right-5 sm:bottom-5'
                        : 'left-3 bottom-3 sm:left-5 sm:bottom-5';

                    const bubbleStyle =
                      b.style === 'system'
                        ? 'border-2 border-cyan-400 bg-[#07192E]/92 text-cyan-100 shadow-[0_0_25px_rgba(56,189,248,0.45)]'
                        : b.style === 'shout'
                        ? 'border-2 border-rose-600 bg-amber-200/95 text-[#140A0A] shadow-[0_8px_28px_rgba(0,0,0,0.7)]'
                        : b.style === 'thought'
                        ? 'border-2 border-dashed border-slate-500 bg-white/94 text-slate-900 rounded-3xl shadow-xl'
                        : 'border-2 border-[#111] bg-white/95 text-[#0F172A] shadow-[0_8px_24px_rgba(0,0,0,0.65)]';

                    return (
                      <div
                        key={bIdx}
                        className={`absolute z-10 max-w-[78%] rounded-2xl px-3.5 py-2.5 text-right sm:max-w-[340px] ${posClass} ${bubbleStyle}`}
                      >
                        <p
                          className={`text-[10px] font-black ${
                            b.style === 'system'
                              ? 'text-cyan-300'
                              : b.style === 'shout'
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {b.speaker}
                        </p>
                        <p className="mt-0.5 text-xs font-extrabold leading-relaxed sm:text-sm">
                          {b.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </figure>
            ))}
          </div>

          {/* Chapter Footer Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#100D18] p-5">
            <button
              type="button"
              disabled={chapterIdx === 0}
              onClick={() => {
                setChapterIdx((c) => Math.max(0, c - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
              <span>الفصل السابق</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSeries(null)}
              className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-xs font-extrabold text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"
            >
              العودة لمكتبة المانهوا
            </button>

            <button
              type="button"
              disabled={chapterIdx >= selectedSeries.chapters.length - 1}
              onClick={() => {
                setChapterIdx((c) => Math.min(selectedSeries.chapters.length - 1, c + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-black text-[#120D08] disabled:opacity-35"
            >
              <span>الفصل التالي</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      data-testid="mangamelo-library"
      className="space-y-4 rounded-3xl border border-fuchsia-400/30 bg-gradient-to-l from-[#181028] via-[#120D1D] to-[#1A1215] p-5 sm:p-6 shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-[11px] font-black text-fuchsia-200">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span>مانهوا ومانجا ملونة جاهزة للقراءة فوراً · أسلوب مانجاميلو HD</span>
          </div>
          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
            اقرأ أشهر أعمال المانهوا الكورية واليابانية والصينية برسم فائق التفاصيل
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['الكل', 'كوري', 'ياباني', 'صيني'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountryFilter(c)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-colors ${
                countryFilter === c
                  ? 'border-fuchsia-400 bg-fuchsia-600 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-fuchsia-400/45'
              }`}
            >
              {c}
            </button>
          ))}
          {onOpenAiStudioTab && (
            <button
              type="button"
              onClick={onOpenAiStudioTab}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-3.5 py-1.5 text-xs font-black text-[#120D08] hover:brightness-110"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ارسم روايتك الخاصة بالذكاء</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredSeries.map((series) => (
          <article
            key={series.id}
            data-testid={`mangamelo-card-${series.id}`}
            onClick={() => openSeries(series, 0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openSeries(series, 0);
              }
            }}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-white/12 bg-[#140F20] transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-400/70 hover:shadow-[0_14px_38px_rgba(192,38,211,0.28)]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
              <img
                src={series.coverUrl}
                alt={series.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-2.5 text-[10px] font-black">
                <span className="rounded-md bg-fuchsia-600 px-2 py-0.5 text-white">
                  {series.country} · HD
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-black/75 px-2 py-0.5 text-[#F5D68A]">
                  <Star className="h-3 w-3 fill-[#F5D68A]" />
                  {series.rating.toFixed(1)}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-10 text-right">
                <p className="text-[10px] font-bold text-fuchsia-300">{series.genre}</p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-black text-white">
                  {series.title}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">
                    {series.chapters.length} {series.chapters.length === 1 ? 'فصل ملون' : 'فصول ملونة'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#D9A441] px-2.5 py-1 text-[11px] font-black text-[#120D08]">
                    <BookOpen className="h-3 w-3" />
                    <span>اقرأ الآن</span>
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
