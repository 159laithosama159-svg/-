import type { MediaItem, ServerProfile } from '../types/cinema';

export interface CrossServerMatch {
  serverId: string;
  serverName: string;
  serverType: ServerProfile['type'];
  item: MediaItem;
  score: number;
  qualityTag: string;
}

const IPTV_PREFIX_REGEX =
  /^(?:\s*(?:\[[^\]]+\]|\([^)]+\)|4k(?:-d\+|-nf|-hbo|-amzn|-atvp)?|uhd|fhd|hd|sd|ar|en|us|uk|fr|tr|de|es|vip|top|new|multi|sub|dub|nf|d\+|hbo|amzn|osn|shahid|netflix|disney\+?)\s*[-:|/•]+\s*)+/gi;

const IPTV_TRAILING_NOISE_REGEX =
  /\s*(?:\((?:19|20)\d{2}\)|\[(?:19|20)\d{2}\]|\((?:us|uk|ar|en|fr|tr|multi|sub|dub|4k|hd|fhd)\)|\b(?:s\d{1,2}e\d{1,2}|season\s*\d+|4k|uhd|fhd|1080p|720p|2160p|hevc|x265|x264|web-dl|bluray|hdtv)\b)\s*/gi;

/**
 * Strips common Xtream/IPTV prefixes & tags (e.g. "4K-D+ - X-Men '97 (2024) (US) — S01E01")
 * so cross-server matching accurately finds the same series/movie on other servers.
 */
export function cleanMediaSearchTitle(raw: string): string {
  if (!raw) return '';
  let text = String(raw).trim();
  // If episode title appended with em-dash, keep the main series title
  if (text.includes(' — ')) {
    text = text.split(' — ')[0].trim();
  }
  text = text.replace(IPTV_PREFIX_REGEX, '');
  text = text.replace(IPTV_TRAILING_NOISE_REGEX, ' ');
  // Normalize Arabic alef/taa/yaa & strip punctuation
  text = text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/['"`’‘.,:;!?()[\]{}_/\\|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text;
}

/**
 * Scores how well a candidate media title matches a search query (0 to 100).
 * Works cleanly for both Arabic and English titles, including Xtream-prefixed names.
 */
export function scoreTitleMatch(rawQuery: string, candidateTitle: string): number {
  const q = cleanMediaSearchTitle(rawQuery);
  const c = cleanMediaSearchTitle(candidateTitle);
  if (!q || !c) return 0;

  if (c === q) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 90;
  if (c.includes(q)) return 82;
  if (q.length >= 4 && q.includes(c) && c.length >= 4) return 76;

  const qTokens = q.split(' ').filter((w) => w.length >= 2);
  const cTokens = new Set(c.split(' ').filter((w) => w.length >= 2));
  if (qTokens.length === 0 || cTokens.size === 0) return 0;

  let hits = 0;
  for (const qt of qTokens) {
    if (cTokens.has(qt)) {
      hits += 1;
    } else {
      for (const ct of cTokens) {
        if (ct.startsWith(qt) || (qt.length >= 4 && ct.includes(qt))) {
          hits += 0.75;
          break;
        }
      }
    }
  }

  const ratio = hits / qTokens.length;
  if (ratio >= 0.85) return Math.round(68 + ratio * 15);
  if (ratio >= 0.6 && qTokens.length >= 2) return Math.round(50 + ratio * 20);
  if (qTokens.length === 1 && hits >= 0.75) return 62;
  return 0;
}

/**
 * Extracts a crisp display quality badge from an IPTV title or quality field.
 */
export function detectQualityBadge(item: Pick<MediaItem, 'title' | 'quality'>): string {
  const combined = `${item.quality || ''} ${item.title || ''}`.toUpperCase();
  if (/\b4K\b|2160P|UHD/.test(combined)) return '4K UHD';
  if (/1080P|\bFHD\b|BLURAY/.test(combined)) return '1080p FHD';
  if (/720P|\bHD\b/.test(combined)) return 'HD';
  return item.quality || 'HD';
}

/**
 * Deduplicates and ranks cross-server matches, prioritizing highest title score
 * and distinct servers so users immediately see every server carrying the title.
 */
export function rankCrossServerMatches(
  matches: CrossServerMatch[],
  limit = 16
): CrossServerMatch[] {
  const seen = new Set<string>();
  const sorted = [...matches].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.serverName.localeCompare(b.serverName);
  });

  const out: CrossServerMatch[] = [];
  for (const m of sorted) {
    const key = `${m.serverId}::${m.item.kind}::${cleanMediaSearchTitle(m.item.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Builds an automatic Arabic announcement message when matches are found across servers.
 */
export function formatCrossServerAnnouncement(
  queryTitle: string,
  matches: CrossServerMatch[]
): string {
  if (matches.length === 0) return '';
  const uniqueServers = Array.from(new Set(matches.map((m) => m.serverName)));
  const cleanTitle = queryTitle.trim();
  if (uniqueServers.length === 1) {
    return `تم العثور تلقائياً على «${cleanTitle}» في سيرفر: ${uniqueServers[0]} (${matches.length} ${
      matches.length === 1 ? 'مصدر' : 'مصادر'
    })`;
  }
  return `تم العثور تلقائياً على «${cleanTitle}» في ${uniqueServers.length} سيرفرات: ${uniqueServers
    .slice(0, 3)
    .join(' · ')}`;
}
