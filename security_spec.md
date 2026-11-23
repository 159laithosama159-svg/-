# VALDRION Firestore Security Specification (Phase 0 — Payload-First TDD)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: A `/users/{userId}` document contains private user PII (`email`, `displayName`, `photoURL`) and personal preferences. Only the authenticated, email-verified user whose `request.auth.uid == userId` may `get`, `create`, `update`, or `delete` their own document. Blanket `list` on `/users` is strictly denied (`false`).
2. **Master Gate for Subcollections**: A `/users/{userId}/servers/{serverId}` document cannot be created or modified unless its parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`) and `request.auth.uid == userId`.
3. **Immutable Identity & Temporal Integrity**:
   - `uid` on `UserAccount` and `ownerId`/`id` on `UserServer` are immutable after creation and must strictly equal `request.auth.uid` / `{serverId}`.
   - `createdAt` must equal `request.time` on creation and remain immutable on updates.
   - `updatedAt` must equal `request.time` on every create and update.
4. **No Shadow Fields & Bounded Collections**:
   - Every create checks `hasAll(...) && hasOnly(...)`.
   - Every update uses Action-Based `affectedKeys().hasOnly(...)` combined with `isValid[Entity](incoming())`.
   - Arrays `favorites` (max 200) and `watchQueue` (max 50) are strictly bounded with first-element type validation.
   - All strings have explicit `.size()` ceilings matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid_alice` with `auth = null`.
2. **Cross-User PII Leak**: `GET /users/uid_alice` authenticated as `uid_bob` (`email_verified: true`).
3. **Blanket User Listing**: `LIST /users` authenticated as `uid_alice`.
4. **Unverified Email Write**: `CREATE /users/uid_alice` with `auth.token.email_verified = false`.
5. **Identity Spoofing on Create**: `CREATE /users/uid_alice` as `uid_alice` with `uid: "uid_bob"`.
6. **Shadow / Ghost Field Injection**: `CREATE /users/uid_alice` with extra field `isAdmin: true`.
7. **Client Timestamp Forgery**: `CREATE /users/uid_alice` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
8. **ID Poisoning**: `CREATE /users/uid_alice/servers/../../evil$id` (fails `isValidId`).
9. **Orphaned Server Create (Master Gate Bypass)**: `CREATE /users/uid_ghost/servers/srv_1` when `/users/uid_ghost` does not exist.
10. **Immutable Field Tampering**: `UPDATE /users/uid_alice` attempting to modify `createdAt` or `uid`.
11. **Value Poisoning / Oversized Array**: `UPDATE /users/uid_alice` with `favorites` array containing 201 items or non-string first element (`[123]`).
12. **Cross-User Server Listing**: `LIST /users/uid_alice/servers` authenticated as `uid_bob` or without matching `resource.data.ownerId == request.auth.uid`.
