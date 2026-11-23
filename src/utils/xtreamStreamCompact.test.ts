import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStreamingCompactXtreamParser,
  projectCompactXtreamRow,
} from './xtreamStreamCompact';

test('streaming parser extracts compact objects from chunked array and stops at limit', () => {
  const parser = createStreamingCompactXtreamParser(2);
  const fullPayload = JSON.stringify([
    {
      stream_id: 101,
      category_id: '10',
      name: 'Channel One',
      stream_icon: 'https://cdn.example.com/1.png',
      huge_unused_field: 'x'.repeat(5000),
    },
    {
      stream_id: 102,
      category_id: '10',
      name: 'Channel Two {HD} "Live"',
      stream_icon: 'https://cdn.example.com/2.png',
    },
    {
      stream_id: 103,
      category_id: '10',
      name: 'Channel Three (should not be collected)',
    },
  ]);

  let stopped = false;
  for (let i = 0; i < fullPayload.length; i += 17) {
    if (parser.push(fullPayload.slice(i, i + 17))) {
      stopped = true;
      break;
    }
  }

  assert.equal(stopped, true);
  const items = parser.getItems();
  assert.equal(items.length, 2);
  assert.equal(items[0].stream_id, 101);
  assert.equal(items[0].name, 'Channel One');
  assert.equal('huge_unused_field' in items[0], false);
  assert.equal(items[1].name, 'Channel Two {HD} "Live"');
});

test('streaming parser handles UTF-8 BOM and keyed object Xtream responses', () => {
  const parser = createStreamingCompactXtreamParser(5);
  const bomKeyed =
    '\uFEFF{"1":{"series_id":55,"name":"Breaking Series","cover":"https://img.test/a.jpg","plot":"' +
    'A'.repeat(400) +
    '"},"2":{"series_id":56,"name":"Second Show","nested":{"a":1,"b":{"c":2}}}}';

  parser.push(bomKeyed);
  const items = parser.getItems();
  assert.equal(items.length, 2);
  assert.equal(items[0].series_id, 55);
  assert.equal(String(items[0].plot).length, 160);
  assert.equal(items[1].series_id, 56);
  assert.equal('nested' in items[1], false);
});

test('projectCompactXtreamRow strips unknown fields and preserves category rows', () => {
  const row = projectCompactXtreamRow({
    category_id: '42',
    category_name: 'أفلام عربية 4K',
    parent_id: 0,
    extra_blob: 'ignored',
  });
  assert.deepEqual(row, {
    category_id: '42',
    category_name: 'أفلام عربية 4K',
  });
});
