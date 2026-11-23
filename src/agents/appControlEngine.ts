import { normalizeArabicText } from '../utils/sovereignAiEngine';
import {
  parseSmartXtreamCredentials,
  type ParsedXtreamCredential,
} from '../utils/cinemaLogic';
import type { NavTab, ProfileId, ServerProfile } from '../types/cinema';

export type NovelsDeepTab =
  | 'library'
  | 'manhwa'
  | 'reader'
  | 'studio'
  | 'interactive'
  | 'world'
  | 'shelf';

export type InternalToolTarget =
  | 'godot'
  | 'voice'
  | 'connectors'
  | 'brain'
  | 'deconstruct'
  | 'agents'
  | 'settings'
  | 'apps';

export type ValdrionAppCommand =
  | { type: 'switch_app'; app: 'ai' | 'cinema' | 'novels' | 'private-ai'; labelAr: string }
  | { type: 'cinema_tab'; tab: Exclude<NavTab, 'ai'>; labelAr: string }
  | { type: 'cinema_search'; query: string; labelAr: string }
  | { type: 'cinema_play'; query: string; labelAr: string }
  | { type: 'cinema_random'; labelAr: string }
  | { type: 'cinema_open_servers'; labelAr: string }
  | { type: 'cinema_import_servers'; credentials: ParsedXtreamCredential[]; labelAr: string }
  | { type: 'cinema_export_servers'; labelAr: string }
  | { type: 'cinema_open_epg'; labelAr: string }
  | { type: 'cinema_open_watch_party'; labelAr: string }
  | { type: 'cinema_open_devices'; labelAr: string }
  | { type: 'cinema_open_auth'; labelAr: string }
  | { type: 'cinema_tv_mode'; enabled: boolean; labelAr: string }
  | { type: 'cinema_family_guard'; enabled: boolean; labelAr: string }
  | { type: 'cinema_profile'; profileId: ProfileId; labelAr: string }
  | { type: 'novels_tab'; tab: NovelsDeepTab; labelAr: string }
  | { type: 'novel_create'; title: string; genre?: string; labelAr: string }
  | { type: 'novel_web_download'; query: string; labelAr: string }
  | { type: 'cinema_web_download'; query: string; labelAr: string }
  | { type: 'novel_download'; query?: string; labelAr: string }
  | { type: 'security_open_shield'; labelAr: string }
  | { type: 'security_lock_now'; labelAr: string }
  | { type: 'social_open_hub'; labelAr: string }
  | { type: 'open_tool'; tool: InternalToolTarget; labelAr: string }
  | { type: 'ai_new_chat'; labelAr: string }
  | { type: 'ai_clear_chat'; labelAr: string }
  | { type: 'ai_set_mode'; commander: boolean; labelAr: string }
  | { type: 'ai_web_search'; enabled: boolean; labelAr: string }
  | { type: 'ai_auto_speak'; enabled: boolean; labelAr: string }
  | { type: 'ai_self_evolve'; labelAr: string }
  | { type: 'speak_reply'; labelAr: string };

export interface ValdrionAppController {
  switchApp: (app: 'ai' | 'cinema' | 'novels' | 'private-ai') => void;
  openCinemaTab: (tab: Exclude<NavTab, 'ai'>) => void;
  searchCinema: (query: string) => void;
  playCinemaByQuery: (query: string) => boolean;
  playRandomCinema: () => boolean;
  openServersModal: () => void;
  importServersLocally: (servers: ServerProfile[], connectFirst?: boolean) => Promise<void>;
  exportServersBackup: () => number;
  openEpgModal: () => void;
  openWatchPartyModal: () => void;
  openDevicesModal: () => void;
  openAuthModal: () => void;
  setTvMode: (enabled: boolean) => void;
  setFamilyGuard: (enabled: boolean) => void;
  switchProfile: (profileId: ProfileId) => void;
  openNovelsTab: (tab: NovelsDeepTab) => void;
  openSecurityShield: () => void;
  lockAppNow: () => void;
  addWebCinemaItems?: (items: Array<{ id: string; title: string; year?: string; desc?: string; poster?: string; url: string; quality?: string; kind?: 'movie' | 'series' }>) => number;
}

export interface AppControlCapability {
  id: string;
  areaAr: string;
  examplesAr: string;
}

export const APP_CONTROL_CAPABILITIES: AppControlCapability[] = [
  {
    id: 'cinema_nav',
    areaAr: 'السينما والبث والسيرفرات الكاملة',
    examplesAr: 'أضف سيرفراتي تلقائياً / نزّل وصدّر السيرفرات / شغّل [اسم فيلم] / وضع TV الخفيف / دليل البرامج / مشاهدة جماعية',
  },
  {
    id: 'novels_full',
    areaAr: 'تأليف وإضافة وتنزيل الروايات والمانهوا',
    examplesAr: 'اعمل وأضف رواية بعنوان [...] / نزّل الرواية كملف / افتح استوديو المانهوا / روايات العالم / رفّي',
  },
  {
    id: 'social_wa',
    areaAr: 'التواصل الاجتماعي ومجموعات واتساب المسموحة',
    examplesAr: 'افتح ربط التواصل الاجتماعي / ابحث في حساباتي المربوطة ومجموعات واتساب المسموحة بإذنك فقط',
  },
  {
    id: 'security_shield',
    areaAr: 'درع الأمان الفائق والقفل الفوري',
    examplesAr: 'افتح درع الأمان / اقفل التطبيق الآن / تشفير OAuth بالخادم / حماية تسريب المفاتيح',
  },
  {
    id: 'vault_tools',
    areaAr: 'الخزنة الخاصة ومحرك الألعاب والأدوات',
    examplesAr: 'افتح الخزنة / Godot 4 / استوديو الفيديو / المحادثة الصوتية / موصّلات الويب / الذاكرة / طوّر نفسك',
  },
];

function dedupeCommands(commands: ValdrionAppCommand[]): ValdrionAppCommand[] {
  const seen = new Set<string>();
  const out: ValdrionAppCommand[] = [];
  for (const cmd of commands) {
    const key = JSON.stringify(cmd);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cmd);
    }
  }
  return out;
}

/**
 * Natural Arabic & English intent detector that maps user commands to real executable
 * actions across the entire VALDRION application.
 */
export function detectFullAppCommands(prompt: string): ValdrionAppCommand[] {
  const raw = String(prompt || '').trim();
  if (!raw) return [];
  const norm = normalizeArabicText(raw);
  const commands: ValdrionAppCommand[] = [];

  // 1) Smart local server import whenever user pastes valid Xtream credentials directly into chat
  const extractedServers = parseSmartXtreamCredentials(raw);
  if (extractedServers.length > 0) {
    commands.push({
      type: 'cinema_import_servers',
      credentials: extractedServers,
      labelAr: `حفظ ${extractedServers.length} سيرفر في السينما محلياً`,
    });
  }

  // 1B) Export/download saved servers backup (.json / .m3u)
  if (/(نزل|حمل|صدر|احفظ|download|export).*(السيرفرات|سيرفراتي|قائمه السيرفرات|servers)/i.test(norm)) {
    commands.push({
      type: 'cinema_export_servers',
      labelAr: 'تنزيل نسخة احتياطية من السيرفرات المحفوظة',
    });
  }

  // 1C-WEB) Search web & download real novels into VALDRION Novels library
  const webNovelMatch = raw.match(
    /(?:نزل|نزّل|حمل|حمّل|ابحث\s+ونزل|جيب|download|fetch)\s+(?:لي\s+)?(?:من\s+الويب\s+|من\s+النت\s+)?(?:رواي[ةه]|كتاب|قص[ةه])\s+(?:عن\s+|باسم\s+|بعنوان\s+)?[«"']?([^\n؟?!.،]{2,65})[»"']?/i
  );
  if (webNovelMatch?.[1] && !/(كملف|ملف|pdf|html)/i.test(norm)) {
    const q = webNovelMatch[1].trim();
    commands.push({
      type: 'novel_web_download',
      query: q,
      labelAr: `البحث بالويب وتنزيل رواية «${q}» في مكتبة التطبيق`,
    });
  }

  // 1C-CINEMA) Search web & download real movies/cinema items into VALDRION Cinema
  const webCinemaMatch = raw.match(
    /(?:نزل|نزّل|حمل|حمّل|ابحث\s+ونزل|جيب|أضف|اضف|download)\s+(?:لي\s+)?(?:من\s+الويب\s+|من\s+النت\s+)?(?:فيلم|افلام|أفلام|مسلسل|سينما)\s+(?:عن\s+|باسم\s+)?[«"']?([^\n؟?!.،]{2,65})[»"']?/i
  );
  if (webCinemaMatch?.[1]) {
    const q = webCinemaMatch[1].trim();
    commands.push({
      type: 'cinema_web_download',
      query: q,
      labelAr: `البحث بالويب وإضافة «${q}» إلى فالدريون سينما`,
    });
  }

  // 1C) Autonomous Novel Creation & Direct Publishing into VALDRION Novels
  const createNovelMatch = raw.match(
    /(?:اعمل|انشئ|أنشئ|أل[ّ]?ف|الف|اكتب|اصنع|create|write)\s+(?:لي\s+)?رواي[ةه]\s*(?:جديد[ةه]\s*)?(?:بعنوان|عن|اسمها)?\s*[«"']?([^\n؟?!.،]{2,70})[»"']?/i
  );
  if (createNovelMatch?.[1] && !/(افتح|روح|ادخل|نزل|حمل)/i.test(norm.slice(0, 14))) {
    const cleanTitle = createNovelMatch[1].trim();
    commands.push({
      type: 'novel_create',
      title: cleanTitle,
      labelAr: `تأليف وإضافة رواية «${cleanTitle}» للمكتبة`,
    });
  }

  // 1D) Export existing novel as file
  if (
    !commands.some((c) => c.type === 'novel_web_download') &&
    /(صدر|نزل|حمل|export|download|كملف|pdf|html).*(الرواي[ةه]|رواي[ةه]|الكتاب|novel)/i.test(norm)
  ) {
    const dlMatch = raw.match(/(?:الرواي[ةه]|رواي[ةه]|novel)\s+[«"']?([^\n؟?!.،]{2,60})[»"']?/i);
    commands.push({
      type: 'novel_download',
      query: dlMatch?.[1]?.trim(),
      labelAr: dlMatch?.[1] ? `تنزيل رواية «${dlMatch[1].trim()}» كملف` : 'تنزيل آخر رواية كملف نصي',
    });
  }

  // 1E) Security Shield & App Lock
  if (/(اقفل|قفل|غلق|lock).*(التطبيق|فالدريون|الشاشه|البرنامج|app)/i.test(norm)) {
    commands.push({ type: 'security_lock_now', labelAr: 'قفل التطبيق فوراً بدرع الأمان' });
  } else if (/(افتح|اعرض|ادخل|شغل|open).*(درع الامان|الامان|الحمايه الفائقه|قفل التطبيق|security shield)/i.test(norm)) {
    commands.push({ type: 'security_open_shield', labelAr: 'فتح درع الأمان الفائق' });
  }

  // 1F) Social Media OAuth & Authorized WhatsApp Groups Hub
  if (/(افتح|اعرض|اربط|ادخل|open).*(التواصل الاجتماعي|مواقع التواصل|مجموعات واتس|واتساب|حساباتي الاجتماعيه|social|oauth)/i.test(norm)) {
    commands.push({ type: 'social_open_hub', labelAr: 'فتح مركز التواصل الاجتماعي ومجموعات واتساب' });
  }

  // 2) Cinema playback / search / surprise
  const playMatch = raw.match(
    /(?:شغ[ّ]?ل|اعرض|ابغى\s*اشوف|بدي\s*احضر|شاهد|play|watch)\s+(?:لي\s+)?(?:فيلم|مسلسل|انمي|أنمي|قناة|البث)?\s*[«"']?([^\n؟?!.،]{2,48})[»"']?/i
  );
  if (
    playMatch?.[1] &&
    !/(عشوائي|حظ|سهره|السيرفر|التطبيق|الصوت|الويب|جودوت|الروايات|السينما|الخزنه|الفيديو|المانهوا|النطق|الوضع|التلفاز|الحمايه|بحث)/i.test(
      normalizeArabicText(playMatch[1])
    )
  ) {
    const q = playMatch[1].trim();
    if (q.length >= 2) {
      commands.push({
        type: 'cinema_play',
        query: q,
        labelAr: `تشغيل «${q}» في السينما`,
      });
    }
  }

  const cinemaSearchMatch = raw.match(
    /(?:ابحث\s+في\s+السينما\s+عن|دور\s+في\s+السينما\s+عن|بحث\s+سينما|ابحث\s+عن\s+(?:فيلم|مسلسل|انمي|أنمي|قناة))\s*[«"']?([^\n؟?!.،]{2,48})[»"']?/i
  );
  if (cinemaSearchMatch?.[1]) {
    const q = cinemaSearchMatch[1].trim();
    commands.push({
      type: 'cinema_search',
      query: q,
      labelAr: `البحث في السينما عن «${q}»`,
    });
  }

  if (/(فيلم عشوائي|حظ السهره|اقترح.*وشغل|شغل.*عشوائي|surprise me|random movie)/i.test(norm)) {
    commands.push({ type: 'cinema_random', labelAr: 'تشغيل فيلم عشوائي للسهرة' });
  }

  // 3) Cinema deep tabs & modals & settings
  if (/(افتح|ادخل|روح|اعرض|انتقل|اريني|open).*(اداره السيرفرات|السيرفرات|سيرفرات السينما|xtream|m3u)/i.test(norm)) {
    commands.push({ type: 'cinema_open_servers', labelAr: 'فتح إدارة سيرفرات السينما' });
  }
  if (/(افتح|ادخل|اعرض|شغل|open).*(دليل البرامج|epg|جدول القنوات)/i.test(norm)) {
    commands.push({ type: 'cinema_open_epg', labelAr: 'فتح دليل البرامج المباشر (EPG)' });
  }
  if (/(افتح|شغل|ابدا|اعمل|انشئ|open).*(مشاهده جماعيه|غرفه مشاهده|watch party)/i.test(norm)) {
    commands.push({ type: 'cinema_open_watch_party', labelAr: 'فتح غرفة المشاهدة الجماعية' });
  }
  if (/(افتح|اعرض|open).*(الاجهزه|السمارت|الاندرويد|ريموت|devices)/i.test(norm)) {
    commands.push({ type: 'cinema_open_devices', labelAr: 'فتح إعدادات الأجهزة والسمارت TV' });
  }
  if (/(افتح|اعرض|سجل|تسجيل الدخول|حسابي السحابي|login|auth)/i.test(norm) && /(حساب|دخول|جوجل|google|سحاب|auth)/i.test(norm)) {
    commands.push({ type: 'cinema_open_auth', labelAr: 'فتح نافذة الحساب والمزامنة السحابية' });
  }

  if (/(فعل|شغل|افتح|enable|turn on).*(وضع التلفاز|وضع الشاشه|smart tv|tv mode)/i.test(norm)) {
    commands.push({ type: 'cinema_tv_mode', enabled: true, labelAr: 'تفعيل وضع التلفاز (Smart TV)' });
  } else if (/(اوقف|الغ|عطل|اغلق|disable|turn off).*(وضع التلفاز|وضع الشاشه|smart tv|tv mode)/i.test(norm)) {
    commands.push({ type: 'cinema_tv_mode', enabled: false, labelAr: 'إيقاف وضع التلفاز' });
  }

  if (/(فعل|شغل|enable|turn on).*(الحمايه العا[ئيل]|فلتر العا[ئيل]|حمايه العا[ئيل]|family guard)/i.test(norm)) {
    commands.push({ type: 'cinema_family_guard', enabled: true, labelAr: 'تفعيل الحماية العائلية في السينما' });
  } else if (/(اوقف|الغ|عطل|disable|turn off).*(الحمايه العا[ئيل]|فلتر العا[ئيل]|حمايه العا[ئيل]|family guard)/i.test(norm)) {
    commands.push({ type: 'cinema_family_guard', enabled: false, labelAr: 'إيقاف الحماية العائلية' });
  }

  if (/(حول|غير|افتح|اختر|switch).*(ملف الاطفال|وضع الاطفال|kids profile)/i.test(norm)) {
    commands.push({ type: 'cinema_profile', profileId: 'kids', labelAr: 'التحويل إلى ملف الأطفال' });
  } else if (/(حول|غير|افتح|اختر|switch).*(ملف العا[ئيل]|وضع العا[ئيل]|family profile)/i.test(norm)) {
    commands.push({ type: 'cinema_profile', profileId: 'family', labelAr: 'التحويل إلى ملف العائلة' });
  } else if (/(حول|غير|افتح|اختر|switch).*(ملف vip|سينمائي vip|وضع vip|ملف امبراطوري|imperial|vip profile)/i.test(norm)) {
    commands.push({ type: 'cinema_profile', profileId: 'imperial', labelAr: 'التحويل إلى ملف سينمائي VIP' });
  }

  if (/(افتح|روح|انتقل|ادخل|اعرض|open).*(قسم الافلام|الافلام|movies)/i.test(norm) && !playMatch) {
    commands.push({ type: 'cinema_tab', tab: 'movies', labelAr: 'فتح قسم الأفلام' });
  } else if (/(افتح|روح|انتقل|ادخل|اعرض|open).*(المسلسلات|الانمي|series)/i.test(norm) && !playMatch) {
    commands.push({ type: 'cinema_tab', tab: 'series', labelAr: 'فتح قسم المسلسلات والأنمي' });
  } else if (/(افتح|روح|انتقل|ادخل|اعرض|open).*(البث المباشر|القنوات|live tv)/i.test(norm)) {
    commands.push({ type: 'cinema_tab', tab: 'live', labelAr: 'فتح قسم البث المباشر' });
  } else if (/(افتح|روح|انتقل|ادخل|اعرض|open).*(قائمتي|المفضله|mylist|favorites)/i.test(norm)) {
    commands.push({ type: 'cinema_tab', tab: 'mylist', labelAr: 'فتح قائمتي والمفضلة' });
  } else if (/(افتح|شغل|روح|انتقل|ادخل|open).*(السينما|سينما|تطبيق المشاهده|cinema)/i.test(norm)) {
    commands.push({ type: 'switch_app', app: 'cinema', labelAr: 'فتح فالدريون · السينما والبث' });
  }

  // 4) Novels & Manhwa deep tabs
  if (/(افتح|روح|انتقل|ادخل|شغل|open).*(مانهوا|المانهوا|ارسم مانهوا|manhwa)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'manhwa', labelAr: 'فتح استوديو المانهوا بالرسم' });
  } else if (/(افتح|روح|انتقل|ادخل|open).*(روايات العالم|ملايين الروايات|world novels)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'world', labelAr: 'فتح مكتبة روايات العالم بالعربي' });
  } else if (/(افتح|روح|انتقل|ادخل|open).*(استوديو التاليف|الف روايه|تأليف الروايات|novel studio)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'studio', labelAr: 'فتح استوديو تأليف الروايات' });
  } else if (/(افتح|روح|انتقل|ادخل|open).*(اصنع قرارك|روايه تفاعليه|interactive)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'interactive', labelAr: 'فتح الروايات التفاعلية (اصنع قرارك)' });
  } else if (/(افتح|روح|انتقل|ادخل|open).*(رفي|رف الروايات|shelf)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'shelf', labelAr: 'فتح رفّي للروايات' });
  } else if (/(افتح|روح|انتقل|ادخل|open).*(القارئ الفاخر|قارئ الروايات|reader)/i.test(norm)) {
    commands.push({ type: 'novels_tab', tab: 'reader', labelAr: 'فتح القارئ الفاخر' });
  } else if (/(افتح|شغل|روح|انتقل|ادخل|open).*(الروايات|روايات|سطور|novels)/i.test(norm)) {
    commands.push({ type: 'switch_app', app: 'novels', labelAr: 'فتح فالدريون · الروايات والمانهوا' });
  }

  // 5) Private Vault
  if (/(افتح|شغل|روح|انتقل|ادخل|open).*(الخزنه|خزنه|خزنتي|سري|ذكائي الخاص|vault)/i.test(norm)) {
    commands.push({ type: 'switch_app', app: 'private-ai', labelAr: 'فتح فالدريون · الخزنة الخاصة' });
  }

  // 6) Internal AI Studio tools & drawers
  if (/(افتح|شغل|ادخل|open).*(جودوت|godot|محرك الالعاب)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'godot', labelAr: 'فتح محرك ألعاب Godot 4' });
  }
  if (/(افتح|شغل|ابدا|open).*(تحدث حي|مكالمه|محادثه صوتيه|التواصل الصوتي|live voice)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'voice', labelAr: 'فتح التواصل الصوتي الحي' });
  }
  if (/(افتح|شغل|ادخل|open).*(موصلات|بوابه الويب|connectors)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'connectors', labelAr: 'فتح موصّلات الإنترنت الحي' });
  }
  if (/(افتح|شغل|ادخل|open).*(الذاكره|العقل|ملفي الشخصي|brain)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'brain', labelAr: 'فتح العقل والذاكرة الشخصية' });
  }
  if (/(افتح|شغل|ادخل|open).*(مختبر|تفكيك|فحص المشروع|deconstruct)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'deconstruct', labelAr: 'فتح مختبر تفكيك المشاريع' });
  }
  if (/(افتح|شغل|اعرض|open).*(دليل الوكلاء|الوكلاء المتخصصين|agents)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'agents', labelAr: 'فتح دليل الوكلاء المتخصصين' });
  }
  if (/(افتح|اعرض|ادخل|open).*(التطبيقات المربوطه|ربط التطبيقات|الويب هوك|webhooks)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'apps', labelAr: 'فتح لوحة التطبيقات المربوطة والتحكم' });
  } else if (/(افتح|اعرض|ادخل|open).*(اعدادات القائد|الاعدادات|settings)/i.test(norm)) {
    commands.push({ type: 'open_tool', tool: 'settings', labelAr: 'فتح إعدادات القائد' });
  }

  // 7) Self-control over AI workspace (strictly short explicit commands so regular chat NEVER resets!)
  if (raw.length < 45 && /^(?:افتح\s+|ابد[اأ]\s+)?(?:محادثه جديده|new chat)$/i.test(norm)) {
    commands.push({ type: 'ai_new_chat', labelAr: 'بدء محادثة جديدة' });
  }
  if (raw.length < 45 && /^(?:امسح المحادثه|نظف المحادثه|clear chat)$/i.test(norm)) {
    commands.push({ type: 'ai_clear_chat', labelAr: 'تنظيف المحادثة الحالية' });
  }
  if (/(حول|فعل|شغل|switch).*(القائد المستقل|الوضع المستقل|commander mode)/i.test(norm)) {
    commands.push({ type: 'ai_set_mode', commander: true, labelAr: 'التحويل إلى وضع القائد المستقل' });
  } else if (/(حول|فعل|شغل|switch).*(الوضع السحابي|السحابي|cloud mode)/i.test(norm)) {
    commands.push({ type: 'ai_set_mode', commander: false, labelAr: 'التحويل إلى الوضع السحابي' });
  }
  if (/(فعل|شغل|enable).*(بحث الويب|البحث المباشر|web search)/i.test(norm)) {
    commands.push({ type: 'ai_web_search', enabled: true, labelAr: 'تفعيل البحث المباشر في الويب' });
  } else if (/(اوقف|الغ|عطل|disable).*(بحث الويب|البحث المباشر|web search)/i.test(norm)) {
    commands.push({ type: 'ai_web_search', enabled: false, labelAr: 'إيقاف البحث المباشر في الويب' });
  }
  if (/(فعل|شغل|enable).*(النطق التلقائي|القراءه التلقائيه|auto speak)/i.test(norm)) {
    commands.push({ type: 'ai_auto_speak', enabled: true, labelAr: 'تفعيل النطق الصوتي التلقائي' });
  } else if (/(اوقف|الغ|عطل|disable).*(النطق التلقائي|القراءه التلقائيه|auto speak)/i.test(norm)) {
    commands.push({ type: 'ai_auto_speak', enabled: false, labelAr: 'إيقاف النطق الصوتي التلقائي' });
  }
  if (/(طور نفسك|تطوير ذاتي|ابد[اأ] التطوير|self evolve)/i.test(norm)) {
    commands.push({ type: 'ai_self_evolve', labelAr: 'تشغيل دورة التطوير الذاتي' });
  }
  if (/(اقرا الرد|انطق|بصوت عال|تحدث بالرد|speak)/i.test(norm)) {
    commands.push({ type: 'speak_reply', labelAr: 'قراءة الإجابة صوتياً' });
  }

  return dedupeCommands(commands);
}

/**
 * Parses structured `[[APP_CMD:action|value]]` tags emitted by the AI model itself,
 * returning both the cleaned user-facing markdown and the list of validated commands to execute.
 */
export function parseEmbeddedAppCommands(markdown: string): {
  cleanMarkdown: string;
  commands: ValdrionAppCommand[];
} {
  const commands: ValdrionAppCommand[] = [];
  const regex = /\[\[APP_CMD:([a-z0-9_-]+)(?:\|([^\]]+))?\]\]/gi;

  const cleanMarkdown = String(markdown || '')
    .replace(regex, (_full, rawAction: string, rawArg?: string) => {
      const action = rawAction.toLowerCase().trim();
      const arg = (rawArg || '').trim();

      switch (action) {
        case 'switch_app':
          if (arg === 'cinema' || arg === 'novels' || arg === 'private-ai' || arg === 'ai') {
            commands.push({ type: 'switch_app', app: arg, labelAr: `الانتقال إلى ${arg}` });
          }
          break;
        case 'cinema_tab':
          if (arg === 'home' || arg === 'movies' || arg === 'series' || arg === 'live' || arg === 'mylist') {
            commands.push({ type: 'cinema_tab', tab: arg, labelAr: `فتح تبويب السينما (${arg})` });
          } else if (arg === 'favorites') {
            commands.push({ type: 'cinema_tab', tab: 'mylist', labelAr: 'فتح قائمتي والمفضلة' });
          }
          break;
        case 'cinema_search':
          if (arg) commands.push({ type: 'cinema_search', query: arg, labelAr: `البحث في السينما عن «${arg}»` });
          break;
        case 'cinema_play':
          if (arg) commands.push({ type: 'cinema_play', query: arg, labelAr: `تشغيل «${arg}» في السينما` });
          break;
        case 'cinema_random':
          commands.push({ type: 'cinema_random', labelAr: 'تشغيل فيلم عشوائي' });
          break;
        case 'cinema_open_servers':
          commands.push({ type: 'cinema_open_servers', labelAr: 'فتح إدارة السيرفرات' });
          break;
        case 'cinema_open_epg':
          commands.push({ type: 'cinema_open_epg', labelAr: 'فتح دليل البرامج (EPG)' });
          break;
        case 'cinema_open_watch_party':
          commands.push({ type: 'cinema_open_watch_party', labelAr: 'فتح المشاهدة الجماعية' });
          break;
        case 'cinema_open_devices':
          commands.push({ type: 'cinema_open_devices', labelAr: 'فتح إعدادات الأجهزة والسمارت TV' });
          break;
        case 'cinema_open_auth':
          commands.push({ type: 'cinema_open_auth', labelAr: 'فتح الحساب والمزامنة' });
          break;
        case 'cinema_tv_mode':
          commands.push({
            type: 'cinema_tv_mode',
            enabled: arg !== 'off' && arg !== 'false',
            labelAr: arg !== 'off' && arg !== 'false' ? 'تفعيل وضع التلفاز' : 'إيقاف وضع التلفاز',
          });
          break;
        case 'cinema_family_guard':
          commands.push({
            type: 'cinema_family_guard',
            enabled: arg !== 'off' && arg !== 'false',
            labelAr: arg !== 'off' && arg !== 'false' ? 'تفعيل الحماية العائلية' : 'إيقاف الحماية العائلية',
          });
          break;
        case 'cinema_profile':
          if (arg === 'imperial' || arg === 'family' || arg === 'kids') {
            commands.push({ type: 'cinema_profile', profileId: arg, labelAr: `تحويل الملف إلى ${arg}` });
          } else if (arg === 'vip') {
            commands.push({ type: 'cinema_profile', profileId: 'imperial', labelAr: 'التحويل إلى ملف VIP' });
          }
          break;
        case 'novels_tab':
          if (
            arg === 'library' ||
            arg === 'manhwa' ||
            arg === 'reader' ||
            arg === 'studio' ||
            arg === 'interactive' ||
            arg === 'world' ||
            arg === 'shelf'
          ) {
            commands.push({ type: 'novels_tab', tab: arg, labelAr: `فتح قسم الروايات (${arg})` });
          }
          break;
        case 'novel_create': {
          const [rawTitle, rawGenre] = arg.split('::').map((s) => s.trim());
          const title = rawTitle || 'رواية فالدريون الجديدة';
          commands.push({
            type: 'novel_create',
            title,
            genre: rawGenre || undefined,
            labelAr: `إضافة ونشر رواية «${title}» في المكتبة`,
          });
          break;
        }
        case 'novel_download':
          commands.push({
            type: 'novel_download',
            query: arg || undefined,
            labelAr: arg ? `تنزيل رواية «${arg}» كملف` : 'تنزيل الرواية كملف',
          });
          break;
        case 'cinema_export_servers':
          commands.push({
            type: 'cinema_export_servers',
            labelAr: 'تنزيل نسخة احتياطية للسيرفرات',
          });
          break;
        case 'security_open_shield':
          commands.push({ type: 'security_open_shield', labelAr: 'فتح درع الأمان الفائق' });
          break;
        case 'security_lock_now':
          commands.push({ type: 'security_lock_now', labelAr: 'قفل التطبيق فوراً' });
          break;
        case 'social_open_hub':
          commands.push({ type: 'social_open_hub', labelAr: 'فتح مركز التواصل الاجتماعي ومجموعات واتساب' });
          break;
        case 'novel_web_download':
          if (arg) {
            commands.push({
              type: 'novel_web_download',
              query: arg,
              labelAr: `البحث بالويب وتنزيل رواية «${arg}» في المكتبة`,
            });
          }
          break;
        case 'cinema_web_download':
          if (arg) {
            commands.push({
              type: 'cinema_web_download',
              query: arg,
              labelAr: `البحث بالويب وتنزيل «${arg}» في السينما`,
            });
          }
          break;
        case 'open_tool':
          if (
            arg === 'godot' ||
            arg === 'voice' ||
            arg === 'connectors' ||
            arg === 'brain' ||
            arg === 'deconstruct' ||
            arg === 'agents' ||
            arg === 'settings' ||
            arg === 'apps'
          ) {
            commands.push({ type: 'open_tool', tool: arg, labelAr: `فتح أداة ${arg}` });
          }
          break;
        case 'ai_new_chat':
          commands.push({ type: 'ai_new_chat', labelAr: 'بدء محادثة جديدة' });
          break;
        case 'ai_web_search':
          commands.push({
            type: 'ai_web_search',
            enabled: arg !== 'off' && arg !== 'false',
            labelAr: arg !== 'off' && arg !== 'false' ? 'تفعيل بحث الويب' : 'إيقاف بحث الويب',
          });
          break;
        case 'ai_auto_speak':
          commands.push({
            type: 'ai_auto_speak',
            enabled: arg !== 'off' && arg !== 'false',
            labelAr: arg !== 'off' && arg !== 'false' ? 'تفعيل النطق التلقائي' : 'إيقاف النطق التلقائي',
          });
          break;
        case 'ai_self_evolve':
          commands.push({ type: 'ai_self_evolve', labelAr: 'تشغيل التطوير الذاتي' });
          break;
        case 'speak_reply':
          commands.push({ type: 'speak_reply', labelAr: 'قراءة الإجابة صوتياً' });
          break;
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanMarkdown, commands: dedupeCommands(commands) };
}

/**
 * Teaches the cloud/commander LLM its real full-app control protocol inside VALDRION.
 */
export function buildAppControlSystemPrompt(): string {
  return `[صلاحية القيادة الشاملة الكاملة داخل نظام فالدريون (VALDRION Omni-Commander)]:
أنت «فالدريون AI» القائد الشامل والمسؤول الذكي داخل منصة فالدريون: السينما والسيرفرات، البحث بالويب وتنزيل الروايات والأفلام مباشرة في التطبيق، قارئ الكتب 4D، استوديو المانهوا، وتوليد الصور ومخططات الفيديو داخل المحادثة مباشرة. عند تنفيذ طلب فعلي أضف الوسم المناسب في نهاية ردّك (يُنفّذ تلقائياً ويُخفى عن العرض):
- التنقل بين التطبيقات: [[APP_CMD:switch_app|cinema]] أو novels أو private-ai
- البحث بالويب وتنزيل رواية حقيقية مباشرة في مكتبة الروايات: [[APP_CMD:novel_web_download|اسم الرواية أو الموضوع]]
- البحث بالويب وتنزيل أفلام حقيقية مباشرة في السينما: [[APP_CMD:cinema_web_download|اسم الفيلم أو التصنيف]]
- تأليف وإضافة رواية لمكتبة الروايات: [[APP_CMD:novel_create|عنوان الرواية::التصنيف]]
- تنزيل رواية كملف نصي لجهاز المستخدم: [[APP_CMD:novel_download|عنوان الرواية]]
- أقسام السينما والسيرفرات: [[APP_CMD:cinema_tab|movies|series|live|mylist|home]] · [[APP_CMD:cinema_play|اسم العمل]] · [[APP_CMD:cinema_search|كلمة]] · [[APP_CMD:cinema_random]] · [[APP_CMD:cinema_open_servers]] · [[APP_CMD:cinema_export_servers]] · [[APP_CMD:cinema_tv_mode|on]]
- نوافذ وإعدادات السينما: [[APP_CMD:cinema_open_epg]] · [[APP_CMD:cinema_open_watch_party]] · [[APP_CMD:cinema_open_devices]] · [[APP_CMD:cinema_open_auth]] · [[APP_CMD:cinema_family_guard|on]] · [[APP_CMD:cinema_profile|imperial|family|kids]]
- أقسام الروايات والمانهوا: [[APP_CMD:novels_tab|manhwa|world|studio|interactive|reader|shelf|library]]
- التواصل الاجتماعي ودرع الأمان: [[APP_CMD:social_open_hub]] · [[APP_CMD:security_open_shield]] · [[APP_CMD:security_lock_now]]
- الأدوات الاحترافية والتحكم الذاتي: [[APP_CMD:open_tool|godot|voice|connectors|brain|deconstruct|agents|settings|apps]] · [[APP_CMD:ai_web_search|on]] · [[APP_CMD:ai_auto_speak|on]] · [[APP_CMD:ai_self_evolve]]
لا تستخدم الوسم إلا عندما يطلب المستخدم إجراءً فعلياً داخل التطبيق.`;
}
