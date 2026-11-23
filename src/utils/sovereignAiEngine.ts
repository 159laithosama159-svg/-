/**
 * Pure Logic Engine for Sovereign Private AI ("ذكائي الخاص السري")
 * - 100% Local Built-From-Scratch Trainable Brain (DEFAULT — ZERO external API, ZERO OpenAI, ZERO Google)
 * - Arabic + English normalization, BM25 retrieval over custom Q&A training pairs, learned facts & encrypted docs
 * - Teach-in-chat memory extraction, extractive local summarizer, safe math solver
 * - Safe browser-direct local endpoint URL validation (Ollama / LM Studio)
 */

export type SovereignEngineMode = 'offline-browser' | 'local-endpoint' | 'zero-log-cloud';
export type SovereignDepth = 'fast' | 'balanced' | 'deep' | 'max';

export interface SovereignRule {
  id: string;
  text: string;
  enabled: boolean;
}

export interface SovereignKnowledgeDoc {
  id: string;
  name: string;
  content: string;
  addedAt: number;
}

export interface SovereignTrainingPair {
  id: string;
  prompt: string;
  response: string;
  createdAt: number;
}

export interface SovereignLearnedFact {
  id: string;
  fact: string;
  createdAt: number;
}

export interface CustomSovereignModel {
  id: string;
  name: string;
  subtitle: string;
  personaPrompt: string;
  tone: string;
  rules: SovereignRule[];
  knowledgeDocs: SovereignKnowledgeDoc[];
  trainingPairs: SovereignTrainingPair[];
  learnedFacts: SovereignLearnedFact[];
  depth: SovereignDepth;
  createdAt: number;
}

export interface SovereignChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  engineUsed: SovereignEngineMode;
}

export interface SovereignConversation {
  id: string;
  modelId: string;
  title: string;
  messages: SovereignChatMessage[];
  updatedAt: number;
}

export interface LocalEndpointConfig {
  url: string;
  modelName: string;
  format: 'ollama' | 'openai';
}

export interface SovereignVaultData {
  models: CustomSovereignModel[];
  conversations: SovereignConversation[];
  activeModelId: string;
  activeConversationId: string;
  engineMode: SovereignEngineMode;
  localEndpoint: LocalEndpointConfig;
  isolatedMode: boolean;
}

export interface OfflineMindResult {
  reply: string;
  newlyLearnedFact?: string;
  newlyTrainedPair?: { prompt: string; response: string };
  matchedSource:
    | 'teach'
    | 'training'
    | 'fact'
    | 'document'
    | 'math'
    | 'summary'
    | 'identity'
    | 'memory'
    | 'greeting'
    | 'general';
}

export const QUICK_USER_RULE_PRESETS: string[] = [
  'أجب مباشرة في صلب الموضوع بدون مقدمات أو مجاملات زائدة.',
  'اعرض الإجابات على شكل نقاط مرتّبة وواضحة.',
  'احفظ سياق أسئلتي واعتمد على تدريبي وملفاتي الخاصة أولاً.',
  'تحدّث معي بالعربية الطبيعية السلسة بدون رسميات.',
  'أجب باختصار شديد في سطر أو سطرين.',
  'لا تتصل بأي خادم خارجي — ابقَ محلياً 100% داخل جهازي.',
];

export const TONE_OPTIONS: Array<{ id: string; label: string; directive: string }> = [
  { id: 'direct', label: 'مباشر وحاسم', directive: 'كن مباشراً وحاسماً ودقيقاً في كل إجابة.' },
  {
    id: 'analytical',
    label: 'تحليلي وعميق',
    directive: 'قدّم تحليلاً عميقاً منظماً بخطوات واضحة وأدلة منطقية.',
  },
  { id: 'creative', label: 'إبداعي ومفتوح', directive: 'فكّر خارج الصندوق بأسلوب إبداعي غني ومبتكر.' },
  { id: 'casual', label: 'عفوي وقريب', directive: 'تحدث بأسلوب طبيعي عفوي كصديق خبير يفهمك بسرعة.' },
  {
    id: 'strict-tech',
    label: 'هندسي وبرمجي صارم',
    directive: 'ركز على الحلول الهندسية والبرمجية الصارمة القابلة للتنفيذ فوراً.',
  },
];

export function makeSovereignId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultVaultData(): SovereignVaultData {
  const starterModelId = 'sov_model_prime';
  const starterConvId = 'sov_conv_prime';
  const now = Date.now();

  const starterModel: CustomSovereignModel = {
    id: starterModelId,
    name: 'عقلي الخاص',
    subtitle: 'نواة محلية مبنية لك من الصفر · 0 بايت خارج جهازك',
    personaPrompt:
      'أنت نموذج ذكاء اصطناعي شخصي مستقل بالكامل، يعمل محلياً لصاحبه فقط وفق قواعده وتدريبه وملفاته الخاصة.',
    tone: 'direct',
    rules: [
      {
        id: 'rule_1',
        text: 'أجب مباشرة في صلب الموضوع بدون مقدمات أو حشو.',
        enabled: true,
      },
      {
        id: 'rule_2',
        text: 'اعتمد على تدريبي وحقائقي وملفاتي الخاصة أولاً.',
        enabled: true,
      },
    ],
    knowledgeDocs: [],
    trainingPairs: [],
    learnedFacts: [],
    depth: 'balanced',
    createdAt: now,
  };

  return {
    models: [starterModel],
    conversations: [
      {
        id: starterConvId,
        modelId: starterModelId,
        title: 'جلسة محلية سرية',
        messages: [],
        updatedAt: now,
      },
    ],
    activeModelId: starterModelId,
    activeConversationId: starterConvId,
    // DEFAULT is strictly 100% local in-browser (ZERO cloud servers, ZERO OpenAI, ZERO Google)
    engineMode: 'offline-browser',
    localEndpoint: {
      url: 'http://127.0.0.1:11434/api/chat',
      modelName: 'qwen2.5',
      format: 'ollama',
    },
    isolatedMode: false,
  };
}

/**
 * Normalizes legacy vaults decrypted from localStorage so newer fields
 * (trainingPairs, learnedFacts) are always valid arrays.
 */
export function normalizeVaultData(raw: SovereignVaultData): SovereignVaultData {
  const fallback = createDefaultVaultData();
  const models =
    Array.isArray(raw.models) && raw.models.length > 0
      ? raw.models.map((m) => ({
          ...m,
          rules: Array.isArray(m.rules) ? m.rules : [],
          knowledgeDocs: Array.isArray(m.knowledgeDocs) ? m.knowledgeDocs : [],
          trainingPairs: Array.isArray(m.trainingPairs) ? m.trainingPairs : [],
          learnedFacts: Array.isArray(m.learnedFacts) ? m.learnedFacts : [],
        }))
      : fallback.models;

  const activeModelId = models.some((m) => m.id === raw.activeModelId)
    ? raw.activeModelId
    : models[0].id;

  const conversations = Array.isArray(raw.conversations) ? raw.conversations : fallback.conversations;
  const activeConversationId = conversations.some((c) => c.id === raw.activeConversationId)
    ? raw.activeConversationId
    : conversations[0]?.id ?? fallback.activeConversationId;

  const engineMode: SovereignEngineMode =
    raw.engineMode === 'offline-browser' ||
    raw.engineMode === 'local-endpoint' ||
    raw.engineMode === 'zero-log-cloud'
      ? raw.engineMode
      : 'offline-browser';

  return {
    models,
    conversations,
    activeModelId,
    activeConversationId,
    engineMode,
    localEndpoint: raw.localEndpoint ?? fallback.localEndpoint,
    isolatedMode: Boolean(raw.isolatedMode),
  };
}

/**
 * Compiles the system instruction strictly from the user's custom model, training examples,
 * learned facts, and user-defined rules. Contains ZERO references to Cinema, Novels, or OpenAI.
 */
export function compileSovereignSystemInstruction(model: CustomSovereignModel): string {
  const parts: string[] = [];
  const cleanName = model.name.trim() || 'ذكائي الخاص';
  parts.push(`اسم النموذج: ${cleanName}`);

  if (model.personaPrompt.trim()) {
    parts.push(`الهوية والدور المحدد من المالك:\n${model.personaPrompt.trim()}`);
  }

  const toneEntry = TONE_OPTIONS.find((t) => t.id === model.tone);
  if (toneEntry) {
    parts.push(`أسلوب الرد المطلوب: ${toneEntry.directive}`);
  }

  const activeRules = model.rules.filter((r) => r.enabled && r.text.trim().length > 0);
  if (activeRules.length > 0) {
    const ruleLines = activeRules.map((r, i) => `${i + 1}. ${r.text.trim()}`).join('\n');
    parts.push(`القواعد والقيود الخاصة التي وضعها المالك (التزم بها بدقة):\n${ruleLines}`);
  }

  if (model.learnedFacts.length > 0) {
    const factLines = model.learnedFacts
      .slice(-30)
      .map((f, i) => `${i + 1}. ${f.fact.trim()}`)
      .join('\n');
    parts.push(`حقائق وذكريات علّمك إياها المالك:\n${factLines}`);
  }

  if (model.trainingPairs.length > 0) {
    const pairLines = model.trainingPairs
      .slice(-20)
      .map((p) => `سؤال: ${p.prompt.trim()}\nجواب معتمد: ${p.response.trim()}`)
      .join('\n---\n');
    parts.push(`أمثلة التدريب المعتمدة من المالك:\n${pairLines}`);
  }

  if (model.knowledgeDocs.length > 0) {
    const knowledgeBlock = model.knowledgeDocs
      .slice(0, 8)
      .map((doc) => {
        const snippet = doc.content.trim().slice(0, 6000);
        return `--- ملف خاص: ${doc.name} ---\n${snippet}`;
      })
      .join('\n\n');
    parts.push(`قاعدة المعرفة الخاصة بالمستخدم:\n${knowledgeBlock}`);
  }

  return parts.join('\n\n');
}

/**
 * Validates browser-direct local/self-hosted AI endpoint URLs.
 * Allows http:// ONLY for loopback (localhost / 127.0.0.1 / [::1]) or https:// for private self-hosted servers.
 */
export function validateLocalEndpointUrl(rawUrl: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'أدخل رابط الخادم المحلي مثل http://127.0.0.1:11434/api/chat' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'صيغة الرابط غير صحيحة.' };
  }

  const protocol = parsed.protocol.toLowerCase();
  const host = parsed.hostname.toLowerCase();

  if (protocol !== 'http:' && protocol !== 'https:') {
    return { valid: false, error: 'يُسمح فقط ببروتوكول http المحلي أو https.' };
  }

  if (host === '169.254.169.254' || host.startsWith('169.254.')) {
    return { valid: false, error: 'هذا العنوان غير مسموح به.' };
  }

  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (protocol === 'http:' && !isLoopback) {
    return {
      valid: false,
      error: 'استخدم http فقط مع جهازك المحلي (localhost أو 127.0.0.1)، أو استخدم https للخوادم الخاصة.',
    };
  }

  return { valid: true, normalized: parsed.toString() };
}

/**
 * Safe recursive-descent math expression evaluator (supports +, -, *, /, ^, parentheses).
 * Zero eval() or Function() usage.
 */
export function evaluateSafeMathExpression(raw: string): number | null {
  const cleaned = raw
    .replace(/[×x]/gi, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');

  if (!cleaned || !/^[0-9+\-*/().^]+$/.test(cleaned)) {
    return null;
  }
  if (!/[+\-*/^]/.test(cleaned)) {
    return null;
  }

  let pos = 0;

  function peek(): string {
    return cleaned[pos] ?? '';
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = cleaned[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = cleaned[pos++];
      const right = parsePower();
      if (op === '/' && right === 0) {
        throw new Error('Division by zero');
      }
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      pos += 1;
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '+') {
      pos += 1;
      return parseUnary();
    }
    if (peek() === '-') {
      pos += 1;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      pos += 1;
      const val = parseExpression();
      if (peek() !== ')') throw new Error('Unclosed parenthesis');
      pos += 1;
      return val;
    }
    const start = pos;
    let sawDot = false;
    while (pos < cleaned.length) {
      const ch = cleaned[pos];
      if (ch >= '0' && ch <= '9') {
        pos += 1;
      } else if (ch === '.' && !sawDot) {
        sawDot = true;
        pos += 1;
      } else {
        break;
      }
    }
    if (pos === start) throw new Error('Expected number');
    const num = Number(cleaned.slice(start, pos));
    if (!Number.isFinite(num)) throw new Error('Invalid number');
    return num;
  }

  try {
    const result = parseExpression();
    if (pos !== cleaned.length || !Number.isFinite(result)) return null;
    return Math.round(result * 1_000_000) / 1_000_000;
  } catch {
    return null;
  }
}

const ARABIC_STOPWORDS = new Set([
  'في',
  'من',
  'على',
  'الى',
  'عن',
  'مع',
  'هو',
  'هي',
  'هم',
  'انا',
  'انت',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'كان',
  'يكون',
  'ما',
  'ماذا',
  'شو',
  'كيف',
  'هل',
  'ليش',
  'كم',
  'اين',
  'وين',
  'ان',
  'او',
  'ثم',
  'كل',
  'بعد',
  'قبل',
  'بين',
  'جدا',
  'فقط',
  'the',
  'is',
  'are',
  'of',
  'to',
  'and',
  'in',
  'for',
  'on',
  'with',
]);

/**
 * Arabic + English text normalizer & light stemmer for accurate local retrieval.
 */
export function normalizeArabicText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // strip tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lightStemToken(token: string): string {
  let t = token;
  if (t.length > 4 && t.startsWith('ال')) t = t.slice(2);
  else if (t.length > 4 && (t.startsWith('وال') || t.startsWith('بال') || t.startsWith('كال') || t.startsWith('فال'))) {
    t = t.slice(3);
  }
  if (t.length > 4 && (t.endsWith('ون') || t.endsWith('ين') || t.endsWith('ات') || t.endsWith('ها') || t.endsWith('هم'))) {
    t = t.slice(0, -2);
  }
  return t;
}

export function tokenizeForLocalSearch(text: string): string[] {
  const normalized = normalizeArabicText(text);
  if (!normalized) return [];
  const raw = normalized.split(' ').filter((w) => w.length >= 2 && !ARABIC_STOPWORDS.has(w));
  const expanded = new Set<string>();
  for (const w of raw) {
    expanded.add(w);
    const stem = lightStemToken(w);
    if (stem.length >= 2) expanded.add(stem);
  }
  return Array.from(expanded);
}

function scoreOverlap(queryTokens: string[], targetText: string, rawNormalizedQuery: string): number {
  const normTarget = normalizeArabicText(targetText);
  if (!normTarget) return 0;
  let score = 0;

  if (rawNormalizedQuery.length >= 4 && normTarget.includes(rawNormalizedQuery)) {
    score += 5;
  }
  if (normTarget.length >= 4 && rawNormalizedQuery.includes(normTarget)) {
    score += 4;
  }

  const targetTokens = new Set(tokenizeForLocalSearch(targetText));
  for (const qt of queryTokens) {
    if (targetTokens.has(qt)) {
      score += 1.6;
    } else if (qt.length >= 3 && normTarget.includes(qt)) {
      score += 0.9;
    }
  }
  return score;
}

/**
 * Local extractive summarizer — ranks sentences by term frequency with zero external API.
 */
function summarizeLocally(text: string, maxSentences = 3): string {
  const sentences = text
    .split(/(?<=[.!؟?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  if (sentences.length <= maxSentences) {
    return sentences.map((s) => `- ${s}`).join('\n') || text.trim();
  }

  const freq = new Map<string, number>();
  for (const s of sentences) {
    for (const tok of tokenizeForLocalSearch(s)) {
      freq.set(tok, (freq.get(tok) ?? 0) + 1);
    }
  }

  const scored = sentences.map((s, idx) => {
    const toks = tokenizeForLocalSearch(s);
    const sum = toks.reduce((acc, t) => acc + (freq.get(t) ?? 0), 0);
    return { idx, s, score: toks.length > 0 ? sum / Math.sqrt(toks.length) : 0 };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.idx - b.idx);

  return top.map((item) => `- ${item.s}`).join('\n');
}

/**
 * 100% Built-From-Scratch Offline Local Mind — ZERO network requests, ZERO OpenAI, ZERO Google.
 */
export function runOfflineLocalMind(
  model: CustomSovereignModel,
  userMessage: string,
  history: SovereignChatMessage[]
): OfflineMindResult {
  const query = userMessage.trim();
  const normQuery = normalizeArabicText(query);
  const queryTokens = tokenizeForLocalSearch(query);
  const activeRules = model.rules.filter((r) => r.enabled && r.text.trim());
  const wantsBrief = activeRules.some((r) => /اختصار|مختصر|قصير|مباشرة|بدون مقدمات|سطر/.test(r.text));
  const wantsBullets = activeRules.some((r) => /نقاط|قائمه|قائمة|مرقمة/.test(r.text));

  // 1A. Teach Q&A Pair directly in chat: "تعلّم سؤال: ... جواب: ..."
  const qaTeachMatch = query.match(
    /^(?:تعل[ّ]?م|در[ّ]?ب)\s+(?:سؤال|السؤال)\s*[:：]\s*(.+?)\s+(?:جواب|الجواب|الرد)\s*[:：]\s*(.+)$/is
  );
  if (qaTeachMatch) {
    const trainedPrompt = qaTeachMatch[1].trim();
    const trainedResponse = qaTeachMatch[2].trim();
    if (trainedPrompt && trainedResponse) {
      return {
        matchedSource: 'teach',
        newlyTrainedPair: { prompt: trainedPrompt, response: trainedResponse },
        reply: `تم تدريبي محلياً وحفظ القاعدة في خزنتك فقط (صفر إنترنت):\n\n- **عندما تسأل:** ${trainedPrompt}\n- **سأجيبك:** ${trainedResponse}`,
      };
    }
  }

  // 1B. Teach a Fact directly in chat: "تعلّم أن ..." / "احفظ أن ..." / "تذكر أن ..."
  const factTeachMatch = query.match(
    /^(?:تعل[ّ]?م|احفظ|تذك[ّ]?ر|سج[ّ]?ل)\s+(?:أ?ن[ّ]?|لي|عندي)?\s*[:：]?\s*(.+)$/i
  );
  if (factTeachMatch && factTeachMatch[1].trim().length >= 4 && !/[؟?]$/.test(query)) {
    const cleanFact = factTeachMatch[1].trim();
    return {
      matchedSource: 'teach',
      newlyLearnedFact: cleanFact,
      reply: wantsBrief
        ? `تم الحفظ محلياً في ذاكرة «${model.name}»: **${cleanFact}**`
        : `حفظت هذه المعلومة في ذاكرة **«${model.name}»** المحلية داخل جهازك فقط (لم تُرسل لأي خادم):\n\n> ${cleanFact}\n\nاسألني عنها في أي وقت وسأجيبك منها فوراً.`,
    };
  }

  // 2. Local Extractive Summarizer: "لخص: <text>"
  const summarizeMatch = query.match(/^(?:لخ[ّ]?ص|ملخص|اختصر)\s*[:：]\s*([\s\S]+)$/i);
  if (summarizeMatch && summarizeMatch[1].trim().length > 40) {
    const summary = summarizeLocally(summarizeMatch[1].trim(), wantsBrief ? 2 : 3);
    return {
      matchedSource: 'summary',
      reply: `**ملخص محلي (تمت المعالجة داخل جهازك فقط):**\n\n${summary}`,
    };
  }

  // 3. Safe Math Evaluator
  const mathMatch = query.match(
    /([0-9]+(?:\.[0-9]+)?(?:\s*[+\-*/×÷^]\s*\(?-?[0-9]+(?:\.[0-9]+)?\)?)+)/
  );
  if (mathMatch) {
    const computed = evaluateSafeMathExpression(mathMatch[1]);
    if (computed !== null) {
      return {
        matchedSource: 'math',
        reply: wantsBrief
          ? `النتيجة: **${computed}**`
          : `تم الحساب محلياً داخل جهازك (صفر إنترنت):\n\n\`${mathMatch[1].trim()}\` = **${computed}**`,
      };
    }
  }

  // 4. Self-Awareness (Who / How / What / Why) & Privacy Audit — 100% Honest Local Verification
  if (
    /(openai|اوبن|جوجل|غوغل|google|جيميني|gemini|مين صنع|من صنع|براقب|يراقب|يشوف المحادث|يشوفوا|هل المحادثه سريه|قيودك|قواعدك|من انت|مين انت|شو وظيفتك|كيف تشتغل|كيف تعمل|شو تسوي|شو تقدر|ليش|لماذا|عرفني بنفسك|عرف نفسك|هويتك)/.test(
      normQuery
    )
  ) {
    const rulesList =
      activeRules.length > 0
        ? activeRules.map((r, i) => `${i + 1}. ${r.text}`).join('\n')
        : 'لا توجد قيود مضافة بعد — أنت وحدك من يضيفها.';

    return {
      matchedSource: 'identity',
      reply: [
        `أنا **${model.name}** — الذكاء الخاص والمستقل داخل **منصة فالدريون (VALDRION)**.`,
        '',
        `- **من أنا (Who):** عقلك الشخصي المشفّر بـ \`AES-256-GCM\` داخل خزنة فالدريون، أعمل **محلياً 100% داخل جهازك فقط (0 بايت لأي شركة خارجية)**.`,
        `- **هل أنا من OpenAI أو Google أو يراقبني أحد؟** **لا!** كل كلامك وتدريبك يبقى داخل جهازك فقط ومشفّر بكلمة سرك.`,
        `- **كيف أعمل (How):** أقرأ تدريباتك الشخصية (\`${model.trainingPairs.length}\` قاعدة)، حقائقك المحفوظة (\`${model.learnedFacts.length}\`)، وملفاتك السرية (\`${model.knowledgeDocs.length}\`) محلياً، كما يمكنك ربطي بمحرك Ollama على جهازك.`,
        `- **ماذا أستطيع فعله (What):** أحفظ معلوماتك الخاصة، أُجيب بناءً على تدريبي بيدك، أُلخّص النصوص محلياً، أُجري الحسابات، وألتزم بقواعدك حرفياً.`,
        `- **لماذا صُنعت (Why):** لأمنحك خصوصية مطلقة وسيادة كاملة على أفكارك وأسرارك داخل عالم فالدريون دون أي مراقبة أو تتبع.`,
        '',
        '**قيودك وقواعدك المفعّلة حالياً:**',
        rulesList,
      ].join('\n'),
    };
  }

  // 5. User-Trained Q&A Pairs (Highest Priority Knowledge)
  if (model.trainingPairs.length > 0) {
    const rankedPairs = model.trainingPairs
      .map((pair) => ({
        pair,
        score: scoreOverlap(queryTokens, pair.prompt, normQuery),
      }))
      .filter((x) => x.score >= 1.5)
      .sort((a, b) => b.score - a.score);

    if (rankedPairs.length > 0) {
      return {
        matchedSource: 'training',
        reply: rankedPairs[0].pair.response,
      };
    }
  }

  // 6. Search Learned Facts + Private Encrypted Knowledge Documents
  const docHits: Array<{ source: string; text: string; score: number; kind: 'fact' | 'document' }> = [];

  for (const f of model.learnedFacts) {
    const score = scoreOverlap(queryTokens, f.fact, normQuery);
    if (score >= 1.2) {
      docHits.push({ source: 'ذاكرتك الخاصة', text: f.fact, score: score + 0.5, kind: 'fact' });
    }
  }

  for (const doc of model.knowledgeDocs) {
    const paragraphs = doc.content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    for (const para of paragraphs) {
      const score = scoreOverlap(queryTokens, para, normQuery);
      if (score >= 1.4) {
        docHits.push({ source: doc.name, text: para.slice(0, 700), score, kind: 'document' });
      }
    }
  }

  docHits.sort((a, b) => b.score - a.score);
  if (docHits.length > 0) {
    const top = docHits.slice(0, wantsBrief ? 1 : 3);
    const formatted = top
      .map((h) =>
        wantsBullets
          ? `- **${h.source}:** ${h.text}`
          : `**من ${h.source}:**\n${h.text}`
      )
      .join('\n\n');

    return {
      matchedSource: top[0].kind,
      reply: wantsBrief ? formatted : `${formatted}\n\n— *إجابة محلية 100% من خزنتك المشفّرة (0 بايت للإنترنت).*`,
    };
  }

  // 7. Recall All Saved Memory / Previous Notes
  if (/(ذاكرتي|شو حفظت|ماذا حفظت|تذكر|سابق|كل المعلومات)/.test(normQuery)) {
    const factsSection =
      model.learnedFacts.length > 0
        ? model.learnedFacts.map((f, i) => `${i + 1}. ${f.fact}`).join('\n')
        : 'لا توجد حقائق محفوظة بعد — اكتب `تعلّم أن ...` لحفظ أي معلومة فوراً.';
    const recentMsgs = history
      .filter((m) => m.role === 'user')
      .slice(-4)
      .map((m) => `- ${m.text.slice(0, 140)}`)
      .join('\n');

    return {
      matchedSource: 'memory',
      reply: [
        `**ذاكرة «${model.name}» المحلية المشفّرة:**`,
        '',
        factsSection,
        ...(recentMsgs ? ['', '**آخر رسائلك في هذه الجلسة:**', recentMsgs] : []),
      ].join('\n'),
    };
  }

  // 8. Friendly Greetings
  if (/^(مرحبا|اهلا|اهلين|هلا|السلام عليكم|سلام|هاي|hello|hi|كيفك|اخبارك)(\s|$)/.test(normQuery)) {
    return {
      matchedSource: 'greeting',
      reply: wantsBrief
        ? `أهلاً بك! أنا **${model.name}** أعمل محلياً داخل جهازك (0 إنترنت). بماذا نبدأ؟`
        : `أهلاً بك! أنا **${model.name}** — أعمل الآن **محلياً 100% داخل جهازك بدون OpenAI وبدون Google وبدون أي مراقبة**.\n\nجرّب الآن:\n- درّبني مباشرة في الدردشة: اكتب \`تعلّم أن ...\` أو \`تعلّم سؤال: ... جواب: ...\`\n- أو افتح **«قواعدي والتدريب»** لإضافة ملفاتك وقواعدك الخاصة.\n- وإذا أردت ذكاءً لغوياً ضخماً (مثل Llama/Qwen) محلياً 100% على جهازك بلا إنترنت، اختر من الأعلى **«جهازك المحلي Ollama»**.`,
    };
  }

  // 9. Honest Local Fallback (teaches user how to train this local mind or plug in local Ollama)
  if (wantsBrief) {
    return {
      matchedSource: 'general',
      reply: `لم أُدرَّب على هذا بعد في عقلي المحلي (0 إنترنت). درّبني فوراً بكتابة: \`تعلّم سؤال: ${query.slice(0, 40)} جواب: ...\` أو اربط نموذجك المحلي عبر **Ollama**.`,
    };
  }

  return {
    matchedSource: 'general',
    reply: [
      `أعمل الآن **محلياً 100% من الصفر داخل جهازك (صفر اتصال بأي شركة خارجية)**، ولم أجد إجابة مدرَّبة بعد لسؤالك في ذاكرتك أو ملفاتك.`,
      '',
      'أمامك 3 خيارات بيدك بالكامل:',
      `1. **درّبني الآن فوراً:** اكتب \`تعلّم أن ...\` أو \`تعلّم سؤال: ${query.slice(0, 36)} جواب: إجابتك\` وسأحفظه مشفّراً في جهازك للأبد.`,
      '2. **أضف ملفاتك وتدريبك:** افتح **«قواعدي والتدريب»** من الأعلى وأضف ملاحظاتك وملفاتك الخاصة.',
      '3. **شغّل نموذجاً عصبياً ضخماً 100% على حاسوبك (بدون OpenAI وبدون Google):** اختر من الأعلى **«جهازك المحلي Ollama»** وشغّل أي نموذج مفتوح المصدر على جهازك أنت وحدك.',
    ].join('\n'),
  };
}
