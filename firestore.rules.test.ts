import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  entities: Record<string, { required?: string[]; properties: Record<string, { maxLength?: number; pattern?: string }> }>;
  firestore: Record<string, { schema: { $ref: string } }>;
};

test('firestore.rules includes default-deny global safety net and rules_version 2', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2'/);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  assert.ok(blueprint.firestore['/users/{userId}']);
  assert.ok(blueprint.firestore['/users/{userId}/servers/{serverId}']);
  assert.ok(blueprint.firestore['/users/{userId}/aiSessions/{sessionId}']);
  assert.match(rulesText, /match \/users\/\{userId\}/);
  assert.match(rulesText, /match \/servers\/\{serverId\}/);
  assert.match(rulesText, /match \/aiSessions\/\{sessionId\}/);
});

test('Dirty Dozen security invariants are explicitly enforced in firestore.rules', () => {
  assert.match(rulesText, /allow get: if isSignedIn\(\) && isValidId\(userId\) && isOwner\(userId\)/);
  assert.match(rulesText, /allow list: if false;/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /isValidUserAccount\(incoming\(\), userId\)/);
  assert.match(rulesText, /isValidUserServer\(incoming\(\), userId, serverId\)/);
  assert.match(rulesText, /isValidUserAiSession\(incoming\(\), userId, sessionId\)/);
  assert.match(rulesText, /data\.keys\(\)\.hasAll\(/);
  assert.match(rulesText, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rulesText, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.match(rulesText, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
  assert.match(rulesText, /isValidStringList\(data\.favorites, 200\)/);
  assert.match(rulesText, /isValidStringList\(data\.watchQueue, 50\)/);
  assert.match(rulesText, /isValidMapList\(data\.messages, 40\)/);
  assert.match(rulesText, /allow list: if isSignedIn\(\) &&\s*isOwner\(userId\) &&\s*resource\.data\.ownerId == request\.auth\.uid;/);
});
