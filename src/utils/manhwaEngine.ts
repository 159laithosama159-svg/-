export type ManhwaArtStyleId =
  | 'solo_manhwa'
  | 'classic_manga'
  | 'cinematic_anime'
  | 'dark_gothic'
  | 'warm_webtoon'
  | 'cyberpunk_neon'
  | 'custom_reference';

export interface ManhwaArtStylePreset {
  id: ManhwaArtStyleId;
  nameAr: string;
  subtitleAr: string;
  palette: [string, string, string, string]; // [bgDark, bgMid, primaryAccent, highlight]
  isMonochrome?: boolean;
  promptCue: string;
}

export const MANHWA_STYLE_PRESETS: ManhwaArtStylePreset[] = [
  {
    id: 'solo_manhwa',
    nameAr: 'مانهوا كورية فاخرة',
    subtitleAr: 'توهج أزرق وبنفسجي حاد، ظلال درامية، خطوط سرعة حماسية',
    palette: ['#090B1A', '#1B193B', '#60A5FA', '#A855F7'],
    promptCue:
      'Korean Webtoon Manhwa (Solo Leveling / Omniscient Reader style): sharp angular character silhouettes, glowing cyan/violet aura effects, deep indigo shadows, dramatic speed lines, high-contrast lighting.',
  },
  {
    id: 'classic_manga',
    nameAr: 'مانغا يابانية أبيض وأسود',
    subtitleAr: 'حبر أسود عميق، تظليل نقاط Halftone، خطوط حركة كلاسيكية',
    palette: ['#111111', '#2B2B2B', '#F4F4F5', '#D4D4D8'],
    isMonochrome: true,
    promptCue:
      'Japanese Seinen/Shonen Manga black-and-white ink art: crisp ink cross-hatching, halftone screentone dots, stark white highlights, explosive impact frames.',
  },
  {
    id: 'cinematic_anime',
    nameAr: 'أنمي سينمائي ملوّن',
    subtitleAr: 'سماء ساحرة، إضاءة ذهبية دافئة، تفاصيل خلفية غنية',
    palette: ['#141B2D', '#2D3A64', '#F59E0B', '#38BDF8'],
    promptCue:
      'Makoto Shinkai / Ghibli cinematic anime frame: luminous sky gradients, lens flare glow, rich atmospheric perspective, warm sunset gold against deep twilight blue.',
  },
  {
    id: 'dark_gothic',
    nameAr: 'فانتازيا قوطية مظلمة',
    subtitleAr: 'أحمر قرمزي، ذهب عتيق، قلاع وضباب غامض',
    palette: ['#0D090C', '#28141E', '#DC2626', '#E5B454'],
    promptCue:
      'Dark Gothic Fantasy Manhwa: crimson moonlit fog, ornate medieval silhouettes, antique gold highlights, dramatic chiaroscuro shadows.',
  },
  {
    id: 'warm_webtoon',
    nameAr: 'ويبتون رومانسي دافئ',
    subtitleAr: 'ألوان باستيل ناعمة، بتلات متطايرة، إضاءة حالمة',
    palette: ['#241724', '#4A2B47', '#F472B6', '#FDE68A'],
    promptCue:
      'Romantic Shoujo/Josei Webtoon: soft pastel rose-gold glow, floating bokeh & cherry petals, warm expressive framing, delicate highlights.',
  },
  {
    id: 'cyberpunk_neon',
    nameAr: 'سايبربانك نيون مستقبلي',
    subtitleAr: 'مدن ممطرة، لافتات نيون وردية وسماوية، طابع مستقبلي',
    palette: ['#070B16', '#161B38', '#06B6D4', '#EC4899'],
    promptCue:
      'Cyberpunk Neon Manhwa: rain-slicked futuristic skyline, magenta & cyan hologram reflections, sleek visor silhouettes, electric atmospheric haze.',
  },
];

export type BubbleType = 'speech' | 'thought' | 'shout' | 'whisper';

export interface ManhwaDialogueBubble {
  speaker: string;
  text: string;
  bubbleType: BubbleType;
  position: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
}

export interface ManhwaCharacterProfile {
  id: string;
  name: string;
  role: string;
  appearanceAr: string;
  outfitAr: string;
  weaponOrPropAr?: string;
  auraOrPowerAr?: string;
  hairHex: string;
  eyeHex: string;
  outfitHex: string;
  skinHex: string;
  auraHex: string;
  fileEvidenceQuote?: string;
}

export interface ManhwaCharacterBible {
  bookTitle: string;
  worldSettingAr: string;
  atmosphereAr: string;
  characters: ManhwaCharacterProfile[];
  extractedFromFullFile: boolean;
  sourceCharCount: number;
}

export interface ManhwaPanel {
  panelNumber: number;
  title: string;
  layout: 'splash' | 'wide' | 'tall' | 'dramatic';
  cameraAngle: string;
  sceneDescriptionAr: string;
  narrationBox?: string;
  dialogues: ManhwaDialogueBubble[];
  sfxText?: string;
  mood: 'action' | 'mystery' | 'emotional' | 'epic' | 'calm' | 'horror';
  palette: [string, string, string, string];
  charactersPresent?: string[];
  characterVisualNotesAr?: string;
  svgArt: string;
}

export interface ManhwaEpisode {
  id: string;
  bookTitle: string;
  chapterTitle: string;
  styleId: ManhwaArtStyleId;
  styleSummaryAr: string;
  extractedPalette: [string, string, string, string];
  usedReferenceImage: boolean;
  strictFileMode?: boolean;
  characterBibleUsed?: ManhwaCharacterBible;
  panels: ManhwaPanel[];
  createdAt: number;
}

export interface ParsedBookChapter {
  index: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface ParsedUploadedBook {
  title: string;
  chapters: ParsedBookChapter[];
  totalWords: number;
  rawFullText: string;
}

export function getManhwaStylePreset(id: ManhwaArtStyleId): ManhwaArtStylePreset {
  return (
    MANHWA_STYLE_PRESETS.find((s) => s.id === id) || MANHWA_STYLE_PRESETS[0]
  );
}

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  return (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Parses an uploaded novel/book file (.txt, .md, .html, .json) into structured chapters
 * ready to be turned into Manhwa episodes or read in the Luxury Reader.
 */
export function parseUploadedBookFile(
  fileName: string,
  rawContent: string
): ParsedUploadedBook {
  const cleanFileName = (fileName || 'روايتي المرفوعة')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  let text = (rawContent || '').trim();

  // Handle JSON book exports gracefully
  if (/\.json$/i.test(fileName) || (text.startsWith('{') && text.endsWith('}'))) {
    try {
      const parsed = JSON.parse(text) as {
        title?: string;
        chapters?: Array<{ title?: string; content?: string }>;
        content?: string;
      };
      if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
        const chapters: ParsedBookChapter[] = parsed.chapters
          .map((ch, i) => {
            const c = String(ch?.content || '').trim();
            return {
              index: i,
              title: String(ch?.title || `الفصل ${i + 1}`).trim(),
              content: c,
              wordCount: countWords(c),
            };
          })
          .filter((c) => c.content.length > 0);
        if (chapters.length > 0) {
          const joined = chapters
            .map((c) => `${c.title}\n${c.content}`)
            .join('\n\n');
          return {
            title: String(parsed.title || cleanFileName).trim(),
            chapters,
            totalWords: chapters.reduce((acc, c) => acc + c.wordCount, 0),
            rawFullText: joined,
          };
        }
      }
      if (typeof parsed.content === 'string') {
        text = parsed.content;
      }
    } catch {
      // fall through to plain text parser
    }
  }

  // Strip HTML if .html/.xhtml
  if (/\.x?html?$/i.test(fileName) || /<html|<body|<p>/i.test(text.slice(0, 600))) {
    text = stripHtmlTags(text);
  } else {
    text = text.replace(/\r\n/g, '\n').trim();
  }

  if (!text) {
    return {
      title: cleanFileName || 'رواية جديدة',
      chapters: [],
      totalWords: 0,
      rawFullText: '',
    };
  }

  // Try splitting by explicit chapter headers (Arabic or English or Markdown #)
  const headingRegex =
    /(?:^|\n)(?=(?:#{1,3}\s+.+|(?:الفصل|الباب|الجزء|الحلقة)\s+[^\n]{1,60}|(?:Chapter|Part|Episode)\s+[0-9IVXLC]+[^\n]{0,60}))/gi;
  const rawParts = text
    .split(headingRegex)
    .map((p) => p.trim())
    .filter((p) => p.length > 35);

  const chapters: ParsedBookChapter[] = [];
  if (rawParts.length >= 2) {
    rawParts.slice(0, 60).forEach((part, idx) => {
      const lines = part.split('\n');
      const firstLine = (lines[0] || '').replace(/^#+\s*/, '').trim();
      const body = lines.slice(1).join('\n').trim() || part;
      chapters.push({
        index: idx,
        title: firstLine.slice(0, 80) || `الفصل ${idx + 1}`,
        content: body,
        wordCount: countWords(body),
      });
    });
  } else {
    // Auto-chunk long continuous text into ~2400-char readable episodes
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
    let bucket: string[] = [];
    let bucketLen = 0;
    let chNum = 1;
    for (const para of paragraphs) {
      if (bucketLen + para.length > 2400 && bucket.length > 0) {
        const content = bucket.join('\n\n');
        chapters.push({
          index: chNum - 1,
          title: `الفصل ${chNum}`,
          content,
          wordCount: countWords(content),
        });
        chNum += 1;
        bucket = [para];
        bucketLen = para.length;
      } else {
        bucket.push(para);
        bucketLen += para.length;
      }
    }
    if (bucket.length > 0) {
      const content = bucket.join('\n\n');
      chapters.push({
        index: chNum - 1,
        title: chapters.length === 0 ? 'الفصل الأول' : `الفصل ${chNum}`,
        content,
        wordCount: countWords(content),
      });
    }
  }

  return {
    title: cleanFileName || 'رواية جديدة',
    chapters,
    totalWords: chapters.reduce((sum, c) => sum + c.wordCount, 0),
    rawFullText: text,
  };
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.trim())) {
    return raw.trim();
  }
  return fallback;
}

function sanitizePalette(
  raw: unknown,
  fallback: [string, string, string, string]
): [string, string, string, string] {
  if (!Array.isArray(raw) || raw.length < 4) return fallback;
  const clean = raw.slice(0, 4).map((c, idx) =>
    typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.trim())
      ? c.trim()
      : fallback[idx]
  );
  return [clean[0], clean[1], clean[2], clean[3]];
}

/**
 * Intelligently samples a full book text (up to maxChars) while preserving the entire
 * opening section (where character sheets, prologues, and physical descriptions live)
 * plus evenly distributed slices across middle & late chapters.
 */
export function sampleFullBookForAnalysis(
  fullText: string,
  maxChars = 28000
): string {
  const clean = (fullText || '').replace(/\r\n/g, '\n').trim();
  if (clean.length <= maxChars) return clean;
  const headSize = Math.floor(maxChars * 0.55);
  const remaining = maxChars - headSize;
  const sliceSize = Math.floor(remaining / 3);
  const restStart = headSize;
  const restLen = clean.length - restStart;
  const p1 = restStart + Math.floor(restLen * 0.2);
  const p2 = restStart + Math.floor(restLen * 0.55);
  const p3 = Math.max(restStart, clean.length - sliceSize);
  return [
    clean.slice(0, headSize),
    '\n--- [مقتطف من منتصف الكتاب] ---\n',
    clean.slice(p1, p1 + sliceSize),
    '\n--- [مقتطف من فصول متقدمة] ---\n',
    clean.slice(p2, p2 + sliceSize),
    '\n--- [مقتطف من الفصول الأخيرة] ---\n',
    clean.slice(p3, p3 + sliceSize),
  ].join('');
}

const ARABIC_ENGLISH_COLOR_MAP: Array<{ pattern: RegExp; hex: string }> = [
  { pattern: /(?:أبيض|بيضاء|فضي|فضية|ثلجي|ثلجية|white|silver|snow)/i, hex: '#E5E7EB' },
  { pattern: /(?:أسود|سوداء|فحمي|حالك|داكن|مظلم|black|obsidian|ebony|dark)/i, hex: '#141720' },
  { pattern: /(?:قرمزي|أحمر|حمراء|دموي|ياقوتي|crimson|scarlet|red|ruby)/i, hex: '#DC2626' },
  { pattern: /(?:أزرق|زرقاء|سماوي|جليدي|لازوردي|نيلي|blue|cyan|azure|sapphire|ice)/i, hex: '#38BDF8' },
  { pattern: /(?:كحلي|أزرق داكن|navy|midnight)/i, hex: '#1E3A8A' },
  { pattern: /(?:ذهبي|ذهبية|أشقر|شقراء|أصفر|صفراء|عسلي|gold|golden|blonde|yellow|amber)/i, hex: '#F59E0B' },
  { pattern: /(?:أخضر|خضراء|زمردي|زمردية|زيتوني|green|emerald|jade)/i, hex: '#10B981' },
  { pattern: /(?:بنفسجي|بنفسجية|أرجواني|أرجوانية|ليلكي|purple|violet|amethyst)/i, hex: '#A855F7' },
  { pattern: /(?:وردي|وردية|زهري|زهرية|pink|rose|magenta)/i, hex: '#F472B6' },
  { pattern: /(?:برتقالي|ناري|نحاسي|orange|fiery|copper)/i, hex: '#F97316' },
  { pattern: /(?:بني|بنية|كستنائي|برونزي|brown|chestnut|bronze)/i, hex: '#78350F' },
  { pattern: /(?:رمادي|رمادية|رصاصي|فولاذي|gray|grey|slate|ash)/i, hex: '#64748B' },
];

export function extractColorHexFromDescription(
  snippet: string,
  fallback: string
): string {
  let bestIndex = Infinity;
  let bestHex: string | null = null;
  for (const entry of ARABIC_ENGLISH_COLOR_MAP) {
    const m = entry.pattern.exec(snippet);
    if (m && m.index < bestIndex) {
      bestIndex = m.index;
      bestHex = entry.hex;
    }
  }
  return bestHex || fallback;
}

function findFeatureSnippet(text: string, featureRegex: RegExp): string {
  const m = featureRegex.exec(text);
  if (!m) return '';
  const tail = text.slice(m.index, Math.min(text.length, m.index + 52));
  const stopIdx = tail.search(/[,،.;؛\n]/);
  return stopIdx > 6 ? tail.slice(0, stopIdx) : tail;
}

/**
 * Deterministic Arabic/English local extractor for uploaded book files.
 * Parses explicit character sheets ("الشخصيات", "الاسم:", "- كايل: ...") and inline
 * physical descriptions (hair, eyes, outfit, weapons, scars, aura) directly from the file.
 */
export function extractLocalCharacterBibleFallback(
  bookTitle: string,
  fullText: string
): ManhwaCharacterBible {
  const clean = (fullText || '').replace(/\r\n/g, '\n').trim();
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  const characters: ManhwaCharacterProfile[] = [];
  const seenNames = new Set<string>();

  const pushCharacter = (nameRaw: string, descRaw: string, roleHint = 'شخصية رئيسية') => {
    const cleanName = nameRaw
      .replace(/^[\-*•●▪\d.)\s#]+/, '')
      .replace(/[*_`[\]()«»"]/g, '')
      .replace(/^(?:الاسم|الشخصية|البطل|البطلة|الخصم|Character|Name)\s*[:：\-–]\s*/i, '')
      .trim()
      .slice(0, 42);
    if (
      !cleanName ||
      cleanName.length < 2 ||
      /^(?:الفصل|الباب|الجزء|المقدمة|ملخص|الوصف|العالم|القصة|المكان|الشخصيات|الأحداث|chapter|part|prologue|setting|world|plot|characters)$/i.test(
        cleanName
      )
    ) {
      return;
    }
    const key = cleanName.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);

    const desc = descRaw.trim().slice(0, 320);
    const hairPart = findFeatureSnippet(desc, /(?:شعر[هها]*|خصلات|hair)/i);
    const eyePart = findFeatureSnippet(desc, /(?:عين[ياهها]*|عيون[هها]*|أعين|نظرات|eye[s]?)/i);
    const outfitPart = findFeatureSnippet(
      desc,
      /(?:يرتدي|ترتدي|ملابس|معطف|عباءة|رداء|درع|قميص|فستان|وشاح|(?<=^|[\s،,.])(?:ال)?زي(?=$|[\s،,.])|coat|cloak|armor|robe|outfit|wear)/i
    );
    const weaponPart = findFeatureSnippet(
      desc,
      /(?:سيف|خنجر|رمح|قوس|عصا|فأس|مسدس|بندقية|نصل|سلاح|درع|sword|blade|dagger|staff|bow|weapon)/i
    );
    const auraPart = findFeatureSnippet(
      desc,
      /(?:هالة|طاقة|سحر|لهب|نار|برق|ظل|ظلال|نور|ضوء|aura|magic|flame|shadow|lightning|power)/i
    );
    const skinPart = findFeatureSnippet(desc, /(?:بشرة|بشرت[هها]|قمحي|سمراء|شاحب|فاتح|skin|pale|tan)/i);

    const hairHex = extractColorHexFromDescription(hairPart || desc, '#1B1D29');
    const eyeHex = extractColorHexFromDescription(eyePart, '#38BDF8');
    const outfitHex = extractColorHexFromDescription(outfitPart, '#1F2438');
    const auraHex = extractColorHexFromDescription(auraPart || eyePart, '#A855F7');
    const skinHex = /سمراء|داكنة|برونزية|dark|tan/i.test(skinPart)
      ? '#B07D56'
      : /قمحي|حنطي|olive|warm/i.test(skinPart)
      ? '#D8A985'
      : '#EED2BC';

    const role =
      /خصم|شرير|عدو|زعيم|ملك الظلام|villain|antagonist/i.test(desc)
        ? 'خصم / عدو'
        : characters.length === 0
        ? 'البطل الرئيسي'
        : roleHint;

    characters.push({
      id: `char_${characters.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      role,
      appearanceAr: desc.slice(0, 210) || 'شخصية مقتبسة مباشرة من نص الملف.',
      outfitAr: outfitPart ? outfitPart.trim().slice(0, 140) : 'ملابس مطابقة لسياق الملف.',
      weaponOrPropAr: weaponPart ? weaponPart.trim().slice(0, 100) : undefined,
      auraOrPowerAr: auraPart ? auraPart.trim().slice(0, 100) : undefined,
      hairHex,
      eyeHex,
      outfitHex,
      skinHex,
      auraHex,
      fileEvidenceQuote: desc.slice(0, 160),
    });
  };

  // Pass 1: Detect structured character lines like "- كايل: شاب بشعر أبيض وعينين قرمزيتين يرتدي معطفاً أسود..."
  for (let i = 0; i < lines.length && characters.length < 8; i++) {
    const line = lines[i];
    const colonMatch = line.match(
      /^[\-*•●▪\d.)\s]*([^:：\-–]{2,36})\s*[:：\-–]\s*(.{16,})$/
    );
    if (colonMatch) {
      const lhs = colonMatch[1].trim();
      const rhs = colonMatch[2].trim();
      const hasVisualCue =
        /(?:شعر|عين|عيون|يرتدي|ترتدي|معطف|عباءة|درع|سيف|خنجر|ندبة|هالة|بشرة|طويل|قصير|شاب|فتاة|فارس|ساحر|hair|eye|coat|cloak|armor|sword|scar|aura)/i.test(
          rhs
        );
      if (hasVisualCue) {
        pushCharacter(lhs, rhs);
      }
    }
  }

  // Pass 2: Detect labeled blocks ("الاسم: X" followed by description lines)
  if (characters.length < 4) {
    for (let i = 0; i < lines.length && characters.length < 8; i++) {
      const m = lines[i].match(
        /^(?:الاسم|الشخصية|البطل|البطلة|Name|Character)\s*[:：]\s*(.+)$/i
      );
      if (m) {
        const nextLines = lines.slice(i + 1, i + 4).join(' ');
        pushCharacter(m[1], nextLines || lines[i]);
      }
    }
  }

  // Pass 3: Extract named actors from prose sentences carrying explicit appearance words
  if (characters.length === 0) {
    const sentences = clean.split(/[.!؟\n]+/).map((s) => s.trim()).filter((s) => s.length > 20);
    for (const s of sentences) {
      if (characters.length >= 6) break;
      if (/(?:شعر[هها]|عين[ياهها]|عيون[هها]|يرتدي|ترتدي|معطف|عباءة|سيف|خنجر|ندبة)/i.test(s)) {
        const nameMatch = s.match(
          /(?:^|\s)([\u0600-\u06FF]{3,16}(?:\s+[\u0600-\u06FF]{3,14})?)\s+(?:شاب|فتاة|رجل|امرأة|فارس|محارب|ساحر|ذو|ذات|بشعر|شعره|شعرها|عيناه|عيناها|يرتدي|ترتدي|يحمل|تحمل)/
        );
        if (nameMatch?.[1]) {
          pushCharacter(nameMatch[1], s, 'شخصية من النص');
        }
      }
    }
  }

  // World & atmosphere extraction directly from file keywords
  const worldCues: string[] = [];
  if (/قلعة|قصر|مملكة|عروش|castle|kingdom|palace/i.test(clean)) worldCues.push('مملكة وقلاع تاريخية');
  if (/زنزانة|بوابة|وحوش|تنين|سحر|dungeon|gate|dragon|magic/i.test(clean)) worldCues.push('عالم فانتازيا وبوابات سحرية');
  if (/مدينة|ناطحات|نيون|مستقبل|مختبر|city|neon|cyber/i.test(clean)) worldCues.push('مدينة حضرية أو مستقبلية');
  if (/صحراء|رمال|جبال|غابة|بحر|desert|forest|mountain/i.test(clean)) worldCues.push('تضاريس طبيعية وغابات أو جبال');

  const atmosphereCues: string[] = [];
  if (/مطر|عاصفة|رعد|برق|rain|storm|thunder/i.test(clean)) atmosphereCues.push('عاصف وممطر');
  if (/ليل|قمر|ظلام|ضباب|night|moon|fog|dark/i.test(clean)) atmosphereCues.push('ليلي غامض تحت ضوء القمر');
  if (/شمس|فجر|غروب|ذهبي|sun|dawn|sunset/i.test(clean)) atmosphereCues.push('دافئ بإضاءة فجر أو غروب');

  return {
    bookTitle: (bookTitle || 'رواية الملف').trim(),
    worldSettingAr:
      worldCues.length > 0
        ? `بيئة مستخلصة من الملف: ${worldCues.join(' · ')}`
        : 'بيئة وأحداث مطابقة تماماً لنص الملف المرفوع.',
    atmosphereAr:
      atmosphereCues.length > 0
        ? atmosphereCues.join('، ')
        : 'أجواء درامية مطابقة لسياق النص المرفوع.',
    characters,
    extractedFromFullFile: true,
    sourceCharCount: clean.length,
  };
}

export function normalizeManhwaCharacterBible(
  raw: Record<string, unknown> | null | undefined,
  bookTitle: string,
  sourceCharCount: number,
  fallbackText?: string
): ManhwaCharacterBible {
  const localFallback = fallbackText
    ? extractLocalCharacterBibleFallback(bookTitle, fallbackText)
    : null;

  const rawChars = Array.isArray(raw?.characters) ? raw.characters : [];
  const normalizedChars: ManhwaCharacterProfile[] = rawChars
    .slice(0, 12)
    .map((item, idx) => {
      const c = (item || {}) as Record<string, unknown>;
      const name = String(c.name || '').trim().slice(0, 50);
      if (!name) return null;
      const appearanceAr = String(c.appearanceAr || '').trim().slice(0, 260);
      const outfitAr = String(c.outfitAr || '').trim().slice(0, 200);
      const combined = `${appearanceAr} ${outfitAr}`;
      const profile: ManhwaCharacterProfile = {
        id:
          typeof c.id === 'string' && c.id.trim()
            ? c.id.trim()
            : `char_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        role: String(c.role || (idx === 0 ? 'البطل الرئيسي' : 'شخصية من الملف'))
          .trim()
          .slice(0, 50),
        appearanceAr: appearanceAr || 'مواصفات مطابقة لوصف الملف.',
        outfitAr: outfitAr || 'ملابس مطابقة لوصف الملف.',
        weaponOrPropAr: c.weaponOrPropAr
          ? String(c.weaponOrPropAr).trim().slice(0, 140)
          : undefined,
        auraOrPowerAr: c.auraOrPowerAr
          ? String(c.auraOrPowerAr).trim().slice(0, 140)
          : undefined,
        hairHex: sanitizeHexColor(
          c.hairHex,
          extractColorHexFromDescription(appearanceAr, '#1B1D29')
        ),
        eyeHex: sanitizeHexColor(
          c.eyeHex,
          extractColorHexFromDescription(appearanceAr, '#38BDF8')
        ),
        outfitHex: sanitizeHexColor(
          c.outfitHex,
          extractColorHexFromDescription(outfitAr || combined, '#1F2438')
        ),
        skinHex: sanitizeHexColor(c.skinHex, '#EED2BC'),
        auraHex: sanitizeHexColor(
          c.auraHex,
          extractColorHexFromDescription(
            String(c.auraOrPowerAr || appearanceAr),
            '#A855F7'
          )
        ),
        fileEvidenceQuote: c.fileEvidenceQuote
          ? String(c.fileEvidenceQuote).trim().slice(0, 200)
          : undefined,
      };
      return profile;
    })
    .filter((c): c is ManhwaCharacterProfile => Boolean(c));

  const finalCharacters =
    normalizedChars.length > 0
      ? normalizedChars
      : localFallback?.characters || [];

  return {
    bookTitle: (bookTitle || 'رواية الملف').trim(),
    worldSettingAr:
      typeof raw?.worldSettingAr === 'string' && raw.worldSettingAr.trim()
        ? raw.worldSettingAr.trim().slice(0, 320)
        : localFallback?.worldSettingAr ||
          'بيئة وأماكن مطابقة حرفياً لنص الملف المرفوع.',
    atmosphereAr:
      typeof raw?.atmosphereAr === 'string' && raw.atmosphereAr.trim()
        ? raw.atmosphereAr.trim().slice(0, 220)
        : localFallback?.atmosphereAr ||
          'أجواء درامية مطابقة للنص المرفوع.',
    characters: finalCharacters,
    extractedFromFullFile: true,
    sourceCharCount: Math.max(sourceCharCount, localFallback?.sourceCharCount || 0),
  };
}

export function buildCharacterBiblePromptBlock(
  bible?: ManhwaCharacterBible | null
): string {
  if (!bible) return '';
  const lines: string[] = [
    '=== MANDATORY CHARACTER & WORLD BIBLE EXTRACTED STRICTLY FROM THE UPLOADED BOOK FILE ===',
    `Book Title: ${bible.bookTitle}`,
    `World Setting (from file): ${bible.worldSettingAr}`,
    `Atmosphere & Mood (from file): ${bible.atmosphereAr}`,
  ];
  if (bible.characters.length > 0) {
    lines.push('CHARACTERS (YOU MUST RENDER EACH CHARACTER WITH 100% FIDELITY TO THESE EXACT DETAILS FROM THE FILE):');
    bible.characters.forEach((c, idx) => {
      lines.push(
        `${idx + 1}. Name: "${c.name}" (${c.role})\n` +
          `   - Exact Physical Appearance from file: ${c.appearanceAr}\n` +
          `   - Exact Outfit/Armor from file: ${c.outfitAr}\n` +
          (c.weaponOrPropAr ? `   - Weapon/Prop from file: ${c.weaponOrPropAr}\n` : '') +
          (c.auraOrPowerAr ? `   - Power/Aura from file: ${c.auraOrPowerAr}\n` : '') +
          `   - MANDATORY SVG HEX COLORS: Hair=${c.hairHex} | Eyes=${c.eyeHex} | Outfit=${c.outfitHex} | Skin=${c.skinHex} | Aura=${c.auraHex}` +
          (c.fileEvidenceQuote ? `\n   - Direct File Quote: "${c.fileEvidenceQuote}"` : '')
      );
    });
  }
  lines.push('=== END OF FILE CHARACTER BIBLE ===');
  return lines.join('\n');
}

function matchPanelCharacters(
  panel: {
    charactersPresent?: string[];
    title?: string;
    sceneDescriptionAr?: string;
    narrationBox?: string;
    dialogues?: ManhwaDialogueBubble[];
  },
  bible?: ManhwaCharacterBible | null
): ManhwaCharacterProfile[] {
  if (!bible || bible.characters.length === 0) return [];
  const matched: ManhwaCharacterProfile[] = [];
  const seen = new Set<string>();
  const addMatch = (ch: ManhwaCharacterProfile) => {
    if (!seen.has(ch.id)) {
      seen.add(ch.id);
      matched.push(ch);
    }
  };

  // 1. Explicit charactersPresent array returned by AI
  for (const name of panel.charactersPresent || []) {
    const n = name.trim().toLowerCase();
    if (!n) continue;
    const found = bible.characters.find(
      (c) =>
        c.name.toLowerCase() === n ||
        c.name.toLowerCase().includes(n) ||
        n.includes(c.name.toLowerCase())
    );
    if (found) addMatch(found);
  }

  // 2. Match speakers & scene text against character names in the bible
  const searchable = [
    panel.title || '',
    panel.sceneDescriptionAr || '',
    panel.narrationBox || '',
    ...(panel.dialogues || []).map((d) => `${d.speaker} ${d.text}`),
  ]
    .join(' ')
    .toLowerCase();

  for (const ch of bible.characters) {
    const full = ch.name.trim().toLowerCase();
    const firstToken = full.split(/\s+/)[0] || '';
    if (
      (full.length >= 2 && searchable.includes(full)) ||
      (firstToken.length >= 3 && searchable.includes(firstToken))
    ) {
      addMatch(ch);
    }
  }

  // Fallback to protagonist if no specific character matched on this panel
  if (matched.length === 0 && bible.characters[0]) {
    addMatch(bible.characters[0]);
  }
  return matched;
}

/**
 * High-craft procedural Manhwa/Manga SVG panel composer used whenever the AI artwork
 * is missing or needs visual reinforcement so EVERY panel looks cinematic, dramatic,
 * and visually faithful to the uploaded file's exact character hair, eye, outfit, and aura colors!
 */
export function buildProceduralManhwaPanelSvg(
  panel: Pick<
    ManhwaPanel,
    'panelNumber' | 'title' | 'mood' | 'cameraAngle' | 'layout' | 'palette'
  >,
  isMonochrome = false,
  primaryCharacter?: ManhwaCharacterProfile | null,
  secondaryCharacter?: ManhwaCharacterProfile | null
): string {
  const [c0, c1, c2, c3] = isMonochrome
    ? (['#0D0D0D', '#262626', '#F4F4F5', '#A1A1AA'] as const)
    : panel.palette;
  const w = 900;
  const h = panel.layout === 'tall' ? 760 : panel.layout === 'splash' ? 680 : 540;
  const seed = panel.panelNumber * 97 + panel.title.length * 13;

  // File-faithful character color overrides!
  const pHair = isMonochrome ? '#121212' : primaryCharacter?.hairHex || c0;
  const pEye = isMonochrome ? '#FFFFFF' : primaryCharacter?.eyeHex || c2;
  const pOutfit = isMonochrome ? '#1E1E1E' : primaryCharacter?.outfitHex || c0;
  const pSkin = isMonochrome ? '#E5E5E5' : primaryCharacter?.skinHex || '#EED2BC';
  const pAura = isMonochrome ? '#F4F4F5' : primaryCharacter?.auraHex || c2;
  const hasPrimaryWeapon = Boolean(primaryCharacter?.weaponOrPropAr);

  const sHair = isMonochrome ? '#0B0B0B' : secondaryCharacter?.hairHex || '#06060C';
  const sEye = isMonochrome ? '#E4E4E7' : secondaryCharacter?.eyeHex || c3;
  const sOutfit = isMonochrome ? '#141414' : secondaryCharacter?.outfitHex || '#06060C';
  const sSkin = isMonochrome ? '#D4D4D8' : secondaryCharacter?.skinHex || '#E6C6AE';
  const sAura = isMonochrome ? '#A1A1AA' : secondaryCharacter?.auraHex || c3;

  // Dynamic speed/energy rays for action or epic panels
  const rays: string[] = [];
  if (panel.mood === 'action' || panel.mood === 'epic') {
    const cx = w * 0.5;
    const cy = h * 0.45;
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2 + (seed % 7) * 0.05;
      const r1 = 150 + (i % 3) * 35;
      const r2 = Math.max(w, h);
      const x1 = (cx + Math.cos(ang) * r1).toFixed(1);
      const y1 = (cy + Math.sin(ang) * r1).toFixed(1);
      const x2 = (cx + Math.cos(ang) * r2).toFixed(1);
      const y2 = (cy + Math.sin(ang) * r2).toFixed(1);
      rays.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i % 2 === 0 ? c2 : c3}" stroke-opacity="${panel.mood === 'action' ? '0.32' : '0.18'}" stroke-width="${i % 3 === 0 ? 3.5 : 1.5}"/>`
      );
    }
  }

  // Atmospheric city/mountain/castle horizon silhouettes
  const horizonY = Math.round(h * 0.68);
  const skylineBars: string[] = [];
  for (let i = 0; i < 16; i++) {
    const bx = i * 60 - 15;
    const bh = 60 + ((seed + i * 43) % 150);
    skylineBars.push(
      `<rect x="${bx}" y="${horizonY - bh}" width="${48 + (i % 3) * 8}" height="${bh + 90}" fill="${c0}" opacity="0.72"/>`
    );
    if (!isMonochrome && i % 2 === 0) {
      skylineBars.push(
        `<rect x="${bx + 10}" y="${horizonY - bh + 18}" width="10" height="14" fill="${c2}" opacity="0.45"/>`
      );
    }
  }

  // Dramatic Character Framing — uses exact file-extracted character hair, eye, outfit, skin & aura colors!
  const shotVariant = panel.panelNumber % 4;
  const heroX = panel.panelNumber % 2 === 0 ? Math.round(w * 0.34) : Math.round(w * 0.64);
  const heroY = Math.round(h * 0.56);

  let characterLayer = '';
  if (shotVariant === 2) {
    // Dramatic Close-up Eyes & Aura Slash Panel (Uses Exact Hair + Eye + Aura Hexes from File!)
    characterLayer = `
      <rect x="0" y="${Math.round(h * 0.24)}" width="${w}" height="${Math.round(h * 0.52)}" fill="${pSkin}" opacity="0.24"/>
      <rect x="0" y="${Math.round(h * 0.24)}" width="${w}" height="${Math.round(h * 0.52)}" fill="${c0}" opacity="0.78"/>
      <line x1="0" y1="${Math.round(h * 0.24)}" x2="${w}" y2="${Math.round(h * 0.24)}" stroke="${pAura}" stroke-width="4"/>
      <line x1="0" y1="${Math.round(h * 0.76)}" x2="${w}" y2="${Math.round(h * 0.76)}" stroke="${c3}" stroke-width="4"/>
      <!-- Dramatic Hair Strands Colored Strictly From File -->
      <path d="M 120 ${Math.round(h * 0.24)} L 205 ${Math.round(h * 0.45)} L 260 ${Math.round(h * 0.24)} L 340 ${Math.round(h * 0.47)} L 430 ${Math.round(h * 0.24)} L 520 ${Math.round(h * 0.43)} L 605 ${Math.round(h * 0.24)} L 690 ${Math.round(h * 0.46)} L 780 ${Math.round(h * 0.24)} Z" fill="${pHair}" stroke="#06060C" stroke-opacity="0.45" stroke-width="2"/>
      <!-- Left Glowing Sharp Eye (File Eye Color) -->
      <g transform="translate(${Math.round(w * 0.34)}, ${Math.round(h * 0.5)})">
        <path d="M -85 -12 Q -10 -36 72 -4 Q 10 26 -72 10 Z" fill="#F8FAFC" stroke="#0B0B14" stroke-width="4"/>
        <ellipse cx="-6" cy="-2" rx="22" ry="15" fill="${pEye}"/>
        <ellipse cx="-6" cy="-2" rx="9" ry="13" fill="#07070D"/>
        <circle cx="4" cy="-7" r="4.5" fill="#FFFFFF"/>
        <path d="M -110 8 Q -20 -6 95 -18" fill="none" stroke="${pAura}" stroke-width="2.5" opacity="0.78"/>
      </g>
      <!-- Right Glowing Sharp Eye (File Eye Color) -->
      <g transform="translate(${Math.round(w * 0.66)}, ${Math.round(h * 0.5)})">
        <path d="M 85 -12 Q 10 -36 -72 -4 Q -10 26 72 10 Z" fill="#F8FAFC" stroke="#0B0B14" stroke-width="4"/>
        <ellipse cx="6" cy="-2" rx="22" ry="15" fill="${pEye}"/>
        <ellipse cx="6" cy="-2" rx="9" ry="13" fill="#07070D"/>
        <circle cx="-4" cy="-7" r="4.5" fill="#FFFFFF"/>
        <path d="M 110 8 Q 20 -6 -95 -18" fill="none" stroke="${pAura}" stroke-width="2.5" opacity="0.78"/>
      </g>
      <!-- Luminous Energy Trail Across Eyes -->
      <path d="M 40 ${Math.round(h * 0.54)} Q ${Math.round(w * 0.5)} ${Math.round(h * 0.38)} ${w - 40} ${Math.round(h * 0.48)}" fill="none" stroke="${pAura}" stroke-width="5" opacity="0.68"/>
    `;
  } else if (shotVariant === 3) {
    // Dual Confrontation Silhouette Panel (Primary vs Secondary Character Colors From File!)
    characterLayer = `
      <g transform="translate(${Math.round(w * 0.28)}, ${heroY})">
        <ellipse cx="0" cy="30" rx="130" ry="165" fill="url(#aura_${panel.panelNumber})" opacity="0.58"/>
        <path d="M -84 220 C -95 95, -70 -10, -34 -48 L 32 -48 C 72 -12, 102 92, 92 220 Z" fill="${pOutfit}" stroke="${pAura}" stroke-width="3"/>
        <!-- Face & Neck -->
        <ellipse cx="4" cy="-90" rx="26" ry="34" fill="${pSkin}" opacity="0.92"/>
        <!-- Hair -->
        <path d="M -32 -88 C -40 -128, -16 -154, 8 -156 C 34 -154, 48 -130, 38 -88 L 48 -78 L 28 -96 L 8 -108 L -14 -94 L -30 -82 Z" fill="${pHair}" stroke="${pAura}" stroke-width="2"/>
        <polygon points="4,-94 22,-90 10,-84" fill="${pEye}"/>
        <path d="M 30 20 L 210 -95" stroke="${pAura}" stroke-width="6" stroke-linecap="round"/>
        <path d="M 30 20 L 210 -95" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g transform="translate(${Math.round(w * 0.74)}, ${heroY - 12})">
        <path d="M -90 230 C -110 100, -76 -18, -36 -56 L 38 -56 C 85 -14, 118 98, 108 230 Z" fill="${sOutfit}" stroke="${sAura}" stroke-width="3"/>
        <ellipse cx="-2" cy="-96" rx="28" ry="35" fill="${sSkin}" opacity="0.88"/>
        <path d="M -36 -94 C -44 -138, -18 -166, 8 -168 C 34 -166, 54 -140, 42 -94 L 22 -112 L -2 -116 L -24 -104 Z" fill="${sHair}" stroke="${sAura}" stroke-width="2"/>
        <polygon points="-22,-98 -4,-94 -14,-88" fill="${sEye}"/>
        <path d="M -34 10 L -210 -80" stroke="${sAura}" stroke-width="5" stroke-linecap="round"/>
      </g>
      <!-- Central Clash Shockwave -->
      <circle cx="${Math.round(w * 0.51)}" cy="${Math.round(h * 0.44)}" r="46" fill="${pAura}" opacity="0.38"/>
      <circle cx="${Math.round(w * 0.51)}" cy="${Math.round(h * 0.44)}" r="22" fill="#FFFFFF" opacity="0.85"/>
    `;
  } else {
    // Classic Heroic Full-Body Rim-Lit Manhwa Figure (Strict File Hair, Eyes, Skin, Outfit & Weapon!)
    characterLayer = `
      <g transform="translate(${heroX}, ${heroY})">
        <ellipse cx="0" cy="40" rx="155" ry="180" fill="url(#aura_${panel.panelNumber})" opacity="0.56"/>
        <!-- Flowing Cloak / Coat (File Outfit Hex) -->
        <path d="M -95 220 C -115 90, -82 -15, -38 -52 L 38 -52 C 88 -12, 130 95, 118 220 Z" fill="${pOutfit}" stroke="${pAura}" stroke-width="3"/>
        <path d="M -52 -46 L 0 42 L 52 -46" fill="none" stroke="${c3}" stroke-width="2.5" opacity="0.82"/>
        <!-- Face & Chin (File Skin Hex) -->
        <path d="M -27 -104 C -28 -68, -14 -48, 2 -46 C 18 -48, 30 -68, 29 -104 Z" fill="${pSkin}" opacity="0.94"/>
        <!-- Spiky/Flowing Anime/Manhwa Hair Silhouette (File Hair Hex) -->
        <path d="M -38 -88 C -46 -134, -20 -164, 6 -166 C 32 -164, 54 -138, 44 -90 L 58 -76 L 34 -88 L 16 -110 L 0 -98 L -18 -110 L -36 -86 L -54 -76 Z" fill="${pHair}" stroke="${pAura}" stroke-width="2.2"/>
        <!-- Glowing Manhwa Eyes (File Eye Hex) -->
        <polygon points="-20,-90 -4,-86 -14,-80" fill="${pEye}"/>
        <polygon points="20,-90 4,-86 14,-80" fill="${pEye}"/>
        ${
          hasPrimaryWeapon
            ? `<path d="M 68 85 L 228 -118" stroke="${pAura}" stroke-width="9" stroke-linecap="round" opacity="0.72"/>
               <path d="M 68 85 L 228 -118" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>`
            : ''
        }
        <!-- Energy Slash Arc -->
        <path d="M -185 45 Q 0 -138 205 -42" fill="none" stroke="${pAura}" stroke-width="5" stroke-linecap="round" opacity="0.84"/>
        <path d="M -160 72 Q 15 -98 180 -10" fill="none" stroke="${c3}" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
      </g>
    `;
  }

  // Floating glowing aura / embers / petals
  const particles: string[] = [];
  for (let i = 0; i < 24; i++) {
    const px = ((seed * (i + 3) * 37) % (w - 40)) + 20;
    const py = ((seed * (i + 5) * 53) % (h - 60)) + 30;
    const r = 1.8 + (i % 4) * 1.4;
    particles.push(
      `<circle cx="${px}" cy="${py}" r="${r}" fill="${i % 2 === 0 ? c2 : c3}" opacity="${(0.28 + (i % 5) * 0.12).toFixed(2)}"/>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="sky_${panel.panelNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c0}"/>
        <stop offset="52%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c0}"/>
      </linearGradient>
      <radialGradient id="moon_${panel.panelNumber}" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.65"/>
        <stop offset="45%" stop-color="${c3}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${c0}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="aura_${panel.panelNumber}" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
      </linearGradient>
      <pattern id="halftone_${panel.panelNumber}" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1.4" fill="${c2}" opacity="${isMonochrome ? '0.2' : '0.07'}"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky_${panel.panelNumber})"/>
    <rect width="${w}" height="${h}" fill="url(#moon_${panel.panelNumber})"/>
    <rect width="${w}" height="${h}" fill="url(#halftone_${panel.panelNumber})"/>
    ${rays.join('')}
    <!-- Celestial Moon / Portal Halo -->
    <circle cx="${Math.round(w * 0.5)}" cy="${Math.round(h * 0.34)}" r="${panel.layout === 'splash' ? 128 : 96}" fill="${c3}" opacity="0.18"/>
    <circle cx="${Math.round(w * 0.5)}" cy="${Math.round(h * 0.34)}" r="${panel.layout === 'splash' ? 92 : 68}" fill="none" stroke="${c2}" stroke-width="2.5" opacity="0.65"/>
    <!-- Horizon Silhouette -->
    <g>${skylineBars.join('')}</g>
    <rect x="0" y="${horizonY}" width="${w}" height="${h - horizonY}" fill="${c0}" opacity="0.88"/>
    <!-- Dramatic Rim-Lit Manhwa Character Composition -->
    ${characterLayer}
    <g>${particles.join('')}</g>
    <!-- Crisp Comic Ink Border -->
    <rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2.5"/>
    <title>PANEL #${panel.panelNumber} · ${escapeXml(panel.cameraAngle)}</title>
  </svg>`;
}

export function sanitizePanelSvg(
  rawSvg: unknown,
  fallbackPanel: Pick<
    ManhwaPanel,
    'panelNumber' | 'title' | 'mood' | 'cameraAngle' | 'layout' | 'palette'
  >,
  isMonochrome = false,
  primaryCharacter?: ManhwaCharacterProfile | null,
  secondaryCharacter?: ManhwaCharacterProfile | null
): string {
  if (typeof rawSvg === 'string') {
    const trimmed = rawSvg.trim();
    const start = trimmed.indexOf('<svg');
    const end = trimmed.lastIndexOf('</svg>');
    if (start !== -1 && end !== -1 && end > start) {
      const cleaned = trimmed
        .slice(start, end + 6)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '');
      const shapeMatches = cleaned.match(/<(path|circle|ellipse|rect|polygon|polyline|line)\b/gi) || [];
      if (cleaned.length >= 2200 && shapeMatches.length >= 16) {
        return cleaned;
      }
    }
  }
  return buildProceduralManhwaPanelSvg(
    fallbackPanel,
    isMonochrome,
    primaryCharacter,
    secondaryCharacter
  );
}

export function normalizeManhwaEpisode(
  raw: Record<string, unknown>,
  meta: {
    bookTitle: string;
    chapterTitle: string;
    styleId: ManhwaArtStyleId;
    usedReferenceImage: boolean;
    characterBible?: ManhwaCharacterBible | null;
    strictFileMode?: boolean;
  }
): ManhwaEpisode {
  const preset = getManhwaStylePreset(meta.styleId);
  const extractedPalette = sanitizePalette(raw.extractedPalette, preset.palette);
  const rawPanels = Array.isArray(raw.panels) ? raw.panels : [];

  const panels: ManhwaPanel[] = rawPanels
    .slice(0, 12)
    .map((item, idx) => {
      const p = (item || {}) as Record<string, unknown>;
      const layoutRaw = String(p.layout || '');
      const layout: ManhwaPanel['layout'] =
        layoutRaw === 'splash' ||
        layoutRaw === 'wide' ||
        layoutRaw === 'tall' ||
        layoutRaw === 'dramatic'
          ? layoutRaw
          : idx === 0
          ? 'splash'
          : idx % 3 === 0
          ? 'tall'
          : 'wide';

      const moodRaw = String(p.mood || '');
      const mood: ManhwaPanel['mood'] =
        moodRaw === 'action' ||
        moodRaw === 'mystery' ||
        moodRaw === 'emotional' ||
        moodRaw === 'epic' ||
        moodRaw === 'calm' ||
        moodRaw === 'horror'
          ? moodRaw
          : 'epic';

      const palette = sanitizePalette(p.palette, extractedPalette);
      const title = String(p.title || `المشهد ${idx + 1}`).trim().slice(0, 80);
      const cameraAngle = String(p.cameraAngle || 'لقطة سينمائية').trim().slice(0, 50);

      const dialogues: ManhwaDialogueBubble[] = Array.isArray(p.dialogues)
        ? p.dialogues
            .slice(0, 3)
            .map((d, dIdx) => {
              const b = (d || {}) as Record<string, unknown>;
              const bt = String(b.bubbleType || 'speech');
              const bubbleType: BubbleType =
                bt === 'thought' || bt === 'shout' || bt === 'whisper'
                  ? bt
                  : 'speech';
              const posRaw = String(b.position || '');
              const position: ManhwaDialogueBubble['position'] =
                posRaw === 'top_right' ||
                posRaw === 'top_left' ||
                posRaw === 'bottom_right' ||
                posRaw === 'bottom_left'
                  ? posRaw
                  : dIdx === 0
                  ? 'top_right'
                  : 'bottom_left';
              return {
                speaker: String(b.speaker || '').trim().slice(0, 40),
                text: String(b.text || '').trim().slice(0, 190),
                bubbleType,
                position,
              };
            })
            .filter((d) => d.text.length > 0)
        : [];

      const rawCharactersPresent = Array.isArray(p.charactersPresent)
        ? p.charactersPresent
            .map((x) => String(x || '').trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];

      const sceneDescriptionAr = String(p.sceneDescriptionAr || '').trim().slice(0, 260);
      const narrationBox = p.narrationBox
        ? String(p.narrationBox).trim().slice(0, 220)
        : undefined;

      const matchedProfiles = matchPanelCharacters(
        {
          charactersPresent: rawCharactersPresent,
          title,
          sceneDescriptionAr,
          narrationBox,
          dialogues,
        },
        meta.characterBible
      );

      const finalCharactersPresent =
        rawCharactersPresent.length > 0
          ? rawCharactersPresent
          : matchedProfiles.map((c) => c.name);

      const baseInfo = {
        panelNumber: idx + 1,
        title,
        mood,
        cameraAngle,
        layout,
        palette,
      };

      return {
        ...baseInfo,
        sceneDescriptionAr,
        narrationBox,
        dialogues,
        sfxText: p.sfxText ? String(p.sfxText).trim().slice(0, 40) : undefined,
        charactersPresent:
          finalCharactersPresent.length > 0 ? finalCharactersPresent : undefined,
        characterVisualNotesAr: p.characterVisualNotesAr
          ? String(p.characterVisualNotesAr).trim().slice(0, 220)
          : matchedProfiles.length > 0
          ? matchedProfiles
              .map((c) => `${c.name}: ${c.appearanceAr.slice(0, 85)}`)
              .join(' · ')
              .slice(0, 220)
          : undefined,
        svgArt: sanitizePanelSvg(
          p.svgArt,
          baseInfo,
          Boolean(preset.isMonochrome),
          matchedProfiles[0],
          matchedProfiles[1]
        ),
      };
    });

  return {
    id: `manhwa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    bookTitle: meta.bookTitle.trim() || 'مانهوا سُطور',
    chapterTitle: meta.chapterTitle.trim() || 'الحلقة الأولى',
    styleId: meta.styleId,
    styleSummaryAr:
      typeof raw.styleSummaryAr === 'string' && raw.styleSummaryAr.trim()
        ? raw.styleSummaryAr.trim().slice(0, 240)
        : preset.subtitleAr,
    extractedPalette,
    usedReferenceImage: meta.usedReferenceImage,
    strictFileMode: meta.strictFileMode ?? Boolean(meta.characterBible),
    characterBibleUsed: meta.characterBible || undefined,
    panels,
    createdAt: Date.now(),
  };
}

export function buildManhwaPrintableHtml(episode: ManhwaEpisode): string {
  const panelsHtml = episode.panels
    .map((panel) => {
      const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(panel.svgArt)}`;
      const bubblesHtml = panel.dialogues
        .map((b) => {
          const isShout = b.bubbleType === 'shout';
          const isThought = b.bubbleType === 'thought';
          const posStyle =
            b.position === 'top_right'
              ? 'top:18px;right:18px;'
              : b.position === 'top_left'
              ? 'top:18px;left:18px;'
              : b.position === 'bottom_right'
              ? 'bottom:18px;right:18px;'
              : 'bottom:18px;left:18px;';
          return `<div style="position:absolute;${posStyle}max-width:44%;background:${
            isShout ? '#FEF08A' : '#FFFFFF'
          };color:#111;padding:10px 14px;border-radius:${
            isThought ? '24px' : '16px'
          };border:${isShout ? '3px solid #DC2626' : isThought ? '2px dashed #475569' : '2.5px solid #111'};box-shadow:0 8px 20px rgba(0,0,0,0.45);font-size:14px;font-weight:800;line-height:1.5;">
            ${b.speaker ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;">${escapeXml(b.speaker)}</div>` : ''}
            <div>${escapeXml(b.text)}</div>
          </div>`;
        })
        .join('');

      return `<section style="margin-bottom:24px;background:#12101A;border:2px solid #2C253D;border-radius:18px;overflow:hidden;">
        ${
          panel.narrationBox
            ? `<div style="background:#FAF3E0;color:#1A140B;padding:12px 18px;border-bottom:2px solid #1A140B;font-size:15px;font-weight:700;line-height:1.7;">${escapeXml(
                panel.narrationBox
              )}</div>`
            : ''
        }
        <div style="position:relative;">
          <img src="${svgData}" alt="${escapeXml(panel.title)}" style="display:block;width:100%;height:auto;"/>
          ${bubblesHtml}
          ${
            panel.sfxText
              ? `<div style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%) rotate(-6deg);font-size:26px;font-weight:900;color:#FACC15;text-shadow:2px 2px 0 #000,-2px -2px 0 #000,0 0 18px rgba(250,204,21,0.8);letter-spacing:1px;">${escapeXml(
                  panel.sfxText
                )}</div>`
              : ''
          }
        </div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(episode.bookTitle)} — ${escapeXml(episode.chapterTitle)} (مانهوا سُطور)</title>
  <style>
    body { margin:0; padding:24px 14px; background:#09080F; color:#F8FAFC; font-family: 'Cairo', 'Tajawal', system-ui, sans-serif; }
    main { max-width: 760px; margin: 0 auto; }
    header { text-align:center; margin-bottom:28px; padding-bottom:18px; border-bottom:1px solid rgba(217,164,65,0.35); }
    h1 { margin:0; font-size:28px; color:#F5D68A; }
    p.sub { margin:6px 0 0; color:#A8A29E; font-size:14px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeXml(episode.bookTitle)}</h1>
      <p class="sub">${escapeXml(episode.chapterTitle)} · أسلوب الرسم: ${escapeXml(episode.styleSummaryAr)}</p>
    </header>
    ${panelsHtml}
  </main>
</body>
</html>`;
}

const MANHWA_GALLERY_STORAGE_KEY = 'sutoor_manhwa_episodes_v1';

export function loadSavedManhwaEpisodes(): ManhwaEpisode[] {
  try {
    const raw = localStorage.getItem(MANHWA_GALLERY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManhwaEpisode[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function saveManhwaEpisodes(episodes: ManhwaEpisode[]): void {
  try {
    localStorage.setItem(
      MANHWA_GALLERY_STORAGE_KEY,
      JSON.stringify(episodes.slice(0, 12))
    );
  } catch {
    // quota safe
  }
}
