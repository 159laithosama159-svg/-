export interface ExtractedArtifact {
  id: string;
  language: string;
  kind: 'html' | 'svg' | 'code';
  code: string;
  title: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface WebsitePreview {
  url: string;
  hostname: string;
  title: string;
  description: string;
  image?: string;
}

/**
 * Validates that a user-provided URL is a safe public http(s) URL
 * (blocks localhost, private LAN subnets, link-local metadata IPs, and non-http protocols).
 */
export function validatePublicWebsiteUrl(raw: string): {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
} {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { valid: false, normalizedUrl: '', error: 'يرجى إدخال رابط الموقع أولاً.' };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, normalizedUrl: '', error: 'صيغة الرابط غير صالحة.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, normalizedUrl: '', error: 'يُسمح فقط بروابط http و https.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return {
      valid: false,
      normalizedUrl: '',
      error: 'لا يُسمح بفحص الروابط الداخلية أو عناوين الشبكة الخاصة.',
    };
  }

  if (!host.includes('.')) {
    return { valid: false, normalizedUrl: '', error: 'يرجى إدخال نطاق موقع صالح (مثل example.com).' };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

/**
 * Extracts first public http(s) URL found in a free-form message.
 */
export function extractFirstUrlFromText(text: string): string | null {
  const match = (text || '').match(/https?:\/\/[^\s<>"'،؛)]+/i);
  if (!match) return null;
  const cleaned = match[0].replace(/[.,;!?،؛)]+$/, '');
  const check = validatePublicWebsiteUrl(cleaned);
  return check.valid ? check.normalizedUrl : null;
}

/**
 * Extracts fenced code/HTML/SVG artifacts from an AI Markdown response so the UI
 * can display interactive sandboxed previews, copy buttons, and file downloads.
 */
export function extractArtifactsFromMarkdown(text: string): ExtractedArtifact[] {
  if (!text) return [];
  const artifacts: ExtractedArtifact[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    const rawLang = (match[1] || 'text').trim().toLowerCase();
    const code = (match[2] || '').trim();
    if (!code) continue;

    let kind: ExtractedArtifact['kind'] = 'code';
    let title = `مقطع كود (${rawLang.toUpperCase()})`;

    if (
      rawLang === 'svg' ||
      (rawLang === 'xml' && code.startsWith('<svg')) ||
      code.startsWith('<svg')
    ) {
      kind = 'svg';
      title = 'تصميم SVG قابل للمعاينة والتحميل';
    } else if (
      rawLang === 'html' ||
      rawLang === 'htm' ||
      code.toLowerCase().includes('<!doctype html') ||
      code.toLowerCase().includes('<html')
    ) {
      kind = 'html';
      title = 'معاينة تفاعلية حيّة (HTML)';
    }

    artifacts.push({
      id: `art_${idx}_${rawLang || 'txt'}`,
      language: rawLang || 'text',
      kind,
      code,
      title,
    });
    idx += 1;
  }

  return artifacts;
}

/**
 * Strips raw HTML tags cleanly and normalizes whitespace for website text excerpts.
 */
export function extractPlainTextFromHtml(html: string, maxChars = 3200): string {
  if (!html) return '';
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  const stripped = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, maxChars);
}
