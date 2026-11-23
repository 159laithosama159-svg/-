import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractArtifactsFromMarkdown,
  extractFirstUrlFromText,
  extractPlainTextFromHtml,
  validatePublicWebsiteUrl,
} from './aiStudioUtils';
import { findNextFocusableBox, keyToTvDirection } from './tvNavigation';

test('validatePublicWebsiteUrl accepts valid public domains and normalizes https', () => {
  const res1 = validatePublicWebsiteUrl('wikipedia.org/wiki/Cinema');
  assert.equal(res1.valid, true);
  assert.equal(res1.normalizedUrl, 'https://wikipedia.org/wiki/Cinema');

  const res2 = validatePublicWebsiteUrl('https://www.imdb.com/title/tt0816692/');
  assert.equal(res2.valid, true);
  assert.equal(res2.normalizedUrl, 'https://www.imdb.com/title/tt0816692/');
});

test('validatePublicWebsiteUrl blocks localhost, private subnets, and unsafe protocols', () => {
  assert.equal(validatePublicWebsiteUrl('http://localhost:3000').valid, false);
  assert.equal(validatePublicWebsiteUrl('http://127.0.0.1/admin').valid, false);
  assert.equal(validatePublicWebsiteUrl('http://192.168.1.1').valid, false);
  assert.equal(validatePublicWebsiteUrl('http://169.254.169.254/latest').valid, false);
  assert.equal(validatePublicWebsiteUrl('http://10.0.0.5').valid, false);
  assert.equal(validatePublicWebsiteUrl('javascript:alert(1)').valid, false);
});

test('extractFirstUrlFromText finds and cleans public URLs embedded in Arabic text', () => {
  const url = extractFirstUrlFromText('لخّص لي هذا الموقع https://www.bbc.com/arabic، شكراً');
  assert.equal(url, 'https://www.bbc.com/arabic،'.replace('،', '') || 'https://www.bbc.com/arabic');
  const cleanUrl = extractFirstUrlFromText('افحص https://example.com/page.');
  assert.equal(cleanUrl, 'https://example.com/page');
  assert.equal(extractFirstUrlFromText('بدون روابط هنا'), null);
});

test('extractArtifactsFromMarkdown classifies html, svg, and code blocks accurately', () => {
  const sample = [
    'إليك صفحة تفاعلية وتصميم شعار:',
    '```html',
    '<!doctype html><html><body><h1>Hello</h1></body></html>',
    '```',
    '```svg',
    '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>',
    '```',
    '```python',
    'print("hello world")',
    '```',
  ].join('\n');

  const arts = extractArtifactsFromMarkdown(sample);
  assert.equal(arts.length, 3);
  assert.equal(arts[0].kind, 'html');
  assert.equal(arts[1].kind, 'svg');
  assert.equal(arts[2].kind, 'code');
  assert.equal(arts[2].language, 'python');
});

test('extractPlainTextFromHtml strips scripts, styles, and tags cleanly', () => {
  const html = '<html><head><style>body{color:red}</style><script>alert(1)</script></head><body><h1>مرحباً</h1><p>سينما &amp; ترفيه</p></body></html>';
  assert.equal(extractPlainTextFromHtml(html), 'مرحباً سينما & ترفيه');
});

test('Smart TV spatial navigation picks nearest aligned candidate along D-Pad direction', () => {
  assert.equal(keyToTvDirection('ArrowRight'), 'right');
  assert.equal(keyToTvDirection('Enter'), null);

  const boxes = [
    { id: 'top-left', left: 0, top: 0, width: 100, height: 50 },
    { id: 'top-right', left: 150, top: 0, width: 100, height: 50 },
    { id: 'bottom-left', left: 0, top: 100, width: 100, height: 50 },
    { id: 'bottom-right', left: 150, top: 100, width: 100, height: 50 },
  ];

  assert.equal(findNextFocusableBox(boxes[0], boxes, 'right')?.id, 'top-right');
  assert.equal(findNextFocusableBox(boxes[0], boxes, 'down')?.id, 'bottom-left');
  assert.equal(findNextFocusableBox(boxes[3], boxes, 'up')?.id, 'top-right');
  assert.equal(findNextFocusableBox(boxes[3], boxes, 'left')?.id, 'bottom-left');
  assert.equal(findNextFocusableBox(boxes[0], boxes, 'up'), null);
});
