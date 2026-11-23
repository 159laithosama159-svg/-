import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Film,
  ListPlus,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Users,
  X,
} from 'lucide-react';
import type {
  Episode,
  MediaItem,
  PlayerMediaRequest,
  ServerProfile,
  WatchProgressEntry,
} from '../types/cinema';
import { fetchXtreamSeriesSeasons, searchAcrossAllServers } from '../services/xtreamApi';
import { calculateProgressPercent, formatTimecode } from '../utils/cinemaLogic';
import { buildMediaCharacterProfiles } from '../utils/mediaCharacters';
import {
  cleanMediaSearchTitle,
  formatCrossServerAnnouncement,
  type CrossServerMatch,
} from '../utils/crossServerSearch';

interface DetailsModalProps {
  item: MediaItem | null;
  activeServer: ServerProfile | null;
  allServers?: ServerProfile[];
  isFavorite: boolean;
  isInQueue: boolean;
  progress?: WatchProgressEntry;
  seriesCache: Record<string, Record<string, Episode[]>>;
  onCacheSeries: (itemId: string, seasons: Record<string, Episode[]>) => void;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleQueue: (id: string) => void;
  onPlayMedia: (req: PlayerMediaRequest) => void;
  onSelectCrossServerMatch?: (match: CrossServerMatch) => void;
  onToast?: (msg: string) => void;
  relatedItems: MediaItem[];
  onSelectRelated: (item: MediaItem) => void;
}

export function DetailsModal({
  item,
  activeServer,
  allServers = [],
  isFavorite,
  isInQueue,
  progress,
  seriesCache,
  onCacheSeries,
  onClose,
  onToggleFavorite,
  onToggleQueue,
  onPlayMedia,
  onSelectCrossServerMatch,
  onToast,
  relatedItems,
  onSelectRelated,
}: DetailsModalProps) {
  const [seasonsMap, setSeasonsMap] = useState<Record<string, Episode[]>>({});
  const [activeSeason, setActiveSeason] = useState<string>('');
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [seasonRetryTick, setSeasonRetryTick] = useState(0);
  const [crossServerMatches, setCrossServerMatches] = useState<CrossServerMatch[]>([]);
  const [scanningCrossServers, setScanningCrossServers] = useState(false);

  const characterProfiles = useMemo(
    () => (item ? buildMediaCharacterProfiles(item) : []),
    [item]
  );

  useEffect(() => {
    setPosterFailed(false);
  }, [item?.id, item?.poster]);

  useEffect(() => {
    if (!item) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose]);

  useEffect(() => {
    if (!item || item.kind !== 'series') {
      setSeasonsMap({});
      setActiveSeason('');
      setLoadingSeasons(false);
      setSeasonError(null);
      return;
    }

    if (item.seasons && Object.keys(item.seasons).length > 0) {
      setSeasonsMap(item.seasons);
      setActiveSeason(Object.keys(item.seasons)[0]);
      setLoadingSeasons(false);
      setSeasonError(null);
      return;
    }

    if (seriesCache[item.id]) {
      const cached = seriesCache[item.id];
      setSeasonsMap(cached);
      setActiveSeason(Object.keys(cached)[0] || '');
      setLoadingSeasons(false);
      setSeasonError(null);
      return;
    }

    if (activeServer?.type === 'xtream' && item.seriesId) {
      let cancelled = false;
      setLoadingSeasons(true);
      setSeasonError(null);
      fetchXtreamSeriesSeasons(activeServer, item.seriesId, item.id)
        .then((map) => {
          if (cancelled) return;
          onCacheSeries(item.id, map);
          setSeasonsMap(map);
          setActiveSeason(Object.keys(map)[0] || '');
          setLoadingSeasons(false);
        })
        .catch(() => {
          if (cancelled) return;
          setSeasonError('تعذّر جلب المواسم والحلقات من السيرفر حالياً.');
          setLoadingSeasons(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setSeasonsMap({});
    setActiveSeason('');
    setLoadingSeasons(false);
  }, [item, activeServer, seriesCache, onCacheSeries, seasonRetryTick]);

  // Automatically scan ALL other saved servers whenever user enters ANY movie or series!
  useEffect(() => {
    if (!item || allServers.length <= 1) {
      setCrossServerMatches([]);
      setScanningCrossServers(false);
      return undefined;
    }
    const queryTitle = cleanMediaSearchTitle(item.originalTitle || item.title);
    if (!queryTitle || queryTitle.length < 2) return undefined;

    const controller = new AbortController();
    setScanningCrossServers(true);
    setCrossServerMatches([]);

    searchAcrossAllServers(queryTitle, allServers, {
      kind: item.kind === 'series' ? 'series' : item.kind === 'movie' ? 'movie' : 'all',
      excludeServerId: activeServer?.id,
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setCrossServerMatches(res.matches);
        setScanningCrossServers(false);
        if (res.matches.length > 0 && onToast) {
          const msg = formatCrossServerAnnouncement(item.title, res.matches);
          if (msg) onToast(msg);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setScanningCrossServers(false);
      });

    return () => controller.abort();
  }, [item?.id, item?.title, activeServer?.id, allServers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  const seasonKeys = Object.keys(seasonsMap);
  const currentEpisodes = activeSeason ? seasonsMap[activeSeason] || [] : [];
  const progressPct = progress ? calculateProgressPercent(progress.t, progress.d) : 0;

  const playMovie = () => {
    if (!item.url) return;
    onClose();
    onPlayMedia({
      id: item.id,
      title: item.title,
      meta: [item.quality || 'HD', item.year].filter(Boolean).join(' · '),
      url: item.url,
      isLive: false,
      poster: item.poster,
    });
  };

  const playEpisode = (epIndex: number) => {
    const ep = currentEpisodes[epIndex];
    if (!ep) return;
    onClose();
    onPlayMedia({
      id: ep.id,
      parentId: item.id,
      title: `${item.title} — ${ep.title}`,
      meta: `الموسم ${activeSeason} · الحلقة ${ep.epNum}`,
      url: ep.url,
      isLive: false,
      poster: item.poster,
      playlist: currentEpisodes.map((e) => ({
        id: e.id,
        parentId: item.id,
        title: `${item.title} — ${e.title}`,
        meta: `الموسم ${activeSeason} · الحلقة ${e.epNum}`,
        url: e.url,
        isLive: false,
        poster: item.poster,
      })),
      playlistIndex: epIndex,
    });
  };

  const backdropSrc = item.backdrop || item.poster;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/12 bg-[#0E0E13] shadow-2xl">
        {/* Hero Backdrop */}
        <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden bg-[#14141B] p-6 sm:p-8">
          {backdropSrc && !posterFailed && (
            <img
              src={backdropSrc}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setPosterFailed(true)}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#0E0E13] via-[#0E0E13]/75 to-black/30"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق التفاصيل"
            className="absolute left-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-[#F4F3EF] transition-colors hover:border-[#D4AF37] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end">
            {item.poster && !posterFailed ? (
              <img
                src={item.poster}
                alt={item.title}
                referrerPolicy="no-referrer"
                onError={() => setPosterFailed(true)}
                className="hidden h-44 w-30 shrink-0 rounded-xl border border-white/15 object-cover shadow-xl sm:block"
              />
            ) : (
              <div className="hidden h-44 w-30 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#171722] p-3 text-center sm:flex">
                <Film className="h-7 w-7 text-[#D4AF37]" aria-hidden="true" />
                <span className="line-clamp-2 text-[11px] font-bold text-[#D6D5CE]">
                  {item.title}
                </span>
              </div>
            )}

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                <span>{item.kind === 'series' ? 'مسلسل' : 'فيلم سينمائي'}</span>
                {item.quality && (
                  <>
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                    <span>{item.quality}</span>
                  </>
                )}
                {item.year && (
                  <>
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                    <span className="tabular-nums text-[#D6D5CE]">{item.year}</span>
                  </>
                )}
                {item.rating && (
                  <>
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                    <span className="tabular-nums">★ {item.rating}</span>
                  </>
                )}
                {item.duration && (
                  <>
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                    <span className="font-mono-tabular text-[#D6D5CE]">
                      {item.duration}
                    </span>
                  </>
                )}
              </div>

              <h2
                id="details-modal-title"
                className="text-2xl font-black text-[#F4F3EF] sm:text-3xl"
              >
                {item.title}
              </h2>

              <p className="max-w-2xl text-sm leading-relaxed text-[#CFCED6]">
                {item.desc || 'عمل متاح للمشاهدة المباشرة عالية الدقة عبر منصة فالدريون.'}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {item.kind === 'movie' && (
                  <button
                    type="button"
                    onClick={playMovie}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#DC143C] px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#EF234B]"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>
                      {progressPct > 2 && progress
                        ? `متابعة من ${formatTimecode(progress.t)}`
                        : 'تشغيل الفيلم'}
                    </span>
                  </button>
                )}

                {item.kind === 'series' && currentEpisodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playEpisode(0)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#DC143C] px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#EF234B]"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span>تشغيل الحلقة 1</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onToggleFavorite(item.id)}
                  aria-pressed={isFavorite}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors ${
                    isFavorite
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/15 bg-[#15151C] text-[#F4F3EF] hover:border-[#D4AF37]/40'
                  }`}
                >
                  {isFavorite ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{isFavorite ? 'في قائمتي' : 'أضف لقائمتي'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleQueue(item.id)}
                  aria-pressed={isInQueue}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors ${
                    isInQueue
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/15 bg-[#15151C] text-[#D6D5CE] hover:border-[#D4AF37]/40'
                  }`}
                >
                  <ListPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{isInQueue ? 'في قائمة السهرة' : '+ قائمة السهرة'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-6 p-6 sm:p-8">
          {/* Automatic Cross-Server Availability Scanner Banner */}
          {allServers.length > 1 && (scanningCrossServers || crossServerMatches.length > 0) && (
            <section
              data-testid="details-cross-server-panel"
              className="rounded-xl border border-emerald-400/35 bg-gradient-to-l from-emerald-950/55 via-[#0E1614] to-[#13121B] p-4"
            >
              {scanningCrossServers ? (
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-200">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>
                    جاري البحث التلقائي عن «{item.title}» في جميع سيرفراتك المضافة ({allServers.length} سيرفرات)...
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-300">
                      <Server className="h-4 w-4" aria-hidden="true" />
                      <span>
                        تم العثور تلقائياً على «{item.title}» في {crossServerMatches.length}{' '}
                        {crossServerMatches.length === 1 ? 'سيرفر آخر' : 'سيرفرات أخرى'}!
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-200/80">
                      اضغط على أي سيرفر للتبديل والتشغيل فوراً
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {crossServerMatches.slice(0, 6).map((m) => (
                      <button
                        key={`${m.serverId}_${m.item.id}`}
                        type="button"
                        onClick={() => onSelectCrossServerMatch?.(m)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/12 px-3 py-2 text-xs font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-[#06120B]"
                      >
                        <Server className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[180px] truncate">{m.serverName}</span>
                        <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-[#F5C76B]">
                          {m.qualityTag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Credits Line */}
          {(item.director ||
            (item.cast && item.cast.length > 0) ||
            (item.genres && item.genres.length > 0)) && (
            <div className="grid gap-3 border-b border-white/[0.07] pb-5 text-xs sm:grid-cols-3">
              {item.genres && item.genres.length > 0 && (
                <div>
                  <span className="text-[#7E7D86]">التصنيف: </span>
                  <span className="font-semibold text-[#D6D5CE]">
                    {item.genres.join(' · ')}
                  </span>
                </div>
              )}
              {item.director && (
                <div>
                  <span className="text-[#7E7D86]">الإخراج: </span>
                  <span className="font-semibold text-[#D6D5CE]">{item.director}</span>
                </div>
              )}
              {item.cast && item.cast.length > 0 && (
                <div>
                  <span className="text-[#7E7D86]">طاقم العمل: </span>
                  <span className="font-semibold text-[#D6D5CE]">
                    {item.cast.join('، ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Concise Character Profiles Section (Movies & Series) */}
          {characterProfiles.length > 0 && (
            <section
              data-testid="media-characters-section"
              className="rounded-xl border border-[#D4AF37]/25 bg-[#12121A] p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-[#F5D68A]">
                <Users className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                <span>التعريف بالشخصيات الرئيسية</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {characterProfiles.map((ch, idx) => (
                  <div
                    key={`${ch.name}_${idx}`}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-right"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#F4F3EF]">{ch.name}</span>
                      <span className="rounded bg-[#D4AF37]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#F5D68A]">
                        {ch.role}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#B6B5C0]">{ch.bio}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Series Seasons & Episodes */}
          {item.kind === 'series' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-extrabold text-[#F4F3EF]">
                  المواسم والحلقات
                </h3>

                {seasonKeys.length > 0 && (
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="tablist"
                    aria-label="المواسم"
                  >
                    {seasonKeys.map((sk) => {
                      const active = sk === activeSeason;
                      return (
                        <button
                          key={sk}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setActiveSeason(sk)}
                          className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                            active
                              ? 'bg-[#D4AF37] text-[#060608]'
                              : 'border border-white/10 bg-[#14141B] text-[#9B9AA2] hover:text-white'
                          }`}
                        >
                          الموسم {sk}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {loadingSeasons ? (
                <div className="flex items-center gap-2.5 py-6 text-sm text-[#D4AF37]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري تحميل حلقات المسلسل من السيرفر...</span>
                </div>
              ) : seasonError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 p-4">
                  <p className="text-sm text-rose-300">{seasonError}</p>
                  <button
                    type="button"
                    onClick={() => setSeasonRetryTick((t) => t + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-extrabold text-[#060608] hover:brightness-110"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>إعادة المحاولة عبر الوسيط</span>
                  </button>
                </div>
              ) : currentEpisodes.length === 0 ? (
                <p className="text-sm text-[#9B9AA2]">
                  لا توجد حلقات متاحة لهذا الموسم حالياً.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-[#121218]">
                  {currentEpisodes.map((ep, idx) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => playEpisode(idx)}
                      className="group flex w-full items-center justify-between gap-4 p-4 text-right transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex min-w-0 items-start gap-3.5">
                        <span className="font-mono-tabular mt-0.5 text-sm font-bold text-[#D4AF37]">
                          {String(ep.epNum).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#F4F3EF] group-hover:text-white">
                            {ep.title}
                          </div>
                          {ep.synopsis && (
                            <p className="mt-1 line-clamp-2 text-xs text-[#9B9AA2]">
                              {ep.synopsis}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {ep.duration && (
                          <span className="font-mono-tabular text-xs text-[#9B9AA2]">
                            {ep.duration}
                          </span>
                        )}
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-[#F4F3EF] transition-colors group-hover:border-[#DC143C] group-hover:bg-[#DC143C]">
                          <Play className="mr-[-1px] h-3.5 w-3.5 fill-current" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Related Recommendations */}
          {relatedItems.length > 0 && (
            <div className="space-y-3 border-t border-white/[0.07] pt-5">
              <h3 className="text-sm font-extrabold text-[#F4F3EF]">
                أعمال مشابهة قد تعجبك
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {relatedItems.slice(0, 4).map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelated(rel)}
                    className="group overflow-hidden rounded-xl border border-white/[0.07] bg-[#13131A] text-right transition-colors hover:border-[#D4AF37]/45"
                  >
                    <div className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-[#1A1A22]">
                      {rel.backdrop || rel.poster ? (
                        <img
                          src={rel.backdrop || rel.poster}
                          alt={rel.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Film className="h-6 w-6 text-[#D4AF37]/70" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="line-clamp-1 text-xs font-bold text-[#F4F3EF]">
                        {rel.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#9B9AA2]">
                        {rel.year || rel.quality || 'HD'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
