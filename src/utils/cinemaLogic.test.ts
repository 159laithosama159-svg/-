import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgressPercent,
  createDefaultFilterConfig,
  evaluateSceneFilterState,
  filterAndSortItems,
  formatTimecode,
  isBlockedByFamilyGuard,
  normalizeServerHost,
  parseFilterConfigJson,
  parseM3UPlaylist,
  validateXtreamForm,
} from './cinemaLogic';
import type { Category, MediaItem } from '../types/cinema';

test('isBlockedByFamilyGuard blocks adult keywords when enabled and allows when disabled', () => {
  assert.equal(isBlockedByFamilyGuard('Adult Movies +18', true), true);
  assert.equal(isBlockedByFamilyGuard('أفلام للكبار فقط', true), true);
  assert.equal(isBlockedByFamilyGuard('أفلام أكشن ومغامرات', true), false);
  assert.equal(isBlockedByFamilyGuard('Adult Movies +18', false), false);
});

test('formatTimecode formats seconds into MM:SS and H:MM:SS cleanly', () => {
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(65), '01:05');
  assert.equal(formatTimecode(3661), '1:01:01');
  assert.equal(formatTimecode(-5), '00:00');
  assert.equal(formatTimecode(Number.NaN), '00:00');
});

test('calculateProgressPercent clamps correctly between 0 and 100', () => {
  assert.equal(calculateProgressPercent(30, 120), 25);
  assert.equal(calculateProgressPercent(200, 100), 100);
  assert.equal(calculateProgressPercent(10, 0), 0);
});

test('validateXtreamForm rejects missing or malformed inputs and accepts valid server credentials', () => {
  assert.equal(
    validateXtreamForm({ name: '', host: 'http://srv.test:8080', username: 'u', password: 'p' })
      .valid,
    false
  );
  assert.equal(
    validateXtreamForm({ name: 'Hydra', host: 'srv.test', username: 'u', password: 'p' }).valid,
    false
  );
  assert.equal(
    validateXtreamForm({ name: 'Hydra', host: 'http://srv.test:8080/', username: 'u', password: 'p' })
      .valid,
    true
  );
  assert.equal(normalizeServerHost('http://srv.test:8080///'), 'http://srv.test:8080');
});

test('filterAndSortItems enforces family guard, kids mode, search, category, and sorting', () => {
  const categories: Category[] = [
    { category_id: 'c1', category_name: 'أكشن' },
    { category_id: 'c2', category_name: 'للكبار فقط +18' },
  ];
  const items: MediaItem[] = [
    {
      id: '1',
      kind: 'movie',
      category_id: 'c1',
      title: 'أسطورة التنين',
      rating: '9.3',
      year: '2025',
      poster: '',
      isKidsFriendly: true,
    },
    {
      id: '2',
      kind: 'movie',
      category_id: 'c1',
      title: 'دموع الفولاذ',
      rating: '8.4',
      year: '2024',
      poster: '',
      isKidsFriendly: false,
    },
    {
      id: '3',
      kind: 'movie',
      category_id: 'c2',
      title: 'فيلم محظور',
      rating: '7.1',
      year: '2023',
      poster: '',
      isKidsFriendly: false,
    },
  ];

  const guarded = filterAndSortItems(items, categories, {
    familyGuard: true,
    sort: 'rating',
  });
  assert.equal(guarded.length, 2);
  assert.equal(guarded[0].id, '1');

  const kidsOnly = filterAndSortItems(items, categories, {
    familyGuard: true,
    kidsOnly: true,
  });
  assert.equal(kidsOnly.length, 1);
  assert.equal(kidsOnly[0].id, '1');

  const searched = filterAndSortItems(items, categories, {
    familyGuard: true,
    search: 'الفولاذ',
  });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, '2');
});

test('evaluateSceneFilterState handles auto-skip, blur_mute, panic override, and lenses_only', () => {
  const config = createDefaultFilterConfig();
  config.cues = [
    { id: 'c_skip', start: 10, end: 20, action: 'skip' },
    { id: 'c_blur', start: 30, end: 40, action: 'blur_mute' },
    { id: 'c_lens', start: 50, end: 60, action: 'lenses_only' },
  ];

  const skipEval = evaluateSceneFilterState(12, config, false, false, null);
  assert.equal(skipEval.skipToTime, 20.25);
  assert.equal(skipEval.skippedCueId, 'c_skip');

  const blurEval = evaluateSceneFilterState(35, config, false, false, null);
  assert.equal(blurEval.veilMode, 'blur');
  assert.equal(blurEval.shouldMute, true);

  const panicEval = evaluateSceneFilterState(5, config, true, false, null);
  assert.equal(panicEval.veilMode, 'blur');
  assert.equal(panicEval.shouldMute, true);

  const outsideLensEval = evaluateSceneFilterState(5, config, false, false, null);
  assert.equal(outsideLensEval.lensOpacity, 0.14);

  const insideLensEval = evaluateSceneFilterState(55, config, false, false, null);
  assert.equal(insideLensEval.lensOpacity, 1);
});

test('parseFilterConfigJson validates and normalizes imported JSON filter rules', () => {
  const validJson = JSON.stringify({
    blurPx: 42,
    style: 'black',
    hideBorders: true,
    cues: [{ start: 15, end: 30, action: 'skip' }],
    lenses: [{ mode: 'blur', x: 20, y: 25, w: 30, h: 30 }],
  });
  const parsed = parseFilterConfigJson(validJson);
  assert.ok(parsed);
  assert.equal(parsed.blurPx, 42);
  assert.equal(parsed.style, 'black');
  assert.equal(parsed.cues.length, 1);
  assert.equal(parsed.lenses.length, 1);

  assert.equal(parseFilterConfigJson('{bad json'), null);
});

test('parseM3UPlaylist extracts live channels, VOD movies, and categories accurately', () => {
  const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://example.com/news.png" group-title="أخبار",الجزيرة الإخبارية
https://live.example.com/aja/index.m3u8
#EXTINF:-1 group-title="أفلام 4K",مغامرة الفضاء
https://vod.example.com/movie1.mp4`;

  const parsed = parseM3UPlaylist(sampleM3U, 'My IPTV');
  assert.equal(parsed.categories.length, 2);
  assert.equal(parsed.liveStreams.length, 1);
  assert.equal(parsed.vodStreams.length, 1);
  assert.equal(parsed.liveStreams[0].title, 'الجزيرة الإخبارية');
  assert.equal(parsed.vodStreams[0].title, 'مغامرة الفضاء');
});

test('normalizeArtworkQuery strips quality tags and years cleanly', async () => {
  const { normalizeArtworkQuery } = await import('./cinemaLogic');
  assert.equal(normalizeArtworkQuery('[4K] Breaking Bad (2008) HDR'), 'Breaking Bad');
  assert.equal(normalizeArtworkQuery('Tears of Steel — 1080p BluRay'), 'Tears of Steel');
});

test('pickRandomTonightItem avoids repeating the previous pick when pool has multiple items', async () => {
  const { pickRandomTonightItem } = await import('./cinemaLogic');
  const pool: MediaItem[] = [
    { id: 'a', kind: 'movie', category_id: 'c1', title: 'A', poster: '' },
    { id: 'b', kind: 'movie', category_id: 'c1', title: 'B', poster: '' },
  ];
  const picked = pickRandomTonightItem(pool, 'a', () => 0);
  assert.equal(picked?.id, 'b');
});

test('buildVideoFilterCss returns none at defaults and builds valid CSS filter string otherwise', async () => {
  const { buildVideoFilterCss, buildCatalogSummaryForAI } = await import('./cinemaLogic');
  assert.equal(
    buildVideoFilterCss({ brightness: 100, contrast: 100, saturation: 100 }),
    'none'
  );
  assert.equal(
    buildVideoFilterCss({ brightness: 115, contrast: 110, saturation: 120 }),
    'brightness(115%) contrast(110%) saturate(120%)'
  );
  const summary = buildCatalogSummaryForAI([
    { id: '1', kind: 'movie', category_id: 'c', title: 'Sintel', poster: '', rating: '9.0' },
  ]);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].id, '1');
});

test('parseSmartXtreamCredentials extracts single, multi-block, and deduplicated Xtream credentials cleanly', async () => {
  const { parseSmartXtreamCredentials } = await import('./cinemaLogic');
  const sampleText = `
#باقة_السينما_الذهبية
تاريخ الانتهاء 10/10/2028
http://iptv.example.com:8080/get.php?username=demo_user1&password=demo_pass1&type=m3u_plus

http://iptv.example.com:8080
username=demo_user1
password=demo_pass1

#سيرفر_العائلة_4K
https://stream.demo.test:8443
username: family_user
password: family_secret
`;
  const parsed = parseSmartXtreamCredentials(sampleText);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].host, 'http://iptv.example.com:8080');
  assert.equal(parsed[0].username, 'demo_user1');
  assert.equal(parsed[0].password, 'demo_pass1');
  assert.equal(parsed[0].recommendedProxy, true);
  assert.equal(parsed[0].expiryHint, '10/10/2028');
  assert.ok(parsed[0].name.includes('باقة'));

  assert.equal(parsed[1].host, 'https://stream.demo.test:8443');
  assert.equal(parsed[1].username, 'family_user');
  assert.equal(parsed[1].password, 'family_secret');
  assert.equal(parsed[1].recommendedProxy, false);
});


