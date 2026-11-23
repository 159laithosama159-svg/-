/**
 * Pure utilities for VALDRION Universal Free Connected Ecosystem:
 * - Real Internet Media & Assets (Wikimedia Commons + Openverse CC)
 * - Canva-Style Live Visual Design Studio & Direct Canva Deep-Links
 * - GitHub Open-Source Repositories & Addons Explorer
 * - Wikipedia + Open Library Books + arXiv Scientific Papers
 * - Live Free Pulse (Open-Meteo Weather, CoinGecko Crypto, Frankfurter Forex, Hacker News)
 * - Automatic Live Free Tool Intent Detection for Autonomous Commander
 */

export type CanvaPresetId =
  | 'ig_post'
  | 'story_reels'
  | 'youtube_thumb'
  | 'presentation'
  | 'logo_brand'
  | 'game_cover';

export interface CanvaDesignPreset {
  id: CanvaPresetId;
  label: string;
  dimensionsLabel: string;
  width: number;
  height: number;
  canvaCreateUrl: string;
}

export interface WebMediaAsset {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
  source: 'wikimedia' | 'openverse';
  author: string;
  license: string;
  width?: number;
  height?: number;
}

export interface GitHubRepoAsset {
  id: number;
  fullName: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  topics: string[];
  updatedAt: string;
}

export interface WikiKnowledgeCard {
  title: string;
  summary: string;
  url: string;
  thumbnail?: string;
  lang: 'ar' | 'en';
}

export interface FreeBookAsset {
  id: string;
  title: string;
  author: string;
  firstPublishYear?: number;
  url: string;
  coverUrl?: string;
}

export interface ArxivPaperAsset {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  url: string;
}

export interface LiveWeatherSnapshot {
  city: string;
  country: string;
  temperatureC: number;
  windSpeedKmh: number;
  weatherCode: number;
  weatherLabel: string;
  isDay: boolean;
}

export interface LiveCryptoTicker {
  id: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
}

export interface LiveTechStory {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
}

export interface LiveFreePulseData {
  weather: LiveWeatherSnapshot | null;
  crypto: LiveCryptoTicker[];
  forexBaseUsd: Record<string, number>;
  techNews: LiveTechStory[];
  fetchedAt: string;
}

export interface CountryAtlasCard {
  nameCommon: string;
  nameArabic?: string;
  capital: string;
  region: string;
  population: number;
  currencies: string[];
  languages: string[];
  flagPng: string;
  mapsUrl: string;
}

export interface NpmPackageAsset {
  name: string;
  version: string;
  description: string;
  npmUrl: string;
  repositoryUrl?: string;
  publisher?: string;
  keywords: string[];
}

export interface DictionaryEntryAsset {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

export interface TvMazeShowAsset {
  id: number;
  name: string;
  premiered: string;
  rating?: number;
  genres: string[];
  summary: string;
  imageUrl?: string;
  officialUrl: string;
}

export const CANVA_DESIGN_PRESETS: CanvaDesignPreset[] = [
  {
    id: 'ig_post',
    label: 'منشور إنستغرام',
    dimensionsLabel: '1080 × 1080',
    width: 1080,
    height: 1080,
    canvaCreateUrl: 'https://www.canva.com/create/instagram-posts/',
  },
  {
    id: 'story_reels',
    label: 'ستوري / ريلز',
    dimensionsLabel: '1080 × 1920',
    width: 1080,
    height: 1920,
    canvaCreateUrl: 'https://www.canva.com/create/instagram-stories/',
  },
  {
    id: 'youtube_thumb',
    label: 'غلاف يوتيوب',
    dimensionsLabel: '1280 × 720',
    width: 1280,
    height: 720,
    canvaCreateUrl: 'https://www.canva.com/create/youtube-thumbnails/',
  },
  {
    id: 'presentation',
    label: 'شريحة عرض 16:9',
    dimensionsLabel: '1920 × 1080',
    width: 1920,
    height: 1080,
    canvaCreateUrl: 'https://www.canva.com/create/presentations/',
  },
  {
    id: 'logo_brand',
    label: 'شعار وهوية بصرية',
    dimensionsLabel: '1000 × 1000',
    width: 1000,
    height: 1000,
    canvaCreateUrl: 'https://www.canva.com/create/logos/',
  },
  {
    id: 'game_cover',
    label: 'غلاف لعبة جودوت',
    dimensionsLabel: '1280 × 720',
    width: 1280,
    height: 720,
    canvaCreateUrl: 'https://www.canva.com/create/posters/',
  },
];

export interface EcosystemBridgeStatus {
  id: string;
  name: string;
  englishName: string;
  capability: string;
  costLabel: string;
  actionTab:
    | 'media'
    | 'canva'
    | 'github'
    | 'knowledge'
    | 'pulse'
    | 'world'
    | 'godot'
    | 'research'
    | 'url';
}

export const ECOSYSTEM_BRIDGES: EcosystemBridgeStatus[] = [
  {
    id: 'bridge_godot',
    name: 'محرك ألعاب جودوت 4',
    englishName: 'Godot 4.3+ Live WS',
    capability: 'توليد ألعاب GDScript + .tscn + مزامنة حيّة وتحميل .zip',
    costLabel: 'مجاني 100%',
    actionTab: 'godot',
  },
  {
    id: 'bridge_media',
    name: 'صور وأصول الإنترنت الحقيقية',
    englishName: 'Wikimedia + Openverse',
    capability: 'جلب صور وخلفيات ورسومات مجانية حقيقية من الإنترنت مباشرة',
    costLabel: 'مجاني 100%',
    actionTab: 'media',
  },
  {
    id: 'bridge_canva',
    name: 'استوديو كانفا والتصميم',
    englishName: 'Canva Studio + HD PNG',
    capability: 'قوالب سوشيال ميديا ويوتيوب وعروض قابلة للتصدير HD أو الفتح في Canva',
    costLabel: 'مجاني 100%',
    actionTab: 'canva',
  },
  {
    id: 'bridge_github',
    name: 'مستكشف GitHub المفتوح',
    englishName: 'GitHub Public API',
    capability: 'البحث عن مشاريع وإضافات جودوت وأكواد مفتوحة وتفكيكها بالذكاء',
    costLabel: 'مجاني 100%',
    actionTab: 'github',
  },
  {
    id: 'bridge_wiki',
    name: 'ويكيبيديا والكتب والأبحاث',
    englishName: 'Wikipedia + OpenLibrary + arXiv',
    capability: 'موسوعة معرفية فورية، كتب عالمية، وأوراق علمية محكّمة مجاناً',
    costLabel: 'مجاني 100%',
    actionTab: 'knowledge',
  },
  {
    id: 'bridge_weather',
    name: 'الطقس العالمي الحي',
    englishName: 'Open-Meteo Weather API',
    capability: 'درجات الحرارة والرياح وحالة الطقس لأي مدينة في العالم لحظياً',
    costLabel: 'مجاني 100%',
    actionTab: 'pulse',
  },
  {
    id: 'bridge_markets',
    name: 'العملات الرقمية والصرف الحي',
    englishName: 'CoinGecko + Frankfurter',
    capability: 'أسعار بيتكوين وإيثريوم وسولانا وأسعار صرف العملات العالمية لحظياً',
    costLabel: 'مجاني 100%',
    actionTab: 'pulse',
  },
  {
    id: 'bridge_hn',
    name: 'رادار التقنية والأخبار الحية',
    englishName: 'Hacker News Live Feed',
    capability: 'أحدث أخبار البرمجة والذكاء الاصطناعي والشركات التقنية أولاً بأول',
    costLabel: 'مجاني 100%',
    actionTab: 'pulse',
  },
  {
    id: 'bridge_search',
    name: 'محرك البحث الحي Google',
    englishName: 'Live Web Grounding',
    capability: 'بحث حي في الويب مع توثيق المصادر والروابط المحدثة',
    costLabel: 'مدمج',
    actionTab: 'research',
  },
  {
    id: 'bridge_url',
    name: 'محلّل المواقع والروابط',
    englishName: 'URL Context Engine',
    capability: 'قراءة وتلخيص أي موقع عام واستخراج بياناته فوراً',
    costLabel: 'مدمج',
    actionTab: 'url',
  },
  {
    id: 'bridge_countries',
    name: 'أطلس دول العالم الحي',
    englishName: 'REST Countries Global API',
    capability: 'عواصم، سكان، عملات، لغات وأعلام كل دول العالم لحظياً',
    costLabel: 'مجاني 100%',
    actionTab: 'world',
  },
  {
    id: 'bridge_npm',
    name: 'سجل حزم البرمجة العالمي',
    englishName: 'NPM Open Registry',
    capability: 'البحث عن أحدث مكتبات JavaScript/TypeScript وإصداراتها الحية',
    costLabel: 'مجاني 100%',
    actionTab: 'world',
  },
  {
    id: 'bridge_dictionary',
    name: 'القاموس العالمي والصوتيات',
    englishName: 'Free Dictionary API',
    capability: 'تعريفات دقيقة وأمثلة سياقية ونطق للمصطلحات العالمية',
    costLabel: 'مجاني 100%',
    actionTab: 'world',
  },
  {
    id: 'bridge_tvmaze',
    name: 'قاعدة المسلسلات والعروض العالمية',
    englishName: 'TVMaze Global Catalog',
    capability: 'بحث فوري في آلاف المسلسلات العالمية وتقييماتها وملخصاتها',
    costLabel: 'مجاني 100%',
    actionTab: 'world',
  },
];

export function isValidHttpsImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeWebMediaAsset(raw: {
  id?: string;
  title?: string;
  thumbUrl?: string;
  fullUrl?: string;
  pageUrl?: string;
  source?: 'wikimedia' | 'openverse';
  author?: string;
  license?: string;
  width?: number;
  height?: number;
}): WebMediaAsset | null {
  const thumb = (raw.thumbUrl || raw.fullUrl || '').trim();
  const full = (raw.fullUrl || raw.thumbUrl || '').trim();
  if (!isValidHttpsImageUrl(thumb) || !isValidHttpsImageUrl(full)) return null;

  return {
    id: String(raw.id || `${raw.source || 'web'}_${Math.random().toString(36).slice(2, 8)}`),
    title: (raw.title || 'صورة من الإنترنت')
      .replace(/^File:/i, '')
      .replace(/\.(jpg|jpeg|png|webp|svg|gif)$/i, '')
      .trim()
      .slice(0, 120),
    thumbUrl: thumb,
    fullUrl: full,
    pageUrl: isValidHttpsImageUrl(raw.pageUrl || '') ? String(raw.pageUrl) : full,
    source: raw.source === 'openverse' ? 'openverse' : 'wikimedia',
    author: (raw.author || 'مبدع مشاع إبداعي').replace(/<[^>]+>/g, '').trim().slice(0, 80),
    license: (raw.license || 'CC').trim().slice(0, 40),
    width: typeof raw.width === 'number' && raw.width > 0 ? raw.width : undefined,
    height: typeof raw.height === 'number' && raw.height > 0 ? raw.height : undefined,
  };
}

export function normalizeGitHubRepo(raw: Record<string, unknown>): GitHubRepoAsset | null {
  const fullName = typeof raw.full_name === 'string' ? raw.full_name.trim() : '';
  const htmlUrl = typeof raw.html_url === 'string' ? raw.html_url.trim() : '';
  if (!fullName || !isValidHttpsImageUrl(htmlUrl)) return null;

  return {
    id: Number(raw.id) || Math.floor(Math.random() * 1_000_000),
    fullName,
    description:
      typeof raw.description === 'string'
        ? raw.description.trim().slice(0, 220)
        : 'مستودع مفتوح المصدر على GitHub',
    url: htmlUrl,
    language: typeof raw.language === 'string' && raw.language ? raw.language : 'Multi',
    stars: Number(raw.stargazers_count) || 0,
    topics: Array.isArray(raw.topics)
      ? raw.topics.filter((t): t is string => typeof t === 'string').slice(0, 4)
      : [],
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at.slice(0, 10) : '',
  };
}

export function describeWmoWeatherCode(code: number): string {
  if (code === 0) return 'سماء صافية';
  if (code <= 3) return 'غائم جزئياً';
  if (code === 45 || code === 48) return 'ضباب';
  if (code >= 51 && code <= 67) return 'أمطار خفيفة إلى متوسطة';
  if (code >= 71 && code <= 77) return 'ثلوج';
  if (code >= 80 && code <= 82) return 'زخات مطر';
  if (code >= 95) return 'عواصف رعدية';
  return 'أجواء متقلبة';
}

export function parseArxivAtomXml(xml: string, limit = 5): ArxivPaperAsset[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const results: ArxivPaperAsset[] = [];

  for (const entry of entries.slice(0, limit)) {
    const idRaw = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || '';
    const titleRaw = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const summaryRaw =
      entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const publishedRaw = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.slice(0, 10) || '';
    const authorMatches = Array.from(entry.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) =>
      m[1].trim()
    );

    if (titleRaw && isValidHttpsImageUrl(idRaw)) {
      results.push({
        id: idRaw,
        title: titleRaw.slice(0, 180),
        summary: summaryRaw.slice(0, 320),
        authors: authorMatches.slice(0, 3),
        published: publishedRaw,
        url: idRaw.replace(/^http:\/\//i, 'https://'),
      });
    }
  }

  return results;
}

export function normalizeCountryAtlas(raw: Record<string, unknown>): CountryAtlasCard | null {
  const nameObj = (raw.name || {}) as { common?: string };
  const nameCommon = typeof nameObj.common === 'string' ? nameObj.common.trim() : '';
  if (!nameCommon) return null;

  const translations = (raw.translations || {}) as { ara?: { common?: string } };
  const capitals = Array.isArray(raw.capital) ? raw.capital : [];
  const currenciesObj = (raw.currencies || {}) as Record<string, { name?: string; symbol?: string }>;
  const languagesObj = (raw.languages || {}) as Record<string, string>;
  const flagsObj = (raw.flags || {}) as { png?: string; svg?: string };
  const mapsObj = (raw.maps || {}) as { googleMaps?: string; openStreetMaps?: string };

  return {
    nameCommon,
    nameArabic: typeof translations.ara?.common === 'string' ? translations.ara.common : undefined,
    capital: typeof capitals[0] === 'string' ? capitals[0] : '—',
    region: typeof raw.region === 'string' ? raw.region : 'العالم',
    population: Number(raw.population) || 0,
    currencies: Object.entries(currenciesObj)
      .slice(0, 3)
      .map(([code, v]) => `${code}${v?.symbol ? ` (${v.symbol})` : ''}`),
    languages: Object.values(languagesObj).slice(0, 4),
    flagPng:
      typeof flagsObj.png === 'string' && isValidHttpsImageUrl(flagsObj.png) ? flagsObj.png : '',
    mapsUrl:
      typeof mapsObj.openStreetMaps === 'string' && isValidHttpsImageUrl(mapsObj.openStreetMaps)
        ? mapsObj.openStreetMaps
        : `https://www.openstreetmap.org/search?query=${encodeURIComponent(nameCommon)}`,
  };
}

export function normalizeNpmPackage(raw: Record<string, unknown>): NpmPackageAsset | null {
  const pkg = ((raw.package || raw) as Record<string, unknown>) || {};
  const name = typeof pkg.name === 'string' ? pkg.name.trim() : '';
  if (!name) return null;
  const links = (pkg.links || {}) as { npm?: string; repository?: string };
  const publisher = (pkg.publisher || {}) as { username?: string };
  return {
    name,
    version: typeof pkg.version === 'string' ? pkg.version : 'latest',
    description:
      typeof pkg.description === 'string'
        ? pkg.description.trim().slice(0, 200)
        : 'حزمة مفتوحة المصدر على NPM',
    npmUrl:
      typeof links.npm === 'string' && isValidHttpsImageUrl(links.npm)
        ? links.npm
        : `https://www.npmjs.com/package/${encodeURIComponent(name)}`,
    repositoryUrl:
      typeof links.repository === 'string' && isValidHttpsImageUrl(links.repository)
        ? links.repository
        : undefined,
    publisher: typeof publisher.username === 'string' ? publisher.username : undefined,
    keywords: Array.isArray(pkg.keywords)
      ? pkg.keywords.filter((k): k is string => typeof k === 'string').slice(0, 4)
      : [],
  };
}

export interface LiveToolAutoPlan {
  weatherCity?: string;
  needCryptoForex: boolean;
  githubQuery?: string;
  techNews: boolean;
  arxivQuery?: string;
  countryQuery?: string;
  npmQuery?: string;
}

/**
 * Pure intent detector that lets VALDRION MIND's Autonomous Brain automatically call
 * real 100% free public APIs (Open-Meteo, CoinGecko, Frankfurter, GitHub, Hacker News,
 * arXiv, REST Countries, NPM Registry) whenever the user's prompt benefits from fresh live data.
 */
export function detectLiveConnectorContext(prompt: string): LiveToolAutoPlan {
  const lower = prompt.toLowerCase();
  const plan: LiveToolAutoPlan = {
    needCryptoForex: false,
    techNews: false,
  };

  if (/(طقس|حرارة|جو|مطر|weather|temperature|forecast)/i.test(lower)) {
    const cityMatch =
      prompt.match(/(?:في|بـ|بمدينة|in|for)\s+([A-Za-z\u0621-\u064A]{3,24})/i)?.[1] || 'Riyadh';
    plan.weatherCity = cityMatch.replace(/[؟?!،.,:;]+$/g, '').trim();
  }

  if (
    /(بيتكوين|إيثريوم|ايثريوم|سولانا|كريبتو|عملات رقمية|سعر الصرف|دولار|يورو|bitcoin|btc|eth|crypto|forex|exchange rate)/i.test(
      lower
    )
  ) {
    plan.needCryptoForex = true;
  }

  if (/(github|جيت هاب|مستودع|مكتبة مفتوحة|إضافة جودوت|godot addon|open source repo)/i.test(lower)) {
    const cleaned = prompt
      .replace(/(?:ابحث|هات|اعطني|في|عن|github|جيت هاب|مستودعات|مشاريع)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    plan.githubQuery = cleaned.slice(0, 60) || 'godot 4';
  }

  if (/(أخبار التقنية|اخبار التقنية|hacker news|tech news|ترند البرمجة|آخر أخبار الذكاء)/i.test(lower)) {
    plan.techNews = true;
  }

  if (/(ورقة علمية|بحث علمي|arxiv|دراسة علمية|research paper)/i.test(lower)) {
    const cleaned = prompt
      .replace(/(?:ابحث|هات|اعطني|ورقة علمية|بحث علمي|عن|في|arxiv)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    plan.arxivQuery = cleaned.slice(0, 60) || 'artificial intelligence';
  }

  if (/(عاصمة|تعداد سكان|دولة|country info|population of|capital of)/i.test(lower)) {
    const m = prompt.match(
      /(?:دولة|عاصمة|سكان|country\s+info|country|population\s+of|capital\s+of)\s+(?:(?:country|info|about|for|of)\s+)*([A-Za-z]{3,28})/i
    )?.[1];
    if (m) {
      plan.countryQuery = m.replace(/[؟?!،.,:;]+$/g, '').trim();
    }
  }

  if (/(حزمة npm|مكتبة npm|npm package|npmjs)/i.test(lower)) {
    const cleaned = prompt
      .replace(/(?:ابحث|عن|حزمة|مكتبة|npm|package|npmjs)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    plan.npmQuery = cleaned.slice(0, 50) || 'react';
  }

  return plan;
}

export function buildCanvaDesignPrompt(params: {
  topic: string;
  presetId: CanvaPresetId;
  selectedImage?: WebMediaAsset | null;
  outputKind?: 'svg' | 'html';
}): string {
  const preset =
    CANVA_DESIGN_PRESETS.find((p) => p.id === params.presetId) || CANVA_DESIGN_PRESETS[0];
  const topic = params.topic.trim() || 'تصميم إعلاني فاخر لعلامة تجارية عربية';
  const kind = params.outputKind || 'svg';

  const photoLine = params.selectedImage
    ? `\n- ادمج هذه الصورة الحقيقية من الإنترنت كخلفية أو عنصر بصري رئيسي داخل التصميم: ${params.selectedImage.thumbUrl} (العنوان: ${params.selectedImage.title}) مع طبقة تباين داكنة أنيقة لوضوح النص.`
    : '';

  if (kind === 'html') {
    return `بصفتك مصمم كانفا والهوية البصرية المحترف، أنشئ تصميماً تفاعلياً بمقاس (${preset.label} - ${preset.dimensionsLabel}) لموضوع: «${topic}».${photoLine}
- قدّم التصميم داخل كتلة \`\`\`html ... \`\`\` واحدة متكاملة تحتوي على أدوات تعديل سريعة للمستخدم (تغيير العنوان، تغيير اللون الأساسي، وتصدير/حفظ التصميم) مع إبراز التصميم بأسلوب Canva الاحترافي الجذاب.`;
  }

  return `بصفتك مصمم كانفا والهوية البصرية المحترف، صمّم عملاً بصرياً متكاملاً بمقاس (${preset.label} — viewBox="0 0 ${preset.width} ${preset.height}") لموضوع: «${topic}».${photoLine}
- أدرج التصميم كاملاً داخل كتلة \`\`\`svg ... \`\`\` غنية بالتدرجات السينمائية، العناوين العربية المقروءة الفاخرة، الزخارف الهندسية، والتوازن البصري المتقن ليكون جاهزاً للمعاينة الحية وتصدير HD PNG فوراً، ثم اقترح 3 تعديلات سريعة يمكن تطبيقها في Canva.`;
}
