import type { NovelBook, NovelChapter } from './novelsUtils';

export interface Book4DPage {
  pageNumber: number;
  totalPages: number;
  chapterIndex: number;
  chapterNumber: number;
  chapterTitle: string;
  paragraphs: string[];
  isCover?: boolean;
}

/**
 * Splits a chapter's text into balanced, comfortable physical book pages
 * based on approximate character budget per page (adjusts smoothly with font size).
 */
export function paginateChapterToBookPages(
  chapter: NovelChapter,
  chapterIndex: number,
  fontSizePx = 19
): Book4DPage[] {
  const rawParagraphs = (chapter.content || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        chapterIndex,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        paragraphs: ['لا يوجد نص متاح في هذا الفصل حالياً.'],
      },
    ];
  }

  // Larger font size = fewer characters per physical book page
  const charBudget = Math.max(380, Math.min(920, Math.round(760 * (19 / Math.max(14, fontSizePx)))));
  const pagesParagraphs: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const para of rawParagraphs) {
    // If a single paragraph is very long, split cleanly at sentence boundaries
    if (para.length > charBudget * 1.35) {
      const sentences = para.split(/(?<=[.!؟،؛])\s+/).filter(Boolean);
      let chunk = '';
      for (const s of sentences) {
        if (chunk.length + s.length + 1 > charBudget && chunk.length > 120) {
          if (current.length > 0) {
            pagesParagraphs.push(current);
            current = [];
            currentLen = 0;
          }
          pagesParagraphs.push([chunk.trim()]);
          chunk = s;
        } else {
          chunk = chunk ? `${chunk} ${s}` : s;
        }
      }
      if (chunk.trim()) {
        if (currentLen + chunk.length > charBudget && current.length > 0) {
          pagesParagraphs.push(current);
          current = [chunk.trim()];
          currentLen = chunk.length;
        } else {
          current.push(chunk.trim());
          currentLen += chunk.length;
        }
      }
      continue;
    }

    if (currentLen + para.length > charBudget && current.length > 0) {
      pagesParagraphs.push(current);
      current = [para];
      currentLen = para.length;
    } else {
      current.push(para);
      currentLen += para.length;
    }
  }

  if (current.length > 0) {
    pagesParagraphs.push(current);
  }

  const total = Math.max(1, pagesParagraphs.length);
  return pagesParagraphs.map((paragraphs, idx) => ({
    pageNumber: idx + 1,
    totalPages: total,
    chapterIndex,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    paragraphs,
  }));
}

/**
 * Plays a gentle, realistic synthesized paper page-flip sound using Web Audio API.
 * Safe no-op when audio is unavailable or muted.
 */
export function playPaperFlipSound(enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const duration = 0.22;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Smooth paper-rustle envelope (soft rise, crisp mid flutter, silky tail)
    let prev = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const env =
        Math.sin(Math.PI * Math.pow(t, 0.72)) *
        (0.65 + 0.35 * Math.sin(t * Math.PI * 6));
      const white = Math.random() * 2 - 1;
      const filtered = prev * 0.58 + white * 0.42;
      prev = filtered;
      data[i] = filtered * env * 0.28;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1450, ctx.currentTime);
    band.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.11);
    band.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + duration);
    band.Q.value = 1.15;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(band);
    band.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // Ignore autoplay / audio context restrictions gracefully
  }
}

export function getNovelCountryLabel(novel: NovelBook): string {
  if (novel.country) return novel.country;
  const hay = `${novel.author} ${novel.genre} ${(novel.tags || []).join(' ')}`.toLowerCase();
  if (/كوري|مانهوا|صيادون|korean/.test(hay)) return 'كوري';
  if (/يابان|لايت نوفل|ساموراي|إيسيكاي|japan/.test(hay)) return 'ياباني';
  if (/صين|تشي|شينشيا|زراعة|chinese|xianxia/.test(hay)) return 'صيني';
  if (/روس|دوستويفسكي|تولستوي|بطرسبرغ|russian/.test(hay)) return 'روسي';
  if (/بريطاني|لندن|أورويل|هولمز|كريستي|دراكولا|british/.test(hay)) return 'بريطاني';
  if (/فرنس|باريس|مونت كريستو|هوغو|french/.test(hay)) return 'فرنسي';
  if (/أمريك|نيويورك|american|usa/.test(hay)) return 'أمريكي';
  if (/ترك|إسطنبول|الأناضول|turkish/.test(hay)) return 'تركي';
  if (/عرب|أندلس|حجاز|بغداد|تراثي|القاهرة|دمشق/.test(hay)) return 'عربي';
  return 'عالمي';
}
