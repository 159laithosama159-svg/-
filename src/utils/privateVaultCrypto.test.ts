import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptVaultPayload,
  encryptVaultPayload,
  isEncryptedVaultEnvelope,
} from './privateVaultCrypto';

test('encryptVaultPayload + decryptVaultPayload round-trip Arabic & nested vault data', async () => {
  const sample = {
    modelName: 'عقل ليث السري',
    rules: ['أجب باختصار شديد', 'لا تحفظ أي شيء في السحابة'],
    messages: [{ role: 'user', text: 'هذه محادثة سرية جداً 12345 🔐' }],
  };

  // Use 20,000 iterations in unit test for fast execution while verifying full PBKDF2 + AES-GCM path
  const envelope = await encryptVaultPayload(sample, 'my-secret-pin-99', 20_000);
  assert.equal(isEncryptedVaultEnvelope(envelope), true);

  // Zero plaintext leakage check
  const serialized = JSON.stringify(envelope);
  assert.equal(serialized.includes('عقل ليث'), false);
  assert.equal(serialized.includes('محادثة سرية'), false);
  assert.equal(serialized.includes('my-secret-pin-99'), false);

  const decrypted = await decryptVaultPayload<typeof sample>(envelope, 'my-secret-pin-99');
  assert.deepEqual(decrypted, sample);
});

test('decryptVaultPayload rejects wrong passphrase', async () => {
  const envelope = await encryptVaultPayload({ secret: 'top-secret' }, 'correct-pass', 20_000);
  await assert.rejects(
    async () => decryptVaultPayload(envelope, 'wrong-pass'),
    /كلمة السر غير صحيحة/
  );
});

test('encryptVaultPayload uses fresh random salt & IV every time (semantic security)', async () => {
  const payload = { note: 'identical plaintext' };
  const e1 = await encryptVaultPayload(payload, 'pass1234', 20_000);
  const e2 = await encryptVaultPayload(payload, 'pass1234', 20_000);

  assert.notEqual(e1.salt, e2.salt);
  assert.notEqual(e1.iv, e2.iv);
  assert.notEqual(e1.ct, e2.ct);
});

test('encryptVaultPayload rejects overly short passphrase', async () => {
  await assert.rejects(
    async () => encryptVaultPayload({ ok: true }, '123', 20_000),
    /4 أحرف/
  );
});
