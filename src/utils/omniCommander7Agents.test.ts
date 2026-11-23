import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultCommanderSettings, buildCommanderRulesBlock } from './commanderPolicy';
import {
  SharedVectorMemoryStore,
  computeLocalEmbedding,
  cosineSimilarity,
} from '../agents/sharedVectorMemory';
import { OmniCommander } from '../agents/orchestratorAgent';
import { runSelfEvolutionCycle, createDefaultEvolutionState } from '../agents/selfEvolutionEngine';

test('SharedVectorMemoryStore computes semantic embeddings and retrieves relevant Arabic & English records', () => {
  const store = new SharedVectorMemoryStore([]);
  store.upsert({
    kind: 'project',
    title: 'مشروع فجر الذكي',
    content: 'تطوير منظومة وكلاء مستقلين بقاعدة بيانات متجهات محلية بدون سحابة',
    tags: ['فجر', 'وكلاء'],
    agentSource: 'archivist',
  });
  store.upsert({
    kind: 'fact',
    title: 'وصفة طبخ',
    content: 'طريقة تحضير القهوة العربية بالهيل والزعفران',
    tags: ['قهوة'],
    agentSource: 'archivist',
  });

  const hits = store.search('منظومة الوكلاء وقاعدة المتجهات لمشروع فجر', { topK: 2 });
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].record.title, 'مشروع فجر الذكي');

  const v1 = computeLocalEmbedding('ذكاء اصطناعي مستقل');
  const v2 = computeLocalEmbedding('ذكاء اصطناعي مستقل');
  assert.ok(cosineSimilarity(v1, v2) > 0.99);
});

test('OmniCommander enforces explicit consent gate BEFORE searching user account data', async () => {
  const store = new SharedVectorMemoryStore([]);
  const commander = new OmniCommander(store);
  const settings = createDefaultCommanderSettings();

  // 1) Without consent -> blocked by Sentinel and asks user explicitly
  const blocked = await commander.executeTask({
    prompt: 'ابحث في حسابي عن مشاريعي المحفوظة',
    settings,
    webSearchEnabled: false,
    accountConsentGranted: false,
    accountSnapshot: {
      isSignedIn: true,
      displayName: 'ليث',
      email: 'user@example.com',
      sessions: [{ id: 's1', title: 'مشروع الوكلاء السبعة', snippet: 'بناء القائد الشامل' }],
      brainNotes: ['أفضل التصميم الداكن الفاخر'],
    },
  });

  assert.equal(blocked.needsAccountConsent, true);
  assert.match(blocked.finalMarkdown, /طلب إذن صريح/);

  // 2) After explicit user consent -> Seeker searches account & cites matched session
  const approved = await commander.executeTask({
    prompt: 'ابحث في حسابي عن مشروع الوكلاء',
    settings,
    webSearchEnabled: false,
    accountConsentGranted: true,
    accountSnapshot: {
      isSignedIn: true,
      displayName: 'ليث',
      email: 'user@example.com',
      sessions: [{ id: 's1', title: 'مشروع الوكلاء السبعة', snippet: 'بناء القائد الشامل' }],
      brainNotes: ['أفضل التصميم الداكن الفاخر'],
    },
  });

  assert.notEqual(approved.needsAccountConsent, true);
  assert.equal(approved.verification.verified, true);
  assert.match(approved.finalMarkdown, /مشروع الوكلاء السبعة/);
  assert.ok(approved.busTrace.length >= 3);
});

test('OmniCommander chains Seeker live open-web search -> Architect code builder -> Sentinel verification over The Bus', async () => {
  const store = new SharedVectorMemoryStore([]);
  const commander = new OmniCommander(store);
  const settings = createDefaultCommanderSettings();

  const res = await commander.executeTask({
    prompt: 'ابحث عن تقنية WebGPU ثم ابني لعبة تفاعلية',
    settings,
    webSearchEnabled: true,
    accountConsentGranted: false,
    fetchWeb: async () => [
      {
        title: 'WebGPU Standard',
        snippet: 'Modern GPU API for high-performance browser compute and graphics.',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API',
        source: 'Wikipedia / MDN',
      },
    ],
  });

  assert.equal(res.sources.length, 1);
  assert.match(res.finalMarkdown, /```html/);
  assert.match(res.finalMarkdown, /WebGPU Standard/);
  assert.ok(res.steps.some((s) => s.agentId === 'seeker'));
  assert.ok(res.steps.some((s) => s.agentId === 'architect'));
  assert.ok(res.steps.some((s) => s.agentId === 'sentinel'));
  assert.ok(res.busTrace.some((b) => b.from === 'seeker' && b.to === 'architect'));
});

test('Sentinel Agent catches XSS and eval vulnerabilities in pasted code', async () => {
  const store = new SharedVectorMemoryStore([]);
  const commander = new OmniCommander(store);
  const settings = createDefaultCommanderSettings();

  const res = await commander.executeTask({
    prompt: 'افحص هذا الكود:\n```js\nfunction run(x) { document.body.innerHTML = x; return eval(x); }\n```',
    settings,
    webSearchEnabled: false,
    accountConsentGranted: false,
  });

  assert.ok(res.verification.warnings.length >= 2);
  assert.ok(res.verification.securityScore < 80);
  assert.match(res.finalMarkdown, /eval|XSS/);
});

test('Self-Evolution Engine upgrades generation and distills reusable skills into Shared Vector DB', async () => {
  const store = new SharedVectorMemoryStore([]);
  const evo0 = createDefaultEvolutionState();
  const { nextState, newSkills } = runSelfEvolutionCycle({
    state: evo0,
    store,
    feedbackNote: 'اجعل تقارير المهندس تبدأ بجدول مقارنة تقني واضح',
  });

  assert.equal(nextState.generation, 2);
  assert.equal(newSkills.length, 1);
  assert.ok(store.count() >= 1);

  const rulesBlock = buildCommanderRulesBlock(createDefaultCommanderSettings());
  assert.match(rulesBlock, /وضع القائد المفتوح/);
});

test('Commander defaults to smart thinking engine and local mode never repeats static boilerplate', async () => {
  const defaults = createDefaultCommanderSettings();
  assert.equal(defaults.engineMode, 'cloud-commander');

  const store = new SharedVectorMemoryStore([]);
  const commander = new OmniCommander(store);

  const greet = await commander.executeTask({
    prompt: 'مرحبا',
    settings: defaults,
    webSearchEnabled: false,
    accountConsentGranted: false,
  });
  const topic = await commander.executeTask({
    prompt: 'اشرح لي التشفير الكمي',
    settings: defaults,
    webSearchEnabled: false,
    accountConsentGranted: false,
    fetchWeb: async () => [
      {
        title: 'Quantum cryptography',
        snippet: 'Uses quantum mechanical properties to perform cryptographic tasks.',
        url: 'https://en.wikipedia.org/wiki/Quantum_cryptography',
        source: 'Wikipedia',
      },
    ],
  });

  assert.notEqual(greet.finalMarkdown, topic.finalMarkdown);
  assert.doesNotMatch(greet.finalMarkdown, /الطبقة 1 \(المدخلات والتحقق\)/);
  assert.doesNotMatch(topic.finalMarkdown, /الطبقة 1 \(المدخلات والتحقق\)/);
  assert.match(topic.finalMarkdown, /Quantum cryptography/);
});

