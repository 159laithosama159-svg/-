import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeUserCommand,
  TaskOrchestratorAgent,
} from '../agents/taskOrchestrator';

test('decomposeUserCommand splits compound Arabic command into Seeker -> Architect dependency pipeline', () => {
  const plan = decomposeUserCommand('ابحث عن تقنية WebGPU ثم اصنع لعبة ثعبان تفاعلية');

  assert.equal(plan.isCompound, true);
  assert.equal(plan.subtasks.length, 2);
  assert.equal(plan.subtasks[0].targetAgent, 'seeker');
  assert.equal(plan.subtasks[1].targetAgent, 'architect');
  assert.deepEqual(plan.subtasks[1].dependsOn, [plan.subtasks[0].stepId]);
});

test('decomposeUserCommand routes pure search prompt to Seeker and pure math/coding prompt to Architect', () => {
  const searchPlan = decomposeUserCommand('ابحث في الويب عن أحدث أخبار الذكاء الاصطناعي');
  assert.equal(searchPlan.subtasks.length, 1);
  assert.equal(searchPlan.subtasks[0].targetAgent, 'seeker');
  assert.equal(searchPlan.subtasks[0].requiresWebSearch, true);

  const mathPlan = decomposeUserCommand('احسب 25 * 4 + 18');
  assert.equal(mathPlan.subtasks.length, 1);
  assert.equal(mathPlan.subtasks[0].targetAgent, 'architect');
});

test('TaskOrchestratorAgent dispatches Seeker findings to Architect over AgentBus', async () => {
  const orchestrator = new TaskOrchestratorAgent();
  const dispatched: string[] = [];

  const report = await orchestrator.execute({
    prompt: 'ابحث عن تقنية HTML5 Canvas ثم اصنع لعبة ثعبان',
    fetchWeb: async (query) => [
      {
        title: `مرجع ${query}`,
        snippet: 'توثيق رسمي لبناء ألعاب Canvas سريعة.',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API',
        source: 'MDN',
      },
    ],
    onSubtaskStart: (st) => dispatched.push(st.targetAgent),
  });

  assert.deepEqual(dispatched, ['seeker', 'architect']);
  assert.equal(report.outcomes.length, 2);
  assert.equal(report.outcomes[0].status, 'done');
  assert.equal(report.outcomes[1].status, 'done');
  assert.equal(report.webHits.length, 1);
  assert.ok(report.outcomes[1].result?.artifacts && report.outcomes[1].result.artifacts.length > 0);
  assert.ok(
    report.busTrace.some((m) => m.from === 'orchestrator' && m.to === 'seeker'),
    'Bus trace should record orchestrator -> seeker dispatch'
  );
  assert.ok(
    report.busTrace.some((m) => m.from === 'orchestrator' && m.to === 'architect'),
    'Bus trace should record orchestrator -> architect dispatch'
  );
});

test('TaskOrchestratorAgent blocks account search until explicit user consent is granted', async () => {
  const orchestrator = new TaskOrchestratorAgent();

  const blockedReport = await orchestrator.execute({
    prompt: 'ابحث في حسابي عن مشروع السينما',
    accountConsentGranted: false,
  });

  assert.equal(blockedReport.needsAccountConsent, true);
  assert.equal(blockedReport.outcomes[0].status, 'blocked');
  assert.equal(blockedReport.accountHits.length, 0);

  const allowedReport = await orchestrator.execute({
    prompt: 'ابحث في حسابي عن مشروع السينما',
    accountConsentGranted: true,
    accountSnapshot: {
      isSignedIn: true,
      displayName: 'Laith',
      email: 'user@example.com',
      sessions: [{ id: 's1', title: 'مشروع السينما', snippet: 'خطة تطوير التطبيق' }],
      brainNotes: [],
    },
  });

  assert.equal(allowedReport.needsAccountConsent, false);
  assert.equal(allowedReport.outcomes[0].status, 'done');
  assert.ok(allowedReport.accountHits.length >= 1);
});
