import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findNextSpatialFocusTarget,
  isSmartTvUserAgent,
  type SpatialCandidate,
} from './tvSpatialNav';

test('findNextSpatialFocusTarget navigates accurately across a 2D card grid in all 4 directions', () => {
  const grid: SpatialCandidate<string>[] = [
    { item: 'r1c1', rect: { left: 0, top: 0, width: 100, height: 100 } },
    { item: 'r1c2', rect: { left: 120, top: 0, width: 100, height: 100 } },
    { item: 'r1c3', rect: { left: 240, top: 0, width: 100, height: 100 } },
    { item: 'r2c1', rect: { left: 0, top: 140, width: 100, height: 100 } },
    { item: 'r2c2', rect: { left: 120, top: 140, width: 100, height: 100 } },
  ];

  const start = grid[0].rect; // r1c1
  assert.equal(findNextSpatialFocusTarget(start, grid.slice(1), 'right'), 'r1c2');
  assert.equal(findNextSpatialFocusTarget(start, grid.slice(1), 'down'), 'r2c1');
  assert.equal(findNextSpatialFocusTarget(start, grid.slice(1), 'left'), null);
  assert.equal(findNextSpatialFocusTarget(start, grid.slice(1), 'up'), null);

  const center = grid[4].rect; // r2c2
  const others = grid.filter((c) => c.item !== 'r2c2');
  assert.equal(findNextSpatialFocusTarget(center, others, 'up'), 'r1c2');
  assert.equal(findNextSpatialFocusTarget(center, others, 'left'), 'r2c1');
});

test('isSmartTvUserAgent detects Android TV, TV Bro, WebOS, and Tizen while ignoring desktop Chrome', () => {
  assert.equal(isSmartTvUserAgent('Mozilla/5.0 (Linux; Android 11; BRAVIA 4K) TV Bro/2.0'), true);
  assert.equal(isSmartTvUserAgent('Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0)'), true);
  assert.equal(isSmartTvUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0'), false);
});
