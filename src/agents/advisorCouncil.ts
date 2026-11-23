import { normalizeArabicText } from '../utils/sovereignAiEngine.ts';

export interface AssistantMember {
  id: string;
  nameAr: string;
  englishRole: string;
  specialtyAr: string;
  systemGuidance: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface AdvisorCouncilConfig {
  advisorEnabled: boolean;
  advisorStyle: 'balanced' | 'strict_critic' | 'creative_strategist';
  assistants: AssistantMember[];
}

const STORAGE_KEY = 'valdrion_advisor_council_v1';

export const CHIEF_ADVISOR_PROFILE = {
  id: 'chief_advisor',
  nameAr: 'المستشار الأعلى',
  englishRole: 'Chief Strategic Advisor',
  specialtyAr: 'يساعد القائد في كل شيء: يراجع القرارات، يكشف النقاط العمياء، ويقترح أذكى مسار.',
};

export function createDefaultAssistants(): AssistantMember[] {
  return [
    {
      id: 'exec_assistant',
      nameAr: 'المساعد المنفّذ',
      englishRole: 'Execution Assistant',
      specialtyAr: 'يحوّل الأفكار إلى خطوات عملية واضحة ومهام جاهزة للتنفيذ الفوري.',
      systemGuidance:
        'حوّل التوصيات إلى خطوات مرقّمة قابلة للتنفيذ فوراً مع أولويات واضحة بدون كلام نظري زائد.',
      enabled: true,
    },
    {
      id: 'creative_assistant',
      nameAr: 'مساعد الإبداع والأفكار',
      englishRole: 'Creative Ideation Assistant',
      specialtyAr: 'يقترح أفكاراً بديلة وزوايا مبتكرة خارج الصندوق.',
      systemGuidance:
        'اقترح زاوية إبداعية بديلة أو ميزة ذكية إضافية ترفع قيمة النتيجة بشكل ملموس.',
      enabled: true,
    },
    {
      id: 'critic_assistant',
      nameAr: 'مساعد التدقيق والمراجعة',
      englishRole: 'Verification & Critic Assistant',
      specialtyAr: 'يكشف الأخطاء المنطقية والثغرات ويدقّق الحقائق قبل عرض الإجابة.',
      systemGuidance:
        'دقّق المنطق والأرقام والافتراضات، واذكر أي مخاطرة أو خطأ محتمل وكيفية تفاديه.',
      enabled: true,
    },
    {
      id: 'growth_assistant',
      nameAr: 'مساعد البحث والفرص',
      englishRole: 'Research & Growth Assistant',
      specialtyAr: 'يستخرج أفضل الأدوات والمصادر العملية والفرص السريعة.',
      systemGuidance:
        'رشّح أفضل الأدوات أو المصادر أو البدائل العملية التي تختصر الوقت والجهد.',
      enabled: true,
    },
  ];
}

export function createDefaultAdvisorCouncilConfig(): AdvisorCouncilConfig {
  return {
    advisorEnabled: true,
    advisorStyle: 'balanced',
    assistants: createDefaultAssistants(),
  };
}

export function normalizeAdvisorCouncilConfig(
  raw?: Partial<AdvisorCouncilConfig> | null
): AdvisorCouncilConfig {
  const base = createDefaultAdvisorCouncilConfig();
  if (!raw || typeof raw !== 'object') return base;

  const advisorStyle: AdvisorCouncilConfig['advisorStyle'] =
    raw.advisorStyle === 'strict_critic' || raw.advisorStyle === 'creative_strategist'
      ? raw.advisorStyle
      : 'balanced';

  const assistants: AssistantMember[] = Array.isArray(raw.assistants)
    ? raw.assistants
        .filter(
          (a): a is AssistantMember =>
            Boolean(a) &&
            typeof a.id === 'string' &&
            typeof a.nameAr === 'string' &&
            a.nameAr.trim().length > 0 &&
            typeof a.specialtyAr === 'string'
        )
        .map((a) => ({
          id: a.id.trim().slice(0, 60),
          nameAr: a.nameAr.trim().slice(0, 80),
          englishRole:
            typeof a.englishRole === 'string' && a.englishRole.trim()
              ? a.englishRole.trim().slice(0, 80)
              : 'Custom Specialist Assistant',
          specialtyAr: a.specialtyAr.trim().slice(0, 220),
          systemGuidance:
            typeof a.systemGuidance === 'string' && a.systemGuidance.trim()
              ? a.systemGuidance.trim().slice(0, 300)
              : a.specialtyAr.trim().slice(0, 220),
          enabled: typeof a.enabled === 'boolean' ? a.enabled : true,
          isCustom: Boolean(a.isCustom),
        }))
        .slice(0, 12)
    : base.assistants;

  return {
    advisorEnabled: typeof raw.advisorEnabled === 'boolean' ? raw.advisorEnabled : true,
    advisorStyle,
    assistants: assistants.length > 0 ? assistants : base.assistants,
  };
}

export function loadAdvisorCouncilConfig(): AdvisorCouncilConfig {
  try {
    if (typeof window === 'undefined') return createDefaultAdvisorCouncilConfig();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultAdvisorCouncilConfig();
    return normalizeAdvisorCouncilConfig(JSON.parse(raw) as Partial<AdvisorCouncilConfig>);
  } catch {
    return createDefaultAdvisorCouncilConfig();
  }
}

export function saveAdvisorCouncilConfig(config: AdvisorCouncilConfig): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota overflow
  }
}

export function addCustomAssistant(
  config: AdvisorCouncilConfig,
  nameAr: string,
  specialtyAr: string
): AdvisorCouncilConfig {
  const cleanName = nameAr.trim().slice(0, 80);
  const cleanSpecialty = specialtyAr.trim().slice(0, 220);
  if (!cleanName || !cleanSpecialty) return config;

  const custom: AssistantMember = {
    id: `custom_asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nameAr: cleanName,
    englishRole: 'Custom Assistant',
    specialtyAr: cleanSpecialty,
    systemGuidance: `بصفتك «${cleanName}»، ساعد القائد الأعلى بالتخصص التالي: ${cleanSpecialty}`,
    enabled: true,
    isCustom: true,
  };

  return {
    ...config,
    assistants: [...config.assistants, custom].slice(0, 12),
  };
}

export function toggleAssistantEnabled(
  config: AdvisorCouncilConfig,
  assistantId: string
): AdvisorCouncilConfig {
  return {
    ...config,
    assistants: config.assistants.map((a) =>
      a.id === assistantId ? { ...a, enabled: !a.enabled } : a
    ),
  };
}

export function removeCustomAssistant(
  config: AdvisorCouncilConfig,
  assistantId: string
): AdvisorCouncilConfig {
  return {
    ...config,
    assistants: config.assistants.filter((a) => !(a.id === assistantId && a.isCustom)),
  };
}

/**
 * Selects the most relevant enabled assistants for a given user prompt
 * (plus always prioritizes custom user assistants whose specialty matches).
 */
export function selectAssistantsForTask(
  prompt: string,
  config: AdvisorCouncilConfig,
  maxAssistants = 2
): AssistantMember[] {
  const enabled = config.assistants.filter((a) => a.enabled);
  if (enabled.length === 0) return [];

  const norm = normalizeArabicText(prompt);
  const scored = enabled.map((asst) => {
    let score = asst.isCustom ? 2 : 1;
    if (
      asst.id === 'exec_assistant' &&
      /(خطه|خطوات|نفذ|ابني|مشروع|مهام|جدول|كيف ابدا|تطبيق)/i.test(norm)
    ) {
      score += 5;
    }
    if (
      asst.id === 'creative_assistant' &&
      /(فكره|افكار|ابتكار|قصه|تصميم|اسم|شعار|ابداع|لعبه|محتوى)/i.test(norm)
    ) {
      score += 5;
    }
    if (
      asst.id === 'critic_assistant' &&
      /(فحص|دقق|راجع|خطا|مشكله|امان|مقارنه|رايك|قرار|تحليل|كود)/i.test(norm)
    ) {
      score += 5;
    }
    if (
      asst.id === 'growth_assistant' &&
      /(ابحث|فرص|سوق|ربح|تسويق|ادوات|منافس|مصادر|اخبار|احدث)/i.test(norm)
    ) {
      score += 5;
    }
    // Token overlap boost for custom assistants
    const specTokens = normalizeArabicText(`${asst.nameAr} ${asst.specialtyAr}`)
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    for (const tok of specTokens) {
      if (norm.includes(tok)) score += 3;
    }
    return { asst, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, maxAssistants)).map((s) => s.asst);
}

/**
 * Compiles the active Chief Advisor + Additional Assistants directives
 * to guide the Commander's deep multi-agent reasoning.
 */
export function buildAdvisorCouncilPromptBlock(
  config: AdvisorCouncilConfig,
  prompt?: string
): string {
  const lines: string[] = [];

  if (config.advisorEnabled) {
    const styleNote =
      config.advisorStyle === 'strict_critic'
        ? 'أسلوب المستشار: ناقد صارم يكشف كل ثغرة ويصحّح الافتراضات بلا مجاملة.'
        : config.advisorStyle === 'creative_strategist'
        ? 'أسلوب المستشار: استراتيجي مبدع يبحث عن حلول غير تقليدية ومختصرة.'
        : 'أسلوب المستشار: متوازن وحكيم يجمع بين الدقة العملية والرؤية الاستراتيجية.';

    lines.push(
      `[المستشار الأعلى للقائد — Chief Advisor (نشط في كل مهمة)]:\n` +
        `- يساعد القائد في كل شيء: يراجع الفكرة قبل صياغة الحل، يكشف أي نقطة عمياء، ويضيف نصيحة استراتيجية مختصرة ومباشرة عند الحاجة.\n` +
        `- ${styleNote}`
    );
  }

  const chosen = prompt
    ? selectAssistantsForTask(prompt, config, 3)
    : config.assistants.filter((a) => a.enabled);

  if (chosen.length > 0) {
    lines.push(
      `[المساعدون المتخصصون المساندون للقائد (${chosen.length})]:\n` +
        chosen
          .map((a, idx) => `${idx + 1}. **${a.nameAr}**: ${a.systemGuidance}`)
          .join('\n')
    );
  }

  return lines.join('\n\n');
}
