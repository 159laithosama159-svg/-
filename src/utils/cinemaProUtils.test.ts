import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_DEMO_SRT,
  classifyPingMs,
  computeEpgProgressPercent,
  generateRoomCode,
  getActiveSubtitleCue,
  hashPin,
  isValidPin,
  isValidRoomCode,
  normalizeRoomCode,
  parseSubtitleFile,
  serializeToSrt,
} from './cinemaProUtils';
import { AI_AGENTS, recommendAgentForPrompt } from '../data/aiAgents';

test('parseSubtitleFile parses SRT and VTT blocks accurately and strips HTML tags', () => {
  const cues = parseSubtitleFile(SAMPLE_DEMO_SRT);
  assert.equal(cues.length, 4);
  assert.equal(cues[0].start, 1);
  assert.equal(cues[0].end, 5.5);
  assert.match(cues[0].text, /VALDRION Imperial Cinema/);

  const vtt = `WEBVTT\n\n00:05.000 --> 00:08.500 align:center\n<i>Hello</i> World\n`;
  const vttCues = parseSubtitleFile(vtt);
  assert.equal(vttCues.length, 1);
  assert.equal(vttCues[0].start, 5);
  assert.equal(vttCues[0].end, 8.5);
  assert.equal(vttCues[0].text, 'Hello World');
});

test('getActiveSubtitleCue respects positive and negative timing offsets', () => {
  const cues = parseSubtitleFile(SAMPLE_DEMO_SRT);
  assert.equal(getActiveSubtitleCue(cues, 2.5, 0)?.id, 'sub_1');
  assert.equal(getActiveSubtitleCue(cues, 0.2, 1.5)?.id, 'sub_1');
  assert.equal(getActiveSubtitleCue(cues, 2.0, -2.0), null);
});

test('serializeToSrt round-trips parsed cues cleanly', () => {
  const cues = parseSubtitleFile(SAMPLE_DEMO_SRT);
  const srt = serializeToSrt(cues);
  const reparsed = parseSubtitleFile(srt);
  assert.equal(reparsed.length, cues.length);
  assert.equal(reparsed[2].text, cues[2].text);
});

test('Watch Party / QR Remote room code helpers normalize and validate safely', () => {
  const code = generateRoomCode(6);
  assert.equal(code.length, 6);
  assert.equal(isValidRoomCode(code), true);
  assert.equal(normalizeRoomCode(' ab-12_cd '), 'AB12CD');
  assert.equal(isValidRoomCode('AB'), false);
  assert.equal(isValidRoomCode('VALDR9'), true);
});

test('Family PIN validation and deterministic hashing work reliably', () => {
  assert.equal(isValidPin('1234'), true);
  assert.equal(isValidPin('123'), false);
  assert.equal(isValidPin('12a4'), false);
  assert.equal(hashPin('4321'), hashPin('4321'));
  assert.notEqual(hashPin('4321'), hashPin('1234'));
});

test('classifyPingMs categorizes latency grades accurately', () => {
  assert.equal(classifyPingMs(true, 120).grade, 'excellent');
  assert.equal(classifyPingMs(true, 480).grade, 'good');
  assert.equal(classifyPingMs(true, 1450).grade, 'slow');
  assert.equal(classifyPingMs(false, null).grade, 'offline');
});

test('computeEpgProgressPercent returns bounded percentage for valid schedules', () => {
  const sampleNow = new Date(2026, 10, 18, 21, 30, 0);
  const pct = computeEpgProgressPercent('21:00', '22:00', sampleNow);
  assert.equal(pct, 50);
});

test('AI_AGENTS defines 29 distinct specialized agents including Chief Advisor and assistants, and auto-dispatch routes prompts accurately', () => {
  assert.equal(AI_AGENTS.length, 29);
  const uniqueIds = new Set(AI_AGENTS.map((a) => a.id));
  assert.equal(uniqueIds.size, 29);
  assert.ok(uniqueIds.has('chief_advisor'));
  assert.ok(uniqueIds.has('exec_assistant'));

  assert.equal(recommendAgentForPrompt('ادخل موقع https://wikipedia.org').id, 'web_navigator');
  assert.equal(recommendAgentForPrompt('سوي لعبة منصات داخل محرك جودوت').id, 'godot_forge');
  assert.equal(recommendAgentForPrompt('صمم منشور كانفا لإنستغرام').id, 'canva_designer');
  assert.equal(recommendAgentForPrompt('ابحث عن مشاريع GitHub مفتوحة المصدر').id, 'github_engineer');
  assert.equal(recommendAgentForPrompt('برمج لعبة ثعبان HTML').id, 'code_architect');
  assert.equal(recommendAgentForPrompt('صمم بوستر SVG فخم').id, 'artisan_studio');
  assert.equal(recommendAgentForPrompt('فك تشفير Base64 هذا').id, 'cipher_decoder');
  assert.equal(recommendAgentForPrompt('اخترع فكرة تطبيق جديد').id, 'nova_inventor');
  assert.equal(recommendAgentForPrompt('اكتب سياسة الخصوصية وعقد عمل حر').id, 'legal_contracts');
  assert.equal(recommendAgentForPrompt('احسب ميزانية و ROI المشروع').id, 'finance_analyst');
  assert.equal(recommendAgentForPrompt('اكتب منشور واتساب للمشاركة').id, 'share_viral');
  assert.equal(recommendAgentForPrompt('أنتج بودكاست صوتي').id, 'voice_producer');
  assert.equal(recommendAgentForPrompt('ابحث عن أحدث الأفلام').id, 'deep_scout');
});


