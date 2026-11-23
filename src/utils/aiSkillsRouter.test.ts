import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProxyImageUrl,
  detectAiSkillIntent,
  extractAutoMemoryCandidate,
  isImageGenerationIntent,
  isVideoGenerationIntent,
  isWebResearchIntent,
} from './aiSkillsRouter';

test('detects Arabic and English image generation requests', () => {
  assert.equal(isImageGenerationIntent('ارسم صورة لمدينة عربية مستقبلية مضيئة'), true);
  assert.equal(isImageGenerationIntent('صمم لي شعار ذهبي لشركة ألعاب'), true);
  assert.equal(isImageGenerationIntent('جيبلي صور عن الفضاء والمجرات'), true);
  assert.equal(detectAiSkillIntent('اعمل صورة أسد ملكي بتاج ذهبي').intent, 'image_gen');
});

test('detects video generation requests separately from images', () => {
  assert.equal(isVideoGenerationIntent('اعمل لي فيديو ريلز عن الذكاء الاصطناعي'), true);
  assert.equal(isImageGenerationIntent('اعمل لي فيديو ريلز عن الذكاء الاصطناعي'), false);
  assert.equal(detectAiSkillIntent('اصنع فيديو موشن جرافيك عن GTA 6').intent, 'video_gen');
});

test('detects live web search intent and enables autoWebSearch', () => {
  assert.equal(isWebResearchIntent('ابحث عن آخر أخبار الذكاء الاصطناعي اليوم'), true);
  const route = detectAiSkillIntent('ما هو سعر البيتكوين اليوم وآخر أخبار السوق؟');
  assert.equal(route.intent, 'web_research');
  assert.equal(route.autoWebSearch, true);
});

test('prioritizes Godot live control and Godot build intents', () => {
  assert.equal(
    detectAiSkillIntent('فوت جودوت ضيف إضاءة نيون وشغل اللعبة بعد إذني').intent,
    'godot_control'
  );
  assert.equal(
    detectAiSkillIntent('اعمل لعبة 3D عالم مفتوح بمحرك جودوت').intent,
    'godot_build'
  );
});

test('detects HTML5 code/game creation intent without slowing with web search', () => {
  const route = detectAiSkillIntent('برمج لعبة سباق سيارات HTML5 سريعة');
  assert.equal(route.intent, 'code_game');
  assert.equal(route.autoWebSearch, false);
});

test('builds safe proxy URLs for external images and preserves local/data URLs', () => {
  assert.equal(
    buildProxyImageUrl('https://upload.wikimedia.org/test.jpg'),
    '/api/media/proxy-image?url=https%3A%2F%2Fupload.wikimedia.org%2Ftest.jpg'
  );
  assert.equal(buildProxyImageUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.equal(buildProxyImageUrl('/api/local.png'), '/api/local.png');
});

test('extracts auto-memory candidates from Arabic and English user prompts', () => {
  assert.equal(
    extractAutoMemoryCandidate('تذكر أنني مطور ألعاب Godot 4 وأحب التصميم الذهبي'),
    'مطور ألعاب Godot 4 وأحب التصميم الذهبي'
  );
  assert.equal(extractAutoMemoryCandidate('اسمي هو طارق من الأردن'), 'طارق من الأردن');
  assert.equal(extractAutoMemoryCandidate('مرحبا'), null);
});
