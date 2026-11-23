// Pure streaming compact extractor for huge Xtream Codes JSON payloads
// Extracts up to `limit` JSON objects incrementally from chunks so the server can
// abort massive 50MB-100MB upstream downloads immediately after the first ~1000 items.

const COMPACT_FIELDS = new Set([
  'stream_id',
  'series_id',
  'category_id',
  'category_name',
  'name',
  'stream_icon',
  'cover',
  'rating',
  'added',
  'releaseDate',
  'container_extension',
  'plot',
]);

export function projectCompactXtreamRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (!COMPACT_FIELDS.has(key)) continue;
    const val = row[key];
    if (val === undefined || val === null) continue;
    if (key === 'plot') {
      if (typeof val === 'string' && val.trim()) {
        out.plot = val.trim().slice(0, 160);
      }
    } else if (key === 'name' || key === 'category_name') {
      out[key] = typeof val === 'string' ? val.slice(0, 140) : val;
    } else if (key === 'stream_icon' || key === 'cover') {
      out[key] = typeof val === 'string' ? val.slice(0, 500) : val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

export interface StreamingCompactParser {
  push: (chunk: string) => boolean; // returns true when `limit` reached (caller should abort upstream!)
  getItems: () => Record<string, unknown>[];
  isFull: () => boolean;
}

/**
 * Incrementally extracts top-level `{ ... }` JSON objects from either a JSON array
 * `[ {...}, {...} ]` or a keyed object `{ "12": {...}, "13": {...} }` — resilient to
 * UTF-8 BOM, leading whitespace/warnings, and truncated streams.
 */
export function createStreamingCompactXtreamParser(limit: number): StreamingCompactParser {
  const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit || 1000)));
  const items: Record<string, unknown>[] = [];

  let containerType: 'unknown' | 'array' | 'object' = 'unknown';
  let braceDepth = 0; // depth inside container (for array: object starts at depth 1; for keyed object: inner item starts at depth 2)
  let inString = false;
  let escapeNext = false;
  let capturing = false;
  let currentBuf = '';
  const MAX_SINGLE_OBJECT_CHARS = 32_000;

  const targetStartDepth = () => (containerType === 'object' ? 2 : 1);

  const push = (chunk: string): boolean => {
    if (items.length >= safeLimit) return true;
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];

      if (containerType === 'unknown') {
        if (ch === '[') {
          containerType = 'array';
          continue;
        }
        if (ch === '{') {
          containerType = 'object';
          braceDepth = 1;
          continue;
        }
        continue;
      }

      if (capturing) {
        if (currentBuf.length < MAX_SINGLE_OBJECT_CHARS) {
          currentBuf += ch;
        }
      }

      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (ch === '\\') {
          escapeNext = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        braceDepth += 1;
        if (!capturing && braceDepth === targetStartDepth()) {
          capturing = true;
          currentBuf = '{';
        }
      } else if (ch === '}') {
        if (capturing && braceDepth === targetStartDepth()) {
          capturing = false;
          if (currentBuf.length > 1 && currentBuf.length < MAX_SINGLE_OBJECT_CHARS) {
            try {
              const parsed = JSON.parse(currentBuf) as unknown;
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const projected = projectCompactXtreamRow(parsed as Record<string, unknown>);
                if (Object.keys(projected).length > 0) {
                  items.push(projected);
                  if (items.length >= safeLimit) {
                    currentBuf = '';
                    braceDepth = Math.max(0, braceDepth - 1);
                    return true;
                  }
                }
              }
            } catch {
              // Skip malformed single object and continue cleanly
            }
          }
          currentBuf = '';
        }
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
    return items.length >= safeLimit;
  };

  return {
    push,
    getItems: () => items,
    isFull: () => items.length >= safeLimit,
  };
}
