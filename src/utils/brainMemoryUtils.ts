/**
 * Pure utilities for VALDRION MIND's Persistent Personal Brain, Long-Term Memory,
 * Knowledge Vault, Auto-Critic Mode, 1-Click Automation Workflows, and Clean Printable Report Export.
 */

export type BrainTone = 'balanced' | 'executive' | 'creative' | 'technical' | 'friendly';

export interface BrainMemoryItem {
  id: string;
  content: string;
  category: 'preference' | 'fact' | 'project' | 'goal';
  pinned?: boolean;
  createdAt: number;
}

export interface BrainKnowledgeNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface UserBrainProfile {
  displayName: string;
  roleTitle: string;
  preferredLanguage: 'ar' | 'en' | 'bilingual';
  tone: BrainTone;
  customInstructions: string;
  autoCritic: boolean;
  autoSpeakReplies: boolean;
  memories: BrainMemoryItem[];
  knowledgeVault: BrainKnowledgeNote[];
  updatedAt: number;
}

export const BRAIN_STORAGE_KEY = 'valdrion_mind_personal_brain_v1';

export const BRAIN_TONE_LABELS: Record<BrainTone, { label: string; promptRule: string }> = {
  balanced: {
    label: 'متوازن وعميق',
    promptRule: 'اجمع بين الوضوح العملي والعمق الهندسي والأسلوب العربي الأنيق.',
  },
  executive: {
    label: 'تنفيذي ومختصر',
    promptRule: 'قدّم خلاصة حاسمة ونقاطاً تنفيذية وجداول مباشرة بلا إطالة.',
  },
  creative: {
    label: 'إبداعي ومُلهم',
    promptRule: 'استخدم خيالاً بصرياً وأفكاراً مبتكرة وصياغة أدبية آسرة.',
  },
  technical: {
    label: 'هندسي وبرمجي صارم',
    promptRule: 'ركّز على الدقة التقنية الكاملة، المعمارية، الأداء، وأكواد جاهزة للإنتاج.',
  },
  friendly: {
    label: 'ودود ومبسّط',
    promptRule: 'تحدث بأسلوب قريب ودافئ مع أمثلة يومية سهلة الفهم.',
  },
};

export const MEMORY_CATEGORY_LABELS: Record<BrainMemoryItem['category'], string> = {
  preference: 'تفضيل شخصي',
  fact: 'حقيقة عنّي',
  project: 'مشروع حالي',
  goal: 'هدف طويل المدى',
};

export function createDefaultBrainProfile(): UserBrainProfile {
  return {
    displayName: '',
    roleTitle: '',
    preferredLanguage: 'ar',
    tone: 'balanced',
    customInstructions: '',
    autoCritic: false,
    autoSpeakReplies: false,
    memories: [],
    knowledgeVault: [],
    updatedAt: Date.now(),
  };
}

export function sanitizeBrainProfile(raw: unknown): UserBrainProfile {
  const base = createDefaultBrainProfile();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  const validTones: BrainTone[] = ['balanced', 'executive', 'creative', 'technical', 'friendly'];
  const validLangs: Array<'ar' | 'en' | 'bilingual'> = ['ar', 'en', 'bilingual'];
  const validCats: Array<BrainMemoryItem['category']> = ['preference', 'fact', 'project', 'goal'];

  const memories: BrainMemoryItem[] = Array.isArray(obj.memories)
    ? obj.memories
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .map((m, i) => ({
          id: typeof m.id === 'string' && m.id.trim() ? m.id.trim() : `mem_${Date.now()}_${i}`,
          content: typeof m.content === 'string' ? m.content.trim().slice(0, 420) : '',
          category: validCats.includes(m.category as BrainMemoryItem['category'])
            ? (m.category as BrainMemoryItem['category'])
            : 'fact',
          pinned: Boolean(m.pinned),
          createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
        }))
        .filter((m) => m.content.length > 0)
        .slice(0, 60)
    : [];

  const knowledgeVault: BrainKnowledgeNote[] = Array.isArray(obj.knowledgeVault)
    ? obj.knowledgeVault
        .filter((n): n is Record<string, unknown> => Boolean(n && typeof n === 'object'))
        .map((n, i) => ({
          id: typeof n.id === 'string' && n.id.trim() ? n.id.trim() : `note_${Date.now()}_${i}`,
          title: typeof n.title === 'string' && n.title.trim() ? n.title.trim().slice(0, 100) : 'ملاحظة معرفية',
          content: typeof n.content === 'string' ? n.content.trim().slice(0, 2400) : '',
          updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
        }))
        .filter((n) => n.content.length > 0)
        .slice(0, 20)
    : [];

  return {
    displayName: typeof obj.displayName === 'string' ? obj.displayName.trim().slice(0, 60) : '',
    roleTitle: typeof obj.roleTitle === 'string' ? obj.roleTitle.trim().slice(0, 80) : '',
    preferredLanguage: validLangs.includes(obj.preferredLanguage as 'ar' | 'en' | 'bilingual')
      ? (obj.preferredLanguage as 'ar' | 'en' | 'bilingual')
      : 'ar',
    tone: validTones.includes(obj.tone as BrainTone) ? (obj.tone as BrainTone) : 'balanced',
    customInstructions:
      typeof obj.customInstructions === 'string' ? obj.customInstructions.trim().slice(0, 1500) : '',
    autoCritic: Boolean(obj.autoCritic),
    autoSpeakReplies: Boolean(obj.autoSpeakReplies),
    memories,
    knowledgeVault,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
}

export function loadBrainProfile(): UserBrainProfile {
  try {
    const raw = localStorage.getItem(BRAIN_STORAGE_KEY);
    if (!raw) return createDefaultBrainProfile();
    return sanitizeBrainProfile(JSON.parse(raw));
  } catch {
    return createDefaultBrainProfile();
  }
}

export function saveBrainProfile(profile: UserBrainProfile): void {
  try {
    const sanitized = sanitizeBrainProfile({ ...profile, updatedAt: Date.now() });
    localStorage.setItem(BRAIN_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function addBrainMemory(
  profile: UserBrainProfile,
  content: string,
  category: BrainMemoryItem['category'] = 'fact'
): UserBrainProfile {
  const clean = content.replace(/\s+/g, ' ').trim().slice(0, 420);
  if (!clean) return profile;
  const duplicate = profile.memories.some(
    (m) => m.content.toLowerCase() === clean.toLowerCase()
  );
  if (duplicate) return profile;

  const item: BrainMemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    content: clean,
    category,
    pinned: false,
    createdAt: Date.now(),
  };

  return {
    ...profile,
    memories: [item, ...profile.memories].slice(0, 60),
    updatedAt: Date.now(),
  };
}

export function buildBrainSystemContext(profile: UserBrainProfile): string {
  const lines: string[] = [];

  if (profile.displayName || profile.roleTitle) {
    const who = [
      profile.displayName ? `اسم المستخدم: ${profile.displayName}` : '',
      profile.roleTitle ? `الدور/التخصص: ${profile.roleTitle}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    lines.push(who);
  }

  const langRule =
    profile.preferredLanguage === 'en'
      ? 'لغة الرد المفضلة: الإنجليزية ما لم يكتب المستخدم بالعربية.'
      : profile.preferredLanguage === 'bilingual'
      ? 'لغة الرد المفضلة: العربية الواضحة مع المصطلحات التقنية بالإنجليزية.'
      : 'لغة الرد المفضلة: العربية الفصحى السلسة والطبيعية.';
  lines.push(langRule);

  const toneInfo = BRAIN_TONE_LABELS[profile.tone] || BRAIN_TONE_LABELS.balanced;
  lines.push(`أسلوب الشخصية المطلوب (${toneInfo.label}): ${toneInfo.promptRule}`);

  if (profile.customInstructions.trim()) {
    lines.push(`تعليمات دائمة من المستخدم:\n${profile.customInstructions.trim()}`);
  }

  if (profile.memories.length > 0) {
    const sorted = [...profile.memories].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
    const memLines = sorted
      .slice(0, 18)
      .map((m) => `- [${MEMORY_CATEGORY_LABELS[m.category]}] ${m.content}`);
    lines.push(`الذاكرة طويلة المدى الخاصة بالمستخدم:\n${memLines.join('\n')}`);
  }

  if (profile.knowledgeVault.length > 0) {
    const notes = profile.knowledgeVault
      .slice(0, 5)
      .map((n) => `• ${n.title}: ${n.content.slice(0, 480)}`);
    lines.push(`خزنة المعرفة الخاصة بالمستخدم:\n${notes.join('\n')}`);
  }

  if (profile.autoCritic) {
    lines.push(
      'وضع التدقيق الذاتي (Auto-Critic) مفعّل: قبل إرسال الرد، راجع دقة الأرقام والأكواد والروابط داخلياً، وتأكّد من عدم وجود أي خطأ منطقي أو نقص، واختم بفقرة موجزة بعنوان «تحقق الجودة» تلخّص نقاط التأكد.'
    );
  }

  return lines.join('\n\n').slice(0, 4800);
}

export interface AutomationWorkflowPreset {
  id: string;
  title: string;
  subtitle: string;
  stepsSummary: string;
  targetMode: 'general' | 'godot' | 'video' | 'canva' | 'deconstruct' | 'research' | 'create';
  useCommander: boolean;
  prompt: string;
}

export const AUTOMATION_WORKFLOWS: AutomationWorkflowPreset[] = [
  {
    id: 'wf_startup_launch',
    title: 'إطلاق مشروع رقمي متكامل',
    subtitle: 'فكرة + دراسة سوق + نموذج أولي + خطة تسويق',
    stepsSummary: 'الباحث ← المعماري ← المبرمج ← المسوّق',
    targetMode: 'general',
    useCommander: true,
    prompt:
      'ابنِ خطة إطلاق متكاملة لتطبيق عربي مبتكر لإدارة الوقت والمهام بالذكاء الاصطناعي: 1) تحليل السوق والميزة التنافسية، 2) البنية الهندسية وقاعدة البيانات، 3) واجهة نموذج أولي تفاعلي جاهز في بلوك HTML كامل، 4) خطة تسويق لـ 30 يوماً.',
  },
  {
    id: 'wf_godot_full_game',
    title: 'صناعة لعبة Godot 4 قابلة للتشغيل',
    subtitle: 'كود GDScript + مشهد .tscn + معاينة + ملف .zip',
    stepsSummary: 'مصمم اللعبة ← مهندس Godot 4 ← الجسر الحي',
    targetMode: 'godot',
    useCommander: false,
    prompt:
      'اصنع لعبة أكشن ومنصات 2D كاملة لمحرك Godot 4 باسم "أسطورة التنين الذهبي": لاعب يتحرك ويقفز، عملات ذهبية متوهجة، منصات متحركة، عقبات، عداد نقاط، ومؤثرات بصرية مع زر إعادة اللعب.',
  },
  {
    id: 'wf_viral_video_reel',
    title: 'إخراج فيديو ريلز متحرك (.webm)',
    subtitle: 'سيناريو مشاهد + حركة 60FPS + تعليق صوتي + تنزيل',
    stepsSummary: 'كاتب السيناريو ← مخرج المشاهد ← محرك الفيديو',
    targetMode: 'video',
    useCommander: false,
    prompt:
      'أخرج فيديو ريلز قصير مشوّق (9:16) عن: "كيف سيغيّر الذكاء الاصطناعي والوكلاء المستقلون حياتنا وعملنا خلال السنوات الخمس القادمة" بأسلوب بصري سينمائي مذهل.',
  },
  {
    id: 'wf_brand_canva_kit',
    title: 'هوية بصرية وبوستر HD بأسلوب كانفا',
    subtitle: 'تصميم SVG فائق الدقة + تصدير PNG 1920px',
    stepsSummary: 'المدير الفني ← مصمم كانفا ← تصدير HD',
    targetMode: 'canva',
    useCommander: false,
    prompt:
      'صمّم بوستر إعلاني فاخر بمقاس 1080×1080 بأسلوب Canva لإطلاق علامة «سُديم» للقهوة المختصة بتدرجات داكنة وذهبية وخط عربي فخم داخل كتلة SVG كاملة جاهزة لتصدير HD PNG.',
  },
  {
    id: 'wf_app_xray',
    title: 'تفكيك تطبيق عالمي وإعادة بنائه',
    subtitle: 'معمارية + مخطط SVG + APIs + نموذج تفاعلي',
    stepsSummary: 'مفكّك الأنظمة ← مهندس الواجهات ← مخطط SVG',
    targetMode: 'deconstruct',
    useCommander: false,
    prompt:
      'فكّك تطبيق Spotify هندسياً بالكامل: جدول التقنيات، مخطط قاعدة البيانات، تدفق بث الصوتيات، مخطط معماري SVG كامل، ونموذج مشغّل موسيقى عربي تفاعلي بملف HTML.',
  },
  {
    id: 'wf_world_briefing',
    title: 'نشرة عالمية حيّة (تقنية + أسواق + طقس)',
    subtitle: 'بيانات حقيقية مجانية من 14 جسراً عالمياً',
    stepsSummary: 'CoinGecko + Hacker News + Open-Meteo ← تقرير تنفيذي',
    targetMode: 'general',
    useCommander: false,
    prompt:
      'قدّم لي نشرة عالمية حيّة الآن تشمل: أسعار البيتكوين والإيثريوم وسولانا وسعر صرف الدولار، حالة الطقس اليوم في الرياض، وأهم أخبار التقنية والذكاء الاصطناعي من Hacker News مع تحليل تنفيذي مختصر.',
  },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a clean, self-contained printable RTL Arabic HTML document (ready for Save as PDF or download)
 * without ever calling window.open.
 */
export function buildPrintableReportHtml(title: string, markdownBody: string): string {
  const safeTitle = escapeHtml(title.trim() || 'تقرير عقل فالدريون');
  const paragraphs = markdownBody
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('```')) {
        const cleanCode = trimmed.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
        return `<pre dir="ltr"><code>${escapeHtml(cleanCode)}</code></pre>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      }
      const htmlLines = escapeHtml(trimmed)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>')
        .replace(/\n/g, '<br/>');
      return `<p>${htmlLines}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  const dateLabel = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle} — VALDRION MIND</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #ffffff;
      color: #14171f;
      line-height: 1.75;
      margin: 0;
      padding: 28px;
      max-width: 820px;
      margin-inline: auto;
    }
    header {
      border-bottom: 2px solid #1e293b;
      padding-bottom: 14px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .brand { font-weight: 800; letter-spacing: 0.08em; font-size: 13px; color: #2563eb; }
    .meta { font-size: 12px; color: #64748b; }
    h1 { font-size: 22px; margin: 0 0 14px; color: #0f172a; }
    h2 { font-size: 17px; margin: 20px 0 8px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3 { font-size: 15px; margin: 16px 0 6px; color: #334155; }
    p { margin: 0 0 12px; font-size: 14px; }
    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f1f5f9;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 12.5px;
    }
    pre code { background: transparent; padding: 0; }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="brand">VALDRION MIND</div>
      <h1>${safeTitle}</h1>
    </div>
    <div class="meta">${escapeHtml(dateLabel)}</div>
  </header>
  <main>${paragraphs}</main>
</body>
</html>`;
}
