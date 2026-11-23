import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANVA_DESIGN_PRESETS,
  ECOSYSTEM_BRIDGES,
  buildCanvaDesignPrompt,
  describeWmoWeatherCode,
  detectLiveConnectorContext,
  normalizeCountryAtlas,
  normalizeGitHubRepo,
  normalizeNpmPackage,
  normalizeWebMediaAsset,
  parseArxivAtomXml,
} from './connectorsUtils';

test('normalizeWebMediaAsset strips File: prefixes and validates URLs', () => {
  const valid = normalizeWebMediaAsset({
    id: 'wm_1',
    title: 'File:Desert_Night_Sky.jpg',
    thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Desert.jpg/640px-Desert.jpg',
    fullUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Desert.jpg',
    source: 'wikimedia',
    author: '<b>Photographer</b>',
    license: 'CC BY-SA 4.0',
  });
  assert.ok(valid);
  assert.equal(valid.title, 'Desert_Night_Sky');
  assert.equal(valid.author, 'Photographer');

  const invalid = normalizeWebMediaAsset({
    title: 'Bad',
    thumbUrl: 'javascript:alert(1)',
  });
  assert.equal(invalid, null);
});

test('normalizeGitHubRepo sanitizes GitHub search items', () => {
  const repo = normalizeGitHubRepo({
    id: 42,
    full_name: 'godotengine/godot',
    description: 'Godot Engine – Multi-platform 2D and 3D game engine',
    html_url: 'https://github.com/godotengine/godot',
    language: 'C++',
    stargazers_count: 95000,
    topics: ['godot', 'game-engine', 'gdscript'],
    updated_at: '2026-10-01T12:00:00Z',
  });
  assert.ok(repo);
  assert.equal(repo.fullName, 'godotengine/godot');
  assert.equal(repo.stars, 95000);
  assert.equal(repo.updatedAt, '2026-10-01');
});

test('buildCanvaDesignPrompt injects dimensions and selected internet image', () => {
  assert.ok(CANVA_DESIGN_PRESETS.length >= 6);
  assert.ok(ECOSYSTEM_BRIDGES.length >= 14);

  const prompt = buildCanvaDesignPrompt({
    topic: 'إعلان إطلاق لعبة فارس الصحراء',
    presetId: 'youtube_thumb',
    selectedImage: {
      id: 'ov_1',
      title: 'Golden Dunes',
      thumbUrl: 'https://images.example.org/dunes.jpg',
      fullUrl: 'https://images.example.org/dunes_full.jpg',
      pageUrl: 'https://openverse.org/image/1',
      source: 'openverse',
      author: 'Artist',
      license: 'CC0',
    },
    outputKind: 'svg',
  });

  assert.match(prompt, /1280 × 720|1280 720/);
  assert.match(prompt, /https:\/\/images\.example\.org\/dunes\.jpg/);
  assert.match(prompt, /```svg/);
});

test('parseArxivAtomXml extracts arXiv entries safely', () => {
  const xml = `
    <feed>
      <entry>
        <id>http://arxiv.org/abs/2501.01234v1</id>
        <published>2025-01-05T12:00:00Z</published>
        <title>Autonomous Multi-Agent Game Design</title>
        <summary>We propose an architecture for procedural game synthesis.</summary>
        <author><name>Ada Lovelace</name></author>
      </entry>
    </feed>
  `;
  const papers = parseArxivAtomXml(xml);
  assert.equal(papers.length, 1);
  assert.equal(papers[0].title, 'Autonomous Multi-Agent Game Design');
  assert.equal(papers[0].url, 'https://arxiv.org/abs/2501.01234v1');
  assert.equal(papers[0].authors[0], 'Ada Lovelace');
});

test('normalizeCountryAtlas and normalizeNpmPackage parse real payloads', () => {
  const country = normalizeCountryAtlas({
    name: { common: 'Jordan' },
    translations: { ara: { common: 'الأردن' } },
    capital: ['Amman'],
    region: 'Asia',
    population: 11200000,
    currencies: { JOD: { name: 'Jordanian dinar', symbol: 'د.ا' } },
    languages: { ara: 'Arabic' },
    flags: { png: 'https://flagcdn.com/w320/jo.png' },
  });
  assert.ok(country);
  assert.equal(country.nameArabic, 'الأردن');
  assert.equal(country.capital, 'Amman');

  const pkg = normalizeNpmPackage({
    package: {
      name: 'lucide-react',
      version: '0.500.0',
      description: 'Beautiful icons',
      links: { npm: 'https://www.npmjs.com/package/lucide-react' },
    },
  });
  assert.ok(pkg);
  assert.equal(pkg.name, 'lucide-react');
  assert.equal(pkg.version, '0.500.0');
});

test('detectLiveConnectorContext detects weather, crypto, github, tech news, country, and npm prompts', () => {
  const weatherPlan = detectLiveConnectorContext('ما حالة الطقس اليوم في الرياض؟');
  assert.equal(weatherPlan.weatherCity, 'الرياض');
  assert.equal(weatherPlan.needCryptoForex, false);

  const cryptoPlan = detectLiveConnectorContext('ما سعر البيتكوين والدولار الآن؟');
  assert.equal(cryptoPlan.needCryptoForex, true);

  const ghPlan = detectLiveConnectorContext('ابحث في GitHub عن إضافات godot 4');
  assert.ok(ghPlan.githubQuery && ghPlan.githubQuery.length > 0);

  const newsPlan = detectLiveConnectorContext('ما أحدث أخبار التقنية اليوم؟');
  assert.equal(newsPlan.techNews, true);

  const countryPlan = detectLiveConnectorContext('ما عاصمة وتعداد سكان country Japan؟');
  assert.equal(countryPlan.countryQuery, 'Japan');

  const npmPlan = detectLiveConnectorContext('ابحث عن حزمة npm three');
  assert.ok(npmPlan.npmQuery && npmPlan.npmQuery.includes('three'));

  assert.equal(describeWmoWeatherCode(0), 'سماء صافية');
});
