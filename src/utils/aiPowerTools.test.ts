import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_SLASH_COMMANDS,
  buildConversationMarkdownExport,
  buildMindMapSvgMarkup,
  enhanceUserPrompt,
  filterSlashCommands,
  isCouncilDebateIntent,
  isMindMapIntent,
  normalizeMindMapData,
} from './aiPowerTools';

test('filterSlashCommands returns all commands on "/" and filters Arabic/English aliases', () => {
  assert.equal(filterSlashCommands('/').length, AI_SLASH_COMMANDS.length);
  assert.equal(filterSlashCommands('مرحبا').length, 0);

  const councilMatches = filterSlashCommands('/مجلس');
  assert.equal(councilMatches.length, 1);
  assert.equal(councilMatches[0].aliasEn, '/council');

  const mapMatches = filterSlashCommands('/mind');
  assert.equal(mapMatches.length, 1);
  assert.equal(mapMatches[0].command, '/خريطة');
});

test('intent detectors recognize Multi-AI Council and Mind Map requests', () => {
  assert.equal(isCouncilDebateIntent('/مجلس هل أطلق تطبيق ألعاب أم متجر؟'), true);
  assert.equal(isCouncilDebateIntent('اعرض على مجلس الخبراء خطة مشروعي'), true);
  assert.equal(isCouncilDebateIntent('مرحبا كيف حالك'), false);

  assert.equal(isMindMapIntent('ارسم خريطة ذهنية لتعلم محرك جودوت 4'), true);
  assert.equal(isMindMapIntent('/خريطة هندسة البرمجيات'), true);
  assert.equal(isMindMapIntent('ما عاصمة الأردن؟'), false);
});

test('enhanceUserPrompt upgrades short prompts with structured engineering/design guidance', () => {
  const gameUpgraded = enhanceUserPrompt('اعمل لعبة سباق سيارات');
  assert.match(gameUpgraded, /60fps/);
  assert.match(gameUpgraded, /HUD/);

  const imgUpgraded = enhanceUserPrompt('صمم شعار أسد ذهبي');
  assert.match(imgUpgraded, /HD/);

  const generalUpgraded = enhanceUserPrompt('كيف أتعلم الذكاء الاصطناعي');
  assert.match(generalUpgraded, /أمثلة عملية/);
});

test('normalizeMindMapData and buildMindMapSvgMarkup produce valid radial and tree SVG', () => {
  const normalized = normalizeMindMapData(
    {
      title: 'خطة تطوير لعبة 3D',
      branches: [
        { id: '1', title: 'التصميم', color: '#38BDF8', note: 'تصميم العالم', children: ['خريطة', 'شخصيات'] },
        { id: '2', title: 'البرمجة', color: '#34D399', note: 'GDScript', children: ['حركة', 'فيزياء'] },
      ],
    },
    'تطوير لعبة'
  );
  assert.equal(normalized.branches.length, 2);

  const radialSvg = buildMindMapSvgMarkup(normalized, 'radial');
  assert.ok(radialSvg.startsWith('<svg'));
  assert.ok(radialSvg.includes('خطة تطوير لعبة 3D'));
  assert.ok(radialSvg.includes('GDScript') === false); // children & title rendered cleanly
  assert.ok(radialSvg.includes('شخصيات'));

  const treeSvg = buildMindMapSvgMarkup(normalized, 'tree');
  assert.ok(treeSvg.startsWith('<svg'));
  assert.ok(treeSvg.includes('البرمجة'));
});

test('buildConversationMarkdownExport formats user and assistant messages cleanly', () => {
  const md = buildConversationMarkdownExport('اختبار أثيرمايند', [
    { role: 'user', text: 'مرحباً' },
    { role: 'assistant', text: 'أهلاً بك في أثيرمايند!' },
  ]);
  assert.match(md, /# اختبار أثيرمايند/);
  assert.match(md, /## 👤 المستخدم/);
  assert.match(md, /## ✨ أثيرمايند AI/);
});
