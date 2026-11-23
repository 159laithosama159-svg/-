export interface AiCouncilMember {
  id: 'architect' | 'critic' | 'visionary';
  nameAr: string;
  roleTitle: string;
  accentHex: string;
  stance: string;
  keyPoints: string[];
  riskOrOpportunity: string;
}

export interface AiCouncilDebateResult {
  question: string;
  members: AiCouncilMember[];
  verdictTitle: string;
  verdictSummary: string;
  actionChecklist: string[];
  confidenceScore: number;
  generatedAt: number;
}

export interface AiMindMapBranch {
  id: string;
  title: string;
  color: string;
  note: string;
  children: string[];
}

export interface AiMindMapData {
  title: string;
  subtitle: string;
  branches: AiMindMapBranch[];
  keyTakeaway: string;
  generatedAt: number;
}

export interface AiSlashCommand {
  command: string;
  aliasEn: string;
  titleAr: string;
  descriptionAr: string;
  template: string;
  badge: string;
}

export const AI_SLASH_COMMANDS: AiSlashCommand[] = [
  {
    command: '/بحث',
    aliasEn: '/search',
    titleAr: 'بحث حي في الويب والموسوعات',
    descriptionAr: 'يبحث لحظياً في Google + ويكيبيديا مع عرض خطوات البحث والمصادر الموثقة',
    template: 'ابحث حيّاً عن أحدث المعلومات حول ',
    badge: 'ويب حي',
  },
  {
    command: '/صورة',
    aliasEn: '/image',
    titleAr: 'توليد صورة HD + صور ويب حقيقية',
    descriptionAr: 'يصمم لوحة فنية عالية الدقة قابلة للتنزيل PNG HD مع صور مرجعية حقيقية',
    template: 'صمّم صورة احترافية عالية الدقة لـ ',
    badge: 'HD PNG',
  },
  {
    command: '/فيديو',
    aliasEn: '/video',
    titleAr: 'إخراج فيديو موشن جرافيك (.webm)',
    descriptionAr: 'ينشئ سيناريو ومشاهد بخلفيات آمنة وتصدير فيديو .webm حقيقي',
    template: 'اعمل فيديو موشن جرافيك احترافي عن ',
    badge: '.WEBM',
  },
  {
    command: '/مجلس',
    aliasEn: '/council',
    titleAr: 'مجلس الخبراء الثلاثي (مناظرة 3 عقول)',
    descriptionAr: 'يعرض رأي المهندس + الناقد الأمني + المبدع الاستراتيجي ثم القرار النهائي',
    template: 'اعرض على مجلس الخبراء الثلاثي: ',
    badge: '3 عقول',
  },
  {
    command: '/خريطة',
    aliasEn: '/mindmap',
    titleAr: 'خريطة ذهنية ومخطط تفاعلي SVG/PNG',
    descriptionAr: 'يرسم خريطة ذهنية ملونة قابلة للتكبير والتنزيل بدقة 1920px',
    template: 'ارسم خريطة ذهنية شاملة لـ ',
    badge: 'خريطة',
  },
  {
    command: '/جودوت',
    aliasEn: '/godot',
    titleAr: 'تحكم مباشر في محرك Godot 4 بإذنك',
    descriptionAr: 'يقترح أوامر تعديل حية لمشروع Godot 4 وينفذها بعد موافقتك',
    template: 'فوت جودوت وعدّل المشهد بإضافة ',
    badge: 'Godot 4',
  },
  {
    command: '/لعبة',
    aliasEn: '/game',
    titleAr: 'برمجة لعبة حيّة 60fps فورية',
    descriptionAr: 'يبني لعبة HTML5 Canvas كاملة بمؤثرات صوتية وتعمل مباشرة في المنصة',
    template: 'برمج لعبة تفاعلية 60fps كاملة عن ',
    badge: '60FPS',
  },
  {
    command: '/ابكس',
    aliasEn: '/apex',
    titleAr: 'وضع العبقري الأقصى APEX (بحث + تدقيق ذاتي)',
    descriptionAr: 'تخطيط + بحث حي موثّق + ناقد ذاتي يكتشف الثغرات + خلاصة أسطورية نهائية',
    template: '/ابكس ',
    badge: 'APEX XHIGH',
  },
  {
    command: '/تطبيق',
    aliasEn: '/app',
    titleAr: 'مصنع التطبيقات والأدوات الحية',
    descriptionAr: 'يبني تطبيق ويب تفاعلي أو لوحة تحكم كاملة ويعرضها فوراً قابلة للتشغيل والتحميل',
    template: '/تطبيق ',
    badge: 'Live App',
  },
  {
    command: '/شرائح',
    aliasEn: '/slides',
    titleAr: 'مولّد العروض التقديمية التفاعلية (Slides)',
    descriptionAr: 'يصمم عرضاً تقديمياً كاملاً بملاحظات المتحدث وتصدير PDF/HTML',
    template: '/شرائح ',
    badge: 'Slides',
  },
  {
    command: '/اختبار',
    aliasEn: '/quiz',
    titleAr: 'اختبار تفاعلي فوري مع التصحيح والشرح',
    descriptionAr: 'يبني امتحاناً تفاعلياً حياً لقياس الفهم مع شرح كل إجابة',
    template: '/اختبار ',
    badge: 'Quiz',
  },
  {
    command: '/حساب',
    aliasEn: '/calc',
    titleAr: 'آلة حاسبة علمية دقيقة 100%',
    descriptionAr: 'حساب رياضي فوري دقيق بدون أخطاء (مثل: /حساب (125*4)+sqrt(144))',
    template: '/حساب ',
    badge: 'Math',
  },
  {
    command: '/مهارة',
    aliasEn: '/skill',
    titleAr: 'تحميل ملف مهارة Gemini (SKILL.md)',
    descriptionAr: 'يفتح نافذة تصدير حزمة الـ 24 وكيلاً وملف SKILL.md لاستخدامه في Gemini',
    template: '/مهارة',
    badge: 'SKILL.md',
  },
];

export function filterSlashCommands(rawInput: string): AiSlashCommand[] {
  const trimmed = (rawInput || '').trim();
  if (!trimmed.startsWith('/')) return [];
  const token = trimmed.split(/\s+/)[0].toLowerCase();
  if (token === '/') return AI_SLASH_COMMANDS;
  return AI_SLASH_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().startsWith(token) ||
      c.aliasEn.toLowerCase().startsWith(token) ||
      c.titleAr.includes(token.slice(1))
  );
}

export function isCouncilDebateIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(مجلس|council)(?:\s|$)/i.test(t) ||
    /(مجلس\s*الخبراء|مناظرة\s*(عقول|خبراء|ذكاء)|قارن\s*آراء\s*الخبراء|3\s*عقول|ثلاثة\s*عقول|اراء\s*الخبراء|آراء\s*الخبراء|multi[- ]?ai\s*council|expert\s*council|debate\s*this)/i.test(
      t
    )
  );
}

export function isMindMapIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(خريطة|mindmap)(?:\s|$)/i.test(t) ||
    /(خريطة\s*ذهنية|خريطه\s*ذهنيه|مخطط\s*ذهني|مخطط\s*هيكلي|مخطط\s*معماري|خريطة\s*مفاهيم|mind\s*map|concept\s*map|flowchart\s+for)/i.test(
      t
    )
  );
}

export function enhanceUserPrompt(rawPrompt: string): string {
  const clean = (rawPrompt || '').trim();
  if (!clean) return '';
  if (clean.length > 260 && clean.includes('\n')) {
    return clean;
  }

  if (/(لعبة|game|godot|جودوت|سباق|أكشن|3d|2d)/i.test(clean)) {
    return [
      `المهمة: ${clean}`,
      'المتطلبات الهندسية الصارمة:',
      '1. تصميم بنية نظيفة وسلسة بسرعة 60fps مع تحكم كامل بالكيبورد واللمس ومؤثرات صوتية مدمجة.',
      '2. واجهة HUD واضحة (النقاط، الطاقة، المستويات، شاشة البداية والنهاية مع زر إعادة اللعب).',
      '3. كود كامل 100% خالٍ من الأخطاء البرمجية أو الأجزاء الناقصة وجاهز للتشغيل الفوري.',
    ].join('\n');
  }

  if (/(صورة|شعار|بوستر|رسمة|غلاف|logo|poster|image)/i.test(clean)) {
    return `${clean} — بأسلوب فني فاخر، تباين ضوئي سينمائي، تفاصيل هندسية دقيقة، تدرجات ذهبية وزرقاء عميقة، بدقة عرض عالية HD مناسبة للطباعة والنشر.`;
  }

  if (/(فيديو|ريلز|مقطع|video|reel)/i.test(clean)) {
    return `${clean} — في 5 مشاهد مترابطة بإيقاع سريع وجذاب، عناوين عربية بارزة، تعليق صوتي مشوّق، وخلفيات بصرية عالية التباين جاهزة لتصدير WebM.`;
  }

  if (/(خريطة\s*ذهنية|مخطط|mind\s*map)/i.test(clean)) {
    return `${clean} — موزّعة على 5 إلى 6 فروع رئيسية واضحة مع تفريعات عملية وخلاصة تنفيذية مركّزة.`;
  }

  if (/(ابحث|أخبار|تقرير|مقارنة|دراسة|search|compare)/i.test(clean)) {
    return [
      `الموضوع: ${clean}`,
      'المطلوب في الإجابة:',
      '- حقائق محدّثة وموثقة بالمصادر الموثوقة.',
      '- جدول مقارنة واضح أو نقاط مرتّبة بالأولوية.',
      '- خلاصة عملية وتوصية مباشرة في النهاية.',
    ].join('\n');
  }

  return [
    `المطلوب بدقة: ${clean}`,
    'قدّم إجابة احترافية ومنظمة بعناوين واضحة، وأمثلة عملية قابلة للتطبيق فوراً، وخطوات تنفيذية مختصرة في الختام.',
  ].join('\n');
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(str: string, maxLen: number): string {
  const s = (str || '').trim();
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

const DEFAULT_BRANCH_COLORS = [
  '#38BDF8',
  '#F5C76B',
  '#34D399',
  '#A78BFA',
  '#FB7185',
  '#F97316',
];

export function normalizeMindMapData(
  raw: Partial<AiMindMapData>,
  fallbackTopic: string
): AiMindMapData {
  const title = (raw.title || fallbackTopic || 'خريطة ذهنية').trim().slice(0, 72);
  const subtitle = (raw.subtitle || 'تحليل هيكلي ذكي بواسطة أثيرمايند AI')
    .trim()
    .slice(0, 120);
  const rawBranches = Array.isArray(raw.branches) ? raw.branches : [];
  const branches: AiMindMapBranch[] = rawBranches
    .slice(0, 6)
    .map((b, idx) => ({
      id: b?.id || `br_${idx + 1}`,
      title: String(b?.title || `المحور ${idx + 1}`).trim().slice(0, 46),
      color:
        typeof b?.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(b.color)
          ? b.color
          : DEFAULT_BRANCH_COLORS[idx % DEFAULT_BRANCH_COLORS.length],
      note: String(b?.note || '').trim().slice(0, 160),
      children: Array.isArray(b?.children)
        ? b.children
            .map((c) => String(c || '').trim().slice(0, 52))
            .filter(Boolean)
            .slice(0, 4)
        : [],
    }))
    .filter((b) => b.title.length > 0);

  const safeBranches: AiMindMapBranch[] =
    branches.length >= 2
      ? branches
      : [
          {
            id: 'br_1',
            title: 'المفهوم والأساسيات',
            color: '#38BDF8',
            note: 'الأركان الجوهرية للفكرة وأهدافها الرئيسية.',
            children: ['التعريف العملي', 'نطاق التطبيق', 'المتطلبات الأولية'],
          },
          {
            id: 'br_2',
            title: 'البنية والأدوات',
            color: '#F5C76B',
            note: 'المكوّنات التقنية أو المنهجية المطلوبة.',
            children: ['الهيكلة الأساسية', 'الأدوات الموصى بها', 'التكامل والربط'],
          },
          {
            id: 'br_3',
            title: 'التنفيذ المرحلي',
            color: '#34D399',
            note: 'خارطة طريق متدرجة من الفكرة للإطلاق.',
            children: ['النموذج الأولي', 'الاختبار والتحسين', 'الإطلاق الفعلي'],
          },
          {
            id: 'br_4',
            title: 'المخاطر والنجاح',
            color: '#A78BFA',
            note: 'كيف تقيس الأثر وتتجنب العقبات المبكرة.',
            children: ['مؤشرات الأداء', 'تخفيف المخاطر', 'التطوير المستمر'],
          },
        ];

  return {
    title,
    subtitle,
    branches: safeBranches,
    keyTakeaway: (
      raw.keyTakeaway ||
      'ابدأ بأهم فرع يحقق قيمة فورية ثم وسّع بقية الفروع تدريجياً بقياس واضح للنتائج.'
    )
      .trim()
      .slice(0, 220),
    generatedAt: typeof raw.generatedAt === 'number' ? raw.generatedAt : Date.now(),
  };
}

export function buildMindMapSvgMarkup(
  data: AiMindMapData,
  layout: 'radial' | 'tree' = 'radial'
): string {
  const width = 1400;
  const height = 880;
  const branches = data.branches.slice(0, 6);

  if (layout === 'tree') {
    const colCount = Math.max(1, branches.length);
    const colWidth = (width - 100) / colCount;
    const branchMarkup = branches
      .map((br, idx) => {
        const bx = 50 + idx * colWidth + colWidth / 2;
        const by = 250;
        const childrenMarkup = br.children
          .slice(0, 4)
          .map((child, cIdx) => {
            const cy = 375 + cIdx * 105;
            return `
              <line x1="${bx}" y1="${by + 36}" x2="${bx}" y2="${cy - 28}" stroke="${br.color}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="4 4"/>
              <rect x="${bx - colWidth * 0.43}" y="${cy - 32}" width="${colWidth * 0.86}" height="64" rx="14" fill="#131926" stroke="${br.color}" stroke-opacity="0.45" stroke-width="1.5"/>
              <text x="${bx}" y="${cy + 5}" text-anchor="middle" fill="#E2E8F0" font-size="15" font-weight="600" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(child, 28))}</text>
            `;
          })
          .join('');
        return `
          <path d="M ${width / 2} 145 C ${width / 2} 195, ${bx} 185, ${bx} ${by - 36}" fill="none" stroke="${br.color}" stroke-width="3" stroke-opacity="0.75"/>
          <rect x="${bx - colWidth * 0.45}" y="${by - 38}" width="${colWidth * 0.9}" height="76" rx="18" fill="#182033" stroke="${br.color}" stroke-width="2.5"/>
          <text x="${bx}" y="${by + 6}" text-anchor="middle" fill="#FFFFFF" font-size="18" font-weight="800" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(br.title, 22))}</text>
          ${childrenMarkup}
        `;
      })
      .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" direction="rtl">
      <defs>
        <linearGradient id="mmBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0B0F1A"/>
          <stop offset="100%" stop-color="#121A2C"/>
        </linearGradient>
        <linearGradient id="mmRoot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB"/>
          <stop offset="100%" stop-color="#7C3AED"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#mmBg)"/>
      <g opacity="0.08" stroke="#93C5FD" stroke-width="1">
        <line x1="0" y1="220" x2="${width}" y2="220"/>
        <line x1="0" y1="440" x2="${width}" y2="440"/>
        <line x1="0" y1="660" x2="${width}" y2="660"/>
      </g>
      <rect x="${width / 2 - 260}" y="44" width="520" height="100" rx="26" fill="url(#mmRoot)" stroke="#F5C76B" stroke-width="2.5"/>
      <text x="${width / 2}" y="88" text-anchor="middle" fill="#FFFFFF" font-size="25" font-weight="900" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(data.title, 38))}</text>
      <text x="${width / 2}" y="122" text-anchor="middle" fill="#E0E7FF" font-size="14" font-weight="600" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(data.subtitle, 60))}</text>
      ${branchMarkup}
      <rect x="60" y="${height - 76}" width="${width - 120}" height="52" rx="14" fill="#141C2E" stroke="#F5C76B" stroke-opacity="0.35"/>
      <text x="${width / 2}" y="${height - 44}" text-anchor="middle" fill="#FDE68A" font-size="15" font-weight="700" font-family="Cairo, Tajawal, sans-serif">الخلاصة: ${escapeXml(truncateText(data.keyTakeaway, 96))}</text>
    </svg>`;
  }

  // Radial Mind Map Layout
  const cx = width / 2;
  const cy = height / 2 - 15;
  const leftBranches = branches.filter((_, idx) => idx % 2 === 1);
  const rightBranches = branches.filter((_, idx) => idx % 2 === 0);

  const renderSide = (items: AiMindMapBranch[], isRight: boolean) => {
    const count = Math.max(1, items.length);
    const stepY = 580 / count;
    const startY = 175 + stepY / 2;
    return items
      .map((br, idx) => {
        const bx = isRight ? cx + 320 : cx - 320;
        const by = startY + idx * stepY;
        const ctrlX = isRight ? cx + 165 : cx - 165;
        const childBaseX = isRight ? bx + 230 : bx - 230;
        const childCount = Math.max(1, br.children.length);
        const childSpan = Math.min(145, childCount * 42);
        const childrenSvg = br.children
          .slice(0, 4)
          .map((child, cIdx) => {
            const offset =
              childCount === 1
                ? 0
                : -childSpan / 2 + (cIdx * childSpan) / (childCount - 1);
            const cyNode = by + offset;
            const anchorEdge = isRight ? bx + 112 : bx - 112;
            const targetEdge = isRight ? childBaseX - 102 : childBaseX + 102;
            return `
              <path d="M ${anchorEdge} ${by} C ${(anchorEdge + targetEdge) / 2} ${by}, ${(anchorEdge + targetEdge) / 2} ${cyNode}, ${targetEdge} ${cyNode}" fill="none" stroke="${br.color}" stroke-opacity="0.5" stroke-width="2"/>
              <rect x="${childBaseX - 102}" y="${cyNode - 18}" width="204" height="36" rx="11" fill="#131A29" stroke="${br.color}" stroke-opacity="0.45" stroke-width="1.3"/>
              <text x="${childBaseX}" y="${cyNode + 5}" text-anchor="middle" fill="#E2E8F0" font-size="13.5" font-weight="600" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(child, 24))}</text>
            `;
          })
          .join('');

        return `
          <path d="M ${cx} ${cy} C ${ctrlX} ${cy}, ${ctrlX} ${by}, ${bx} ${by}" fill="none" stroke="${br.color}" stroke-width="3.5" stroke-opacity="0.82"/>
          <rect x="${bx - 115}" y="${by - 30}" width="230" height="60" rx="18" fill="#182236" stroke="${br.color}" stroke-width="2.4"/>
          <text x="${bx}" y="${by + 6}" text-anchor="middle" fill="#FFFFFF" font-size="16.5" font-weight="800" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(br.title, 22))}</text>
          ${childrenSvg}
        `;
      })
      .join('');
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" direction="rtl">
    <defs>
      <radialGradient id="mmGlow" cx="50%" cy="48%" r="55%">
        <stop offset="0%" stop-color="#1A2744"/>
        <stop offset="100%" stop-color="#0A0E18"/>
      </radialGradient>
      <linearGradient id="mmCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1D4ED8"/>
        <stop offset="100%" stop-color="#6D28D9"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#mmGlow)"/>
    <circle cx="${cx}" cy="${cy}" r="185" fill="none" stroke="#60A5FA" stroke-opacity="0.12" stroke-dasharray="6 8"/>
    <circle cx="${cx}" cy="${cy}" r="335" fill="none" stroke="#F5C76B" stroke-opacity="0.09" stroke-dasharray="4 10"/>
    ${renderSide(rightBranches, true)}
    ${renderSide(leftBranches, false)}
    <rect x="${cx - 155}" y="${cy - 64}" width="310" height="128" rx="30" fill="url(#mmCore)" stroke="#F5C76B" stroke-width="3"/>
    <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="900" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(data.title, 26))}</text>
    <text x="${cx}" y="${cy + 24}" text-anchor="middle" fill="#DBEAFE" font-size="12.5" font-weight="600" font-family="Cairo, Tajawal, sans-serif">${escapeXml(truncateText(data.subtitle, 40))}</text>
    <text x="${width - 42}" y="44" text-anchor="end" fill="#93C5FD" font-size="13" font-weight="700" font-family="Cairo, Tajawal, sans-serif">AETHERMIND AI · خريطة ذهنية تفاعلية</text>
    <rect x="60" y="${height - 74}" width="${width - 120}" height="50" rx="14" fill="#131B2C" stroke="#F5C76B" stroke-opacity="0.35"/>
    <text x="${width / 2}" y="${height - 43}" text-anchor="middle" fill="#FDE68A" font-size="14.5" font-weight="700" font-family="Cairo, Tajawal, sans-serif">الخلاصة التنفيذية: ${escapeXml(truncateText(data.keyTakeaway, 94))}</text>
  </svg>`;
}

export function buildConversationMarkdownExport(
  title: string,
  messages: Array<{ role: 'user' | 'assistant'; text: string; ts?: number }>
): string {
  const lines: string[] = [
    `# ${title || 'محادثة أثيرمايند AI'}`,
    '',
    `> تم التصدير من **AETHERMIND · أثيرمايند AI**`,
    '',
    '---',
    '',
  ];
  for (const m of messages) {
    if (!m.text?.trim()) continue;
    lines.push(m.role === 'user' ? '## 👤 المستخدم' : '## ✨ أثيرمايند AI');
    lines.push('');
    lines.push(m.text.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}
