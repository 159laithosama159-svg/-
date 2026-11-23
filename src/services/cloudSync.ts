import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type {
  AiStudioMessage,
  AiStudioMode,
  AiStudioSession,
  ProfileId,
  ServerProfile,
} from '../types/cinema';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_PROFILES: ReadonlySet<ProfileId> = new Set(['imperial', 'family', 'kids']);
const VALID_AI_MODES: ReadonlySet<AiStudioMode> = new Set([
  'general',
  'godot',
  'canva',
  'video',
  'deconstruct',
  'research',
  'url',
  'poster',
  'create',
  'audio',
  'media',
  'cinema',
]);

function sanitizeId(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  if (!cleaned || !VALID_ID_REGEX.test(cleaned)) return fallback;
  return cleaned;
}

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen);
}

function sanitizeStringList(list: string[], maxItems: number): string[] {
  return list
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.slice(0, 128))
    .slice(0, maxItems);
}

export interface CloudUserAccount {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  familyGuard: boolean;
  activeProfileId: ProfileId;
  activeServerId: string;
  favorites: string[];
  watchQueue: string[];
}

export async function ensureUserAccountDoc(
  user: User,
  localDefaults: {
    familyGuard: boolean;
    activeProfileId: ProfileId;
    activeServerId: string;
    favorites: string[];
    watchQueue: string[];
  }
): Promise<void> {
  const uid = sanitizeId(user.uid, user.uid);
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    const safeProfile: ProfileId = VALID_PROFILES.has(localDefaults.activeProfileId)
      ? localDefaults.activeProfileId
      : 'family';
    const safeActiveServerId = sanitizeId(
      localDefaults.activeServerId,
      'valdrion_showcase'
    );

    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        displayName: clampString(user.displayName || 'مستخدم فالدريون', 120),
        email: clampString(user.email || '', 200),
        photoURL: clampString(user.photoURL || '', 500),
        familyGuard: Boolean(localDefaults.familyGuard),
        activeProfileId: safeProfile,
        activeServerId: safeActiveServerId,
        favorites: sanitizeStringList(localDefaults.favorites, 200),
        watchQueue: sanitizeStringList(localDefaults.watchQueue, 50),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: clampString(user.displayName || 'مستخدم فالدريون', 120),
        email: clampString(user.email || '', 200),
        photoURL: clampString(user.photoURL || '', 500),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserAccountFields(
  uid: string,
  patch: Partial<{
    familyGuard: boolean;
    activeProfileId: ProfileId;
    activeServerId: string;
    favorites: string[];
    watchQueue: string[];
  }>
): Promise<void> {
  const safeUid = sanitizeId(uid, uid);
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof patch.familyGuard === 'boolean') {
    payload.familyGuard = patch.familyGuard;
  }
  if (patch.activeProfileId && VALID_PROFILES.has(patch.activeProfileId)) {
    payload.activeProfileId = patch.activeProfileId;
  }
  if (typeof patch.activeServerId === 'string') {
    payload.activeServerId = sanitizeId(patch.activeServerId, 'valdrion_showcase');
  }
  if (Array.isArray(patch.favorites)) {
    payload.favorites = sanitizeStringList(patch.favorites, 200);
  }
  if (Array.isArray(patch.watchQueue)) {
    payload.watchQueue = sanitizeStringList(patch.watchQueue, 50);
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserAccount(
  uid: string,
  onData: (account: CloudUserAccount) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, uid);
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        uid: String(d.uid || safeUid),
        displayName: clampString(d.displayName, 120),
        email: clampString(d.email, 200),
        photoURL: clampString(d.photoURL, 500),
        familyGuard: typeof d.familyGuard === 'boolean' ? d.familyGuard : true,
        activeProfileId: VALID_PROFILES.has(d.activeProfileId)
          ? (d.activeProfileId as ProfileId)
          : 'family',
        activeServerId: sanitizeId(String(d.activeServerId || ''), 'valdrion_showcase'),
        favorites: Array.isArray(d.favorites)
          ? sanitizeStringList(d.favorites as string[], 200)
          : [],
        watchQueue: Array.isArray(d.watchQueue)
          ? sanitizeStringList(d.watchQueue as string[], 50)
          : [],
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserServers(
  uid: string,
  onData: (servers: ServerProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, uid);
  const path = `users/${safeUid}/servers`;
  const q = query(
    collection(db, 'users', safeUid, 'servers'),
    where('ownerId', '==', safeUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ServerProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const type = d.type === 'm3u' ? 'm3u' : 'xtream';
        list.push({
          id: String(d.id || docSnap.id),
          name: clampString(d.name || 'سيرفر محفوظ', 120),
          type,
          host: clampString(d.host || '', 500),
          username: clampString(d.username || '', 120) || undefined,
          password: clampString(d.password || '', 120) || undefined,
          m3uContent: clampString(d.m3uContent || '', 50000) || undefined,
          useProxy: Boolean(d.useProxy),
          addedAt: typeof d.addedAt === 'number' ? d.addedAt : Date.now(),
        });
      });
      list.sort((a, b) => b.addedAt - a.addedAt);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveUserServerToCloud(
  uid: string,
  server: ServerProfile
): Promise<void> {
  if (server.type === 'showcase') return;
  const safeUid = sanitizeId(uid, uid);
  const safeServerId = sanitizeId(server.id, `srv_${Date.now()}`);
  const path = `users/${safeUid}/servers/${safeServerId}`;
  const ref = doc(db, 'users', safeUid, 'servers', safeServerId);

  try {
    await setDoc(ref, {
      id: safeServerId,
      ownerId: safeUid,
      name: clampString(server.name.trim() || 'سيرفر مخصص', 120),
      type: server.type === 'm3u' ? 'm3u' : 'xtream',
      host: clampString(server.host.trim() || 'local://m3u-playlist', 500),
      username: clampString(server.username || '', 120),
      password: clampString(server.password || '', 120),
      m3uContent: clampString(server.m3uContent || '', 50000),
      useProxy: Boolean(server.useProxy),
      addedAt: typeof server.addedAt === 'number' ? server.addedAt : Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserServerFromCloud(
  uid: string,
  serverId: string
): Promise<void> {
  const safeUid = sanitizeId(uid, uid);
  const safeServerId = sanitizeId(serverId, serverId);
  const path = `users/${safeUid}/servers/${safeServerId}`;
  const ref = doc(db, 'users', safeUid, 'servers', safeServerId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- AI Studio Cloud Sync (/users/{userId}/aiSessions/{sessionId}) ---

function sanitizeAiMessagesForCloud(messages: AiStudioMessage[]): Array<Record<string, unknown>> {
  return messages
    .filter((m) => !m.streaming && !m.error)
    .slice(-30)
    .map((m) => ({
      id: clampString(m.id || `m_${Date.now()}`, 64),
      role: m.role === 'assistant' ? 'assistant' : 'user',
      mode: VALID_AI_MODES.has(m.mode) ? m.mode : 'general',
      text: clampString(m.text || '', 12000),
      ts: typeof m.ts === 'number' ? m.ts : Date.now(),
      ...(m.urlInspected ? { urlInspected: clampString(m.urlInspected, 400) } : {}),
      ...(m.sources && m.sources.length > 0
        ? {
            sources: m.sources.slice(0, 6).map((s) => ({
              title: clampString(s.title, 180),
              uri: clampString(s.uri, 400),
            })),
          }
        : {}),
    }));
}

export function subscribeUserAiSessions(
  uid: string,
  onData: (sessions: AiStudioSession[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, uid);
  const path = `users/${safeUid}/aiSessions`;
  const q = query(
    collection(db, 'users', safeUid, 'aiSessions'),
    where('ownerId', '==', safeUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AiStudioSession[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const rawMsgs = Array.isArray(d.messages) ? (d.messages as Array<Record<string, unknown>>) : [];
        const messages: AiStudioMessage[] = rawMsgs.slice(-30).map((m, idx) => ({
          id: clampString(m.id || `cm_${idx}`, 64),
          role: m.role === 'assistant' ? 'assistant' : 'user',
          mode: VALID_AI_MODES.has(m.mode as AiStudioMode)
            ? (m.mode as AiStudioMode)
            : 'general',
          text: clampString(m.text || '', 12000),
          urlInspected: typeof m.urlInspected === 'string' ? m.urlInspected : undefined,
          sources: Array.isArray(m.sources)
            ? (m.sources as Array<{ title?: string; uri?: string }>)
                .filter((s) => typeof s?.uri === 'string')
                .map((s) => ({
                  title: clampString(s.title || s.uri, 180),
                  uri: clampString(s.uri, 400),
                }))
            : undefined,
          ts: typeof m.ts === 'number' ? m.ts : Date.now(),
        }));
        list.push({
          id: String(d.id || docSnap.id),
          title: clampString(d.title || 'محادثة سحابية', 120),
          updatedAt: typeof d.updatedAtMs === 'number' ? d.updatedAtMs : Date.now(),
          messages,
        });
      });
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveAiSessionToCloud(
  uid: string,
  session: AiStudioSession
): Promise<void> {
  if (!session.messages.length) return;
  const safeUid = sanitizeId(uid, uid);
  const safeSessionId = sanitizeId(session.id, `sess_${Date.now()}`);
  const path = `users/${safeUid}/aiSessions/${safeSessionId}`;
  const ref = doc(db, 'users', safeUid, 'aiSessions', safeSessionId);

  const safeTitle = clampString(session.title.trim() || 'محادثة فالدريون AI', 120);
  const safeMessages = sanitizeAiMessagesForCloud(session.messages);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        id: safeSessionId,
        ownerId: safeUid,
        title: safeTitle,
        updatedAtMs: session.updatedAt || Date.now(),
        messages: safeMessages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: safeTitle,
        updatedAtMs: session.updatedAt || Date.now(),
        messages: safeMessages,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAiSessionFromCloud(
  uid: string,
  sessionId: string
): Promise<void> {
  const safeUid = sanitizeId(uid, uid);
  const safeSessionId = sanitizeId(sessionId, sessionId);
  const path = `users/${safeUid}/aiSessions/${safeSessionId}`;
  const ref = doc(db, 'users', safeUid, 'aiSessions', safeSessionId);

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
