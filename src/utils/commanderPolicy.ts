export type CommanderEngineMode = 'local-kernel' | 'local-ollama' | 'cloud-commander';

export interface CommanderTrainedPair {
  id: string;
  prompt: string;
  response: string;
  createdAt: number;
}

export interface CommanderLearnedFact {
  id: string;
  fact: string;
  createdAt: number;
}

export interface CommanderFreedomSettings {
  engineMode: CommanderEngineMode;
  openMode: boolean;
  maxAgents: 2 | 3 | 4 | 5;
  customDirectives: string[];
  trainedPairs: CommanderTrainedPair[];
  learnedFacts: CommanderLearnedFact[];
  localEndpointUrl: string;
  localModelName: string;
  localApiFormat: 'ollama' | 'openai-compatible';
}

const STORAGE_KEY = 'valdrion_commander_freedom_v2';
const LEGACY_STORAGE_KEY = 'valdrion_commander_freedom_v1';
const COMMANDER_ACTIVE_KEY = 'valdrion_commander_active_v1';

export function createDefaultCommanderSettings(): CommanderFreedomSettings {
  return {
    engineMode: 'cloud-commander',
    openMode: true,
    maxAgents: 3,
    customDirectives: [
      'أجب مباشرة في صلب الموضوع بدون مقدمات إنشائية أو حشو.',
      'فكّر بعمق وقدّم إجابة مخصّصة ومفيدة للسؤال الفعلي دون تكرار قوالب جاهزة.',
      'اعتمد أولاً على تدريبي الخاص وحقائقي وذاكرتي المحفوظة عند توفرها.',
    ],
    trainedPairs: [],
    learnedFacts: [],
    localEndpointUrl: 'http://127.0.0.1:11434/api/chat',
    localModelName: 'qwen2.5',
    localApiFormat: 'ollama',
  };
}

export function normalizeCommanderSettings(
  raw?: Partial<CommanderFreedomSettings> | null
): CommanderFreedomSettings {
  const base = createDefaultCommanderSettings();
  if (!raw || typeof raw !== 'object') return base;

  const engineMode: CommanderEngineMode =
    raw.engineMode === 'local-kernel' ||
    raw.engineMode === 'local-ollama' ||
    raw.engineMode === 'cloud-commander'
      ? raw.engineMode
      : base.engineMode;

  const rawMax = Number(raw.maxAgents);
  const maxAgents: 2 | 3 | 4 | 5 =
    rawMax === 2 || rawMax === 3 || rawMax === 4 || rawMax === 5 ? rawMax : base.maxAgents;

  const customDirectives = Array.isArray(raw.customDirectives)
    ? raw.customDirectives
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => d.trim().slice(0, 300))
        .slice(0, 20)
    : base.customDirectives;

  const trainedPairs: CommanderTrainedPair[] = Array.isArray(raw.trainedPairs)
    ? raw.trainedPairs
        .filter(
          (p): p is CommanderTrainedPair =>
            Boolean(p) &&
            typeof p.id === 'string' &&
            typeof p.prompt === 'string' &&
            typeof p.response === 'string' &&
            p.prompt.trim().length > 0 &&
            p.response.trim().length > 0
        )
        .slice(0, 200)
    : [];

  const learnedFacts: CommanderLearnedFact[] = Array.isArray(raw.learnedFacts)
    ? raw.learnedFacts
        .filter(
          (f): f is CommanderLearnedFact =>
            Boolean(f) &&
            typeof f.id === 'string' &&
            typeof f.fact === 'string' &&
            f.fact.trim().length > 0
        )
        .slice(0, 300)
    : [];

  return {
    engineMode,
    openMode: typeof raw.openMode === 'boolean' ? raw.openMode : base.openMode,
    maxAgents,
    customDirectives,
    trainedPairs,
    learnedFacts,
    localEndpointUrl:
      typeof raw.localEndpointUrl === 'string' && raw.localEndpointUrl.trim()
        ? raw.localEndpointUrl.trim().slice(0, 300)
        : base.localEndpointUrl,
    localModelName:
      typeof raw.localModelName === 'string' && raw.localModelName.trim()
        ? raw.localModelName.trim().slice(0, 120)
        : base.localModelName,
    localApiFormat:
      raw.localApiFormat === 'openai-compatible' ? 'openai-compatible' : 'ollama',
  };
}

export function loadCommanderSettings(): CommanderFreedomSettings {
  try {
    if (typeof window === 'undefined') return createDefaultCommanderSettings();
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      return normalizeCommanderSettings(JSON.parse(rawV2) as Partial<CommanderFreedomSettings>);
    }
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as Partial<CommanderFreedomSettings>;
      // Upgrade legacy local-kernel default to smart thinking cloud-commander while keeping user rules/training
      const migrated = normalizeCommanderSettings({
        ...legacy,
        engineMode: legacy.engineMode === 'local-ollama' ? 'local-ollama' : 'cloud-commander',
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return createDefaultCommanderSettings();
  } catch {
    return createDefaultCommanderSettings();
  }
}

export function saveCommanderSettings(settings: CommanderFreedomSettings): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota issues
  }
}

export function loadCommanderActiveDefault(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(COMMANDER_ACTIVE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export function saveCommanderActiveDefault(active: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COMMANDER_ACTIVE_KEY, active ? '1' : '0');
  } catch {
    // ignore
  }
}

export function buildCommanderRulesBlock(settings: {
  openMode?: boolean;
  customDirectives?: string[];
  learnedFacts?: Array<{ fact: string }>;
  trainedPairs?: Array<{ prompt: string; response: string }>;
}): string {
  const sections: string[] = [];

  if (settings.openMode !== false) {
    sections.push(
      '[وضع القائد المفتوح]:\n' +
        '- لا قيود تطبيقية على طول الإجابة أو مستوى التفصيل.\n' +
        '- تخطّ المقدمات الآلية والعبارات المتكررة وادخل مباشرة في الحلول والنتائج.\n' +
        '- نفّذ طلبات المستخدم الإبداعية والبرمجية والتحليلية بعمق كامل ودقة عالية.'
    );
  }

  const cleanRules = (settings.customDirectives || [])
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, 15);
  if (cleanRules.length > 0) {
    sections.push(
      '[قواعد وتعليمات المستخدم المخصّصة للقائد (أولوية قصوى)]:\n' +
        cleanRules.map((r, i) => `${i + 1}. ${r}`).join('\n')
    );
  }

  const cleanFacts = (settings.learnedFacts || [])
    .map((f) => f.fact.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (cleanFacts.length > 0) {
    sections.push(
      '[ذاكرة وحقائق المستخدم المحلية]:\n' + cleanFacts.map((f) => `- ${f}`).join('\n')
    );
  }

  const cleanPairs = (settings.trainedPairs || [])
    .filter((p) => p.prompt.trim() && p.response.trim())
    .slice(0, 12);
  if (cleanPairs.length > 0) {
    sections.push(
      '[أمثلة التدريب المعتمدة من المستخدم]:\n' +
        cleanPairs.map((p) => `س: ${p.prompt.trim()}\nج: ${p.response.trim()}`).join('\n---\n')
    );
  }

  return sections.join('\n\n');
}
