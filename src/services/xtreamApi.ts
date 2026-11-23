import type {
  AccountInfo,
  AiConciergeResponse,
  AiStudioMode,
  AiThinkingDepth,
  CatalogData,
  Episode,
  MediaItem,
  MediaKind,
  ServerPingResult,
  ServerProfile,
  SubtitleCue,
} from '../types/cinema';
import {
  normalizeArtworkQuery,
  normalizeServerHost,
  parseM3UPlaylist,
} from '../utils/cinemaLogic';
import { classifyPingMs } from '../utils/cinemaProUtils';
import {
  detectQualityBadge,
  rankCrossServerMatches,
  scoreTitleMatch,
  type CrossServerMatch,
} from '../utils/crossServerSearch';
import { buildLegalFtaCatalog, buildShowcaseCatalog } from '../data/showcaseCatalog';
import {
  normalizeGodotProjectPayload,
  type GodotDimension,
  type GodotProjectBundle,
  type GodotRenderer,
} from '../utils/godotEngineUtils';
import type {
  ArxivPaperAsset,
  CountryAtlasCard,
  DictionaryEntryAsset,
  FreeBookAsset,
  GitHubRepoAsset,
  LiveFreePulseData,
  NpmPackageAsset,
  TvMazeShowAsset,
  WebMediaAsset,
  WikiKnowledgeCard,
} from '../utils/connectorsUtils';
import type { MotionVideoProject, VideoAspectRatio } from '../utils/motionVideoUtils';

function buildFetchUrl(
  url: string,
  useProxy: boolean,
  compactLimit?: number
): string {
  // Always route compact catalog queries through our streaming server proxy so huge 50MB+ Xtream panels NEVER freeze the browser
  if (!useProxy && !compactLimit) return url;
  const compactPart = compactLimit ? `&compact=1&limit=${compactLimit}` : '';
  return `/api/xtream-proxy?url=${encodeURIComponent(url)}${compactPart}`;
}

export function buildProxiedStreamUrl(url: string, forceProxy = false): string {
  const clean = (url || '').trim();
  if (!clean) return clean;
  if (clean.startsWith('/api/stream-proxy') || clean.startsWith('/api/stream-transcode')) {
    return clean;
  }
  const isHttpOnHttps =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    /^http:\/\//i.test(clean);
  if (forceProxy || isHttpOnHttps) {
    return `/api/stream-proxy?url=${encodeURIComponent(clean)}`;
  }
  return clean;
}

export function buildTranscodedStreamUrl(
  url: string,
  mode: 'remux' | 'full' = 'remux',
  startSec = 0
): string {
  const clean = (url || '').trim();
  if (!clean) return clean;
  const startPart = startSec > 0 ? `&start=${Math.floor(startSec)}` : '';
  return `/api/stream-transcode?url=${encodeURIComponent(clean)}&mode=${mode}${startPart}`;
}

export async function searchAcrossAllServers(
  query: string,
  servers: ServerProfile[],
  options?: {
    kind?: 'all' | 'movie' | 'series' | 'live';
    excludeServerId?: string;
    signal?: AbortSignal;
  }
): Promise<{ matches: CrossServerMatch[]; scannedServers: number }> {
  const q = query.trim();
  if (q.length < 2 || servers.length === 0) {
    return { matches: [], scannedServers: 0 };
  }

  const kind = options?.kind || 'all';
  const targetServers = servers.filter((s) => s.id !== options?.excludeServerId);
  if (targetServers.length === 0) {
    return { matches: [], scannedServers: 0 };
  }

  const localMatches: CrossServerMatch[] = [];
  const remoteServers: ServerProfile[] = [];

  for (const srv of targetServers) {
    if (srv.type === 'showcase') {
      const cat =
        srv.id === 'valdrion_fta_public' ? buildLegalFtaCatalog() : buildShowcaseCatalog();
      const pool: MediaItem[] = [
        ...(kind === 'all' || kind === 'movie' ? cat.vodStreams : []),
        ...(kind === 'all' || kind === 'series' ? cat.seriesList : []),
        ...(kind === 'all' || kind === 'live' ? cat.liveStreams : []),
      ];
      for (const item of pool) {
        const s1 = scoreTitleMatch(q, item.title);
        const s2 = item.originalTitle ? scoreTitleMatch(q, item.originalTitle) : 0;
        const score = Math.max(s1, s2);
        if (score >= 58) {
          localMatches.push({
            serverId: srv.id,
            serverName: srv.name,
            serverType: srv.type,
            item,
            score,
            qualityTag: detectQualityBadge(item),
          });
        }
      }
    } else {
      remoteServers.push(srv);
    }
  }

  let remoteMatches: CrossServerMatch[] = [];
  if (remoteServers.length > 0) {
    try {
      const res = await fetch('/api/xtream/multi-server-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options?.signal,
        body: JSON.stringify({
          query: q,
          kind,
          servers: remoteServers.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            host: s.host,
            username: s.username,
            password: s.password,
            m3uUrl: s.type === 'm3u' ? s.host : undefined,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          matches?: CrossServerMatch[];
        };
        if (Array.isArray(data.matches)) {
          remoteMatches = data.matches;
        }
      }
    } catch {
      // Abort or network hiccup — still return local matches cleanly
    }
  }

  return {
    matches: rankCrossServerMatches([...remoteMatches, ...localMatches], 18),
    scannedServers: targetServers.length,
  };
}

async function fetchJson<T>(
  url: string,
  useProxy: boolean,
  compactLimit?: number,
  timeoutMs = 18000
): Promise<T> {
  const effectiveProxy = useProxy || Boolean(compactLimit);
  const attempt = async (viaProxy: boolean): Promise<T> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(buildFetchUrl(url, viaProxy, compactLimit), {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    return await attempt(effectiveProxy);
  } catch (err) {
    // Auto-retry via built-in server proxy if direct HTTP failed due to Mixed-Content/CORS
    if (!effectiveProxy) {
      return attempt(true);
    }
    throw err;
  }
}

const yieldMainThread = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

const MAX_CLIENT_XTREAM_ITEMS = 1000;
const MAX_CLIENT_XTREAM_CATEGORIES = 250;

export interface SyncProgressCallback {
  (pct: number, message: string): void;
}

export interface SyncResult {
  catalog: CatalogData;
  accountInfo: AccountInfo;
}

export async function syncServerCatalog(
  server: ServerProfile,
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  if (server.type === 'showcase') {
    const isFta = server.id === 'valdrion_fta_public';
    onProgress?.(
      35,
      isFta
        ? 'جاري تجهيز باقة البث العام المجاني المفتوح...'
        : 'جاري تهيئة مكتبة فالدريون الإمبراطورية...'
    );
    await new Promise((r) => setTimeout(r, 150));
    onProgress?.(100, 'المكتبة جاهزة للمشاهدة');
    return {
      catalog: isFta ? buildLegalFtaCatalog() : buildShowcaseCatalog(),
      accountInfo: {
        status: isFta ? 'بث عام مجاني قانوني (FTA)' : 'نشط — باقة إمبراطورية',
        expiry: 'مفتوح دائماً',
        connections: '1 / غير محدود',
        serverLabel: server.name,
      },
    };
  }

  if (server.type === 'm3u') {
    onProgress?.(25, 'جاري تحميل قائمة M3U وتحليل القنوات...');
    let rawText = server.m3uContent || '';
    if (!rawText && server.host) {
      const res = await fetch(buildFetchUrl(server.host, server.useProxy));
      if (!res.ok) throw new Error(`تعذّر تحميل قائمة M3U (HTTP ${res.status})`);
      rawText = await res.text();
    }
    onProgress?.(75, 'جاري تصنيف القنوات والأفلام...');
    await yieldMainThread();
    const parsed = parseM3UPlaylist(rawText, server.name);
    if (!parsed.liveStreams.length && !parsed.vodStreams.length) {
      throw new Error('لم يتم العثور على روابط بث صالحة داخل ملف M3U.');
    }
    onProgress?.(100, 'تمت مزامنة قائمة M3U بنجاح');
    return {
      catalog: {
        liveCategories: parsed.categories,
        liveStreams: parsed.liveStreams.slice(0, MAX_CLIENT_XTREAM_ITEMS),
        vodCategories: parsed.vodStreams.length ? parsed.categories : [],
        vodStreams: parsed.vodStreams.slice(0, MAX_CLIENT_XTREAM_ITEMS),
        seriesCategories: [],
        seriesList: [],
      },
      accountInfo: {
        status: 'قائمة M3U نشطة',
        expiry: 'حسب المصدر',
        connections: `${parsed.liveStreams.length + parsed.vodStreams.length} رابط`,
        serverLabel: server.name,
      },
    };
  }

  // Real Xtream Codes API sync — always use compact server projection for zero-freeze on TV & Laptop
  const host = normalizeServerHost(server.host);
  const username = server.username || '';
  const password = server.password || '';
  const u = encodeURIComponent(username);
  const p = encodeURIComponent(password);
  const baseApi = `${host}/player_api.php?username=${u}&password=${p}`;
  const preferProxy = server.useProxy || host.toLowerCase().startsWith('http://');

  onProgress?.(12, 'جاري التحقق من بيانات حساب Xtream Codes...');
  const authData = await fetchJson<{
    user_info?: {
      auth?: number | string;
      status?: string;
      exp_date?: string | number;
      active_cons?: string | number;
      max_connections?: string | number;
    };
  }>(baseApi, preferProxy);

  if (!authData?.user_info || String(authData.user_info.auth) === '0') {
    throw new Error('بيانات الدخول غير صحيحة أو الاشتراك منتهي.');
  }

  const ui = authData.user_info;
  const expDate =
    ui.exp_date && Number(ui.exp_date) > 0
      ? new Date(Number(ui.exp_date) * 1000).toLocaleDateString('ar-EG')
      : 'غير محدود';

  const accountInfo: AccountInfo = {
    status: ui.status || 'Active',
    expiry: expDate,
    connections: `${ui.active_cons || 0} / ${ui.max_connections || '∞'}`,
    serverLabel: server.name,
  };

  onProgress?.(35, 'جاري جلب باقات وقنوات البث المباشر (بوضع خفيف وسريع)...');
  const [liveCats, liveStreamsRaw] = await Promise.all([
    fetchJson<Array<{ category_id: string; category_name: string }>>(
      `${baseApi}&action=get_live_categories`,
      preferProxy,
      MAX_CLIENT_XTREAM_CATEGORIES
    ).catch(() => []),
    fetchJson<
      Array<{
        stream_id: number | string;
        category_id?: string;
        name?: string;
        stream_icon?: string;
      }>
    >(`${baseApi}&action=get_live_streams`, preferProxy, MAX_CLIENT_XTREAM_ITEMS).catch(() => []),
  ]);
  await yieldMainThread();

  onProgress?.(62, 'جاري مزامنة مكتبة الأفلام (VOD)...');
  const [vodCats, vodStreamsRaw] = await Promise.all([
    fetchJson<Array<{ category_id: string; category_name: string }>>(
      `${baseApi}&action=get_vod_categories`,
      preferProxy,
      MAX_CLIENT_XTREAM_CATEGORIES
    ).catch(() => []),
    fetchJson<
      Array<{
        stream_id: number | string;
        category_id?: string;
        name?: string;
        stream_icon?: string;
        rating?: string;
        added?: string;
        container_extension?: string;
      }>
    >(`${baseApi}&action=get_vod_streams`, preferProxy, MAX_CLIENT_XTREAM_ITEMS).catch(() => []),
  ]);
  await yieldMainThread();

  onProgress?.(82, 'جاري جلب مكتبة المسلسلات...');
  const [serCats, serListRaw] = await Promise.all([
    fetchJson<Array<{ category_id: string; category_name: string }>>(
      `${baseApi}&action=get_series_categories`,
      preferProxy,
      MAX_CLIENT_XTREAM_CATEGORIES
    ).catch(() => []),
    fetchJson<
      Array<{
        series_id: number | string;
        category_id?: string;
        name?: string;
        cover?: string;
        rating?: string;
        releaseDate?: string;
        plot?: string;
      }>
    >(`${baseApi}&action=get_series`, preferProxy, MAX_CLIENT_XTREAM_ITEMS).catch(() => []),
  ]);

  onProgress?.(92, 'جاري تجهيز الفهرس الخفيف للتشغيل...');
  await yieldMainThread();

  const liveStreams = (Array.isArray(liveStreamsRaw) ? liveStreamsRaw : [])
    .slice(0, MAX_CLIENT_XTREAM_ITEMS)
    .map((ch) => ({
      id: `live_${ch.stream_id}`,
      streamId: ch.stream_id,
      kind: 'live' as const,
      isLive: true,
      category_id: String(ch.category_id || ''),
      title: ch.name || 'قناة بث مباشر',
      poster: ch.stream_icon || '',
      quality: 'LIVE',
      url: `${host}/live/${username}/${password}/${ch.stream_id}.m3u8`,
      isKidsFriendly: true,
    }));
  await yieldMainThread();

  const vodStreams = (Array.isArray(vodStreamsRaw) ? vodStreamsRaw : [])
    .slice(0, MAX_CLIENT_XTREAM_ITEMS)
    .map((m) => ({
      id: `vod_${m.stream_id}`,
      streamId: m.stream_id,
      kind: 'movie' as const,
      category_id: String(m.category_id || ''),
      title: m.name || 'فيلم',
      poster: m.stream_icon || '',
      rating: m.rating || '',
      year: m.added ? String(new Date(Number(m.added) * 1000).getFullYear()) : '',
      quality: (m.container_extension || 'MP4').toUpperCase(),
      desc: `متوفر بجودة عالية عبر سيرفر ${server.name}`,
      url: `${host}/movie/${username}/${password}/${m.stream_id}.${m.container_extension || 'mp4'}`,
      isKidsFriendly: true,
    }));
  await yieldMainThread();

  const seriesList = (Array.isArray(serListRaw) ? serListRaw : [])
    .slice(0, MAX_CLIENT_XTREAM_ITEMS)
    .map((s) => ({
      id: `ser_${s.series_id}`,
      seriesId: s.series_id,
      kind: 'series' as const,
      category_id: String(s.category_id || ''),
      title: s.name || 'مسلسل',
      poster: s.cover || '',
      rating: s.rating || '',
      year: (s.releaseDate || '').slice(0, 4),
      quality: 'HD',
      desc: s.plot || `مسلسل متوفر عبر سيرفر ${server.name}`,
      isKidsFriendly: true,
    }));

  const catalog: CatalogData = {
    liveCategories: Array.isArray(liveCats) ? liveCats : [],
    liveStreams,
    vodCategories: Array.isArray(vodCats) ? vodCats : [],
    vodStreams,
    seriesCategories: Array.isArray(serCats) ? serCats : [],
    seriesList,
  };

  onProgress?.(100, 'تمت المزامنة بنجاح');
  return { catalog, accountInfo };
}

export async function fetchXtreamSeriesSeasons(
  server: ServerProfile,
  seriesId: string | number,
  itemId: string
): Promise<Record<string, Episode[]>> {
  if (server.type !== 'xtream' || !server.username || !server.password) {
    return {};
  }
  const host = normalizeServerHost(server.host);
  const url = `${host}/player_api.php?username=${encodeURIComponent(
    server.username
  )}&password=${encodeURIComponent(
    server.password
  )}&action=get_series_info&series_id=${encodeURIComponent(String(seriesId))}`;

  const preferProxy = server.useProxy || /^http:\/\//i.test(host);
  type RawXtreamEp = {
    id: string | number;
    episode_num?: number | string;
    season?: number | string;
    title?: string;
    container_extension?: string;
    info?: { duration?: string; plot?: string };
  };

  const info = await fetchJson<{
    episodes?: Record<string, RawXtreamEp[]> | RawXtreamEp[];
  }>(url, preferProxy, undefined, 25000);

  const rawEps = info?.episodes;
  const seasonsMap: Record<string, Episode[]> = {};

  if (Array.isArray(rawEps)) {
    rawEps.forEach((ep, idx) => {
      const sk = String(ep.season || '1');
      if (!seasonsMap[sk]) seasonsMap[sk] = [];
      const epNum = Number(ep.episode_num) || idx + 1;
      seasonsMap[sk].push({
        id: `${itemId}_ep_${ep.id}`,
        epNum,
        title: ep.title || `الحلقة ${epNum}`,
        duration: ep.info?.duration || '',
        synopsis: ep.info?.plot || '',
        url: `${host}/series/${server.username}/${server.password}/${ep.id}.${
          ep.container_extension || 'mp4'
        }`,
      });
    });
  } else if (rawEps && typeof rawEps === 'object') {
    Object.keys(rawEps)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((seasonKey) => {
        const list = Array.isArray(rawEps[seasonKey]) ? rawEps[seasonKey] : [];
        seasonsMap[seasonKey] = list.map((ep, idx) => {
          const epNum = Number(ep.episode_num) || idx + 1;
          return {
            id: `${itemId}_ep_${ep.id}`,
            epNum,
            title: ep.title || `الحلقة ${epNum}`,
            duration: ep.info?.duration || '',
            synopsis: ep.info?.plot || '',
            url: `${host}/series/${server.username}/${server.password}/${ep.id}.${
              ep.container_extension || 'mp4'
            }`,
          };
        });
      });
  }

  return seasonsMap;
}

// Server Health Ping API
export async function pingServersBatch(
  servers: ServerProfile[]
): Promise<Record<string, ServerPingResult>> {
  const res = await fetch('/api/servers/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      servers: servers.map((s) => ({
        id: s.id,
        type: s.type,
        host: s.host,
        username: s.username,
        password: s.password,
      })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    results?: Array<{
      serverId: string;
      ok: boolean;
      latencyMs: number | null;
      statusCode?: number;
      checkedAt: number;
    }>;
  };

  const map: Record<string, ServerPingResult> = {};
  for (const r of data.results || []) {
    const cls = classifyPingMs(r.ok, r.latencyMs);
    map[r.serverId] = {
      serverId: r.serverId,
      ok: r.ok,
      latencyMs: r.latencyMs,
      statusCode: r.statusCode,
      grade: cls.grade,
      label: cls.label,
      checkedAt: r.checkedAt || Date.now(),
    };
  }
  return map;
}

// Client-side deduplication cache for real official artwork lookup
export interface OfficialArtworkResult {
  posterUrl: string | null;
  backdropUrl: string | null;
  source: string | null;
}

const clientArtworkCache = new Map<string, Promise<OfficialArtworkResult>>();

export function fetchOfficialArtwork(
  title: string,
  originalTitle: string | undefined,
  kind: MediaKind
): Promise<OfficialArtworkResult> {
  const cleanTitle = normalizeArtworkQuery(title);
  const cleanOriginal = originalTitle ? normalizeArtworkQuery(originalTitle) : '';
  const key = `${kind}:${(cleanOriginal || cleanTitle).toLowerCase()}`;

  const existing = clientArtworkCache.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<OfficialArtworkResult> => {
    try {
      const params = new URLSearchParams();
      if (cleanTitle) params.set('title', cleanTitle);
      if (cleanOriginal) params.set('originalTitle', cleanOriginal);
      params.set('kind', kind);

      const res = await fetch(`/api/media/artwork?${params.toString()}`);
      if (!res.ok) return { posterUrl: null, backdropUrl: null, source: null };
      const data = (await res.json()) as Partial<OfficialArtworkResult>;
      return {
        posterUrl: data.posterUrl || null,
        backdropUrl: data.backdropUrl || null,
        source: data.source || null,
      };
    } catch {
      return { posterUrl: null, backdropUrl: null, source: null };
    }
  })();

  clientArtworkCache.set(key, promise);
  return promise;
}

export interface AskAiConciergePayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  catalogSummary: Array<{
    id: string;
    title: string;
    originalTitle?: string;
    kind: MediaKind;
    year?: string;
    rating?: string;
    genres?: string[];
    maturity?: string;
    isKidsFriendly?: boolean;
    desc?: string;
  }>;
  context: {
    activeProfile: string;
    familyGuard: boolean;
    activeServerName: string;
  };
}

export async function askAiConcierge(
  payload: AskAiConciergePayload
): Promise<AiConciergeResponse> {
  const res = await fetch('/api/ai/concierge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<AiConciergeResponse> & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || `تعذّر الاتصال بالمساعد الذكي (HTTP ${res.status})`);
  }

  return {
    reply: data.reply || 'إليك أفضل الترشيحات المطابقة من مكتبة فالدريون.',
    matchedIds: Array.isArray(data.matchedIds) ? data.matchedIds : [],
    suggestedTab: data.suggestedTab || '',
    suggestedSearch: data.suggestedSearch || '',
    suggestedProfile: data.suggestedProfile || '',
    watchNightPlan: Array.isArray(data.watchNightPlan) ? data.watchNightPlan : [],
    followUpChips: Array.isArray(data.followUpChips) ? data.followUpChips : [],
  };
}

export interface AskAiStudioStreamPayload {
  mode: Exclude<AiStudioMode, 'cinema' | 'audio'>;
  depth: AiThinkingDepth;
  webSearch?: boolean;
  agentId?: string;
  agentName?: string;
  agentSystemPrompt?: string;
  brainContext?: string;
  message: string;
  url?: string;
  createKind?: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  image?: { mimeType: string; data: string };
  audio?: { mimeType: string; data: string };
  fileText?: { name: string; content: string };
}

export interface AskAiStudioDoneMeta {
  sources: Array<{ title: string; uri: string }>;
  searchQueries: string[];
  websiteInfo?: {
    url: string;
    hostname: string;
    title: string;
    description: string;
  };
  audioTranscript?: string;
  thinkingDurationMs?: number;
}

export async function streamAiStudio(
  payload: AskAiStudioStreamPayload,
  callbacks: {
    onStatus?: (label: string) => void;
    onStep?: (step: { id: string; label: string; detail?: string; status: 'running' | 'done' | 'error' }) => void;
    onThought?: (delta: string) => void;
    onChunk: (delta: string) => void;
    onDone: (meta: AskAiStudioDoneMeta) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/ai/studio/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `تعذّر الاتصال بمحرك الذكاء الاصطناعي (HTTP ${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('المتصفح لا يدعم قراءة البث النصي المباشر.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const ev of events) {
      const line = ev
        .split('\n')
        .find((l) => l.startsWith('data: '));
      if (!line) continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (parsed.type === 'status' && typeof parsed.label === 'string') {
        callbacks.onStatus?.(parsed.label);
      } else if (parsed.type === 'step' && typeof parsed.id === 'string' && typeof parsed.label === 'string') {
        callbacks.onStep?.({
          id: parsed.id,
          label: parsed.label,
          detail: typeof parsed.detail === 'string' ? parsed.detail : undefined,
          status:
            parsed.status === 'done'
              ? 'done'
              : parsed.status === 'error'
              ? 'error'
              : 'running',
        });
      } else if (parsed.type === 'thought' && typeof parsed.text === 'string') {
        callbacks.onThought?.(parsed.text);
      } else if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
        callbacks.onChunk(parsed.text);
      } else if (parsed.type === 'error') {
        throw new Error(
          typeof parsed.error === 'string'
            ? parsed.error
            : 'حدث خطأ أثناء توليد الرد.'
        );
      } else if (parsed.type === 'done') {
        doneFired = true;
        callbacks.onDone({
          sources: Array.isArray(parsed.sources)
            ? (parsed.sources as Array<{ title: string; uri: string }>)
            : [],
          searchQueries: Array.isArray(parsed.searchQueries)
            ? (parsed.searchQueries as string[])
            : [],
          websiteInfo: parsed.websiteInfo as AskAiStudioDoneMeta['websiteInfo'],
          audioTranscript:
            typeof parsed.audioTranscript === 'string'
              ? parsed.audioTranscript
              : undefined,
          thinkingDurationMs:
            typeof parsed.thinkingDurationMs === 'number'
              ? parsed.thinkingDurationMs
              : undefined,
        });
      }
    }
  }

  if (!doneFired) {
    callbacks.onDone({ sources: [], searchQueries: [] });
  }
}

export interface OrchestrateMissionPayload {
  message: string;
  depth: AiThinkingDepth;
  webSearch?: boolean;
  brainContext?: string;
  url?: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  image?: { mimeType: string; data: string };
  audio?: { mimeType: string; data: string };
  fileText?: { name: string; content: string };
  commanderFreedom?: {
    openMode?: boolean;
    maxAgents?: number;
    customDirectives?: string[];
  };
  advisorCouncil?: {
    advisorEnabled?: boolean;
    advisorStyle?: string;
    enabledAssistantIds?: string[];
    customAssistants?: Array<{ id: string; nameAr: string; specialtyAr: string }>;
  };
}

export async function orchestrateAiMission(
  payload: OrchestrateMissionPayload,
  callbacks: {
    onStage?: (stage: 'planning' | 'delegating' | 'synthesizing', label: string) => void;
    onStatus?: (label: string) => void;
    onPlan?: (plan: {
      missionSummary: string;
      steps: Array<{
        stepId: string;
        agentId: string;
        agentName: string;
        englishRole?: string;
        taskTitle: string;
        instruction: string;
        needsWebSearch?: boolean;
        status: 'pending' | 'running' | 'done' | 'error';
      }>;
    }) => void;
    onStepStart?: (stepId: string) => void;
    onStepThought?: (stepId: string, delta: string) => void;
    onStepDone?: (payload: {
      stepId: string;
      status: 'done' | 'error';
      summary: string;
      output: string;
      sources?: Array<{ title: string; uri: string }>;
      durationMs?: number;
    }) => void;
    onThought?: (delta: string) => void;
    onChunk: (delta: string) => void;
    onDone: (meta: AskAiStudioDoneMeta) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/ai/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errData.error || `تعذّر الاتصال بغرفة القيادة الذكية (HTTP ${res.status})`
    );
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('المتصفح لا يدعم البث المباشر لغرفة القيادة.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const ev of events) {
      const line = ev
        .split('\n')
        .find((l) => l.startsWith('data: '));
      if (!line) continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (parsed.type === 'stage' && typeof parsed.stage === 'string') {
        callbacks.onStage?.(
          parsed.stage as 'planning' | 'delegating' | 'synthesizing',
          typeof parsed.label === 'string' ? parsed.label : ''
        );
      } else if (parsed.type === 'status' && typeof parsed.label === 'string') {
        callbacks.onStatus?.(parsed.label);
      } else if (parsed.type === 'plan' && Array.isArray(parsed.steps)) {
        callbacks.onPlan?.({
          missionSummary:
            typeof parsed.missionSummary === 'string' ? parsed.missionSummary : '',
          steps: parsed.steps as Array<{
            stepId: string;
            agentId: string;
            agentName: string;
            englishRole?: string;
            taskTitle: string;
            instruction: string;
            needsWebSearch?: boolean;
            status: 'pending' | 'running' | 'done' | 'error';
          }>,
        });
      } else if (parsed.type === 'step_start' && typeof parsed.stepId === 'string') {
        callbacks.onStepStart?.(parsed.stepId);
      } else if (
        parsed.type === 'step_thought' &&
        typeof parsed.stepId === 'string' &&
        typeof parsed.text === 'string'
      ) {
        callbacks.onStepThought?.(parsed.stepId, parsed.text);
      } else if (parsed.type === 'step_done' && typeof parsed.stepId === 'string') {
        callbacks.onStepDone?.({
          stepId: parsed.stepId,
          status: parsed.status === 'error' ? 'error' : 'done',
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
          output: typeof parsed.output === 'string' ? parsed.output : '',
          sources: Array.isArray(parsed.sources)
            ? (parsed.sources as Array<{ title: string; uri: string }>)
            : [],
          durationMs:
            typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined,
        });
      } else if (parsed.type === 'thought' && typeof parsed.text === 'string') {
        callbacks.onThought?.(parsed.text);
      } else if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
        callbacks.onChunk(parsed.text);
      } else if (parsed.type === 'error') {
        throw new Error(
          typeof parsed.error === 'string'
            ? parsed.error
            : 'حدث خطأ أثناء تنفيذ خطة القائد.'
        );
      } else if (parsed.type === 'done') {
        doneFired = true;
        callbacks.onDone({
          sources: Array.isArray(parsed.sources)
            ? (parsed.sources as Array<{ title: string; uri: string }>)
            : [],
          searchQueries: Array.isArray(parsed.searchQueries)
            ? (parsed.searchQueries as string[])
            : [],
          websiteInfo: parsed.websiteInfo as AskAiStudioDoneMeta['websiteInfo'],
          audioTranscript:
            typeof parsed.audioTranscript === 'string'
              ? parsed.audioTranscript
              : undefined,
          thinkingDurationMs:
            typeof parsed.thinkingDurationMs === 'number'
              ? parsed.thinkingDurationMs
              : undefined,
        });
      }
    }
  }

  if (!doneFired) {
    callbacks.onDone({ sources: [], searchQueries: [] });
  }
}

export async function generateAiAudioBrief(payload: {
  text: string;
  format: 'single' | 'podcast';
  voice?: string;
}): Promise<{
  audioDataUrl: string;
  script: string;
  voiceLabel: string;
}> {
  const res = await fetch('/api/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    audioBase64?: string;
    mimeType?: string;
    script?: string;
    voiceLabel?: string;
    error?: string;
  };
  if (!res.ok || !data.audioBase64) {
    throw new Error(data.error || `تعذّر توليد الملخص الصوتي (HTTP ${res.status})`);
  }
  return {
    audioDataUrl: `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`,
    script: data.script || payload.text,
    voiceLabel: data.voiceLabel || 'صوت فالدريون العصبي',
  };
}

export async function translateSubtitlesWithAI(
  cues: SubtitleCue[]
): Promise<SubtitleCue[]> {
  const res = await fetch('/api/ai/translate-subtitles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cues: cues.slice(0, 120).map((c) => ({ id: c.id, text: c.text })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    translated?: Array<{ id: string; text: string }>;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `فشلت ترجمة ملف الترجمة (HTTP ${res.status})`);
  }
  const map = new Map<string, string>();
  for (const row of data.translated || []) {
    if (row?.id && typeof row.text === 'string') {
      map.set(row.id, row.text);
    }
  }
  return cues.map((c) => ({
    ...c,
    text: map.get(c.id) || c.text,
  }));
}

export interface GenerateGodotGamePayload {
  prompt: string;
  dimension: GodotDimension;
  renderer?: GodotRenderer;
  depth?: AiThinkingDepth;
  includePlayablePreview?: boolean;
  bridgeWsUrl?: string;
  pairCode?: string;
}

export async function generateGodotGameProject(
  payload: GenerateGodotGamePayload,
  signal?: AbortSignal
): Promise<{
  project: GodotProjectBundle;
  guideMarkdown: string;
}> {
  const res = await fetch('/api/ai/godot/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const data = (await res.json().catch(() => ({}))) as {
    project?: Parameters<typeof normalizeGodotProjectPayload>[0];
    guideMarkdown?: string;
    error?: string;
  };

  if (!res.ok || !data.project) {
    throw new Error(
      data.error || `تعذّر توليد مشروع لعبة Godot 4 حالياً (HTTP ${res.status})`
    );
  }

  const project = normalizeGodotProjectPayload(data.project, {
    fallbackDimension: payload.dimension,
    renderer: payload.renderer,
    bridgeWsUrl: payload.bridgeWsUrl,
    pairCode: payload.pairCode,
  });

  const guideMarkdown =
    typeof data.guideMarkdown === 'string' && data.guideMarkdown.trim()
      ? data.guideMarkdown.trim()
      : `## ${project.projectName}\n\n${project.summary}`;

  return { project, guideMarkdown };
}

export async function searchInternetMedia(query: string): Promise<WebMediaAsset[]> {
  const res = await fetch(`/api/connectors/media-search?q=${encodeURIComponent(query)}`);
  const data = (await res.json().catch(() => ({}))) as {
    assets?: WebMediaAsset[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر جلب صور الإنترنت (HTTP ${res.status})`);
  }
  return Array.isArray(data.assets) ? data.assets : [];
}

export async function searchGitHubRepos(query: string): Promise<GitHubRepoAsset[]> {
  const res = await fetch(`/api/connectors/github-search?q=${encodeURIComponent(query)}`);
  const data = (await res.json().catch(() => ({}))) as {
    repos?: GitHubRepoAsset[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر البحث في GitHub (HTTP ${res.status})`);
  }
  return Array.isArray(data.repos) ? data.repos : [];
}

export async function searchKnowledgeHub(
  query: string,
  lang: 'ar' | 'en' = 'ar'
): Promise<{
  wiki: WikiKnowledgeCard[];
  books: FreeBookAsset[];
  papers: ArxivPaperAsset[];
}> {
  const res = await fetch(
    `/api/connectors/knowledge-hub?q=${encodeURIComponent(query)}&lang=${lang}`
  );
  const data = (await res.json().catch(() => ({}))) as {
    wiki?: WikiKnowledgeCard[];
    books?: FreeBookAsset[];
    papers?: ArxivPaperAsset[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر البحث في موسوعة المعرفة (HTTP ${res.status})`);
  }
  return {
    wiki: Array.isArray(data.wiki) ? data.wiki : [],
    books: Array.isArray(data.books) ? data.books : [],
    papers: Array.isArray(data.papers) ? data.papers : [],
  };
}

export async function fetchLiveFreePulse(city = 'Riyadh'): Promise<LiveFreePulseData> {
  const res = await fetch(`/api/connectors/live-pulse?city=${encodeURIComponent(city)}`);
  const data = (await res.json().catch(() => ({}))) as LiveFreePulseData & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر جلب النبض الحي المجاني (HTTP ${res.status})`);
  }
  return {
    weather: data.weather || null,
    crypto: Array.isArray(data.crypto) ? data.crypto : [],
    forexBaseUsd: data.forexBaseUsd || {},
    techNews: Array.isArray(data.techNews) ? data.techNews : [],
    fetchedAt: data.fetchedAt || new Date().toISOString(),
  };
}

export interface WorldCountryInfo {
  name: string;
  officialName: string;
  capital: string;
  region: string;
  population: number;
  flagUrl: string;
  currency: string;
  languages: string;
  timezone: string;
}

export interface DictionaryInfo {
  word: string;
  phonetic: string;
  definitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
}

export async function searchWorldInfo(query: string): Promise<{
  countries: WorldCountryInfo[];
  dictionary: DictionaryInfo | null;
}> {
  const res = await fetch(`/api/connectors/world-info?q=${encodeURIComponent(query)}`);
  const data = (await res.json().catch(() => ({}))) as {
    countries?: WorldCountryInfo[];
    dictionary?: DictionaryInfo | null;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر جلب بيانات الأطلس والقاموس (HTTP ${res.status})`);
  }
  return {
    countries: Array.isArray(data.countries) ? data.countries : [],
    dictionary: data.dictionary || null,
  };
}

export async function generateMotionVideoStoryboard(payload: {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneCount?: number;
  brainContext?: string;
}): Promise<{ storyboard: unknown; aspectRatio: '16:9' | '9:16' | '1:1' }> {
  const res = await fetch('/api/ai/video/storyboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    storyboard?: unknown;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    error?: string;
  };
  if (!res.ok || !data.storyboard) {
    throw new Error(data.error || `تعذّر توليد مشاهد الفيديو حالياً (HTTP ${res.status})`);
  }
  return {
    storyboard: data.storyboard,
    aspectRatio: data.aspectRatio || payload.aspectRatio,
  };
}

export async function generateMotionVideoProject(payload: {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  sceneCount?: number;
  includeInternetPhotos?: boolean;
  brainContext?: string;
}): Promise<MotionVideoProject> {
  const res = await fetch('/api/ai/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    project?: MotionVideoProject;
    error?: string;
  };
  if (!res.ok || !data.project) {
    throw new Error(data.error || `تعذّر توليد مشروع الفيديو حالياً (HTTP ${res.status})`);
  }
  return data.project;
}

export async function planGodotEditorCommands(
  payload: {
    prompt: string;
    dimension: GodotDimension;
    sceneTree?: {
      scenePath?: string;
      nodes?: Array<{ name: string; type: string; path: string; depth: number }>;
    } | null;
    activeProjectFiles?: string[];
    brainContext?: string;
  },
  signal?: AbortSignal
): Promise<import('../utils/godotAgentCommands').GodotAgentActionPlan> {
  const res = await fetch('/api/ai/godot/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    plan?: import('../utils/godotAgentCommands').GodotAgentActionPlan;
    error?: string;
  };
  if (!res.ok || !data.plan) {
    throw new Error(
      data.error || `تعذّر تجهيز خطة التحكم في محرك Godot 4 (HTTP ${res.status})`
    );
  }
  return data.plan;
}


export async function searchWorldConnector(
  type: 'country' | 'npm' | 'dict' | 'shows',
  query: string
): Promise<{
  countries?: CountryAtlasCard[];
  packages?: NpmPackageAsset[];
  definitions?: DictionaryEntryAsset[];
  shows?: TvMazeShowAsset[];
}> {
  const res = await fetch(
    `/api/connectors/world-tools?type=${encodeURIComponent(type)}&q=${encodeURIComponent(query)}`
  );
  const data = (await res.json().catch(() => ({}))) as {
    countries?: CountryAtlasCard[];
    packages?: NpmPackageAsset[];
    definitions?: DictionaryEntryAsset[];
    shows?: TvMazeShowAsset[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر الاتصال بالأداة العالمية (HTTP ${res.status})`);
  }
  return data;
}

export async function generateAiVisualImages(
  payload: {
    prompt: string;
    aspectRatio?: '1:1' | '16:9' | '9:16';
    brainContext?: string;
  },
  signal?: AbortSignal
): Promise<{
  bundle: import('../types/cinema').AiGeneratedImageBundle;
  description: string;
}> {
  const res = await fetch('/api/ai/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    bundle?: import('../types/cinema').AiGeneratedImageBundle;
    description?: string;
    error?: string;
  };
  if (!res.ok || !data.bundle) {
    throw new Error(data.error || `تعذّر توليد الصور والتصميم حالياً (HTTP ${res.status})`);
  }
  return {
    bundle: data.bundle,
    description: data.description || '',
  };
}

export async function runAiCouncilDebate(
  payload: { prompt: string; brainContext?: string },
  signal?: AbortSignal
): Promise<import('../utils/aiPowerTools').AiCouncilDebateResult> {
  const res = await fetch('/api/ai/council', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    debate?: import('../utils/aiPowerTools').AiCouncilDebateResult;
    error?: string;
  };
  if (!res.ok || !data.debate) {
    throw new Error(data.error || `تعذّر عقد مجلس الخبراء حالياً (HTTP ${res.status})`);
  }
  return data.debate;
}

export async function generateAiMindMap(
  payload: { prompt: string; brainContext?: string },
  signal?: AbortSignal
): Promise<import('../utils/aiPowerTools').AiMindMapData> {
  const res = await fetch('/api/ai/mindmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    mindMap?: import('../utils/aiPowerTools').AiMindMapData;
    error?: string;
  };
  if (!res.ok || !data.mindMap) {
    throw new Error(data.error || `تعذّر توليد الخريطة الذهنية حالياً (HTTP ${res.status})`);
  }
  return data.mindMap;
}

export interface WorldArabicBookCard {
  id: string;
  titleAr: string;
  titleOriginal: string;
  authorAr: string;
  genreAr: string;
  synopsisAr: string;
  year?: number;
  coverUrl?: string;
  source: 'Open Library' | 'Project Gutenberg' | 'Google Books' | 'Internet Archive';
  infoUrl: string;
  hasPublicFullText: boolean;
  fullTextUrl?: string;
}

export async function analyzeBookFileForManhwa(
  payload: {
    bookTitle: string;
    fullText: string;
  },
  signal?: AbortSignal
): Promise<import('../utils/manhwaEngine').ManhwaCharacterBible> {
  const res = await fetch('/api/novels/manhwa/analyze-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    bible?: import('../utils/manhwaEngine').ManhwaCharacterBible;
    error?: string;
  };
  if (!res.ok || !data.bible) {
    throw new Error(
      data.error || `تعذّر تحليل شخصيات وعالم الملف حالياً (HTTP ${res.status})`
    );
  }
  return data.bible;
}

export async function generateManhwaEpisode(
  payload: {
    bookTitle: string;
    chapterTitle: string;
    text: string;
    styleId: import('../utils/manhwaEngine').ManhwaArtStyleId;
    customStyleNotes?: string;
    panelCount?: number;
    referenceImage?: { mimeType: string; data: string } | null;
    characterBible?: import('../utils/manhwaEngine').ManhwaCharacterBible | null;
    strictFileMode?: boolean;
  },
  signal?: AbortSignal
): Promise<import('../utils/manhwaEngine').ManhwaEpisode> {
  const res = await fetch('/api/novels/manhwa/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    episode?: import('../utils/manhwaEngine').ManhwaEpisode;
    error?: string;
  };
  if (!res.ok || !data.episode) {
    throw new Error(data.error || `تعذّر رسم حلقة المانهوا حالياً (HTTP ${res.status})`);
  }
  return data.episode;
}

export async function searchWorldNovelsArabic(
  query: string,
  category?: string,
  page = 1
): Promise<{
  books: WorldArabicBookCard[];
  translatedQuery: string;
  totalFound: number;
  page: number;
  hasMore: boolean;
}> {
  const res = await fetch('/api/novels/world-search-ar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, category, page }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    books?: WorldArabicBookCard[];
    translatedQuery?: string;
    totalFound?: number;
    page?: number;
    hasMore?: boolean;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر البحث في مكتبة الروايات العالمية (HTTP ${res.status})`);
  }
  return {
    books: data.books || [],
    translatedQuery: data.translatedQuery || query,
    totalFound: Number(data.totalFound || (data.books?.length ?? 0)),
    page: Number(data.page || page),
    hasMore: Boolean(data.hasMore),
  };
}

export async function translateWorldNovelChapter(payload: {
  titleAr: string;
  titleOriginal?: string;
  authorAr?: string;
  synopsisAr?: string;
  fullTextUrl?: string;
  chapterNumber?: number;
}): Promise<{
  chapterTitle: string;
  content: string;
  translatedFromOriginal: boolean;
}> {
  const res = await fetch('/api/novels/translate-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    chapterTitle?: string;
    content?: string;
    translatedFromOriginal?: boolean;
    error?: string;
  };
  if (!res.ok || !data.content) {
    throw new Error(data.error || `تعذّر تجهيز وترجمة الفصل بالعربية (HTTP ${res.status})`);
  }
  return {
    chapterTitle: data.chapterTitle || 'الفصل الأول',
    content: data.content,
    translatedFromOriginal: Boolean(data.translatedFromOriginal),
  };
}

export async function streamAiApex(
  payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    brainContext?: string;
    webSearch?: boolean;
    attachedFile?: { name: string; content: string } | null;
  },
  callbacks: {
    onStep?: (step: import('../types/cinema').AiExecutionStep) => void;
    onChunk: (delta: string) => void;
    onDone: (meta: {
      sources: Array<{ title: string; uri: string }>;
      searchQueries: string[];
      apexReport?: import('../utils/apexEngine').ApexVerificationReport;
      thinkingDurationMs?: number;
    }) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/ai/apex/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `تعذّر تشغيل محرك APEX الأقصى (HTTP ${res.status})`);
  }
  if (!res.body) {
    throw new Error('لم يصل بث الاستجابة من محرك APEX.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const ev of events) {
      const line = ev.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (parsed.type === 'step' && parsed.step && typeof parsed.step === 'object') {
        callbacks.onStep?.(parsed.step as import('../types/cinema').AiExecutionStep);
      } else if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
        callbacks.onChunk(parsed.text);
      } else if (parsed.type === 'error') {
        throw new Error(
          typeof parsed.error === 'string'
            ? parsed.error
            : 'حدث خطأ أثناء تشغيل محرك APEX.'
        );
      } else if (parsed.type === 'done') {
        doneFired = true;
        callbacks.onDone({
          sources: Array.isArray(parsed.sources)
            ? (parsed.sources as Array<{ title: string; uri: string }>)
            : [],
          searchQueries: Array.isArray(parsed.searchQueries)
            ? (parsed.searchQueries as string[])
            : [],
          apexReport: parsed.apexReport as
            | import('../utils/apexEngine').ApexVerificationReport
            | undefined,
          thinkingDurationMs:
            typeof parsed.thinkingDurationMs === 'number'
              ? parsed.thinkingDurationMs
              : undefined,
        });
      }
    }
  }

  if (!doneFired) {
    callbacks.onDone({ sources: [], searchQueries: [] });
  }
}

export async function refineAiAnswer(payload: {
  originalQuestion?: string;
  previousAnswer: string;
  refineGoal?: string;
  brainContext?: string;
}): Promise<{
  refinedText: string;
  apexReport: import('../utils/apexEngine').ApexVerificationReport;
}> {
  const res = await fetch('/api/ai/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    refinedText?: string;
    apexReport?: import('../utils/apexEngine').ApexVerificationReport;
    error?: string;
  };
  if (!res.ok || !data.refinedText || !data.apexReport) {
    throw new Error(data.error || `تعذّر تدقيق وتحسين الإجابة (HTTP ${res.status})`);
  }
  return { refinedText: data.refinedText, apexReport: data.apexReport };
}

export async function generateAiSlidesDeck(
  payload: {
    topic?: string;
    sourceContent?: string;
    slideCount?: number;
    brainContext?: string;
  },
  signal?: AbortSignal
): Promise<{
  deck: import('../utils/apexEngine').SlidesDeckData;
  html: string;
}> {
  const res = await fetch('/api/ai/slides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    deck?: import('../utils/apexEngine').SlidesDeckData;
    html?: string;
    error?: string;
  };
  if (!res.ok || !data.deck || !data.html) {
    throw new Error(data.error || `تعذّر إنشاء العرض التقديمي (HTTP ${res.status})`);
  }
  return { deck: data.deck, html: data.html };
}

export async function generateAiQuizApp(
  payload: {
    topic?: string;
    sourceContent?: string;
    questionCount?: number;
  },
  signal?: AbortSignal
): Promise<{
  quiz: import('../utils/apexEngine').InteractiveQuizData;
  html: string;
}> {
  const res = await fetch('/api/ai/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    quiz?: import('../utils/apexEngine').InteractiveQuizData;
    html?: string;
    error?: string;
  };
  if (!res.ok || !data.quiz || !data.html) {
    throw new Error(data.error || `تعذّر إنشاء الاختبار التفاعلي (HTTP ${res.status})`);
  }
  return { quiz: data.quiz, html: data.html };
}

export async function buildAiLiveApp(
  payload: {
    prompt: string;
    existingHtml?: string;
    brainContext?: string;
  },
  signal?: AbortSignal
): Promise<{ title: string; summaryAr: string; html: string }> {
  const res = await fetch('/api/ai/app-builder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    title?: string;
    summaryAr?: string;
    html?: string;
    error?: string;
  };
  if (!res.ok || !data.html) {
    throw new Error(data.error || `تعذّر بناء التطبيق التفاعلي (HTTP ${res.status})`);
  }
  return {
    title: data.title || 'تطبيق أثيرمايند التفاعلي',
    summaryAr: data.summaryAr || 'تم بناء التطبيق التفاعلي وتشغيله في المعاينة الحية.',
    html: data.html,
  };
}

// ============================================================================
// Social OAuth 2.0 Connectors & Authorized Account Search (Memory-Only Session)
// ============================================================================

let inMemorySocialBearerToken: string | null = null;

export function getSocialSessionToken(): string | null {
  return inMemorySocialBearerToken;
}

export function setSocialSessionToken(token: string | null): void {
  inMemorySocialBearerToken = token && /^[a-f0-9]{32,128}$/i.test(token) ? token : null;
}

export interface SocialProviderStatusItem {
  provider: import('../utils/securityShield').SocialOAuthProviderId;
  label: string;
  configured: boolean;
  callbackUrl: string;
  connected: boolean;
  account: {
    handle: string;
    displayName: string;
    avatarUrl?: string;
    profileUrl?: string;
    connectedAt: number;
  } | null;
}

export interface SocialHubStatusResponse {
  baseUrl: string;
  shield: {
    tokenEncryption: string;
    oauthPkceState: boolean;
    rateLimiterActive: boolean;
  };
  providers: SocialProviderStatusItem[];
}

export async function fetchSocialHubStatus(): Promise<SocialHubStatusResponse> {
  const headers: Record<string, string> = {};
  if (inMemorySocialBearerToken) {
    headers.Authorization = `Bearer ${inMemorySocialBearerToken}`;
  }
  const res = await fetch('/api/social/status', { headers });
  if (!res.ok) {
    throw new Error(`تعذّر قراءة حالة ربط منصات التواصل (HTTP ${res.status})`);
  }
  return (await res.json()) as SocialHubStatusResponse;
}

export async function requestSocialOAuthUrl(
  provider: import('../utils/securityShield').SocialOAuthProviderId
): Promise<{
  ok: boolean;
  url?: string;
  callbackUrl?: string;
  requiredEnv?: string[];
  error?: string;
}> {
  const headers: Record<string, string> = {};
  if (inMemorySocialBearerToken) {
    headers.Authorization = `Bearer ${inMemorySocialBearerToken}`;
  }
  const res = await fetch(`/api/social/oauth/${encodeURIComponent(provider)}/url`, {
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    callbackUrl?: string;
    requiredEnv?: string[];
    error?: string;
  };
  if (!res.ok || !data.url) {
    return {
      ok: false,
      callbackUrl: data.callbackUrl,
      requiredEnv: data.requiredEnv,
      error: data.error || 'المنصة تحتاج إعداد مفاتيح OAuth في الإعدادات أولاً.',
    };
  }
  return { ok: true, url: data.url, callbackUrl: data.callbackUrl };
}

export async function disconnectSocialProvider(
  provider: import('../utils/securityShield').SocialOAuthProviderId | 'all'
): Promise<void> {
  if (!inMemorySocialBearerToken) return;
  await fetch('/api/social/disconnect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${inMemorySocialBearerToken}`,
    },
    body: JSON.stringify({ provider }),
  }).catch(() => {});
  if (provider === 'all') {
    inMemorySocialBearerToken = null;
  }
}

export interface ConnectedSocialSearchHit {
  provider: string;
  providerLabel: string;
  title: string;
  snippet: string;
  url: string;
}

export async function searchConnectedSocialAccounts(
  query: string,
  consent: boolean
): Promise<{ hits: ConnectedSocialSearchHit[]; searchedProviders: string[] }> {
  if (!inMemorySocialBearerToken || !consent) {
    return { hits: [], searchedProviders: [] };
  }
  const res = await fetch('/api/social/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${inMemorySocialBearerToken}`,
    },
    body: JSON.stringify({ query, consent: true }),
  });
  if (!res.ok) return { hits: [], searchedProviders: [] };
  const data = (await res.json().catch(() => ({}))) as {
    hits?: ConnectedSocialSearchHit[];
    searchedProviders?: string[];
  };
  return {
    hits: Array.isArray(data.hits) ? data.hits : [],
    searchedProviders: Array.isArray(data.searchedProviders) ? data.searchedProviders : [],
  };
}

export interface ExtractedImageServer {
  name?: string;
  host?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
  expiryHint?: string;
}

export async function extractServersFromImage(
  mimeType: string,
  dataBase64: string
): Promise<{ servers: ExtractedImageServer[]; rawText: string }> {
  const res = await fetch('/api/xtream/extract-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType, data: dataBase64 }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    servers?: ExtractedImageServer[];
    rawText?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر استخراج بيانات السيرفر من الصورة (HTTP ${res.status})`);
  }
  return {
    servers: Array.isArray(data.servers) ? data.servers : [],
    rawText: typeof data.rawText === 'string' ? data.rawText : '',
  };
}

export interface WebDownloadedNovel {
  id: string;
  title: string;
  author: string;
  country?: string;
  genre?: string;
  synopsis: string;
  sourceUrl?: string;
  chapters: Array<{ id: string; number: number; title: string; content: string; createdAt: number }>;
}

export async function searchAndDownloadWebNovel(
  query: string
): Promise<{ novels: WebDownloadedNovel[]; source: string }> {
  const res = await fetch('/api/web-media/novels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    novels?: WebDownloadedNovel[];
    source?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر تحميل الرواية من الويب (HTTP ${res.status})`);
  }
  return {
    novels: Array.isArray(data.novels) ? data.novels : [],
    source: data.source || 'Open Web Library',
  };
}

export interface WebDownloadedCinemaItem {
  id: string;
  title: string;
  year?: string;
  desc?: string;
  poster?: string;
  url: string;
  quality?: string;
  kind?: 'movie' | 'series';
}

export async function searchAndDownloadWebCinema(
  query: string
): Promise<{ items: WebDownloadedCinemaItem[]; source: string }> {
  const res = await fetch('/api/web-media/cinema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    items?: WebDownloadedCinemaItem[];
    source?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `تعذّر جلب الأعمال السينمائية من الويب (HTTP ${res.status})`);
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    source: data.source || 'Internet Archive',
  };
}

export interface WhatsAppCloudStatus {
  configured: boolean;
  hasPhoneNumberId: boolean;
  hasAccessToken: boolean;
  webhookPath: string;
  receivedCount: number;
  verifyTokenHint?: string;
}

export async function fetchWhatsAppCloudStatus(): Promise<WhatsAppCloudStatus> {
  const res = await fetch('/api/whatsapp/status');
  const data = (await res.json().catch(() => ({}))) as Partial<WhatsAppCloudStatus>;
  return {
    configured: Boolean(data.configured),
    hasPhoneNumberId: Boolean(data.hasPhoneNumberId),
    hasAccessToken: Boolean(data.hasAccessToken),
    webhookPath: data.webhookPath || '/api/whatsapp/webhook',
    receivedCount: Number(data.receivedCount) || 0,
    verifyTokenHint: data.verifyTokenHint,
  };
}









