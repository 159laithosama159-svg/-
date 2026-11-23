// VALDRION Defense-in-Depth Security Shield & Social Platforms Registry
// Pure client-safe cryptographic utilities (Web Crypto PBKDF2-SHA256),
// brute-force lockout policy, sensitive secret leak guard, and OAuth platform metadata.

export type SocialOAuthProviderId =
  | 'github'
  | 'discord'
  | 'x'
  | 'reddit'
  | 'linkedin'
  | 'spotify';

export interface SocialPlatformDescriptor {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'oauth' | 'direct';
  oauthProvider?: SocialOAuthProviderId;
  accentClass: string;
  descriptionAr: string;
  searchCapabilityAr: string;
  profileUrl: string;
  developerPortalUrl?: string;
  envKeys?: [string, string];
}

export const SOCIAL_OAUTH_PLATFORMS: SocialPlatformDescriptor[] = [
  {
    id: 'github',
    nameAr: 'GitHub',
    nameEn: 'GitHub',
    category: 'oauth',
    oauthProvider: 'github',
    accentClass: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
    descriptionAr: 'البحث داخل مستودعاتك ومشاريعك ومشاكلك البرمجية بإذنك',
    searchCapabilityAr: 'بحث المستودعات والملف الشخصي',
    profileUrl: 'https://github.com',
    developerPortalUrl: 'https://github.com/settings/developers',
    envKeys: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  },
  {
    id: 'discord',
    nameAr: 'Discord',
    nameEn: 'Discord',
    category: 'oauth',
    oauthProvider: 'discord',
    accentClass: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200',
    descriptionAr: 'ربط حساب ديسكورد والبحث في سيرفراتك وبيانات ملفك الشخصي',
    searchCapabilityAr: 'بحث السيرفرات والملف الشخصي',
    profileUrl: 'https://discord.com/app',
    developerPortalUrl: 'https://discord.com/developers/applications',
    envKeys: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  },
  {
    id: 'x',
    nameAr: 'X (تويتر)',
    nameEn: 'X',
    category: 'oauth',
    oauthProvider: 'x',
    accentClass: 'border-sky-400/40 bg-sky-500/10 text-sky-200',
    descriptionAr: 'ربط رسمي عبر OAuth 2.0 + PKCE للبحث في تغريداتك وإشاراتك',
    searchCapabilityAr: 'بحث التغريدات والحساب',
    profileUrl: 'https://x.com',
    developerPortalUrl: 'https://developer.x.com/en/portal/dashboard',
    envKeys: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  },
  {
    id: 'reddit',
    nameAr: 'Reddit',
    nameEn: 'Reddit',
    category: 'oauth',
    oauthProvider: 'reddit',
    accentClass: 'border-orange-400/40 bg-orange-500/10 text-orange-200',
    descriptionAr: 'البحث في منشوراتك والمحفوظات والمجتمعات المشترك بها',
    searchCapabilityAr: 'بحث المحفوظات والمنشورات',
    profileUrl: 'https://www.reddit.com',
    developerPortalUrl: 'https://www.reddit.com/prefs/apps',
    envKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
  },
  {
    id: 'linkedin',
    nameAr: 'LinkedIn',
    nameEn: 'LinkedIn',
    category: 'oauth',
    oauthProvider: 'linkedin',
    accentClass: 'border-blue-400/40 bg-blue-500/10 text-blue-200',
    descriptionAr: 'ربط ملفك المهني لكتابة المنشورات والبحث في بيانات حسابك',
    searchCapabilityAr: 'بيانات الملف المهني',
    profileUrl: 'https://www.linkedin.com',
    developerPortalUrl: 'https://www.linkedin.com/developers/apps',
    envKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  },
  {
    id: 'spotify',
    nameAr: 'Spotify',
    nameEn: 'Spotify',
    category: 'oauth',
    oauthProvider: 'spotify',
    accentClass: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    descriptionAr: 'البحث داخل قوائم التشغيل والأغاني المحفوظة في حسابك',
    searchCapabilityAr: 'بحث قوائم التشغيل والموسيقى',
    profileUrl: 'https://open.spotify.com',
    developerPortalUrl: 'https://developer.spotify.com/dashboard',
    envKeys: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  },
];

export const DIRECT_SOCIAL_PLATFORMS: SocialPlatformDescriptor[] = [
  {
    id: 'instagram',
    nameAr: 'إنستغرام',
    nameEn: 'Instagram',
    category: 'direct',
    accentClass: 'border-pink-400/35 bg-pink-500/10 text-pink-200',
    descriptionAr: 'فتح سريع ومشاركة المحتوى',
    searchCapabilityAr: 'وصول مباشر',
    profileUrl: 'https://www.instagram.com',
  },
  {
    id: 'facebook',
    nameAr: 'فيسبوك',
    nameEn: 'Facebook',
    category: 'direct',
    accentClass: 'border-blue-500/35 bg-blue-500/10 text-blue-200',
    descriptionAr: 'فتح سريع ومشاركة المنشورات',
    searchCapabilityAr: 'وصول مباشر',
    profileUrl: 'https://www.facebook.com',
  },
  {
    id: 'tiktok',
    nameAr: 'تيك توك',
    nameEn: 'TikTok',
    category: 'direct',
    accentClass: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200',
    descriptionAr: 'فتح سريع ومقاطع الفيديو',
    searchCapabilityAr: 'وصول مباشر',
    profileUrl: 'https://www.tiktok.com',
  },
  {
    id: 'youtube',
    nameAr: 'يوتيوب',
    nameEn: 'YouTube',
    category: 'direct',
    accentClass: 'border-red-400/35 bg-red-500/10 text-red-200',
    descriptionAr: 'فيديوهات وقنوات ومشاركة',
    searchCapabilityAr: 'وصول مباشر',
    profileUrl: 'https://www.youtube.com',
  },
  {
    id: 'snapchat',
    nameAr: 'سناب شات',
    nameEn: 'Snapchat',
    category: 'direct',
    accentClass: 'border-amber-300/35 bg-amber-400/10 text-amber-200',
    descriptionAr: 'فتح سريع لسناب ويب',
    searchCapabilityAr: 'وصول مباشر',
    profileUrl: 'https://web.snapchat.com',
  },
  {
    id: 'whatsapp',
    nameAr: 'واتساب',
    nameEn: 'WhatsApp',
    category: 'direct',
    accentClass: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
    descriptionAr: 'إرسال الردود والملخصات فوراً',
    searchCapabilityAr: 'إرسال ومشاركة',
    profileUrl: 'https://web.whatsapp.com',
  },
  {
    id: 'telegram',
    nameAr: 'تيليجرام',
    nameEn: 'Telegram',
    category: 'direct',
    accentClass: 'border-sky-400/35 bg-sky-500/10 text-sky-200',
    descriptionAr: 'مشاركة للقنوات والرسائل',
    searchCapabilityAr: 'إرسال ومشاركة',
    profileUrl: 'https://web.telegram.org',
  },
];

// ============================================================================
// PBKDF2-SHA256 Master App Lock (210,000 iterations + random 16-byte salt)
// ============================================================================

export interface AppLockCredential {
  version: 2;
  saltHex: string;
  hashHex: string;
  iterations: number;
  createdAt: number;
}

const PBKDF2_ITERATIONS = 210_000;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) return new Uint8Array(0);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePbkdf2Hex(
  passcode: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('Web Crypto API is unavailable');
  }
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltCopy = new Uint8Array(saltBytes.length);
  saltCopy.set(saltBytes);
  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltCopy,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashAppPasscode(
  passcode: string,
  iterations = PBKDF2_ITERATIONS
): Promise<AppLockCredential> {
  const clean = passcode.trim();
  if (clean.length < 4) {
    throw new Error('يجب أن يتكون رمز القفل من 4 خانات على الأقل.');
  }
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const hashHex = await derivePbkdf2Hex(clean, salt, iterations);
  return {
    version: 2,
    saltHex: bytesToHex(salt),
    hashHex,
    iterations,
    createdAt: Date.now(),
  };
}

export async function verifyAppPasscode(
  passcode: string,
  stored: AppLockCredential | null | undefined
): Promise<boolean> {
  if (!stored || stored.version !== 2 || !stored.saltHex || !stored.hashHex) {
    return false;
  }
  const clean = passcode.trim();
  if (!clean) return false;
  const salt = hexToBytes(stored.saltHex);
  if (salt.length < 8) return false;
  const derived = await derivePbkdf2Hex(
    clean,
    salt,
    Math.max(10_000, stored.iterations || PBKDF2_ITERATIONS)
  );
  return constantTimeEqualHex(derived, stored.hashHex);
}

// ============================================================================
// Brute-Force Exponential Lockout Policy
// ============================================================================

export interface LockoutState {
  failedAttempts: number;
  lockedUntilMs: number;
}

export function evaluateLockoutOnFailure(
  prev: LockoutState,
  nowMs = Date.now()
): { next: LockoutState; waitSeconds: number } {
  const attempts = Math.max(0, prev.failedAttempts) + 1;
  if (attempts < 3) {
    return {
      next: { failedAttempts: attempts, lockedUntilMs: 0 },
      waitSeconds: 0,
    };
  }
  // Progressive exponential delay: 15s -> 30s -> 60s -> 120s -> 300s max
  const exponent = Math.min(4, attempts - 3);
  const waitSeconds = Math.min(300, 15 * Math.pow(2, exponent));
  return {
    next: {
      failedAttempts: attempts,
      lockedUntilMs: nowMs + waitSeconds * 1000,
    },
    waitSeconds,
  };
}

export function getRemainingLockoutSeconds(state: LockoutState, nowMs = Date.now()): number {
  if (!state.lockedUntilMs || state.lockedUntilMs <= nowMs) return 0;
  return Math.ceil((state.lockedUntilMs - nowMs) / 1000);
}

// ============================================================================
// Sensitive Secret & PII Leak Scanner / Redactor (Pre-Send AI Protection)
// ============================================================================

export interface SecretScanFinding {
  kind: string;
  labelAr: string;
  preview: string;
}

export interface SecretScanResult {
  hasSecrets: boolean;
  findings: SecretScanFinding[];
  redactedText: string;
}

const SECRET_RULES: Array<{
  kind: string;
  labelAr: string;
  regex: RegExp;
  replacement: string;
}> = [
  {
    kind: 'openai_or_api_key',
    labelAr: 'مفتاح API خاص (sk-...)',
    regex: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}\b/g,
    replacement: '[مفتاح-API-محجوب]',
  },
  {
    kind: 'google_api_key',
    labelAr: 'مفتاح Google API (AIza...)',
    regex: /\bAIza[0-9A-Za-z_-]{28,}\b/g,
    replacement: '[مفتاح-Google-محجوب]',
  },
  {
    kind: 'github_token',
    labelAr: 'رمز وصول GitHub',
    regex: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g,
    replacement: '[رمز-GitHub-محجوب]',
  },
  {
    kind: 'slack_token',
    labelAr: 'رمز وصول Slack',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,
    replacement: '[رمز-Slack-محجوب]',
  },
  {
    kind: 'jwt_token',
    labelAr: 'رمز جلسة مشفّر (JWT)',
    regex: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{10,}\b/g,
    replacement: '[رمز-جلسة-محجوب]',
  },
  {
    kind: 'private_key_block',
    labelAr: 'مفتاح تشفير خاص (Private Key)',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: '[مفتاح-خاص-محجوب]',
  },
  {
    kind: 'payment_card',
    labelAr: 'رقم بطاقة بنكية',
    regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{3,4}\b/g,
    replacement: '[رقم-بطاقة-محجوب]',
  },
];

export function scanAndRedactSecrets(text: string): SecretScanResult {
  const input = String(text || '');
  if (!input.trim()) {
    return { hasSecrets: false, findings: [], redactedText: input };
  }
  const findings: SecretScanFinding[] = [];
  let redacted = input;

  for (const rule of SECRET_RULES) {
    const matches = input.match(rule.regex);
    if (matches && matches.length > 0) {
      for (const m of matches.slice(0, 3)) {
        const preview = m.length > 10 ? `${m.slice(0, 5)}•••${m.slice(-3)}` : '••••';
        findings.push({
          kind: rule.kind,
          labelAr: rule.labelAr,
          preview,
        });
      }
      redacted = redacted.replace(rule.regex, rule.replacement);
    }
  }

  return {
    hasSecrets: findings.length > 0,
    findings,
    redactedText: redacted,
  };
}

// ============================================================================
// Security Shield Settings & Audit Trail (Stored locally without any secrets!)
// ============================================================================

export type SecurityAuditCategory =
  | 'lock'
  | 'oauth'
  | 'account_search'
  | 'secret_guard'
  | 'wipe';

export interface SecurityAuditEvent {
  id: string;
  ts: number;
  category: SecurityAuditCategory;
  titleAr: string;
  detailAr: string;
  severity: 'info' | 'success' | 'warn';
}

export interface SecurityShieldConfig {
  credential: AppLockCredential | null;
  idleLockMinutes: 0 | 1 | 5 | 15;
  secretLeakGuard: boolean;
  strictExternalConfirm: boolean;
  auditLog: SecurityAuditEvent[];
}

export const SECURITY_SHIELD_STORAGE_KEY = 'valdrion_security_shield_v1';

export function createDefaultSecurityShieldConfig(): SecurityShieldConfig {
  return {
    credential: null,
    idleLockMinutes: 5,
    secretLeakGuard: true,
    strictExternalConfirm: true,
    auditLog: [],
  };
}

export function appendSecurityAuditEvent(
  prev: SecurityAuditEvent[],
  event: Omit<SecurityAuditEvent, 'id' | 'ts'>
): SecurityAuditEvent[] {
  const entry: SecurityAuditEvent = {
    ...event,
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
  };
  return [entry, ...prev].slice(0, 40);
}

export function loadSecurityShieldConfig(): SecurityShieldConfig {
  try {
    const raw = localStorage.getItem(SECURITY_SHIELD_STORAGE_KEY);
    if (!raw) return createDefaultSecurityShieldConfig();
    const parsed = JSON.parse(raw) as Partial<SecurityShieldConfig>;
    return {
      credential:
        parsed.credential && parsed.credential.version === 2 ? parsed.credential : null,
      idleLockMinutes:
        parsed.idleLockMinutes === 0 ||
        parsed.idleLockMinutes === 1 ||
        parsed.idleLockMinutes === 5 ||
        parsed.idleLockMinutes === 15
          ? parsed.idleLockMinutes
          : 5,
      secretLeakGuard: parsed.secretLeakGuard !== false,
      strictExternalConfirm: parsed.strictExternalConfirm !== false,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog.slice(0, 40) : [],
    };
  } catch {
    return createDefaultSecurityShieldConfig();
  }
}

export function saveSecurityShieldConfig(config: SecurityShieldConfig): void {
  try {
    localStorage.setItem(SECURITY_SHIELD_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}
