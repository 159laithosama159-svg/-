import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTOMATION_WORKFLOWS,
  addBrainMemory,
  buildBrainSystemContext,
  buildPrintableReportHtml,
  createDefaultBrainProfile,
  sanitizeBrainProfile,
} from './brainMemoryUtils.ts';

test('sanitizeBrainProfile normalizes partial or invalid input safely', () => {
  const clean = sanitizeBrainProfile({
    displayName: '  طارق  ',
    tone: 'invalid_tone',
    autoCritic: true,
    memories: [
      { id: 'm1', content: 'أعمل على ألعاب Godot 4', category: 'project', pinned: true },
      { id: 'm2', content: '   ', category: 'fact' },
    ],
  });

  assert.equal(clean.displayName, 'طارق');
  assert.equal(clean.tone, 'balanced');
  assert.equal(clean.autoCritic, true);
  assert.equal(clean.memories.length, 1);
  assert.equal(clean.memories[0].pinned, true);
});

test('addBrainMemory prevents duplicates and preserves category', () => {
  let profile = createDefaultBrainProfile();
  profile = addBrainMemory(profile, 'أفضل الإجابات المختصرة مع الكود الكامل', 'preference');
  profile = addBrainMemory(profile, 'أفضل الإجابات المختصرة مع الكود الكامل', 'preference');
  assert.equal(profile.memories.length, 1);
  assert.equal(profile.memories[0].category, 'preference');
});

test('buildBrainSystemContext includes name, memories, vault, and auto-critic rule', () => {
  let profile = createDefaultBrainProfile();
  profile.displayName = 'خالد';
  profile.roleTitle = 'مطور ألعاب وتطبيقات';
  profile.tone = 'technical';
  profile.autoCritic = true;
  profile = addBrainMemory(profile, 'أستخدم Godot 4.3 و TypeScript', 'project');
  profile.knowledgeVault.push({
    id: 'k1',
    title: 'ملاحظة مشروعي',
    content: 'لعبة فانتازيا عربية بنظام قتال سريع',
    updatedAt: Date.now(),
  });

  const ctx = buildBrainSystemContext(profile);
  assert.ok(ctx.includes('خالد'));
  assert.ok(ctx.includes('Godot 4.3'));
  assert.ok(ctx.includes('لعبة فانتازيا'));
  assert.ok(ctx.includes('Auto-Critic'));
});

test('buildPrintableReportHtml escapes HTML and renders clean RTL document', () => {
  const html = buildPrintableReportHtml('تقرير <script>x</script>', '## العنوان\n\nفقرة **مهمة**');
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('<h2>العنوان</h2>'));
  assert.ok(html.includes('<strong>مهمة</strong>'));
});

test('AUTOMATION_WORKFLOWS provides 6 valid 1-click workflows', () => {
  assert.equal(AUTOMATION_WORKFLOWS.length, 6);
  for (const wf of AUTOMATION_WORKFLOWS) {
    assert.ok(wf.title.length > 4);
    assert.ok(wf.prompt.length > 20);
  }
});
