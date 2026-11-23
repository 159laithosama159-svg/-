import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateChapterToBookPages, getNovelCountryLabel } from './book4dUtils';
import {
  clampFloatingPosition,
  getDeviceCapabilities,
  suggestDeviceModeFromEnvironment,
} from './deviceModeUtils';
import {
  buildMediaCharacterProfiles,
  buildNovelCharacterProfiles,
} from './mediaCharacters';
import type { NovelBook } from './novelsUtils';
import type { MediaItem } from '../types/cinema';

test('paginateChapterToBookPages splits long Arabic chapters into balanced 4D pages', () => {
  const longText = Array.from({ length: 10 }, (_, i) =>
    `الفقرة رقم ${i + 1}: كان المسافر يقلب صفحات الكتاب العتيق تحت ضوء المصباح الدافئ وهو يستمع إلى همس الرياح بين الممرات الحجرية القديمة في القلعة.`
  ).join('\n\n');

  const pages = paginateChapterToBookPages(
    { id: 'c1', number: 1, title: 'بداية الرحلة', content: longText, createdAt: 1 },
    0,
    20
  );

  assert.ok(pages.length >= 2, 'should split into at least 2 physical pages');
  assert.equal(pages[0].pageNumber, 1);
  assert.equal(pages[0].totalPages, pages.length);
  assert.equal(pages[pages.length - 1].pageNumber, pages.length);
});

test('TV device mode strips Novels, AI Studio, Vault, and Floating Dock for pure Cinema speed', () => {
  const tv = getDeviceCapabilities('tv');
  assert.equal(tv.isCinemaOnly, true);
  assert.equal(tv.showNovels, false);
  assert.equal(tv.showAiStudio, false);
  assert.equal(tv.showPrivateVault, false);
  assert.equal(tv.showFloatingDock, false);
  assert.equal(tv.lightweightTvMode, true);

  const pc = getDeviceCapabilities('desktop');
  assert.equal(pc.isCinemaOnly, false);
  assert.equal(pc.showNovels, true);
  assert.equal(pc.showAiStudio, true);
  assert.equal(pc.showFloatingDock, true);

  assert.equal(suggestDeviceModeFromEnvironment('Mozilla/5.0 Android TV TV Bro', 1920), 'tv');
  assert.equal(suggestDeviceModeFromEnvironment('Mozilla/5.0 iPhone Mobile', 390), 'mobile');
  assert.equal(suggestDeviceModeFromEnvironment('Mozilla/5.0 Windows NT', 1440), 'desktop');
});

test('clampFloatingPosition keeps draggable widgets strictly inside viewport bounds', () => {
  const clamped = clampFloatingPosition({ x: -120, y: 2000 }, 300, 180, 1280, 800, 12);
  assert.equal(clamped.x, 12);
  assert.equal(clamped.y, 800 - 180 - 12);
});

test('character profile helpers return rich bios for movies, series, and novels', () => {
  const movie: MediaItem = {
    id: 'm1',
    kind: 'movie',
    category_id: 'fantasy',
    poster: '',
    title: 'سينتل (Sintel)',
    genres: ['فانتازيا'],
    desc: 'رحلة البحث عن تنين صغير',
  };
  const chars = buildMediaCharacterProfiles(movie);
  assert.ok(chars.length >= 2);
  assert.ok(chars[0].name.includes('سينتل'));

  const novel: NovelBook = {
    id: 'n1',
    title: 'سيف الساموراي الرقمي',
    author: 'أكيتو تاكاهاشي',
    country: 'ياباني',
    genre: 'خيال علمي',
    synopsis: 'طوكيو 2099',
    rating: 4.9,
    status: 'مستمرة',
    coverFrom: '#111',
    coverTo: '#222',
    accentColor: '#F5C76B',
    tags: ['ياباني'],
    updatedAt: 1,
    chapters: [{ id: 'ch1', number: 1, title: 'الفصل 1', content: 'نص', createdAt: 1 }],
  };
  assert.equal(getNovelCountryLabel(novel), 'ياباني');
  assert.ok(buildNovelCharacterProfiles(novel).length >= 2);
});
