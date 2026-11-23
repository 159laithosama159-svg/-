/**
 * Pure utilities for the Claude-Style App & System Deconstructor
 * Builds structured architecture, database, UX, SVG diagram, and interactive prototype prompts.
 */

export type AppDeconstructionLensId =
  | 'architecture'
  | 'database_api'
  | 'ux_flows'
  | 'svg_blueprint'
  | 'interactive_clone'
  | 'security_scale';

export interface AppDeconstructionLens {
  id: AppDeconstructionLensId;
  label: string;
  shortHint: string;
  defaultSelected: boolean;
}

export interface PopularAppPreset {
  id: string;
  name: string;
  arabicLabel: string;
  category: string;
}

export const APP_DECONSTRUCTOR_LENSES: AppDeconstructionLens[] = [
  {
    id: 'architecture',
    label: 'المعمارية والتقنيات',
    shortHint: 'الواجهات، الخوادم، البث والخدمات المصغّرة',
    defaultSelected: true,
  },
  {
    id: 'database_api',
    label: 'قاعدة البيانات والـ API',
    shortHint: 'الجداول، العلاقات، ونقاط النهاية الأساسية',
    defaultSelected: true,
  },
  {
    id: 'ux_flows',
    label: 'الميزات ورحلة المستخدم',
    shortHint: 'تفكيك الشاشات والتجربة ونموذج العمل',
    defaultSelected: true,
  },
  {
    id: 'svg_blueprint',
    label: 'مخطط معماري SVG حي',
    shortHint: 'رسم هندسي تفاعلي يُفتح في اللوحة الجانبية',
    defaultSelected: true,
  },
  {
    id: 'interactive_clone',
    label: 'نموذج تفاعلي HTML حي',
    shortHint: 'نسخة مصغّرة قابلة للتجربة فوراً',
    defaultSelected: false,
  },
  {
    id: 'security_scale',
    label: 'الأمان والأداء والتوسّع',
    shortHint: 'الحماية، الكاش، ونقاط الضعف والحلول',
    defaultSelected: false,
  },
];

export const POPULAR_APP_BLUEPRINTS: PopularAppPreset[] = [
  { id: 'uber', name: 'Uber', arabicLabel: 'أوبر (Uber)', category: 'نقل وخرائط حيّة' },
  { id: 'tiktok', name: 'TikTok', arabicLabel: 'تيك توك (TikTok)', category: 'فيديو وخوارزميات' },
  { id: 'whatsapp', name: 'WhatsApp', arabicLabel: 'واتساب (WhatsApp)', category: 'محادثات فورية' },
  { id: 'spotify', name: 'Spotify', arabicLabel: 'سبوتيفاي (Spotify)', category: 'بث صوتي' },
  { id: 'netflix', name: 'Netflix', arabicLabel: 'نتفليكس (Netflix)', category: 'بث سينمائي' },
  { id: 'notion', name: 'Notion', arabicLabel: 'نوشن (Notion)', category: 'إنتاجية وتعاون' },
];

export function getDefaultDeconstructorLenses(): AppDeconstructionLensId[] {
  return APP_DECONSTRUCTOR_LENSES.filter((l) => l.defaultSelected).map((l) => l.id);
}

export function isAppDeconstructionIntent(text: string): boolean {
  const normalized = (text || '').trim().toLowerCase();
  if (!normalized) return false;
  return /(?:فكك|تفكيك|فكّك|حلل\s+معمارية|حلّل\s+معمارية|كيف\s+(?:يشتغل|يعمل|مبني)\s+تطبيق|هندسة\s+تطبيق|معمارية\s+تطبيق|deconstruct|system\s+design|architecture\s+of)/i.test(
    normalized
  );
}

export function buildAppDeconstructionPrompt(params: {
  appName: string;
  notes?: string;
  selectedLenses: AppDeconstructionLensId[];
  hasAttachedFile?: boolean;
  attachedFileName?: string;
}): string {
  const cleanApp = params.appName.trim();
  const cleanNotes = (params.notes || '').trim();
  const lenses: AppDeconstructionLensId[] =
    params.selectedLenses.length > 0
      ? params.selectedLenses
      : getDefaultDeconstructorLenses();

  const subject = cleanApp
    ? `تطبيق / نظام «${cleanApp}»`
    : params.hasAttachedFile && params.attachedFileName
    ? `الكود والملف المرفق «${params.attachedFileName}»`
    : 'التطبيق المطلوب';

  const sections: string[] = [];

  if (lenses.includes('architecture')) {
    sections.push(
      '1. **تفكيك المعمارية والتقنيات (System Architecture & Tech Stack)**: جدول واضح يبيّن طبقة الواجهة (Frontend / Mobile)، طبقة الخادم (Backend Services)، البروتوكولات اللحظية (WebSockets / gRPC / HLS)، الكاش (Redis/CDN)، وكيف تتدفق البيانات بين المكونات.'
    );
  }
  if (lenses.includes('database_api')) {
    sections.push(
      '2. **قاعدة البيانات والـ APIs (Database Schema & API Contract)**: تصميم أهم الجداول والكيانات والعلاقات، مع جدول لأبرز نقاط النهاية (REST / WebSocket APIs) والمدخلات والمخرجات.'
    );
  }
  if (lenses.includes('ux_flows')) {
    sections.push(
      '3. **تفكيك الشاشات ورحلة المستخدم والميزات الخفية (UX & Core Flows)**: تقسيم التطبيق إلى شاشات ومكونات أساسية، آلية عمل الخوارزمية أو الميزة الجوهرية، ونقاط التحسين الممكنة لبناء نسخة أقوى.'
    );
  }
  if (lenses.includes('security_scale')) {
    sections.push(
      '4. **الأمان والتوسّع والأداء (Security, Reliability & Scale)**: أهم آليات المصادقة، الحماية، منع الاختناقات (Bottlenecks)، واستراتيجيات تحمّل ملايين المستخدمين.'
    );
  }
  if (lenses.includes('svg_blueprint') && !lenses.includes('interactive_clone')) {
    sections.push(
      '5. **مخطط معماري بصري حي (SVG Architecture Blueprint)**: أدرج في نهاية التقرير كتلة ```svg ... ``` واحدة كاملة ودقيقة (`viewBox="0 0 1100 680"`) بخلفية داكنة `#0B0907` وإطارات ذهبية `#D9A441` وأحمر قرمزي `#B8243A` وخطوط عربية/إنجليزية واضحة ترسم المعمارية الكاملة وتدفق البيانات بين المستخدم، البوابة، الخوادم، قواعد البيانات، والـ CDN ليُعرض مباشرة في لوحة المعاينة الجانبية.'
    );
  }
  if (lenses.includes('interactive_clone')) {
    sections.push(
      '5. **نموذج تفاعلي مصغّر يعمل حيّاً (Interactive HTML Prototype)**: أدرج في نهاية التقرير كتلة ```html ... ``` واحدة كاملة ومستقلة بذاتها (HTML + CSS + JS) تقدم محاكاة واجهة تفاعلية عربية/داكنة أنيقة لأهم شاشة في التطبيق تعمل بالكامل داخل لوحة المعاينة الجانبية.'
    );
    if (lenses.includes('svg_blueprint')) {
      sections.push(
        '   *(كما يرجى تضمين مخطط معماري واضح داخل قسم التحليل أو داخل تبويب "المعمارية" في النموذج التفاعلي).*'
      );
    }
  }

  return [
    `قم بتفكيك وتحليل ${subject} بالكامل بأسلوب هندسي احترافي دقيق ومعمّق (مثل Claude في تحليل الأنظمة وتفكيك التطبيقات).`,
    cleanNotes ? `متطلبات أو تركيز خاص من المستخدم: ${cleanNotes}` : '',
    params.hasAttachedFile
      ? 'ملاحظة: اعتمد بشكل مباشر على الكود أو الملف المرفق في تفكيك البنية واكتشاف المكونات ونقاط التحسين.'
      : '',
    'المطلوب في تقرير التفكيك:',
    sections.join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}
