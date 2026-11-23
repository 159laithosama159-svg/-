import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileSovereignSystemInstruction,
  createDefaultVaultData,
  evaluateSafeMathExpression,
  normalizeArabicText,
  normalizeVaultData,
  runOfflineLocalMind,
  validateLocalEndpointUrl,
} from './sovereignAiEngine';

test('createDefaultVaultData defaults to 100% offline-browser mode (zero external API by default)', () => {
  const vault = createDefaultVaultData();
  assert.equal(vault.engineMode, 'offline-browser');
  assert.deepEqual(vault.models[0].trainingPairs, []);
  assert.deepEqual(vault.models[0].learnedFacts, []);
});

test('normalizeArabicText normalizes alef/taa/yaa and tashkeel accurately', () => {
  assert.equal(normalizeArabicText('أَحْمَدُ في المَدْرَسَةِ'), 'احمد في المدرسه');
});

test('compileSovereignSystemInstruction includes ONLY user model, active rules, facts, training, and docs without Cinema/OpenAI strings', () => {
  const vault = createDefaultVaultData();
  const model = {
    ...vault.models[0],
    name: 'ذكاء ليث المستقل',
    personaPrompt: 'مساعد شخصي خاص للهندسة والبرمجة',
    rules: [
      { id: 'r1', text: 'أجب بدون مقدمات طويلة', enabled: true },
      { id: 'r2', text: 'قاعدة معطّلة لا يجب تضمينها', enabled: false },
    ],
    learnedFacts: [{ id: 'f1', fact: 'اسمي ليث وأعمل على مشروع سري', createdAt: 1 }],
    trainingPairs: [
      { id: 't1', prompt: 'شو خطة اليوم', response: 'إنجاز النظام المحلي بالكامل', createdAt: 1 },
    ],
    knowledgeDocs: [
      { id: 'd1', name: 'notes.md', content: 'مشروع السرية يبدأ الساعة 8 مساءً.', addedAt: 1 },
    ],
  };

  const compiled = compileSovereignSystemInstruction(model);
  assert.equal(compiled.includes('ذكاء ليث المستقل'), true);
  assert.equal(compiled.includes('أجب بدون مقدمات طويلة'), true);
  assert.equal(compiled.includes('قاعدة معطّلة لا يجب تضمينها'), false);
  assert.equal(compiled.includes('اسمي ليث'), true);
  assert.equal(compiled.includes('إنجاز النظام المحلي بالكامل'), true);
  assert.equal(compiled.includes('VALDRION'), false);
  assert.equal(compiled.includes('OpenAI'), false);
});

test('validateLocalEndpointUrl allows loopback http and private https while blocking unsafe URLs', () => {
  assert.equal(validateLocalEndpointUrl('http://127.0.0.1:11434/api/chat').valid, true);
  assert.equal(validateLocalEndpointUrl('http://localhost:1234/v1/chat/completions').valid, true);
  assert.equal(validateLocalEndpointUrl('https://my-private-gpu.example.com/v1/chat/completions').valid, true);

  assert.equal(validateLocalEndpointUrl('http://169.254.169.254/latest/meta-data').valid, false);
  assert.equal(validateLocalEndpointUrl('http://example.com/api').valid, false);
  assert.equal(validateLocalEndpointUrl('javascript:alert(1)').valid, false);
  assert.equal(validateLocalEndpointUrl('file:///etc/passwd').valid, false);
});

test('evaluateSafeMathExpression computes arithmetic safely', () => {
  assert.equal(evaluateSafeMathExpression('12 + 8 * 3'), 36);
  assert.equal(evaluateSafeMathExpression('(100 - 25) / 3'), 25);
  assert.equal(evaluateSafeMathExpression('2 ^ 10'), 1024);
  assert.equal(evaluateSafeMathExpression('10 / 0'), null);
  assert.equal(evaluateSafeMathExpression('process.exit(1)'), null);
});

test('runOfflineLocalMind handles training pairs, teach-in-chat facts, privacy audit, math, and local summarization with 0 network', () => {
  const vault = createDefaultVaultData();
  const model = {
    ...vault.models[0],
    name: 'مختبري السري',
    rules: [{ id: 'r1', text: 'أجب باختصار شديد', enabled: true }],
    trainingPairs: [
      { id: 'tp1', prompt: 'شو خطة اليوم', response: 'بناء ذكائي المستقل 100%', createdAt: 1 },
    ],
    learnedFacts: [
      { id: 'lf1', fact: 'اسم مشروعي السري هو فجر', createdAt: 1 },
    ],
    knowledgeDocs: [
      {
        id: 'doc1',
        name: 'خطة.txt',
        content: 'الميزانية المخصصة للمشروع السري هي 4500 دينار وتُصرف على 3 مراحل.',
        addedAt: 1,
      },
    ],
  };

  // 1. User-trained Q&A pair match
  const trainedRes = runOfflineLocalMind(model, 'شو خطة اليوم؟', []);
  assert.equal(trainedRes.matchedSource, 'training');
  assert.equal(trainedRes.reply, 'بناء ذكائي المستقل 100%');

  // 2. Teach new fact directly in chat
  const teachRes = runOfflineLocalMind(model, 'تعلّم أن رمز الخزنة هو 9944', []);
  assert.equal(teachRes.matchedSource, 'teach');
  assert.equal(teachRes.newlyLearnedFact, 'رمز الخزنة هو 9944');

  // 3. Recall learned fact
  const recallRes = runOfflineLocalMind(model, 'شو اسم مشروعي السري؟', []);
  assert.equal(recallRes.matchedSource, 'fact');
  assert.equal(recallRes.reply.includes('فجر'), true);

  // 4. Document retrieval
  const docRes = runOfflineLocalMind(model, 'كم الميزانية للمشروع السري؟', []);
  assert.equal(docRes.reply.includes('4500 دينار'), true);

  // 5. Math
  const mathRes = runOfflineLocalMind(model, 'احسب 15 * 4 + 10', []);
  assert.equal(mathRes.reply.includes('70'), true);

  // 6. Privacy / OpenAI origin honesty check
  const originRes = runOfflineLocalMind(model, 'انت من openai؟ حد براقب المحادثة؟', []);
  assert.equal(originRes.matchedSource, 'identity');
  assert.equal(originRes.reply.includes('0 بايت'), true);
  assert.equal(originRes.reply.includes('لا!'), true);

  // 7. Normalize legacy vault without trainingPairs/learnedFacts
  const legacyNormalized = normalizeVaultData({
    ...vault,
    models: [{ ...vault.models[0], trainingPairs: undefined as never, learnedFacts: undefined as never }],
  });
  assert.deepEqual(legacyNormalized.models[0].trainingPairs, []);
  assert.deepEqual(legacyNormalized.models[0].learnedFacts, []);
});
