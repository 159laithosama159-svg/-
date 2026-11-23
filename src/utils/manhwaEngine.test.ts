import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANHWA_STYLE_PRESETS,
  buildCharacterBiblePromptBlock,
  buildManhwaPrintableHtml,
  buildProceduralManhwaPanelSvg,
  extractLocalCharacterBibleFallback,
  normalizeManhwaCharacterBible,
  normalizeManhwaEpisode,
  parseUploadedBookFile,
  sampleFullBookForAnalysis,
} from './manhwaEngine';

test('parseUploadedBookFile splits Arabic and English chapters cleanly, strips HTML, and preserves rawFullText', () => {
  const arabicBook = [
    'دليل الشخصيات:',
    '- كايل: شاب بشعر أبيض وعينين قرمزيتين يرتدي معطفاً أسود ويحمل سيفاً فضياً.',
    '',
    'الفصل الأول: بداية العاصفة',
    'سار الفارس وحيداً تحت سماء ملبّدة بالغيوم وهو يحمل سيف النور.',
    '',
    'الفصل الثاني: بوابة الظلال',
    'انفتحت البوابة السوداء أمامه وظهر التنين الحارس بزئير هزّ الجبال.',
  ].join('\n');

  const parsed = parseUploadedBookFile('أسطورة_النور.txt', arabicBook);
  assert.equal(parsed.title, 'أسطورة النور');
  assert.ok(parsed.chapters.length >= 2);
  assert.ok(parsed.rawFullText.includes('شعر أبيض'));
  assert.ok(parsed.rawFullText.includes('التنين'));
  assert.ok(parsed.totalWords >= 20);

  const htmlParsed = parseUploadedBookFile(
    'story.html',
    '<html><body><h1>Chapter 1</h1><p>Hero enters the castle.</p><h1>Chapter 2</h1><p>Dragon awakes.</p></body></html>'
  );
  assert.ok(htmlParsed.chapters.length >= 1);
  assert.ok(!htmlParsed.chapters[0].content.includes('<p>'));
  assert.ok(htmlParsed.rawFullText.includes('Dragon awakes'));
});

test('extractLocalCharacterBibleFallback extracts character names, traits, weapons, and exact hex colors from Arabic novel files', () => {
  const fileText = [
    'الشخصيات:',
    '- كايل: شاب طويل بشعر أبيض فضي وعينين قرمزيتين حادتين، يرتدي معطفاً أسود طويلاً ويحمل سيفاً فضياً وتحيط به هالة زرقاء.',
    '- ليلى: ساحرة بشعر أشقر ذهبي وعينين خضراوين زمرديتين، ترتدي عباءة بنفسجية وتحمل عصا سحرية.',
    '',
    'الفصل الأول: قلعة المطر',
    'تحت سماء الليل والمطر، رفع كايل سيفه أمام القصر المهجور.',
  ].join('\n');

  const bible = extractLocalCharacterBibleFallback('سيف القمر', fileText);
  assert.equal(bible.bookTitle, 'سيف القمر');
  assert.equal(bible.characters.length, 2);
  assert.equal(bible.characters[0].name, 'كايل');
  assert.equal(bible.characters[0].hairHex, '#E5E7EB');
  assert.equal(bible.characters[0].eyeHex, '#DC2626');
  assert.equal(bible.characters[0].outfitHex, '#141720');
  assert.ok(bible.characters[0].weaponOrPropAr?.includes('سيف'));

  assert.equal(bible.characters[1].name, 'ليلى');
  assert.equal(bible.characters[1].hairHex, '#F59E0B');
  assert.equal(bible.characters[1].eyeHex, '#10B981');
  assert.equal(bible.characters[1].outfitHex, '#A855F7');

  const promptBlock = buildCharacterBiblePromptBlock(bible);
  assert.ok(promptBlock.includes('كايل'));
  assert.ok(promptBlock.includes('#E5E7EB'));
  assert.ok(promptBlock.includes('#DC2626'));
});

test('normalizeManhwaEpisode applies extracted Character Bible colors to SVG art and tracks charactersPresent', () => {
  const bible = normalizeManhwaCharacterBible(
    {
      worldSettingAr: 'قلعة جليدية تحت قمر قرمزي',
      atmosphereAr: 'عاصف وغامض',
      characters: [
        {
          name: 'كايل',
          role: 'البطل الرئيسي',
          appearanceAr: 'شعر أبيض طويل وعينان قرمزيتان',
          outfitAr: 'معطف أسود طويل بحواف ذهبية',
          weaponOrPropAr: 'سيف فضي متوهج',
          hairHex: '#F1F5F9',
          eyeHex: '#E11D48',
          outfitHex: '#0F172A',
          skinHex: '#F2D5C0',
          auraHex: '#38BDF8',
        },
      ],
    },
    'سيف القمر',
    800
  );

  const ep = normalizeManhwaEpisode(
    {
      styleSummaryAr: 'مانهوا ملحمية ملتزمة بالملف',
      panels: [
        {
          title: 'ظهور كايل',
          layout: 'splash',
          mood: 'epic',
          sceneDescriptionAr: 'يقف كايل أمام البوابة الحجرية.',
          charactersPresent: ['كايل'],
          dialogues: [
            {
              speaker: 'كايل',
              text: 'لن أتراجع خطوة واحدة!',
              bubbleType: 'shout',
              position: 'top_right',
            },
          ],
          sfxText: 'ووش!',
          svgArt: '', // triggers procedural renderer using Character Bible hexes!
        },
      ],
    },
    {
      bookTitle: 'سيف القمر',
      chapterTitle: 'الفصل 1',
      styleId: 'solo_manhwa',
      usedReferenceImage: false,
      characterBible: bible,
      strictFileMode: true,
    }
  );

  assert.equal(ep.strictFileMode, true);
  assert.deepEqual(ep.panels[0].charactersPresent, ['كايل']);
  assert.ok(ep.panels[0].svgArt.includes('#F1F5F9'), 'SVG must render exact hairHex from file');
  assert.ok(ep.panels[0].svgArt.includes('#E11D48'), 'SVG must render exact eyeHex from file');
  assert.ok(ep.panels[0].svgArt.includes('#0F172A'), 'SVG must render exact outfitHex from file');
});

test('normalizeManhwaEpisode builds valid SVG panels and respects monochrome manga preset', () => {
  const ep = normalizeManhwaEpisode(
    {
      styleSummaryAr: 'مانغا حبر أسود حاد',
      panels: [
        {
          title: 'الاصطدام الأول',
          layout: 'splash',
          mood: 'action',
          narrationBox: 'في تلك اللحظة، توقّف الزمن.',
          dialogues: [
            {
              speaker: 'زين',
              text: 'لن أسمح لك بتدمير المدينة!',
              bubbleType: 'shout',
              position: 'top_right',
            },
          ],
          sfxText: 'كرااااش!',
          svgArt: '',
        },
      ],
    },
    {
      bookTitle: 'سيف الظل',
      chapterTitle: 'الفصل 1',
      styleId: 'classic_manga',
      usedReferenceImage: false,
    }
  );

  assert.equal(ep.panels.length, 1);
  assert.ok(ep.panels[0].svgArt.startsWith('<svg'));
  assert.equal(ep.panels[0].dialogues[0].bubbleType, 'shout');
  assert.equal(ep.panels[0].sfxText, 'كرااااش!');

  const html = buildManhwaPrintableHtml(ep);
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes('سيف الظل'));
  assert.ok(html.includes('كرااااش!'));
});

test('MANHWA_STYLE_PRESETS exposes 6 presets and sampleFullBookForAnalysis keeps head + distributed slices', () => {
  assert.equal(MANHWA_STYLE_PRESETS.length, 6);
  const svg = buildProceduralManhwaPanelSvg({
    panelNumber: 2,
    title: 'بوابة النيون',
    mood: 'epic',
    cameraAngle: 'زاوية سفلية',
    layout: 'tall',
    palette: ['#070B16', '#161B38', '#06B6D4', '#EC4899'],
  });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('PANEL #2'));

  const huge = 'مقدمة الشخصيات: كايل شعره أبيض.\n' + 'أحداث '.repeat(8000) + '\nنهاية الكتاب العظيمة.';
  const sampled = sampleFullBookForAnalysis(huge, 4000);
  assert.ok(sampled.includes('مقدمة الشخصيات'));
  assert.ok(sampled.includes('نهاية الكتاب'));
  assert.ok(sampled.length <= 4400);
});
