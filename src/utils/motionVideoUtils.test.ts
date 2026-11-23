import assert from 'node:assert/strict';
import test from 'node:test';
import {
  VIDEO_TEMPLATES,
  getTotalVideoDurationSec,
  getVideoCanvasDimensions,
  normalizeMotionVideoProject,
} from './motionVideoUtils.ts';

test('normalizeMotionVideoProject sanitizes colors, durations, and builds narration script', () => {
  const project = normalizeMotionVideoProject(
    {
      title: 'رحلة إلى المستقبل',
      aspectRatio: '9:16',
      scenes: [
        {
          headline: 'المستقبل يبدأ الآن',
          subtitle: 'ذكاء اصطناعي يعمل معك في كل خطوة',
          narration: 'المستقبل يبدأ الآن مع الذكاء الاصطناعي.',
          durationSec: 99,
          accentColor: 'not-a-hex',
          motionStyle: 'starfield_warp',
          visualKeyword: 'galaxy stars',
        },
        {
          headline: 'أبدع بلا حدود',
          subtitle: 'صور وفيديوهات وألعاب بضغطة زر',
          durationSec: 1,
          accentColor: '#34D399',
          motionStyle: 'aurora_waves',
        },
      ],
    },
    '16:9'
  );

  assert.equal(project.aspectRatio, '9:16');
  assert.equal(project.scenes.length, 2);
  assert.equal(project.scenes[0].durationSec, 9);
  assert.equal(project.scenes[1].durationSec, 3);
  assert.equal(project.scenes[0].accentColor, '#60A5FA');
  assert.equal(project.scenes[1].accentColor, '#34D399');
  assert.equal(getTotalVideoDurationSec(project), 12);
  assert.ok(project.narrationFullScript.includes('المستقبل يبدأ الآن'));
});

test('getVideoCanvasDimensions matches 16:9 and 9:16 presets', () => {
  assert.deepEqual(getVideoCanvasDimensions('16:9'), { width: 1280, height: 720 });
  assert.deepEqual(getVideoCanvasDimensions('9:16'), { width: 720, height: 1280 });
  assert.ok(VIDEO_TEMPLATES.length >= 5);
});
