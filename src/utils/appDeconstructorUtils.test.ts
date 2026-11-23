import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_DECONSTRUCTOR_LENSES,
  POPULAR_APP_BLUEPRINTS,
  buildAppDeconstructionPrompt,
  getDefaultDeconstructorLenses,
  isAppDeconstructionIntent,
} from './appDeconstructorUtils';

test('APP_DECONSTRUCTOR_LENSES and POPULAR_APP_BLUEPRINTS provide complete defaults', () => {
  assert.ok(APP_DECONSTRUCTOR_LENSES.length >= 6);
  assert.ok(POPULAR_APP_BLUEPRINTS.length >= 6);
  const defaults = getDefaultDeconstructorLenses();
  assert.ok(defaults.includes('architecture'));
  assert.ok(defaults.includes('database_api'));
  assert.ok(defaults.includes('svg_blueprint'));
});

test('isAppDeconstructionIntent detects Arabic and English app breakdown prompts', () => {
  assert.equal(isAppDeconstructionIntent('فكك تطبيق أوبر بالكامل'), true);
  assert.equal(isAppDeconstructionIntent('تفكيك تطبيق تيك توك'), true);
  assert.equal(isAppDeconstructionIntent('كيف يشتغل تطبيق واتساب'), true);
  assert.equal(isAppDeconstructionIntent('Deconstruct Spotify system design'), true);
  assert.equal(isAppDeconstructionIntent('ما هو الطقس اليوم'), false);
});

test('buildAppDeconstructionPrompt composes targeted sections including SVG or interactive HTML', () => {
  const svgPrompt = buildAppDeconstructionPrompt({
    appName: 'Uber',
    notes: 'ركز على التتبع اللحظي للسائقين',
    selectedLenses: ['architecture', 'database_api', 'svg_blueprint'],
  });
  assert.ok(svgPrompt.includes('Uber'));
  assert.ok(svgPrompt.includes('التتبع اللحظي'));
  assert.ok(svgPrompt.includes('```svg'));
  assert.ok(!svgPrompt.includes('```html'));

  const htmlPrompt = buildAppDeconstructionPrompt({
    appName: 'Spotify',
    selectedLenses: ['ux_flows', 'interactive_clone', 'security_scale'],
  });
  assert.ok(htmlPrompt.includes('Spotify'));
  assert.ok(htmlPrompt.includes('```html'));
  assert.ok(htmlPrompt.includes('الأمان والتوسّع'));
});
