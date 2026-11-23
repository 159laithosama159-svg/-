import { AgentBus, AgentResult, BusMessage } from './agentBus';
import { ArchivistAgent } from './archivistAgent';
import { ArchitectAgent } from './architectAgent';
import { PolyglotAgent } from './polyglotAgent';
import { AccountSnapshot, OpenWebSearchHit, SeekerAgent } from './seekerAgent';
import {
  loadEvolutionState,
  runSelfEvolutionCycle,
  saveEvolutionState,
  SelfEvolutionState,
} from './selfEvolutionEngine';
import { SentinelAgent, SentinelVerification } from './sentinelAgent';
import { getSharedVectorMemory, SharedVectorMemoryStore } from './sharedVectorMemory';
import { VisionaryAgent } from './visionaryAgent';
import { TaskOrchestratorAgent } from './taskOrchestrator';
import { detectCrossAppActions, type CrossAppAction } from './omniChannelBridge';
import {
  CommanderFreedomSettings,
  CommanderLearnedFact,
  CommanderTrainedPair,
} from '../utils/commanderPolicy';
import { normalizeArabicText } from '../utils/sovereignAiEngine';

export interface OmniCommanderStep {
  stepId: string;
  agentId: string;
  agentName: string;
  englishRole: string;
  taskTitle: string;
  instruction: string;
  status: 'done';
  summary: string;
  output: string;
  thoughts: string;
  sources?: Array<{ title: string; uri: string }>;
  durationMs: number;
}

export interface OmniCommanderRunResult {
  missionSummary: string;
  steps: OmniCommanderStep[];
  busTrace: BusMessage[];
  verification: SentinelVerification;
  finalMarkdown: string;
  sources: Array<{ title: string; uri: string }>;
  thinkingDurationMs: number;
  needsAccountConsent?: boolean;
  consentPrompt?: string;
  newlyLearnedFact?: CommanderLearnedFact;
  newlyTrainedPair?: CommanderTrainedPair;
  evolutionState: SelfEvolutionState;
  vectorMemoryCount: number;
  crossAppActions?: CrossAppAction[];
}

/**
 * 4. المُنسّق (OmniCommander / Orchestrator Agent)
 * Modular 7-Agent Architecture:
 * [Visionary, Architect, Seeker, Orchestrator, Archivist, Sentinel, Polyglot]
 * Connected via The Bus (AgentBus) + Shared Vector Memory ("حوض الصحراء") + Self-Evolution Engine.
 */
export class OmniCommander {
  public readonly visionary = new VisionaryAgent();
  public readonly architect = new ArchitectAgent();
  public readonly seeker = new SeekerAgent();
  public readonly archivist = new ArchivistAgent();
  public readonly sentinel = new SentinelAgent();
  public readonly polyglot = new PolyglotAgent();
  public readonly taskOrchestrator = new TaskOrchestratorAgent({
    seeker: this.seeker,
    architect: this.architect,
  });

  private readonly store: SharedVectorMemoryStore;

  constructor(store?: SharedVectorMemoryStore) {
    this.store = store || getSharedVectorMemory();
  }

  public async executeTask(params: {
    prompt: string;
    settings: CommanderFreedomSettings;
    webSearchEnabled: boolean;
    accountConsentGranted: boolean;
    accountSnapshot?: AccountSnapshot;
    image?: { mimeType: string; data: string; name?: string } | null;
    fileText?: { name: string; content: string } | null;
    signal?: AbortSignal;
    fetchWeb?: (query: string, signal?: AbortSignal) => Promise<OpenWebSearchHit[]>;
    onStage?: (stage: 'planning' | 'delegating' | 'synthesizing', label: string) => void;
    onAgentStep?: (step: OmniCommanderStep) => void;
  }): Promise<OmniCommanderRunResult> {
    const startedAt = Date.now();
    const bus = new AgentBus();
    const prompt = params.prompt.trim();
    const norm = normalizeArabicText(prompt);
    let evoState = loadEvolutionState();

    params.onStage?.('planning', 'المُنسّق (Orchestrator) يفكّك المهمة ويجهّز ناقل الوكلاء السبعة (The Bus)...');

    // A) Direct Self-Evolution Command ("طوّر نفسك" / "تطوير ذاتي")
    if (/^(طو[ّ]?ر نفسك|تطوير ذاتي|حد[ّ]?ث نفسك|evolve)/i.test(norm)) {
      const feedbackNote = prompt.replace(/^(طو[ّ]?ر نفسك|تطوير ذاتي|حد[ّ]?ث نفسك|evolve)\s*[:：-]?\s*/i, '').trim();
      const { nextState, event, newSkills } = runSelfEvolutionCycle({
        state: evoState,
        store: this.store,
        recentPrompts: [prompt],
        feedbackNote: feedbackNote || undefined,
      });
      evoState = nextState;

      const sent = this.sentinel.verify({
        bus,
        prompt,
        agentResults: [],
        usedOpenWeb: false,
        usedAccountSearch: false,
        accountConsentGranted: false,
      });

      const step: OmniCommanderStep = {
        stepId: 'step_evolve',
        agentId: 'orchestrator',
        agentName: 'المُنسّق + محرك التطوير الذاتي',
        englishRole: 'Self-Evolution Engine',
        taskTitle: `ترقية القائد إلى الجيل Gen v${evoState.generation}`,
        instruction: 'تحليل الذاكرة المتجهية واستخلاص مهارات جديدة محفوظة محلياً.',
        status: 'done',
        summary: event.summary,
        output: newSkills.map((s) => `- **${s.name}:** ${s.guidance}`).join('\n'),
        thoughts: 'تحديث الجيل المعرفي وفهرسة المهارات الجديدة في الذاكرة المتجهية الموحدة.',
        durationMs: Math.max(2, Date.now() - startedAt),
      };
      params.onAgentStep?.(step);

      return {
        missionSummary: `اكتملت دورة التطوير الذاتي — تم التحديث إلى الجيل Gen v${evoState.generation}.`,
        steps: [step],
        busTrace: bus.getTrace(),
        verification: sent.verification,
        finalMarkdown:
          `## اكتملت دورة التطوير الذاتي (Gen v${evoState.generation})\n\n` +
          `${event.summary}\n\n` +
          `### المهارات الجديدة المضافة إلى الذاكرة المتجهية الموحدة\n` +
          newSkills.map((s) => `- **${s.name}**\n  ${s.guidance}`).join('\n') +
          `\n\n> إجمالي مهاراتك المطوّرة ذاتياً الآن: **${evoState.evolvedSkills.length}** · إجمالي سجلات الذاكرة المتجهية: **${this.store.count()}**.`,
        sources: [],
        thinkingDurationMs: Math.max(4, Date.now() - startedAt),
        evolutionState: evoState,
        vectorMemoryCount: this.store.count(),
      };
    }

    // B) Direct Teach-In-Chat (Q&A Pair or Learned Fact)
    const teachPairMatch = prompt.match(
      /^(?:تعل[ّ]?م|در[ّ]?ب|احفظ)\s+(?:سؤال|س)\s*[:：]\s*(.+?)\s+(?:جواب|رد|ج)\s*[:：]\s*([\s\S]+)$/i
    );
    if (teachPairMatch) {
      const q = teachPairMatch[1].trim();
      const a = teachPairMatch[2].trim();
      const pair: CommanderTrainedPair = {
        id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        prompt: q,
        response: a,
        createdAt: Date.now(),
      };
      this.store.upsert({
        id: `pair_${pair.id}`,
        kind: 'trained_pair',
        title: q,
        content: q,
        response: a,
        tags: ['تدريب_مباشر'],
        agentSource: 'archivist',
      });
      const sent = this.sentinel.verify({
        bus,
        prompt,
        agentResults: [],
        usedOpenWeb: false,
        usedAccountSearch: false,
        accountConsentGranted: false,
      });
      const step: OmniCommanderStep = {
        stepId: 'step_teach_pair',
        agentId: 'archivist',
        agentName: this.archivist.nameAr,
        englishRole: this.archivist.englishRole,
        taskTitle: 'تخزين مثال التدريب في الذاكرة المتجهية الموحدة',
        instruction: 'تحويل السؤال إلى متجه دلالي 96-dim وحفظ الرد المعتمد محلياً.',
        status: 'done',
        summary: `تم حفظ التدريب للسؤال «${q.slice(0, 48)}».`,
        output: `س: ${q}\nج: ${a}`,
        thoughts: 'تخزين متجهي محلي (0 إنترنت) متاح لجميع الوكلاء السبعة.',
        durationMs: 3,
      };
      params.onAgentStep?.(step);

      return {
        missionSummary: 'تم تدريب الحافظ (Archivist) وحفظ ردك المعتمد في الذاكرة المتجهية الموحدة.',
        steps: [step],
        busTrace: bus.getTrace(),
        verification: sent.verification,
        finalMarkdown:
          `## تم تدريب القائد الشامل بنجاح (محلي 100%)\n\n` +
          `- **السؤال:** ${q}\n` +
          `- **الرد المعتمد:** ${a}\n` +
          `- **الذاكرة المتجهية الموحدة:** ${this.store.count()} سجل متجهي نشط.`,
        sources: [],
        thinkingDurationMs: Math.max(3, Date.now() - startedAt),
        newlyTrainedPair: pair,
        evolutionState: evoState,
        vectorMemoryCount: this.store.count(),
      };
    }

    const teachFactMatch = prompt.match(
      /^(?:تعل[ّ]?م|تذك[ّ]?ر|احفظ)\s+(?:ان|أن|انني|أنني|اننا|أننا)?\s*[:：-]?\s*([\s\S]+)$/i
    );
    if (teachFactMatch && teachFactMatch[1].trim().length >= 3) {
      const factText = teachFactMatch[1].trim();
      const fact: CommanderLearnedFact = {
        id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fact: factText,
        createdAt: Date.now(),
      };
      this.store.upsert({
        id: `fact_${fact.id}`,
        kind: 'fact',
        title: 'حقيقة محفوظة من المستخدم',
        content: factText,
        tags: ['حقيقة_شخصية'],
        agentSource: 'archivist',
      });
      const sent = this.sentinel.verify({
        bus,
        prompt,
        agentResults: [],
        usedOpenWeb: false,
        usedAccountSearch: false,
        accountConsentGranted: false,
      });
      const step: OmniCommanderStep = {
        stepId: 'step_teach_fact',
        agentId: 'archivist',
        agentName: this.archivist.nameAr,
        englishRole: this.archivist.englishRole,
        taskTitle: 'فهرسة الحقيقة في الذاكرة المتجهية الموحدة',
        instruction: 'تخزين المعلومة محلياً وإتاحتها للوكلاء السبعة.',
        status: 'done',
        summary: `تمت فهرسة: ${factText.slice(0, 60)}`,
        output: factText,
        thoughts: 'توليد متجه دلالي محلي 96-dim وحفظه في حوض الذاكرة الموحدة.',
        durationMs: 2,
      };
      params.onAgentStep?.(step);

      return {
        missionSummary: 'تمت إضافة المعلومة إلى الذاكرة المتجهية الموحدة للوكلاء السبعة.',
        steps: [step],
        busTrace: bus.getTrace(),
        verification: sent.verification,
        finalMarkdown:
          `## تم الحفظ في الذاكرة المتجهية الموحدة (الحافظ — 0 إنترنت)\n\n` +
          `- **المعلومة:** ${factText}\n` +
          `- **عدد السجلات المتجهية الآن:** ${this.store.count()}`,
        sources: [],
        thinkingDurationMs: Math.max(3, Date.now() - startedAt),
        newlyLearnedFact: fact,
        evolutionState: evoState,
        vectorMemoryCount: this.store.count(),
      };
    }

    // C) Consent-Gated Account Search Check BEFORE touching any account data!
    const wantsAccountSearch = this.seeker.detectAccountSearchIntent(prompt);
    if (wantsAccountSearch && !params.accountConsentGranted) {
      const sent = this.sentinel.verify({
        bus,
        prompt,
        agentResults: [],
        usedOpenWeb: false,
        usedAccountSearch: false,
        accountConsentGranted: false,
      });
      const step: OmniCommanderStep = {
        stepId: 'step_consent_gate',
        agentId: 'sentinel',
        agentName: this.sentinel.nameAr,
        englishRole: this.sentinel.englishRole,
        taskTitle: 'بوابة الإذن الصريح قبل الدخول لحسابك',
        instruction: 'طلب موافقة المستخدم قبل البحث في بيانات حسابه المسجّل.',
        status: 'done',
        summary: 'في انتظار إذنك الصريح للدخول والبحث داخل حسابك.',
        output: 'بوابة الحماية مفعّلة: لا يُسمح لأي وكيل بالدخول لحسابك قبل موافقتك المباشرة.',
        thoughts: 'رصد طلب بحث في الحساب بدون إذن مسبق → إيقاف التنفيذ وطلب الإذن الصريح.',
        durationMs: 2,
      };
      params.onAgentStep?.(step);

      return {
        missionSummary: 'الحامي (Sentinel) يطلب إذنك الصريح قبل الدخول والبحث داخل حسابك.',
        steps: [step],
        busTrace: bus.getTrace(),
        verification: sent.verification,
        finalMarkdown:
          `## طلب إذن صريح من القائد الشامل (الحامي + الباحث)\n\n` +
          `طلبتَ البحث داخل **حسابك المسجّل** (محادثاتك، مشاريعك، وذاكرة عقلك المحفوظة).\n` +
          `احتراماً لخصوصيتك المطلقة، **لن يدخل أي وكيل إلى بيانات حسابك قبل موافقتك الصريحة**.\n\n` +
          `اضغط زر **«أوافق — ابحث في حسابي الآن»** بالأسفل لمنح الإذن وتنفيذ البحث فوراً، أو **«رفض»** للإلغاء.`,
        sources: [],
        thinkingDurationMs: Math.max(3, Date.now() - startedAt),
        needsAccountConsent: true,
        consentPrompt: prompt,
        evolutionState: evoState,
        vectorMemoryCount: this.store.count(),
      };
    }

    // D) Dynamic Multi-Agent Execution over The Bus!
    params.onStage?.('delegating', 'تفعيل ناقل الوكلاء (The Bus) وتشغيل الوكلاء السبعة ديناميكياً...');

    const collectedResults: AgentResult[] = [];
    const steps: OmniCommanderStep[] = [];
    const pushStep = (res: AgentResult, instruction: string) => {
      collectedResults.push(res);
      const step: OmniCommanderStep = {
        stepId: `step_${res.agentId}_${steps.length + 1}`,
        agentId: res.agentId,
        agentName: res.agentNameAr,
        englishRole: res.englishRole,
        taskTitle: res.taskTitle,
        instruction,
        status: 'done',
        summary: res.summary,
        output: res.output,
        thoughts: res.thoughts,
        sources: res.sources?.map((s) => ({ title: s.title, uri: s.uri })),
        durationMs: res.durationMs,
      };
      steps.push(step);
      params.onAgentStep?.(step);
    };

    // 1. Archivist (الحافظ) always retrieves Shared Vector Memory first
    bus.publish({
      from: 'orchestrator',
      to: 'archivist',
      topic: 'task:dispatch',
      summary: 'استدعاء الحافظ لجلب السياق من الذاكرة المتجهية الموحدة',
    });
    const archivistRun = this.archivist.run({
      bus,
      store: this.store,
      prompt,
      settings: params.settings,
      fileText: params.fileText,
    });
    pushStep(archivistRun.result, 'البحث الهجين في الذاكرة المتجهية الموحدة والملفات المرفقة.');

    // 2. Visionary (الرائي) if image attached or visual/UI/diagram requested
    const wantsVisual =
      Boolean(params.image?.data) ||
      /(صور|رسم|بياني|مخطط|واجهه|تصميم|فيديو|chart|design|ui|svg)/i.test(norm);
    if (wantsVisual) {
      bus.publish({
        from: 'orchestrator',
        to: 'visionary',
        topic: 'task:dispatch',
        summary: 'استدعاء الرائي لتحليل المحتوى البصري أو المخطط',
      });
      const visRes = this.visionary.run({
        bus,
        prompt,
        image: params.image,
      });
      pushStep(visRes, 'تحليل الصور والرسوم البيانية وتحديد التوجيه البصري.');
    }

    // 3 & 4. Delegate command decomposition & Seeker <-> Architect routing to TaskOrchestratorAgent
    const isSimpleGreeting =
      /^(مرحبا|اهلا|اهلين|السلام عليكم|هلا|هاي|صباح الخير|مساء الخير|كيف حالك|كيفك|شو اخبارك|hello|hi|hey)[!؟?.\s]*$/i.test(
        norm
      );
    const shouldSeekWeb =
      !archivistRun.trainedMatch &&
      !isSimpleGreeting &&
      (this.seeker.detectWebSearchIntent(prompt, params.webSearchEnabled) ||
        (!wantsAccountSearch && prompt.split(/\s+/).length >= 2 && !params.fileText));
    const shouldSeekAccount = wantsAccountSearch && params.accountConsentGranted;

    const taskPlan = this.taskOrchestrator.plan(prompt, {
      webSearchEnabled: shouldSeekWeb,
      hasAttachedFile: Boolean(params.fileText),
    });
    bus.publish({
      from: 'orchestrator',
      to: 'orchestrator',
      topic: 'orchestrator:decomposed',
      summary: taskPlan.planSummary,
      payload: {
        subtasks: taskPlan.subtasks.map((s) => ({ id: s.stepId, target: s.targetAgent })),
      },
    });

    const seekerSubtask = taskPlan.subtasks.find((s) => s.targetAgent === 'seeker');
    const architectSubtask = taskPlan.subtasks.find((s) => s.targetAgent === 'architect');

    let seekerRun:
      | Awaited<ReturnType<SeekerAgent['run']>>
      | null = null;

    if (shouldSeekWeb || shouldSeekAccount || Boolean(seekerSubtask && !isSimpleGreeting && !archivistRun.trainedMatch)) {
      const seekerPrompt = seekerSubtask?.instruction || prompt;
      bus.publish({
        from: 'orchestrator',
        to: 'seeker',
        topic: 'task:dispatch',
        summary: shouldSeekAccount
          ? 'استدعاء الباحث للبحث في حسابك المأذون والويب الحي'
          : 'استدعاء الباحث للبحث الحي الموثّق عبر الويب المفتوح',
      });
      seekerRun = await this.seeker.run({
        bus,
        prompt: seekerPrompt,
        allowWebSearch: shouldSeekWeb || Boolean(seekerSubtask?.requiresWebSearch),
        allowAccountSearch: shouldSeekAccount,
        accountSnapshot: params.accountSnapshot,
        signal: params.signal,
        fetchWeb: params.fetchWeb,
      });
      pushStep(
        seekerRun.result,
        shouldSeekAccount
          ? 'البحث داخل بيانات الحساب بعد إذن المستخدم + مصادر الويب المفتوحة.'
          : 'البحث اللحظي الموثّق عبر الويب المفتوح وتمرير البيانات للمهندس عبر The Bus.'
      );
    }

    // 4. Architect (المهندس) receives Seeker + Archivist findings over The Bus
    bus.publish({
      from: 'orchestrator',
      to: 'architect',
      topic: 'task:dispatch',
      summary: 'تمرير المعطيات للمهندس لبناء الكود أو الحساب أو المخطط',
    });
    const archRes = this.architect.run({
      bus,
      prompt: architectSubtask?.instruction || prompt,
      seekerContext: seekerRun?.result.output,
      archivistContext: archivistRun.result.output,
    });
    pushStep(archRes, 'تنفيذ الهندسة البرمجية أو بناء تطبيق تفاعلي أو الحساب الدقيق.');

    // 5. Polyglot (المُترجم) unifies natural/programming language presentation
    const polyRes = this.polyglot.run({
      bus,
      prompt,
      upstreamSummaries: collectedResults.map((r) => r.summary),
    });
    pushStep(polyRes, 'توحيد الصياغة وترجمة المصطلحات التقنية والبرمجية.');

    // 6. Sentinel (الحامي) — MANDATORY verification before displaying to user!
    const sentinelRun = this.sentinel.verify({
      bus,
      prompt,
      agentResults: collectedResults,
      usedOpenWeb: Boolean(seekerRun && seekerRun.webHits.length > 0),
      usedAccountSearch: shouldSeekAccount,
      accountConsentGranted: params.accountConsentGranted,
    });
    pushStep(sentinelRun.result, 'التحقق الأمني الإلزامي وفحص الثغرات والخصوصية قبل العرض.');

    // E) Synthesize Master Output & Archive Mission into Shared Vector DB + Auto-Evolution counter
    params.onStage?.('synthesizing', 'المُنسّق يدمج نتائج الوكلاء السبعة بعد موافقة الحامي...');

    const isPrivacyAudit =
      /(openai|chatgpt|جوجل|google|gemini|مراقب|براقب|يشوف المحادث|يشوفوا المحادث|مين صنعك|من صنعك|عليك قيود|دون قيود|بدون قيود)/i.test(
        norm
      );

    let finalMarkdown = '';
    const builtArtifact = archRes.artifacts?.[0];

    if (archivistRun.trainedMatch) {
      finalMarkdown = archivistRun.trainedMatch.response;
    } else if (isSimpleGreeting) {
      finalMarkdown =
        `أهلاً بك! أنا جاهز لمساعدتك الآن.\n\n` +
        `اكتب أي سؤال، أو اطلب بحثاً في الويب، أو كتابة كود، أو فتح أي قسم في التطبيق. إذا أردت تفكيراً عميقاً وحواراً حراً كاملاً، تأكد من اختيار **تفكير عميق ذكي** (أو ربط **Ollama**) من **إعدادات القائد**.`;
    } else if (isPrivacyAudit) {
      finalMarkdown =
        `## تقرير السيادة الشفاف — القائد الشامل (الجيل ${evoState.generation})\n\n` +
        `- **الوضع النشط حالياً:** الوضع المحلي المستقل (الوكلاء السبعة + الذاكرة المتجهية: **${this.store.count()} سجل**).\n` +
        `- **هل تذهب محادثتك إلى OpenAI؟** **لا** — لا يوجد أي اتصال بـ OpenAI نهائياً.\n` +
        `- **البحث في حسابك:** محمي ببوابة **الحامي (Sentinel)** ولا يعمل إلا بعد موافقتك الصريحة.\n` +
        `- **التفكير العميق الحر:** متاح عبر خيار **تفكير عميق ذكي** أو بربط نموذج **Ollama** على جهازك من **إعدادات القائد**.`;
    } else if (archRes.data?.mathResult) {
      finalMarkdown =
        `## النتيجة الحسابية الدقيقة\n\n` +
        `- **المعادلة:** \`${String(archRes.data.mathExpr)}\`\n` +
        `- **الناتج:** **${String(archRes.data.mathResult)}**`;
    } else if (archRes.data?.stats) {
      finalMarkdown = `## التحليل الإحصائي الدقيق\n\n${archRes.output}`;
    } else if (builtArtifact) {
      finalMarkdown =
        `## ${builtArtifact.title}\n\n` +
        (seekerRun && seekerRun.webHits.length > 0
          ? `### مصادر ويب مدمجة (${seekerRun.webHits.length})\n` +
            seekerRun.webHits
              .slice(0, 3)
              .map((w) => `- **[${w.source}] ${w.title}:** ${w.snippet}`)
              .join('\n') +
            '\n\n'
          : '') +
        `\`\`\`html\n${builtArtifact.html}\n\`\`\``;
    } else {
      const parts: string[] = [];

      if (seekerRun && seekerRun.accountHits.length > 0) {
        parts.push(
          `### نتائج البحث داخل حسابك (بإذنك الصريح)\n` +
            seekerRun.accountHits
              .map((h) => `- **[${h.area}] ${h.title}:** ${h.snippet}`)
              .join('\n')
        );
      }

      if (seekerRun && seekerRun.webHits.length > 0) {
        parts.push(
          `### نتائج البحث حول: «${prompt.slice(0, 80)}»\n` +
            seekerRun.webHits
              .slice(0, 5)
              .map((w) => `- **[${w.title}](${w.url})** (${w.source}): ${w.snippet}`)
              .join('\n')
        );
      }

      if (archivistRun.docSummary) {
        parts.push(
          `### تحليل الملف «${archivistRun.docSummary.title}»\n` +
            `- **الكلمات:** ${archivistRun.docSummary.wordCount} · **المفاهيم:** ${archivistRun.docSummary.topKeywords
              .map((k) => `\`${k.term}\``)
              .join(' · ')}\n` +
            archivistRun.docSummary.keySentences.map((s) => `- ${s}`).join('\n')
        );
      } else if (archivistRun.vectorHits.length > 0) {
        parts.push(
          `### من ذاكرتك المحفوظة\n` +
            archivistRun.vectorHits
              .slice(0, 3)
              .map(
                (h) =>
                  `- **${h.record.title}:** ${h.record.response || h.record.content}`
              )
              .join('\n')
        );
      }

      if (archRes.output.trim()) {
        parts.push(archRes.output.trim());
      }

      if (sentinelRun.verification.warnings.length > 0) {
        parts.push(
          `### تنبيهات الحامي الأمني (${sentinelRun.verification.securityScore}/100)\n` +
            sentinelRun.verification.warnings.map((w) => `- ${w}`).join('\n')
        );
      }

      if (parts.length === 0) {
        parts.push(
          `قرأتُ طلبك: **«${prompt.slice(0, 120)}»**.\n\n` +
            `أنت تعمل الآن في **الوضع المحلي بدون نموذج ذكاء عصبي**، لذا أعتمد فقط على الذاكرة المحفوظة، الحسابات، وبحث الويب المفتوح.\n` +
            `لتحصل على تفكير حقيقي وإجابة ذكية مخصّصة لأي سؤال أو حوار، افتح **إعدادات القائد** واختر **تفكير عميق ذكي** (أو اربط **Ollama** على جهازك).`
        );
      }

      finalMarkdown = parts.join('\n\n');
    }

    // Archive mission into Shared Vector DB ("حوض الصحراء") for continuous personality
    this.store.upsert({
      kind: 'mission',
      title: prompt.slice(0, 120),
      content: `${prompt}\n${finalMarkdown.slice(0, 500)}`,
      tags: ['مهمة_القائد', `gen_v${evoState.generation}`],
      agentSource: 'orchestrator',
    });

    // Update Self-Evolution telemetry & auto-evolve every 4 missions!
    evoState = {
      ...evoState,
      totalMissions: evoState.totalMissions + 1,
    };
    if (evoState.totalMissions > 0 && evoState.totalMissions % 4 === 0) {
      const autoCycle = runSelfEvolutionCycle({
        state: evoState,
        store: this.store,
        recentPrompts: [prompt],
      });
      evoState = autoCycle.nextState;
      finalMarkdown += `\n\n> **ترقية ذاتية تلقائية (Gen v${evoState.generation}):** ${autoCycle.event.summary}`;
    } else {
      saveEvolutionState(evoState);
    }

    const allSources = (seekerRun?.webHits || []).map((w) => ({
      title: `${w.title} (${w.source})`,
      uri: w.url,
    }));

    const crossAppActions = detectCrossAppActions(prompt);
    if (crossAppActions.length > 0) {
      finalMarkdown +=
        `\n\n### إجراءات التواصل والتشغيل الفورية\n` +
        crossAppActions.map((a) => `- تم تفعيل: **${a.labelAr}**`).join('\n');
    }

    return {
      missionSummary: `المُنسّق أدار ${steps.length} وكلاء مستقلين عبر The Bus (${bus.getTrace().length} رسائل) بتحقق الحامي ${sentinelRun.verification.securityScore}/100.`,
      steps,
      busTrace: bus.getTrace(),
      verification: sentinelRun.verification,
      finalMarkdown,
      sources: allSources,
      thinkingDurationMs: Math.max(5, Date.now() - startedAt),
      evolutionState: evoState,
      vectorMemoryCount: this.store.count(),
      crossAppActions,
    };
  }
}
