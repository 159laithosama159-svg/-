import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppControlSystemPrompt,
  detectFullAppCommands,
  parseEmbeddedAppCommands,
} from '../agents/appControlEngine';

test('detectFullAppCommands detects Cinema playback, search, tabs, modals, TV mode, family guard, and profiles', () => {
  const playCmds = detectFullAppCommands('شغّل لي فيلم سينتل');
  assert.ok(playCmds.some((c) => c.type === 'cinema_play' && c.query.includes('سينتل')));

  const searchCmds = detectFullAppCommands('ابحث في السينما عن بين النجوم');
  assert.ok(searchCmds.some((c) => c.type === 'cinema_search' && c.query.includes('بين النجوم')));

  const sysCmds = detectFullAppCommands(
    'افتح السيرفرات وفعّل وضع التلفاز وحوّل إلى ملف الأطفال وفعّل الحماية العائلية'
  );
  assert.ok(sysCmds.some((c) => c.type === 'cinema_open_servers'));
  assert.ok(sysCmds.some((c) => c.type === 'cinema_tv_mode' && c.enabled === true));
  assert.ok(sysCmds.some((c) => c.type === 'cinema_profile' && c.profileId === 'kids'));
  assert.ok(sysCmds.some((c) => c.type === 'cinema_family_guard' && c.enabled === true));
});

test('detectFullAppCommands extracts pasted Xtream server credentials locally when user asks to add them to Cinema', () => {
  const cmds = detectFullAppCommands(
    'أضف هذا السيرفر للسينما:\n#باقة_تجريبية\nhttp://demo.example.com:8080/get.php?username=user1&password=pass1&type=m3u_plus'
  );
  const imp = cmds.find((c) => c.type === 'cinema_import_servers');
  assert.ok(imp && imp.type === 'cinema_import_servers');
  assert.equal(imp.credentials.length, 1);
  assert.equal(imp.credentials[0].host, 'http://demo.example.com:8080');
});

test('detectFullAppCommands detects Novels deep tabs, Private Vault, internal tools, and AI self-control', () => {
  const manhwa = detectFullAppCommands('افتح استوديو المانهوا');
  assert.ok(manhwa.some((c) => c.type === 'novels_tab' && c.tab === 'manhwa'));

  const vault = detectFullAppCommands('ادخل الخزنة الخاصة');
  assert.ok(vault.some((c) => c.type === 'switch_app' && c.app === 'private-ai'));

  const tools = detectFullAppCommands('افتح جودوت وافتح التطبيقات المربوطة وفعّل بحث الويب');
  assert.ok(tools.some((c) => c.type === 'open_tool' && c.tool === 'godot'));
  assert.ok(tools.some((c) => c.type === 'open_tool' && c.tool === 'apps'));
  assert.ok(tools.some((c) => c.type === 'ai_web_search' && c.enabled === true));
});

test('parseEmbeddedAppCommands parses [[APP_CMD:...]] directives and strips them cleanly from visible markdown', () => {
  const aiOutput = `تم تجهيز طلبك وسأفتح لك استوديو المانهوا وأفعّل بحث الويب الآن.\n[[APP_CMD:novels_tab|manhwa]]\n[[APP_CMD:ai_web_search|on]]`;
  const { cleanMarkdown, commands } = parseEmbeddedAppCommands(aiOutput);

  assert.equal(cleanMarkdown.includes('[[APP_CMD'), false);
  assert.ok(cleanMarkdown.includes('تم تجهيز طلبك'));
  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0], {
    type: 'novels_tab',
    tab: 'manhwa',
    labelAr: 'فتح قسم الروايات (manhwa)',
  });
  assert.deepEqual(commands[1], {
    type: 'ai_web_search',
    enabled: true,
    labelAr: 'تفعيل بحث الويب',
  });
  assert.ok(buildAppControlSystemPrompt().includes('[[APP_CMD:cinema_play'));
});

test('detectFullAppCommands supports autonomous novel create/download, server export, Security Shield, and Social/WhatsApp hub', () => {
  const novelCmds = detectFullAppCommands('اعمل رواية بعنوان عرش الظلال ونزّل الرواية');
  assert.ok(novelCmds.some((c) => c.type === 'novel_create' && c.title.includes('عرش الظلال')));
  assert.ok(novelCmds.some((c) => c.type === 'novel_download' || c.type === 'novel_web_download'));

  const secCmds = detectFullAppCommands('افتح درع الأمان وصدّر السيرفرات');
  assert.ok(secCmds.some((c) => c.type === 'security_open_shield'));
  assert.ok(secCmds.some((c) => c.type === 'cinema_export_servers'));

  const lockCmds = detectFullAppCommands('اقفل التطبيق فوراً');
  assert.ok(lockCmds.some((c) => c.type === 'security_lock_now'));

  const socialCmds = detectFullAppCommands('افتح مجموعات واتساب ومواقع التواصل الاجتماعي');
  assert.ok(socialCmds.some((c) => c.type === 'social_open_hub'));

  const embedded = parseEmbeddedAppCommands('تم التأليف!\n[[APP_CMD:novel_create|سيف الفجر::فانتازيا]]\n[[APP_CMD:security_open_shield]]');
  assert.equal(embedded.commands.length, 2);
  assert.equal(embedded.commands[0].type, 'novel_create');
  assert.equal(embedded.commands[1].type, 'security_open_shield');
});

