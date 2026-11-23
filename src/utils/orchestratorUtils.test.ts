import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AI_AGENTS } from '../data/aiAgents';
import {
  formatElapsedSeconds,
  parseMarkdownBlocks,
  sanitizeCommanderPlan,
} from './orchestratorUtils';

describe('Commander Multi-Agent Plan Sanitizer', () => {
  const roster = AI_AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    englishRole: a.englishRole,
  }));

  it('normalizes valid Commander steps and deduplicates agent assignments', () => {
    const plan = sanitizeCommanderPlan(
      {
        missionSummary: 'بناء خطة إطلاق تطبيق سينمائي كامل',
        steps: [
          {
            agentId: 'deep_scout',
            taskTitle: 'تحليل المنافسين',
            instruction: 'ابحث عن أفضل 3 منصات',
            needsWebSearch: true,
          },
          {
            agentId: 'deep_scout', // duplicate should be skipped
            taskTitle: 'مكرر',
            instruction: 'مكرر',
          },
          {
            agentId: 'code_architect',
            taskTitle: 'بناء النموذج الأولي',
            instruction: 'اكتب HTML تفاعلي',
            needsWebSearch: false,
          },
        ],
      },
      roster,
      'اصنع تطبيق سينما',
      4
    );

    assert.equal(plan.missionSummary, 'بناء خطة إطلاق تطبيق سينمائي كامل');
    assert.equal(plan.steps.length, 2);
    assert.equal(plan.steps[0].agentId, 'deep_scout');
    assert.equal(plan.steps[0].needsWebSearch, true);
    assert.equal(plan.steps[1].agentId, 'code_architect');
    assert.equal(plan.steps[1].status, 'pending');
  });

  it('provides at least 2 specialist fallback agents when raw plan is empty', () => {
    const plan = sanitizeCommanderPlan(null, roster, 'اشرح الثقوب السوداء');
    assert.ok(plan.steps.length >= 2);
    assert.notEqual(plan.steps[0].agentId, plan.steps[1].agentId);
  });
});

describe('Rich Markdown Block Parser', () => {
  it('parses headings, lists, tables, blockquotes, and fenced code blocks cleanly', () => {
    const md = [
      '# عنوان رئيسي',
      'فقرة تعريفية تحتوي على **نص عريض** و `كود`.',
      '',
      '- عنصر أول',
      '- عنصر ثاني',
      '',
      '> اقتباس تحريري مهم',
      '',
      '| الوكيل | الدور |',
      '| --- | --- |',
      '| القائد | التوزيع |',
      '| المبرمج | الكود |',
      '',
      '```ts',
      'const x = 42;',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(md);
    assert.equal(blocks[0].type, 'heading');
    assert.equal(blocks[1].type, 'paragraph');
    assert.equal(blocks[2].type, 'ul');
    assert.equal(blocks[3].type, 'blockquote');
    assert.equal(blocks[4].type, 'table');
    if (blocks[4].type === 'table') {
      assert.deepEqual(blocks[4].headers, ['الوكيل', 'الدور']);
      assert.equal(blocks[4].rows.length, 2);
    }
    assert.equal(blocks[5].type, 'code');
    if (blocks[5].type === 'code') {
      assert.equal(blocks[5].language, 'ts');
      assert.equal(blocks[5].code, 'const x = 42;');
    }
  });

  it('formats elapsed thinking durations clearly in Arabic', () => {
    assert.equal(formatElapsedSeconds(850), '0.9 ث');
    assert.equal(formatElapsedSeconds(4200), '4.2 ث');
    assert.equal(formatElapsedSeconds(65000), '1 د 5 ث');
  });
});
