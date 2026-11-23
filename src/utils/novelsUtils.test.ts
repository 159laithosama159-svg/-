import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_ARABIC_NOVELS,
  buildInteractiveChoicePrompt,
  buildNovelContinuationPrompt,
  buildNovelExportHtml,
  computeNovelWordCount,
  estimateReadingMinutes,
  parseInteractiveStoryTurn,
} from './novelsUtils';

test('curated Arabic novels catalog is richly populated across genres', () => {
  assert.ok(CURATED_ARABIC_NOVELS.length >= 6);
  for (const novel of CURATED_ARABIC_NOVELS) {
    assert.ok(novel.title.length > 3);
    assert.ok(novel.chapters.length >= 1);
    assert.ok(computeNovelWordCount(novel) > 60);
    assert.ok(estimateReadingMinutes(computeNovelWordCount(novel)) >= 1);
  }
});

test('parses interactive branching story narrative and 3 Arabic choices cleanly', () => {
  const sample = `وقفت أمام البوابة الحديدية في ظلام القلعة.\n\n[خيار 1]: افتح البوابة بالمفتاح الذهبي\n[خيار 2]: تسلّق السور الخلفي بهدوء\n[خيار 3]: نادِ الحارس واسأله عن السر`;
  const parsed = parseInteractiveStoryTurn(sample);
  assert.ok(parsed.narrative.includes('البوابة الحديدية'));
  assert.equal(parsed.choices.length, 3);
  assert.equal(parsed.choices[0], 'افتح البوابة بالمفتاح الذهبي');
  assert.equal(parsed.choices[2], 'نادِ الحارس واسأله عن السر');
});

test('builds continuation prompt with world bible and previous chapter context', () => {
  const novel = CURATED_ARABIC_NOVELS[0];
  const prompt = buildNovelContinuationPrompt(novel, 'يظهر خصم جديد من الماضي');
  assert.ok(prompt.includes(novel.title));
  assert.ok(prompt.includes('ريّان الزجّاج'));
  assert.ok(prompt.includes('يظهر خصم جديد من الماضي'));
});

test('builds interactive prompt and printable RTL HTML book export', () => {
  const prompt = buildInteractiveChoicePrompt('فانتازيا', 'ساحر في الصحراء', '', undefined);
  assert.ok(prompt.includes('[خيار 1]'));

  const html = buildNovelExportHtml(CURATED_ARABIC_NOVELS[0]);
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes(CURATED_ARABIC_NOVELS[0].title));
  assert.ok(html.includes('الفصل 1:'));
});
