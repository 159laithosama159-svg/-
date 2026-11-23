import { SharedVectorMemoryStore } from './sharedVectorMemory';
import { tokenizeCommanderText } from '../utils/localCommanderKernel';

export interface EvolvedSkill {
  id: string;
  name: string;
  triggerPattern: string;
  guidance: string;
  createdAt: number;
  generation: number;
  usageCount: number;
}

export interface EvolutionEvent {
  id: string;
  generation: number;
  summary: string;
  createdAt: number;
  skillsAdded: number;
}

export interface SelfEvolutionState {
  generation: number;
  totalMissions: number;
  positiveRatings: number;
  improvementRequests: number;
  evolvedSkills: EvolvedSkill[];
  changelog: EvolutionEvent[];
  lastEvolvedAt: number | null;
}

const EVOLUTION_STORAGE_KEY = 'valdrion_commander_self_evolution_v1';

export function createDefaultEvolutionState(): SelfEvolutionState {
  return {
    generation: 1,
    totalMissions: 0,
    positiveRatings: 0,
    improvementRequests: 0,
    evolvedSkills: [
      {
        id: 'skill_bus_chain',
        name: 'ربط الباحث ← المهندس ← الحامي تلقائياً',
        triggerPattern: 'ابحث كود تقنية تطبيق برمجة',
        guidance:
          'عند طلب البحث ثم البرمجة: استدعِ الباحث لجلب أحدث المعلومات من الويب المفتوح، ثم مرّر النتائج عبر The Bus إلى المهندس لبناء الكود، ثم افحصه عبر الحامي قبل العرض.',
        createdAt: Date.now(),
        generation: 1,
        usageCount: 0,
      },
    ],
    changelog: [
      {
        id: 'evo_init',
        generation: 1,
        summary: 'الجيل الأول (Gen v1): تفعيل منظومة الوكلاء السبعة المستقلين + The Bus + الذاكرة المتجهية الموحدة.',
        createdAt: Date.now(),
        skillsAdded: 1,
      },
    ],
    lastEvolvedAt: null,
  };
}

export function loadEvolutionState(): SelfEvolutionState {
  try {
    if (typeof window === 'undefined') return createDefaultEvolutionState();
    const raw = window.localStorage.getItem(EVOLUTION_STORAGE_KEY);
    if (!raw) return createDefaultEvolutionState();
    const parsed = JSON.parse(raw) as Partial<SelfEvolutionState>;
    const base = createDefaultEvolutionState();
    return {
      generation: typeof parsed.generation === 'number' && parsed.generation >= 1 ? parsed.generation : base.generation,
      totalMissions: typeof parsed.totalMissions === 'number' ? parsed.totalMissions : 0,
      positiveRatings: typeof parsed.positiveRatings === 'number' ? parsed.positiveRatings : 0,
      improvementRequests: typeof parsed.improvementRequests === 'number' ? parsed.improvementRequests : 0,
      evolvedSkills: Array.isArray(parsed.evolvedSkills) ? parsed.evolvedSkills.slice(0, 60) : base.evolvedSkills,
      changelog: Array.isArray(parsed.changelog) ? parsed.changelog.slice(0, 40) : base.changelog,
      lastEvolvedAt: typeof parsed.lastEvolvedAt === 'number' ? parsed.lastEvolvedAt : null,
    };
  } catch {
    return createDefaultEvolutionState();
  }
}

export function saveEvolutionState(state: SelfEvolutionState): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EVOLUTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

/**
 * Self-Evolution Engine:
 * Analyzes recent missions & Shared Vector DB records to automatically distill new reusable skills,
 * upgrade the Commander's generation version, and index evolved playbooks into the Shared Vector DB.
 */
export function runSelfEvolutionCycle(params: {
  state: SelfEvolutionState;
  store: SharedVectorMemoryStore;
  recentPrompts?: string[];
  feedbackNote?: string;
}): { nextState: SelfEvolutionState; event: EvolutionEvent; newSkills: EvolvedSkill[] } {
  const { state, store } = params;
  const nextGen = state.generation + 1;
  const now = Date.now();
  const records = store.listAll();

  // Extract recurring high-frequency themes from Shared Vector DB & recent prompts
  const corpusTexts = [
    ...(params.recentPrompts || []),
    ...records.slice(0, 40).map((r) => `${r.title} ${r.content}`),
  ];

  const freq = new Map<string, number>();
  for (const text of corpusTexts) {
    const uniq = new Set(tokenizeCommanderText(text));
    for (const tok of uniq) {
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }

  const topThemes = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  const newSkills: EvolvedSkill[] = [];
  const existingNames = new Set(state.evolvedSkills.map((s) => s.name));

  if (params.feedbackNote && params.feedbackNote.trim()) {
    const fb = params.feedbackNote.trim();
    const skill: EvolvedSkill = {
      id: `skill_fb_${now}`,
      name: `تحسين ذاتي من ملاحظتك (Gen v${nextGen})`,
      triggerPattern: tokenizeCommanderText(fb).slice(0, 6).join(' ') || fb.slice(0, 40),
      guidance: `قاعدة مطوّرة ذاتياً: ${fb}`,
      createdAt: now,
      generation: nextGen,
      usageCount: 0,
    };
    newSkills.push(skill);
    store.upsert({
      id: skill.id,
      kind: 'skill',
      title: skill.name,
      content: skill.triggerPattern,
      response: skill.guidance,
      tags: ['تطوير_ذاتي', `gen_v${nextGen}`],
      agentSource: 'orchestrator',
    });
  } else if (topThemes.length >= 2) {
    const themeLabel = topThemes.slice(0, 3).join(' · ');
    const skillName = `تخصّص مكتسب: ${themeLabel}`;
    if (!existingNames.has(skillName)) {
      const skill: EvolvedSkill = {
        id: `skill_auto_${now}`,
        name: skillName,
        triggerPattern: topThemes.join(' '),
        guidance:
          `بناءً على تحليل ${records.length} سجل متجهي و${state.totalMissions} مهمة سابقة، تم تعزيز أولوية المواضيع (${themeLabel}) في التخطيط والاسترجاع الدلالي وتخصيص مخرجات المهندس والباحث لها.`,
        createdAt: now,
        generation: nextGen,
        usageCount: 0,
      };
      newSkills.push(skill);
      store.upsert({
        id: skill.id,
        kind: 'skill',
        title: skill.name,
        content: skill.triggerPattern,
        response: skill.guidance,
        tags: ['تطوير_ذاتي', ...topThemes.slice(0, 4)],
        agentSource: 'orchestrator',
      });
    }
  }

  // Always distill a structural optimization skill if none was created yet
  if (newSkills.length === 0) {
    const skill: EvolvedSkill = {
      id: `skill_opt_${now}`,
      name: `تحسين مسار الناقل The Bus (Gen v${nextGen})`,
      triggerPattern: 'خطة وكلاء تحليل بحث كود أمان',
      guidance: `ترقية الجيل v${nextGen}: تسريع مطابقة الذاكرة المتجهية الموحدة ودمج نتائج الباحث والمهندس تلقائياً مع تدقيق الحامي الإلزامي.`,
      createdAt: now,
      generation: nextGen,
      usageCount: 0,
    };
    newSkills.push(skill);
    store.upsert({
      id: skill.id,
      kind: 'skill',
      title: skill.name,
      content: skill.triggerPattern,
      response: skill.guidance,
      tags: ['تطوير_ذاتي', `gen_v${nextGen}`],
      agentSource: 'orchestrator',
    });
  }

  const event: EvolutionEvent = {
    id: `evo_${now}`,
    generation: nextGen,
    summary: `الترقية للجيل Gen v${nextGen}: تم تحليل ${records.length} سجل في الذاكرة المتجهية واستخلاص ${newSkills.length} مهارة جديدة (${newSkills[0].name}).`,
    createdAt: now,
    skillsAdded: newSkills.length,
  };

  const nextState: SelfEvolutionState = {
    ...state,
    generation: nextGen,
    evolvedSkills: [...newSkills, ...state.evolvedSkills].slice(0, 60),
    changelog: [event, ...state.changelog].slice(0, 40),
    lastEvolvedAt: now,
  };

  saveEvolutionState(nextState);
  return { nextState, event, newSkills };
}
