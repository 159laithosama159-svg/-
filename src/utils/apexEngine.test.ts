import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInteractiveQuizHtml,
  buildInteractiveSlidesHtml,
  evaluateSafeMathExpression,
  isApexDeepIntent,
  isInteractiveAppIntent,
  isQuizIntent,
  isSlidesIntent,
  normalizeQuizData,
  normalizeSlidesDeck,
} from './apexEngine';

test('evaluateSafeMathExpression accurately computes scientific expressions and rejects division by zero', () => {
  const r1 = evaluateSafeMathExpression('/حساب (125 * 4) + sqrt(144) - 2^3');
  assert.equal(r1.ok, true);
  if (r1.ok) assert.equal(r1.value, 504);

  const r2 = evaluateSafeMathExpression('round(pi * 100) / 100');
  assert.equal(r2.ok, true);
  if (r2.ok) assert.equal(r2.value, 3.14);

  const r3 = evaluateSafeMathExpression('10 / 0');
  assert.equal(r3.ok, false);
});

test('APEX, Slides, App Builder, and Quiz intent detectors match Arabic and English slash commands cleanly', () => {
  assert.equal(isApexDeepIntent('/ابكس قارن بين معماريات الذكاء الاصطناعي'), true);
  assert.equal(isApexDeepIntent('/apex compare rust vs go'), true);
  assert.equal(isSlidesIntent('/شرائح الذكاء الاصطناعي في التعليم'), true);
  assert.equal(isSlidesIntent('اعمل عرض تقديمي عن الطاقة المتجددة'), true);
  assert.equal(isInteractiveAppIntent('/تطبيق حاسبة ميزانية شخصية'), true);
  assert.equal(isInteractiveAppIntent('برمج تطبيق ويب لإدارة المهام'), true);
  assert.equal(isQuizIntent('/اختبار الفيزياء الكمية'), true);
  assert.equal(isQuizIntent('اعمل اختبار تفاعلي عن التاريخ'), true);
});

test('buildInteractiveSlidesHtml and buildInteractiveQuizHtml produce complete RTL HTML5 interactive apps', () => {
  const deck = normalizeSlidesDeck(
    {
      title: 'مستقبل الذكاء الاصطناعي',
      subtitle: 'عرض استراتيجي',
      accentHex: '#38BDF8',
      slides: [
        {
          heading: 'الوكلاء المستقلون',
          bulletPoints: ['تخطيط ذاتي', 'تحقق نقدي'],
          highlightMetric: '4x',
          highlightLabel: 'دقة أعلى',
          speakerNotes: 'اشرح دور التدقيق الذاتي.',
        },
      ],
    },
    'الذكاء الاصطناعي'
  );
  const slidesHtml = buildInteractiveSlidesHtml(deck);
  assert.ok(slidesHtml.includes('dir="rtl"'));
  assert.ok(slidesHtml.includes('مستقبل الذكاء الاصطناعي'));
  assert.ok(slidesHtml.includes('btnNext'));

  const quiz = normalizeQuizData(
    {
      title: 'اختبار سريع',
      questions: [
        {
          question: 'ما هي وحدة قياس القوة؟',
          options: ['النيوتن', 'الجول', 'الواط'],
          correctIndex: 0,
          explanation: 'النيوتن هو وحدة قياس القوة في النظام الدولي.',
        },
      ],
    },
    'فيزياء'
  );
  const quizHtml = buildInteractiveQuizHtml(quiz);
  assert.ok(quizHtml.includes('dir="rtl"'));
  assert.ok(quizHtml.includes('اختبار سريع'));
  assert.ok(quizHtml.includes('النيوتن'));
});
