import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomAssistant,
  buildAdvisorCouncilPromptBlock,
  createDefaultAdvisorCouncilConfig,
  removeCustomAssistant,
  selectAssistantsForTask,
  toggleAssistantEnabled,
} from '../agents/advisorCouncil';

test('createDefaultAdvisorCouncilConfig enables Chief Advisor and 4 additional assistants', () => {
  const cfg = createDefaultAdvisorCouncilConfig();
  assert.equal(cfg.advisorEnabled, true);
  assert.equal(cfg.assistants.length, 4);
  assert.ok(cfg.assistants.every((a) => a.enabled));
});

test('addCustomAssistant, toggleAssistantEnabled, and removeCustomAssistant manage council state cleanly', () => {
  let cfg = createDefaultAdvisorCouncilConfig();
  cfg = addCustomAssistant(cfg, 'مساعد التصميم الثلاثي', 'تحسين الإضاءة والمشاهد ثلاثية الأبعاد');
  assert.equal(cfg.assistants.length, 5);
  const custom = cfg.assistants.find((a) => a.isCustom);
  assert.ok(custom);
  assert.equal(custom.nameAr, 'مساعد التصميم الثلاثي');

  cfg = toggleAssistantEnabled(cfg, 'exec_assistant');
  assert.equal(cfg.assistants.find((a) => a.id === 'exec_assistant')?.enabled, false);

  cfg = removeCustomAssistant(cfg, custom.id);
  assert.equal(cfg.assistants.length, 4);
});

test('selectAssistantsForTask prioritizes matching specialist and custom assistants', () => {
  let cfg = createDefaultAdvisorCouncilConfig();
  cfg = addCustomAssistant(cfg, 'مساعد التمويل', 'حساب الميزانية والتدفق النقدي للشركات');

  const selected = selectAssistantsForTask('اريد حساب الميزانية وخطة تنفيذ سريعة', cfg, 2);
  assert.equal(selected.length, 2);
  assert.ok(selected.some((a) => a.nameAr === 'مساعد التمويل'));
});

test('buildAdvisorCouncilPromptBlock includes Chief Advisor and active assistants', () => {
  const cfg = createDefaultAdvisorCouncilConfig();
  const block = buildAdvisorCouncilPromptBlock(cfg, 'اعطني فكرة مشروع مربح');
  assert.match(block, /المستشار الأعلى للقائد/);
  assert.match(block, /المساعدون المتخصصون/);
});
