import { AgentBus, AgentResult, BusMessage } from './agentBus';
import { ArchitectAgent } from './architectAgent';
import { AccountSearchHit, AccountSnapshot, OpenWebSearchHit, SeekerAgent } from './seekerAgent';
import { extractPublicUrlFromPrompt } from './omniChannelBridge';
import { normalizeArabicText } from '../utils/sovereignAiEngine';

export type DispatchTargetAgent = 'seeker' | 'architect';

export interface DecomposedSubtask {
  stepId: string;
  order: number;
  targetAgent: DispatchTargetAgent;
  agentNameAr: string;
  titleAr: string;
  instruction: string;
  dependsOn: string[];
  requiresWebSearch: boolean;
  requiresAccountSearch: boolean;
}

export interface OrchestrationPlan {
  originalPrompt: string;
  isCompound: boolean;
  planSummary: string;
  subtasks: DecomposedSubtask[];
}

export interface SubtaskExecutionOutcome {
  subtask: DecomposedSubtask;
  status: 'done' | 'blocked';
  result?: AgentResult;
  blockedReason?: string;
  webHits?: OpenWebSearchHit[];
  accountHits?: AccountSearchHit[];
}

export interface OrchestratorExecutionReport {
  plan: OrchestrationPlan;
  outcomes: SubtaskExecutionOutcome[];
  agentResults: AgentResult[];
  busTrace: BusMessage[];
  webHits: OpenWebSearchHit[];
  accountHits: AccountSearchHit[];
  needsAccountConsent: boolean;
  consentPrompt?: string;
  combinedMarkdown: string;
  durationMs: number;
}

export interface DecomposeCommandOptions {
  webSearchEnabled?: boolean;
  hasAttachedFile?: boolean;
}

const COMPOUND_SPLIT_REGEX =
  /\s+(?:ثم|وبعدها|وبعد\s+ذلك|ومن\s+ثم|بعدين|و\s*من\s*ثم|and\s+then|then|after\s+that)\s+/i;

const SEEKER_INTENT_REGEX =
  /(ابحث|بحث|الانترنت|الويب|اخبار|احدث|تقنيه\s*جديده|معلومات\s*عن|مصادر|تحقق\s*من|ما\s*هو|ما\s*هي|من\s*هو|حسابي|بحسابي|في\s*حسابي|محادثاتي|search|latest|news|lookup|find\s+info|wikipedia|github|arxiv)/i;

const ARCHITECT_ACTION_REGEX =
  /(اكتب\s*كود|برمج|اصنع|ابن|انشئ|طو[ّ]?ر|احسب|حساب|ناتج|متوسط|مجموع|احصاء|فحص\s*كود|صحح|نف[ّ]?ذ|صم[ّ]?م\s*كود|build|write\s+code|code\s+a|create\s+app|calculate|compute|refactor|debug)/i;

const ARCHITECT_NOUN_REGEX =
  /(كود|لعبه|تطبيق|موقع|خادم|سيرفر|اله\s*حاسبه|ارقام|داله|خوارزميه|هيكل|معماري|script|app|game|function|class|html|css|javascript|typescript|python|react|sql)/i;

const ACCOUNT_INTENT_REGEX =
  /(حسابي|بحسابي|في\s*حسابي|محادثاتي|مشاريعي\s*المحفوظه|بياناتي\s*المحفوظه|ايميلي|بريدي|سجل\s*دخولي|فوت\s*بحسابي|ادخل\s*حسابي|ابحث\s*في\s*حسابي|search\s*my\s*account|my\s*sessions)/i;

const MATH_EXPR_REGEX = /[0-9]\s*[+\-*/^%]\s*[0-9]|\b(sqrt|sin|cos|tan|log|abs|pow)\s*\(/i;

function classifyClause(clause: string, webSearchEnabled: boolean): {
  needsSeeker: boolean;
  needsArchitect: boolean;
  needsAccount: boolean;
} {
  const norm = normalizeArabicText(clause);
  const hasUrl = Boolean(extractPublicUrlFromPrompt(clause));
  const needsAccount = ACCOUNT_INTENT_REGEX.test(norm);
  const needsSeeker = hasUrl || needsAccount || SEEKER_INTENT_REGEX.test(norm);
  const hasCodeFence = /```/.test(clause);
  const hasMath = MATH_EXPR_REGEX.test(clause);
  const hasArchitectAction = ARCHITECT_ACTION_REGEX.test(norm);
  const hasArchitectNoun = ARCHITECT_NOUN_REGEX.test(norm);
  // If the clause is a search query (e.g. "ابحث عن تقنية HTML5"), only trigger Architect
  // on the same clause if it explicitly includes a build/code/math action or code block.
  const needsArchitect =
    hasCodeFence || hasMath || hasArchitectAction || (!needsSeeker && hasArchitectNoun);

  if (!needsSeeker && !needsArchitect) {
    return {
      needsSeeker: webSearchEnabled,
      needsArchitect: !webSearchEnabled,
      needsAccount: false,
    };
  }

  return { needsSeeker, needsArchitect, needsAccount };
}

/**
 * Pure task decomposition function:
 * Breaks a user command into ordered subtasks distributed between Seeker (الباحث)
 * and Architect (المهندس), wiring explicit dependency links when research feeds coding.
 */
export function decomposeUserCommand(
  rawPrompt: string,
  options: DecomposeCommandOptions = {}
): OrchestrationPlan {
  const prompt = rawPrompt.trim();
  const webSearchEnabled = Boolean(options.webSearchEnabled);

  if (!prompt) {
    return {
      originalPrompt: '',
      isCompound: false,
      planSummary: 'لا يوجد أمر لتفكيكه حالياً.',
      subtasks: [],
    };
  }

  const rawClauses = prompt
    .split(COMPOUND_SPLIT_REGEX)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const subtasks: DecomposedSubtask[] = [];
  let lastSeekerStepId: string | null = null;

  const pushSubtask = (params: {
    targetAgent: DispatchTargetAgent;
    titleAr: string;
    instruction: string;
    dependsOn?: string[];
    requiresWebSearch?: boolean;
    requiresAccountSearch?: boolean;
  }) => {
    const order = subtasks.length + 1;
    const stepId = `step_${order}_${params.targetAgent}`;
    subtasks.push({
      stepId,
      order,
      targetAgent: params.targetAgent,
      agentNameAr: params.targetAgent === 'seeker' ? 'الباحث (Seeker)' : 'المهندس (Architect)',
      titleAr: params.titleAr,
      instruction: params.instruction,
      dependsOn: params.dependsOn ? [...params.dependsOn] : [],
      requiresWebSearch: Boolean(params.requiresWebSearch),
      requiresAccountSearch: Boolean(params.requiresAccountSearch),
    });
    if (params.targetAgent === 'seeker') {
      lastSeekerStepId = stepId;
    }
  };

  for (const clause of rawClauses) {
    const intent = classifyClause(clause, webSearchEnabled);

    if (intent.needsSeeker && intent.needsArchitect) {
      // Single clause requesting both research & engineering -> Seeker first, then Architect
      pushSubtask({
        targetAgent: 'seeker',
        titleAr: intent.needsAccount
          ? 'جمع البيانات من الحساب المأذون والويب الحي'
          : 'البحث اللحظي وجمع المعطيات الموثّقة',
        instruction: clause,
        requiresWebSearch: !intent.needsAccount || webSearchEnabled,
        requiresAccountSearch: intent.needsAccount,
      });
      pushSubtask({
        targetAgent: 'architect',
        titleAr: 'تحويل نتائج الباحث إلى كود أو حل هندسي عملي',
        instruction: clause,
        dependsOn: lastSeekerStepId ? [lastSeekerStepId] : [],
      });
    } else if (intent.needsSeeker) {
      pushSubtask({
        targetAgent: 'seeker',
        titleAr: intent.needsAccount
          ? 'البحث داخل بيانات الحساب (بعد الإذن الصريح)'
          : 'البحث اللحظي الموثّق عبر الويب المفتوح',
        instruction: clause,
        requiresWebSearch: !intent.needsAccount || webSearchEnabled,
        requiresAccountSearch: intent.needsAccount,
      });
    } else {
      pushSubtask({
        targetAgent: 'architect',
        titleAr: 'التنفيذ الهندسي والبرمجي أو الحساب الدقيق',
        instruction: clause,
        dependsOn: lastSeekerStepId ? [lastSeekerStepId] : [],
      });
    }
  }

  // If webSearchEnabled is forced on and no seeker step was added for an open prompt, prepend Seeker
  if (
    webSearchEnabled &&
    !options.hasAttachedFile &&
    !subtasks.some((t) => t.targetAgent === 'seeker')
  ) {
    const existingArchitectIds = subtasks.map((t) => t.stepId);
    const seekerTask: DecomposedSubtask = {
      stepId: 'step_0_seeker',
      order: 1,
      targetAgent: 'seeker',
      agentNameAr: 'الباحث (Seeker)',
      titleAr: 'البحث الحي المسبق لتغذية المهندس بالمصادر',
      instruction: prompt,
      dependsOn: [],
      requiresWebSearch: true,
      requiresAccountSearch: false,
    };
    const reordered = [
      seekerTask,
      ...subtasks.map((task, idx) => ({
        ...task,
        order: idx + 2,
        dependsOn:
          task.targetAgent === 'architect' && existingArchitectIds.includes(task.stepId)
            ? Array.from(new Set([...task.dependsOn, seekerTask.stepId]))
            : task.dependsOn,
      })),
    ];
    subtasks.splice(0, subtasks.length, ...reordered);
  }

  const seekerCount = subtasks.filter((t) => t.targetAgent === 'seeker').length;
  const architectCount = subtasks.filter((t) => t.targetAgent === 'architect').length;
  const isCompound = subtasks.length > 1;

  const planSummary =
    seekerCount > 0 && architectCount > 0
      ? `تم تفكيك الأمر إلى ${subtasks.length} مهام مترابطة: الباحث (${seekerCount}) ← المهندس (${architectCount}).`
      : seekerCount > 0
      ? `تم توجيه الأمر إلى وكيل الباحث (${seekerCount} مهمة بحث موثّق).`
      : `تم توجيه الأمر إلى وكيل المهندس (${architectCount} مهمة برمجية/هندسية).`;

  return {
    originalPrompt: prompt,
    isCompound,
    planSummary,
    subtasks,
  };
}

/**
 * 4. هيكل المُنسّق المستقل (TaskOrchestratorAgent)
 * Responsible for decomposing user commands into ordered subtasks and dynamically
 * dispatching them between SeekerAgent (الباحث) and ArchitectAgent (المهندس) over AgentBus.
 */
export class TaskOrchestratorAgent {
  public readonly id = 'orchestrator' as const;
  public readonly nameAr = 'المُنسّق (Orchestrator)';
  public readonly englishRole = 'Task Decomposition & Routing Orchestrator';

  public readonly seeker: SeekerAgent;
  public readonly architect: ArchitectAgent;

  constructor(deps?: { seeker?: SeekerAgent; architect?: ArchitectAgent }) {
    this.seeker = deps?.seeker || new SeekerAgent();
    this.architect = deps?.architect || new ArchitectAgent();
  }

  /**
   * 1. التخطيط والتفكيك: يحوّل أمر المستخدم إلى خطة مهام فرعية واضحة.
   */
  public plan(prompt: string, options?: DecomposeCommandOptions): OrchestrationPlan {
    return decomposeUserCommand(prompt, options);
  }

  /**
   * 2. اختيار الوكيل المناسب لكل مهمة فرعية.
   */
  public selectAgent(subtask: DecomposedSubtask): SeekerAgent | ArchitectAgent {
    return subtask.targetAgent === 'seeker' ? this.seeker : this.architect;
  }

  /**
   * 3. التوزيع والتنفيذ عبر ناقل التواصل (The Bus) مع تمرير مخرجات الباحث إلى المهندس.
   */
  public async execute(params: {
    prompt: string;
    bus?: AgentBus;
    webSearchEnabled?: boolean;
    hasAttachedFile?: boolean;
    accountConsentGranted?: boolean;
    accountSnapshot?: AccountSnapshot;
    archivistContext?: string;
    signal?: AbortSignal;
    fetchWeb?: (query: string, signal?: AbortSignal) => Promise<OpenWebSearchHit[]>;
    onSubtaskStart?: (subtask: DecomposedSubtask) => void;
    onSubtaskComplete?: (outcome: SubtaskExecutionOutcome) => void;
  }): Promise<OrchestratorExecutionReport> {
    const startedAt = Date.now();
    const bus = params.bus || new AgentBus();
    const plan = this.plan(params.prompt, {
      webSearchEnabled: params.webSearchEnabled,
      hasAttachedFile: params.hasAttachedFile,
    });

    bus.publish({
      from: this.id,
      to: this.id,
      topic: 'orchestrator:plan_ready',
      summary: plan.planSummary,
      payload: {
        subtaskCount: plan.subtasks.length,
        targets: plan.subtasks.map((s) => s.targetAgent),
      },
    });

    const outcomes: SubtaskExecutionOutcome[] = [];
    const agentResults: AgentResult[] = [];
    const allWebHits: OpenWebSearchHit[] = [];
    const allAccountHits: AccountSearchHit[] = [];
    const stepOutputs = new Map<string, string>();

    let needsAccountConsent = false;
    let consentPrompt: string | undefined;

    for (const subtask of plan.subtasks) {
      params.onSubtaskStart?.(subtask);

      // Enforce explicit user consent before dispatching any account search to Seeker
      if (subtask.requiresAccountSearch && !params.accountConsentGranted) {
        needsAccountConsent = true;
        consentPrompt = subtask.instruction;
        const blockedReason =
          'يلزم الحصول على إذن صريح من المستخدم قبل السماح لوكيل الباحث بالدخول إلى بيانات الحساب.';

        bus.publish({
          from: this.id,
          to: 'sentinel',
          topic: 'orchestrator:consent_required',
          summary: 'إيقاف البحث في الحساب لحين موافقة المستخدم الصريحة',
          payload: { stepId: subtask.stepId },
        });

        const blockedOutcome: SubtaskExecutionOutcome = {
          subtask,
          status: 'blocked',
          blockedReason,
        };
        outcomes.push(blockedOutcome);
        params.onSubtaskComplete?.(blockedOutcome);
        continue;
      }

      bus.publish({
        from: this.id,
        to: subtask.targetAgent,
        topic: 'task:dispatch',
        summary: `توزيع المهمة #${subtask.order} إلى ${subtask.agentNameAr}: ${subtask.titleAr}`,
        payload: {
          stepId: subtask.stepId,
          dependsOn: subtask.dependsOn,
        },
      });

      if (subtask.targetAgent === 'seeker') {
        const seekerRun = await this.seeker.run({
          bus,
          prompt: subtask.instruction,
          allowWebSearch: subtask.requiresWebSearch,
          allowAccountSearch:
            subtask.requiresAccountSearch && Boolean(params.accountConsentGranted),
          accountSnapshot: params.accountSnapshot,
          signal: params.signal,
          fetchWeb: params.fetchWeb,
        });

        allWebHits.push(...seekerRun.webHits);
        allAccountHits.push(...seekerRun.accountHits);
        agentResults.push(seekerRun.result);
        stepOutputs.set(subtask.stepId, seekerRun.result.output);

        const outcome: SubtaskExecutionOutcome = {
          subtask,
          status: 'done',
          result: seekerRun.result,
          webHits: seekerRun.webHits,
          accountHits: seekerRun.accountHits,
        };
        outcomes.push(outcome);
        params.onSubtaskComplete?.(outcome);
      } else {
        const upstreamSeekerContext = subtask.dependsOn
          .map((depId) => stepOutputs.get(depId))
          .filter((txt): txt is string => Boolean(txt && txt.trim()))
          .join('\n\n');

        const archRes = this.architect.run({
          bus,
          prompt: subtask.instruction,
          seekerContext: upstreamSeekerContext || undefined,
          archivistContext: params.archivistContext,
        });

        agentResults.push(archRes);
        stepOutputs.set(subtask.stepId, archRes.output);

        const outcome: SubtaskExecutionOutcome = {
          subtask,
          status: 'done',
          result: archRes,
        };
        outcomes.push(outcome);
        params.onSubtaskComplete?.(outcome);
      }
    }

    const markdownParts = outcomes
      .map((item) => {
        if (item.status === 'blocked') {
          return `### ${item.subtask.agentNameAr} — بانتظار الإذن\n${item.blockedReason}`;
        }
        const text = item.result?.output?.trim();
        if (!text) return '';
        return `### ${item.subtask.agentNameAr} — ${item.subtask.titleAr}\n${text}`;
      })
      .filter(Boolean);

    return {
      plan,
      outcomes,
      agentResults,
      busTrace: bus.getTrace(),
      webHits: allWebHits,
      accountHits: allAccountHits,
      needsAccountConsent,
      consentPrompt,
      combinedMarkdown: markdownParts.join('\n\n---\n\n'),
      durationMs: Math.max(1, Date.now() - startedAt),
    };
  }
}
