import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOmniShareLinks,
  buildWebhookPayloadForTarget,
  detectCrossAppActions,
  detectWebhookPlatform,
  extractPublicUrlFromPrompt,
  INTERNAL_CONNECTED_APPS,
  validateWebhookUrl,
} from '../agents/omniChannelBridge';

test('detectCrossAppActions recognizes multi-direction navigation across all internal apps and speech', () => {
  const actions = detectCrossAppActions('افتح تطبيق سطور للروايات واقرأ الرد بصوت عال');
  assert.ok(actions.some((a) => a.type === 'navigate' && a.target === 'novels'));
  assert.ok(actions.some((a) => a.type === 'speak_reply'));

  const godot = detectCrossAppActions('شغّل محرك ألعاب Godot 4 الآن');
  assert.ok(godot.some((a) => a.type === 'navigate' && a.target === 'godot'));

  const connectors = detectCrossAppActions('افتح موصلات الويب وجيت هاب');
  assert.ok(connectors.some((a) => a.type === 'navigate' && a.target === 'connectors'));

  const brain = detectCrossAppActions('افتح الذاكرة والعقل الشخصي');
  assert.ok(brain.some((a) => a.type === 'navigate' && a.target === 'brain'));

  assert.equal(INTERNAL_CONNECTED_APPS.length, 9);
});

test('validateWebhookUrl permits https and local loopback while blocking unsafe schemes', () => {
  assert.equal(validateWebhookUrl('https://hooks.example.com/mission').valid, true);
  assert.equal(validateWebhookUrl('http://127.0.0.1:5678/webhook/test').valid, true);
  assert.equal(validateWebhookUrl('http://evil.example.com/hook').valid, false);
  assert.equal(validateWebhookUrl('javascript:alert(1)').valid, false);
});

test('extractPublicUrlFromPrompt extracts safe public URLs and ignores localhost/private IPs', () => {
  assert.equal(
    extractPublicUrlFromPrompt('اقرأ هذا الموقع https://en.wikipedia.org/wiki/WebGPU ولخصه'),
    'https://en.wikipedia.org/wiki/WebGPU'
  );
  assert.equal(extractPublicUrlFromPrompt('افحص http://127.0.0.1:8080/admin'), null);
});

test('buildOmniShareLinks generates clean links across 11 external apps', () => {
  const links = buildOmniShareLinks('تقرير القائد', '## النتيجة\nنجح التنفيذ 100%');
  assert.ok(links.mailtoUrl.startsWith('mailto:?subject='));
  assert.ok(links.gmailUrl.startsWith('https://mail.google.com/mail/'));
  assert.ok(links.whatsappUrl.startsWith('https://wa.me/?text='));
  assert.ok(links.telegramUrl.startsWith('https://t.me/share/url?'));
  assert.ok(links.googleCalendarUrl.startsWith('https://calendar.google.com/calendar/render'));
  assert.ok(links.googleMapsUrl.startsWith('https://www.google.com/maps/search/'));
  assert.ok(links.youtubeUrl.startsWith('https://www.youtube.com/results?'));
  assert.ok(links.spotifyUrl.startsWith('https://open.spotify.com/search/'));
  assert.ok(links.githubUrl.startsWith('https://github.com/search?q='));
  assert.ok(links.twitterUrl.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(links.linkedinUrl.startsWith('https://www.linkedin.com/feed/'));
});

test('detectWebhookPlatform and buildWebhookPayloadForTarget format Discord, Slack, and n8n natively', () => {
  assert.equal(detectWebhookPlatform('https://discord.com/api/webhooks/123/abc'), 'discord');
  assert.equal(detectWebhookPlatform('https://hooks.slack.com/services/T00/B00/XXX'), 'slack');
  assert.equal(detectWebhookPlatform('https://hooks.zapier.com/hooks/catch/1/2/'), 'zapier');

  const discordPayload = buildWebhookPayloadForTarget({
    webhookUrl: 'https://discord.com/api/webhooks/123/abc',
    prompt: 'ملخص اليوم',
    reply: 'تم إنجاز 3 مهام',
    generation: 2,
    agentsUsed: ['القائد'],
  });
  assert.equal(discordPayload.username, 'VALDRION Commander');
  assert.ok(typeof discordPayload.content === 'string' && discordPayload.content.includes('ملخص اليوم'));

  const slackPayload = buildWebhookPayloadForTarget({
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
    prompt: 'ملخص اليوم',
    reply: 'تم إنجاز 3 مهام',
    generation: 2,
    agentsUsed: ['القائد'],
  });
  assert.ok(typeof slackPayload.text === 'string' && slackPayload.text.includes('تم إنجاز 3 مهام'));
});
