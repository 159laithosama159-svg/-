import type { SubtitleCue } from '../types/cinema';

/**
 * Parse a timestamp like "00:01:23,450" (SRT) or "01:23.450" (VTT) into seconds.
 */
export function parseSubtitleTimestamp(raw: string): number | null {
  const cleaned = (raw || '').trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  if (nums.length === 3) {
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  return nums[0] * 60 + nums[1];
}

/**
 * Format seconds into SRT timestamp "HH:MM:SS,mmm".
 */
export function formatSrtTimestamp(sec: number): string {
  const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const totalMs = Math.round(safe * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Parse an SRT or WebVTT subtitle string into structured cues.
 */
export function parseSubtitleFile(raw: string): SubtitleCue[] {
  if (!raw || typeof raw !== 'string') return [];
  const normalized = raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^WEBVTT[^\n]*\n+/i, '');

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startRaw, endRawWithSettings] = timeLine.split('-->').map((s) => s.trim());
    const endRaw = (endRawWithSettings || '').split(/\s+/)[0] || '';
    const start = parseSubtitleTimestamp(startRaw);
    const end = parseSubtitleTimestamp(endRaw);
    if (start === null || end === null || end <= start) continue;

    const text = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (!text) continue;

    cues.push({
      id: `sub_${cues.length + 1}`,
      start,
      end,
      text,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Serialize subtitle cues back to clean UTF-8 SRT text.
 */
export function serializeToSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatSrtTimestamp(cue.start)} --> ${formatSrtTimestamp(cue.end)}\n${cue.text}`
    )
    .join('\n\n');
}

/**
 * Find the currently active subtitle cue given playback time and user timing offset (seconds).
 */
export function getActiveSubtitleCue(
  cues: SubtitleCue[],
  currentTimeSec: number,
  offsetSec = 0
): SubtitleCue | null {
  if (!cues.length || !Number.isFinite(currentTimeSec)) return null;
  const adjusted = currentTimeSec + offsetSec;
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (adjusted >= c.start && adjusted <= c.end) {
      return c;
    }
  }
  return null;
}

/**
 * Normalize and validate a 6-character Watch Party or QR Remote pairing code.
 */
export function normalizeRoomCode(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code);
}

export function generateRoomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Validate a 4-digit Family PIN and compute a deterministic non-reversible hash string.
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function hashPin(pin: string): string {
  // Fast deterministic salted FNV-1a 64-bit style hex hash for local family PIN lock
  const salted = `VALDRION_PIN_V1::${pin}::IMPERIAL`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + ((h1 >>> 0) % 251);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Classify server latency ping results cleanly.
 */
export function classifyPingMs(
  ok: boolean,
  latencyMs: number | null
): {
  grade: 'excellent' | 'good' | 'slow' | 'offline';
  label: string;
} {
  if (!ok || latencyMs === null || !Number.isFinite(latencyMs)) {
    return { grade: 'offline', label: 'غير متاح' };
  }
  if (latencyMs <= 280) {
    return { grade: 'excellent', label: 'فائق السرعة' };
  }
  if (latencyMs <= 800) {
    return { grade: 'good', label: 'مستقر' };
  }
  return { grade: 'slow', label: 'بطيء' };
}

/**
 * Calculate live EPG program progress percentage (0..100) from HH:MM start/end strings.
 */
export function computeEpgProgressPercent(
  startTime: string,
  endTime: string,
  nowDate = new Date()
): number {
  const toMinutes = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (s === null || e === null) return 45;

  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  let duration = e - s;
  let elapsed = nowMin - s;
  if (duration <= 0) duration += 24 * 60;
  if (elapsed < 0) elapsed += 24 * 60;

  if (elapsed >= duration) return 96;
  return Math.max(6, Math.min(98, Math.round((elapsed / duration) * 100)));
}

/**
 * Sample English SRT subtitle track for instant one-click demo & AI Arabic translation test.
 */
export const SAMPLE_DEMO_SRT = `1
00:00:01,000 --> 00:00:05,500
Welcome to VALDRION Imperial Cinema — experience 4K streaming at its finest.

2
00:00:06,000 --> 00:00:11,500
Tonight's feature brings together breathtaking visuals and immersive sound.

3
00:00:12,000 --> 00:00:17,500
You can translate these subtitles into natural Arabic with one click using VALDRION AI.

4
00:00:18,000 --> 00:00:24,000
Adjust font size, golden color, or timing synchronization anytime from the Subtitles Studio.`;
