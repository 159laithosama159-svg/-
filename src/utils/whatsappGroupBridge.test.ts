import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizedWhatsAppGroup,
  parseWhatsAppExportText,
  searchAuthorizedWhatsAppGroups,
} from './whatsappGroupBridge';

test('parseWhatsAppExportText parses Arabic & English WhatsApp exports with multiline messages', () => {
  const sample = `
16/02/2026, 21:15 - أبو آدم: سيرفر جديد جاهز
http://example-iptv.net:80
username=user12345
password=pass67890
[16/02/2026, 21:18:00] ليث: يعطيك العافية ممتاز جداً!
`;
  const msgs = parseWhatsAppExportText(sample);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].sender, 'أبو آدم');
  assert.equal(msgs[0].text.includes('username=user12345'), true);
  assert.equal(msgs[1].sender, 'ليث');
});

test('buildAuthorizedWhatsAppGroup extracts Xtream servers automatically and respects allowed flag on search', () => {
  const sample = `
16/02/2026, 21:15 - أبو آدم: #دانا
http://demo-panel.net:80
username=demo_user_1
password=demo_pass_1
`;
  const grpAllowed = buildAuthorizedWhatsAppGroup('مجموعة السيرفرات', sample);
  assert.equal(grpAllowed.extractedServers.length, 1);
  assert.equal(grpAllowed.allowed, true);

  const grpBlocked = {
    ...buildAuthorizedWhatsAppGroup('مجموعة خاصة محظورة', '16/02/2026, 22:00 - سارة: سر عائلي مهم'),
    allowed: false,
  };

  const hits = searchAuthorizedWhatsAppGroups([grpAllowed, grpBlocked], 'سر عائلي');
  assert.equal(hits.length, 0);

  const allowedHits = searchAuthorizedWhatsAppGroups([grpAllowed, grpBlocked], 'دانا');
  assert.equal(allowedHits.length, 1);
  assert.equal(allowedHits[0].groupName, 'مجموعة السيرفرات');
});
