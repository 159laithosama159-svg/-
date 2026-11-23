import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendSecurityAuditEvent,
  constantTimeEqualHex,
  DIRECT_SOCIAL_PLATFORMS,
  evaluateLockoutOnFailure,
  getRemainingLockoutSeconds,
  hashAppPasscode,
  scanAndRedactSecrets,
  SOCIAL_OAUTH_PLATFORMS,
  verifyAppPasscode,
} from './securityShield';

test('PBKDF2 app passcode hashing uses random salts and verifies accurately', async () => {
  const credA = await hashAppPasscode('246890', 25_000);
  const credB = await hashAppPasscode('246890', 25_000);

  assert.notEqual(credA.saltHex, credB.saltHex);
  assert.notEqual(credA.hashHex, credB.hashHex);
  assert.equal(await verifyAppPasscode('246890', credA), true);
  assert.equal(await verifyAppPasscode('000000', credA), false);
  assert.equal(await verifyAppPasscode('', credA), false);
});

test('constantTimeEqualHex compares equal and different hex strings accurately', () => {
  assert.equal(constantTimeEqualHex('abcd1234', 'abcd1234'), true);
  assert.equal(constantTimeEqualHex('abcd1234', 'abcd1235'), false);
  assert.equal(constantTimeEqualHex('abcd', 'abcde'), false);
  assert.equal(constantTimeEqualHex('', ''), false);
});

test('brute-force exponential lockout escalates after 3 failed attempts', () => {
  const now = 1_000_000;
  const r1 = evaluateLockoutOnFailure({ failedAttempts: 0, lockedUntilMs: 0 }, now);
  assert.equal(r1.waitSeconds, 0);
  assert.equal(r1.next.failedAttempts, 1);

  const r2 = evaluateLockoutOnFailure(r1.next, now);
  assert.equal(r2.waitSeconds, 0);

  const r3 = evaluateLockoutOnFailure(r2.next, now);
  assert.equal(r3.waitSeconds, 15);
  assert.equal(getRemainingLockoutSeconds(r3.next, now + 5000), 10);

  const r4 = evaluateLockoutOnFailure(r3.next, now);
  assert.equal(r4.waitSeconds, 30);
});

test('scanAndRedactSecrets detects and masks API keys, tokens, and cards while keeping normal Arabic text intact', () => {
  const clean = scanAndRedactSecrets('ابحث في حسابي عن مشروع فالدريون والروايات المفضلة');
  assert.equal(clean.hasSecrets, false);
  assert.equal(clean.findings.length, 0);

  const leaky = scanAndRedactSecrets(
    'استخدم هذا المفتاح sk-proj-1234567890abcdefghijklmnop ورمز ghp_1234567890abcdefghijklmno'
  );
  assert.equal(leaky.hasSecrets, true);
  assert.equal(leaky.findings.length, 2);
  assert.equal(leaky.redactedText.includes('sk-proj-'), false);
  assert.equal(leaky.redactedText.includes('ghp_'), false);
  assert.equal(leaky.redactedText.includes('[مفتاح-API-محجوب]'), true);
});

test('security audit log caps history at 40 items and social registries are populated', () => {
  let log: ReturnType<typeof appendSecurityAuditEvent> = [];
  for (let i = 0; i < 50; i++) {
    log = appendSecurityAuditEvent(log, {
      category: 'lock',
      titleAr: `Event ${i}`,
      detailAr: 'ok',
      severity: 'info',
    });
  }
  assert.equal(log.length, 40);
  assert.equal(SOCIAL_OAUTH_PLATFORMS.length, 6);
  assert.equal(DIRECT_SOCIAL_PLATFORMS.length >= 6, true);
});
