import type {
  Category,
  MediaFilterConfig,
  MediaItem,
  SceneCue,
  SortOption,
} from '../types/cinema';

const ADULT_REGEX =
  /(\+18|18\+|adult|for\s*adults|xxx|porn|erotic|nsfw|sex|للكبار\s*فقط|إباحي)/i;

export function isBlockedByFamilyGuard(
  text: string | undefined | null,
  guardEnabled: boolean
): boolean {
  if (!guardEnabled) return false;
  return ADULT_REGEX.test(String(text ?? ''));
}

export function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function calculateProgressPercent(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
}

export function normalizeServerHost(host: string): string {
  return String(host || '').trim().replace(/\/+$/, '');
}

export interface XtreamValidationResult {
  valid: boolean;
  error?: string;
}

export function validateXtreamForm(input: {
  name: string;
  host: string;
  username: string;
  password: string;
}): XtreamValidationResult {
  if (!input.name.trim()) {
    return { valid: false, error: 'يرجى إدخال اسم للسيرفر.' };
  }
  const host = normalizeServerHost(input.host);
  if (!host || !/^https?:\/\/.+/i.test(host)) {
    return {
      valid: false,
      error: 'يرجى إدخال رابط سيرفر صالح يبدأ بـ http:// أو https://',
    };
  }
  if (!input.username.trim() || !input.password.trim()) {
    return { valid: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
  }
  return { valid: true };
}

export function filterSafeCategories(
  categories: Category[],
  familyGuard: boolean
): Category[] {
  return categories.filter((c) => !isBlockedByFamilyGuard(c.category_name, familyGuard));
}

export interface FilterCatalogOptions {
  familyGuard: boolean;
  kidsOnly?: boolean;
  search?: string;
  categoryId?: string;
  sort?: SortOption;
}

export function filterAndSortItems(
  items: MediaItem[],
  categories: Category[],
  options: FilterCatalogOptions
): MediaItem[] {
  const blockedCatIds = new Set(
    categories
      .filter((c) => isBlockedByFamilyGuard(c.category_name, options.familyGuard))
      .map((c) => String(c.category_id))
  );

  const normalizedQuery = (options.search ?? '').trim().toLowerCase();
  const selectedCat = options.categoryId ?? 'all';

  const filtered = items.filter((item) => {
    if (
      options.familyGuard &&
      (blockedCatIds.has(String(item.category_id)) ||
        isBlockedByFamilyGuard(item.title, true) ||
        isBlockedByFamilyGuard(item.desc, true))
    ) {
      return false;
    }

    if (options.kidsOnly && item.isKidsFriendly === false) {
      return false;
    }

    if (selectedCat !== 'all' && String(item.category_id) !== String(selectedCat)) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = [
        item.title,
        item.originalTitle,
        item.desc,
        ...(item.genres ?? []),
        ...(item.cast ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered];
  const sort = options.sort ?? 'featured';

  if (sort === 'rating') {
    sorted.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
  } else if (sort === 'newest') {
    sorted.sort((a, b) => parseInt(b.year || '0', 10) - parseInt(a.year || '0', 10));
  } else if (sort === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  }

  return sorted;
}

export function createDefaultFilterConfig(): MediaFilterConfig {
  return {
    blurPx: 28,
    style: 'blur',
    hideBorders: false,
    cues: [],
    lenses: [],
  };
}

export interface SceneEvaluationResult {
  skipToTime: number | null;
  skippedCueId: string | null;
  veilMode: 'blur' | 'black' | null;
  veilLabel: string;
  shouldMute: boolean;
  lensOpacity: number;
  activeCue: SceneCue | null;
}

export function evaluateSceneFilterState(
  currentTime: number,
  config: MediaFilterConfig,
  panicActive: boolean,
  userMuted: boolean,
  lastSkippedCueId: string | null
): SceneEvaluationResult {
  const matchingCue =
    config.cues.find((c) => currentTime >= c.start && currentTime < c.end) ?? null;

  if (matchingCue && matchingCue.action === 'skip' && lastSkippedCueId !== matchingCue.id) {
    return {
      skipToTime: matchingCue.end + 0.25,
      skippedCueId: matchingCue.id,
      veilMode: null,
      veilLabel: '',
      shouldMute: userMuted,
      lensOpacity: 1,
      activeCue: matchingCue,
    };
  }

  let veilMode: 'blur' | 'black' | null = null;
  let veilLabel = '';
  let shouldMute = userMuted;

  if (panicActive) {
    veilMode = config.style;
    shouldMute = true;
    veilLabel =
      veilMode === 'black'
        ? 'حجب فوري مفعّل — تسويد وكتم الصوت'
        : 'حجب فوري مفعّل — تغبيش وكتم الصوت';
  } else if (matchingCue && matchingCue.action === 'blur_mute') {
    veilMode = 'blur';
    shouldMute = true;
    veilLabel = 'تم تغبيش المشهد وكتم الصوت تلقائياً';
  } else if (matchingCue && matchingCue.action === 'black_mute') {
    veilMode = 'black';
    shouldMute = true;
    veilLabel = 'تم تسويد المشهد وكتم الصوت تلقائياً';
  }

  const hasLensOnlyCues = config.cues.some((c) => c.action === 'lenses_only');
  let lensOpacity = 1;
  if (hasLensOnlyCues) {
    const inLensCue = Boolean(matchingCue && matchingCue.action === 'lenses_only');
    lensOpacity = inLensCue ? 1 : 0.14;
  }

  return {
    skipToTime: null,
    skippedCueId: null,
    veilMode,
    veilLabel,
    shouldMute,
    lensOpacity,
    activeCue: matchingCue,
  };
}

export function parseFilterConfigJson(raw: string): MediaFilterConfig | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const blurPx =
      typeof parsed.blurPx === 'number'
        ? Math.max(10, Math.min(60, parsed.blurPx))
        : 28;
    const style = parsed.style === 'black' ? 'black' : 'blur';
    const hideBorders = Boolean(parsed.hideBorders);
    const cues: SceneCue[] = Array.isArray(parsed.cues)
      ? parsed.cues
          .filter(
            (c: unknown): c is SceneCue =>
              Boolean(c) &&
              typeof (c as SceneCue).start === 'number' &&
              typeof (c as SceneCue).end === 'number' &&
              (c as SceneCue).end > (c as SceneCue).start
          )
          .map((c: SceneCue, idx: number) => ({
            id: c.id || `imp_c_${idx}_${Date.now()}`,
            start: c.start,
            end: c.end,
            action: ['skip', 'blur_mute', 'black_mute', 'lenses_only'].includes(c.action)
              ? c.action
              : 'blur_mute',
          }))
      : [];

    const lenses = Array.isArray(parsed.lenses)
      ? parsed.lenses
          .filter(
            (l: unknown) =>
              Boolean(l) &&
              typeof (l as { x?: unknown }).x === 'number' &&
              typeof (l as { y?: unknown }).y === 'number'
          )
          .map(
            (
              l: { id?: string; mode?: string; x: number; y: number; w?: number; h?: number },
              idx: number
            ) => ({
              id: l.id || `imp_l_${idx}_${Date.now()}`,
              mode: (l.mode === 'black' ? 'black' : 'blur') as 'blur' | 'black',
              x: Math.max(0, Math.min(90, l.x)),
              y: Math.max(0, Math.min(90, l.y)),
              w: Math.max(10, Math.min(100, l.w ?? 32)),
              h: Math.max(10, Math.min(100, l.h ?? 36)),
            })
          )
      : [];

    return { blurPx, style, hideBorders, cues, lenses };
  } catch {
    return null;
  }
}

export interface ParsedM3UResult {
  categories: Category[];
  liveStreams: MediaItem[];
  vodStreams: MediaItem[];
}

export function parseM3UPlaylist(m3uText: string, serverName: string): ParsedM3UResult {
  const lines = String(m3uText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const catMap = new Map<string, Category>();
  const liveStreams: MediaItem[] = [];
  const vodStreams: MediaItem[] = [];

  let pendingMeta: {
    title: string;
    logo: string;
    group: string;
  } | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const commaIdx = line.lastIndexOf(',');
      const title = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : 'بث مباشر';
      pendingMeta = {
        title: title || 'بث مباشر',
        logo: logoMatch?.[1] ?? '',
        group: groupMatch?.[1]?.trim() || 'قنوات عامة',
      };
    } else if (!line.startsWith('#') && /^https?:\/\//i.test(line)) {
      const meta = pendingMeta ?? {
        title: `قناة ${liveStreams.length + vodStreams.length + 1}`,
        logo: '',
        group: 'قنوات عامة',
      };
      pendingMeta = null;

      const catId = `m3u_cat_${meta.group.toLowerCase().replace(/\s+/g, '_')}`;
      if (!catMap.has(catId)) {
        catMap.set(catId, { category_id: catId, category_name: meta.group });
      }

      const isVod = /\.(mp4|mkv|avi|mov)(\?.*)?$/i.test(line);
      if (isVod) {
        vodStreams.push({
          id: `m3u_vod_${vodStreams.length + 1}`,
          kind: 'movie',
          isLive: false,
          category_id: catId,
          title: meta.title,
          poster: meta.logo,
          quality: 'HD',
          desc: `متاح عبر قائمة ${serverName}`,
          url: line,
          isKidsFriendly: true,
        });
      } else {
        liveStreams.push({
          id: `m3u_live_${liveStreams.length + 1}`,
          kind: 'live',
          isLive: true,
          category_id: catId,
          title: meta.title,
          poster: meta.logo,
          quality: 'LIVE',
          desc: `بث مباشر عبر ${serverName}`,
          url: line,
          isKidsFriendly: true,
        });
      }
    }
  }

  return {
    categories: Array.from(catMap.values()),
    liveStreams,
    vodStreams,
  };
}

export function normalizeArtworkQuery(title: string): string {
  return String(title || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:19|20)\d{2}\)/g, ' ')
    .replace(/\b(4K|UHD|HDR|FHD|HD|1080p|720p|IMAX|BluRay|WEB-DL|HLS|LIVE|AR|EN)\b/gi, ' ')
    .replace(/[|—–-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pickRandomTonightItem(
  items: MediaItem[],
  excludeId?: string | null,
  randomFn: () => number = Math.random
): MediaItem | null {
  if (!items.length) return null;
  const candidates =
    items.length > 1 && excludeId
      ? items.filter((it) => it.id !== excludeId)
      : items;
  const idx = Math.floor(Math.max(0, Math.min(0.999999, randomFn())) * candidates.length);
  return candidates[idx] ?? candidates[0] ?? null;
}

export function buildCatalogSummaryForAI(items: MediaItem[], limit = 80) {
  return items.slice(0, limit).map((it) => ({
    id: it.id,
    title: it.title,
    originalTitle: it.originalTitle || '',
    kind: it.kind,
    year: it.year || '',
    rating: it.rating || '',
    genres: it.genres || [],
    maturity: it.maturity || '',
    isKidsFriendly: it.isKidsFriendly !== false,
    desc: (it.desc || it.epg?.title || '').slice(0, 140),
  }));
}

export function buildVideoFilterCss(calibration: {
  brightness: number;
  contrast: number;
  saturation: number;
}): string {
  const b = Math.max(50, Math.min(150, calibration.brightness));
  const c = Math.max(50, Math.min(150, calibration.contrast));
  const s = Math.max(0, Math.min(180, calibration.saturation));
  if (b === 100 && c === 100 && s === 100) return 'none';
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
}

export interface ParsedXtreamCredential {
  name: string;
  host: string;
  username: string;
  password: string;
  expiryHint?: string;
  recommendedProxy: boolean;
}

function cleanLabelCandidate(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[#*_`~]+/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 42);
}

function deriveLabelFromContext(lines: string[], anchorIndex: number, fallbackHost: string): {
  name: string;
  expiryHint?: string;
} {
  let name = '';
  let expiryHint: string | undefined;

  for (let i = Math.max(0, anchorIndex - 5); i <= Math.min(lines.length - 1, anchorIndex + 2); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch && !expiryHint) {
      expiryHint = dateMatch[1];
    }
    if (i < anchorIndex && !name) {
      const hashTag = line.match(/#([\p{L}\p{N}_-]{2,36})/u);
      if (hashTag?.[1]) {
        name = cleanLabelCandidate(hashTag[1]);
      } else if (
        !/^(https?:|user|pass|تاريخ|انتهاء|exp)/i.test(line) &&
        !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) &&
        line.length >= 2 &&
        line.length <= 45
      ) {
        const candidate = cleanLabelCandidate(line);
        if (candidate.length >= 2) name = candidate;
      }
    }
  }

  if (!name) {
    try {
      const u = new URL(fallbackHost);
      name = `سيرفر ${u.hostname}`;
    } catch {
      name = 'سيرفر Xtream';
    }
  }

  return { name, expiryHint };
}

/**
 * Pure smart parser that extracts one or many Xtream credentials from pasted subscription text:
 * - Full M3U/Xtream links: http://host:port/get.php?username=USER&password=PASS...
 * - Structured text blocks: http://host:port + username=... + password=...
 * Deduplicates identical (host, username, password) entries cleanly.
 */
export function parseSmartXtreamCredentials(rawText: string): ParsedXtreamCredential[] {
  const text = String(rawText || '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const results: ParsedXtreamCredential[] = [];
  const seen = new Set<string>();

  const pushUnique = (entry: ParsedXtreamCredential) => {
    const cleanHost = normalizeServerHost(entry.host);
    const cleanUser = entry.username.trim();
    const cleanPass = entry.password.trim();
    if (!cleanHost || !cleanUser || !cleanPass) return;
    const key = `${cleanHost.toLowerCase()}|${cleanUser}|${cleanPass}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      ...entry,
      host: cleanHost,
      username: cleanUser,
      password: cleanPass,
      recommendedProxy: cleanHost.toLowerCase().startsWith('http://'),
    });
  };

  // Pass 1: Extract directly from get.php / player_api.php query URLs
  lines.forEach((line, idx) => {
    const urlMatches = line.match(/https?:\/\/[^\s"'<>]+/gi);
    if (!urlMatches) return;
    for (const rawUrl of urlMatches) {
      try {
        const parsed = new URL(rawUrl);
        const username =
          parsed.searchParams.get('username') || parsed.searchParams.get('user') || '';
        const password =
          parsed.searchParams.get('password') || parsed.searchParams.get('pass') || '';
        if (username && password) {
          const origin = `${parsed.protocol}//${parsed.host}`;
          const { name, expiryHint } = deriveLabelFromContext(lines, idx, origin);
          pushUnique({
            name,
            host: origin,
            username,
            password,
            expiryHint,
            recommendedProxy: parsed.protocol === 'http:',
          });
        }
      } catch {
        // skip invalid URLs
      }
    }
  });

  // Pass 2: Extract from multi-line host + username + password blocks
  let pendingHost = '';
  let pendingHostLine = 0;
  let pendingUser = '';
  let pendingPass = '';

  const flushPending = () => {
    if (pendingHost && pendingUser && pendingPass) {
      const { name, expiryHint } = deriveLabelFromContext(lines, pendingHostLine, pendingHost);
      pushUnique({
        name,
        host: pendingHost,
        username: pendingUser,
        password: pendingPass,
        expiryHint,
        recommendedProxy: pendingHost.toLowerCase().startsWith('http://'),
      });
      pendingUser = '';
      pendingPass = '';
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const bareHost = trimmed.match(/^(?:host|url|server|رابط|السيرفر)?\s*[:=-]?\s*(https?:\/\/[^\s"'<>]+)/i);
    if (bareHost?.[1]) {
      try {
        const u = new URL(bareHost[1]);
        const nextOrigin = `${u.protocol}//${u.host}`;
        if (!u.searchParams.get('username')) {
          flushPending();
          pendingHost = nextOrigin;
          pendingHostLine = idx;
          pendingUser = '';
          pendingPass = '';
        }
      } catch {
        // ignore
      }
    }

    const userMatch = trimmed.match(/(?:username|user|المستخدم|اسم\s*المستخدم)\s*[:=]\s*([^\s&]+)/i);
    if (userMatch?.[1]) {
      pendingUser = userMatch[1].trim();
    }

    const passMatch = trimmed.match(/(?:password|pass|كلمة\s*المرور|الباسورد|السر)\s*[:=]\s*([^\s&]+)/i);
    if (passMatch?.[1]) {
      pendingPass = passMatch[1].trim();
    }

    if (pendingHost && pendingUser && pendingPass) {
      flushPending();
    }
  });

  flushPending();
  return results;
}


