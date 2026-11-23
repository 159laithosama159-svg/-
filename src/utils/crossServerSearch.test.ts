import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanMediaSearchTitle,
  detectQualityBadge,
  formatCrossServerAnnouncement,
  rankCrossServerMatches,
  scoreTitleMatch,
  type CrossServerMatch,
} from './crossServerSearch';

test('cleanMediaSearchTitle strips Xtream IPTV 4K/D+/country/year/episode noise cleanly', () => {
  assert.equal(
    cleanMediaSearchTitle("4K-D+ - X-Men '97 (2024) (US) — 4K-D+ - X-Men '97 (2024) (US) - S01E01 - To Me, My X-Men"),
    'x men 97'
  );
  assert.equal(cleanMediaSearchTitle('AR | NF - Breaking Bad (2008) FHD'), 'breaking bad');
  assert.equal(cleanMediaSearchTitle('[4K] ألمُؤسس عُثمان (2023)'), 'المؤسس عثمان');
});

test('scoreTitleMatch matches identical and noisy IPTV titles accurately', () => {
  const s1 = scoreTitleMatch("X-Men '97", "4K-D+ - X-Men '97 (2024) (US)");
  assert.ok(s1 >= 90, `Expected >= 90, got ${s1}`);

  const s2 = scoreTitleMatch('بريكنغ باد', 'بريكنغ باد (Breaking Bad)');
  assert.ok(s2 >= 80, `Expected >= 80, got ${s2}`);

  const s3 = scoreTitleMatch('X-Men 97', 'Big Buck Bunny');
  assert.equal(s3, 0);
});

test('detectQualityBadge infers 4K / 1080p / HD from titles', () => {
  assert.equal(detectQualityBadge({ title: "4K-D+ - X-Men '97" }), '4K UHD');
  assert.equal(detectQualityBadge({ title: 'Series 1080p BluRay' }), '1080p FHD');
  assert.equal(detectQualityBadge({ title: 'Normal Show', quality: 'HD' }), 'HD');
});

test('rankCrossServerMatches sorts by score and deduplicates same server+title', () => {
  const matches: CrossServerMatch[] = [
    {
      serverId: 's1',
      serverName: 'Server Alpha',
      serverType: 'xtream',
      score: 82,
      qualityTag: 'HD',
      item: { id: '1', kind: 'series', category_id: '1', title: "HD - X-Men '97 (2024)", poster: '' },
    },
    {
      serverId: 's1',
      serverName: 'Server Alpha',
      serverType: 'xtream',
      score: 95,
      qualityTag: '4K UHD',
      item: { id: '2', kind: 'series', category_id: '1', title: "4K-D+ - X-Men '97 (2024)", poster: '' },
    },
    {
      serverId: 's2',
      serverName: 'Server Beta',
      serverType: 'xtream',
      score: 90,
      qualityTag: '1080p FHD',
      item: { id: '3', kind: 'series', category_id: '2', title: "FHD - X-Men '97", poster: '' },
    },
  ];
  const ranked = rankCrossServerMatches(matches);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].serverId, 's1');
  assert.equal(ranked[0].item.id, '2');
  assert.equal(ranked[1].serverId, 's2');
});

test('formatCrossServerAnnouncement produces clear Arabic announcements', () => {
  const msg = formatCrossServerAnnouncement("X-Men '97", [
    {
      serverId: 's1',
      serverName: 'سيرفر VIP 1',
      serverType: 'xtream',
      score: 95,
      qualityTag: '4K UHD',
      item: { id: '1', kind: 'series', category_id: '1', title: "X-Men '97", poster: '' },
    },
    {
      serverId: 's2',
      serverName: 'سيرفر VIP 2',
      serverType: 'xtream',
      score: 90,
      qualityTag: 'HD',
      item: { id: '2', kind: 'series', category_id: '1', title: "X-Men '97", poster: '' },
    },
  ]);
  assert.ok(msg.includes('2 سيرفرات'));
  assert.ok(msg.includes('سيرفر VIP 1'));
  assert.ok(msg.includes('سيرفر VIP 2'));
});
