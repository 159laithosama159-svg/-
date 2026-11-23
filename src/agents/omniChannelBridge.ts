import { normalizeArabicText } from '../utils/sovereignAiEngine';

export type CrossAppActionTarget =
  | 'cinema'
  | 'novels'
  | 'private-ai'
  | 'godot'
  | 'voice'
  | 'connectors'
  | 'brain'
  | 'deconstruct'
  | 'agents';

export type WebhookPlatformId =
  | 'discord'
  | 'slack'
  | 'zapier'
  | 'make'
  | 'n8n'
  | 'home_assistant'
  | 'custom';

export interface ConnectedWebhookApp {
  id: string;
  name: string;
  platform: WebhookPlatformId;
  url: string;
  enabled: boolean;
}

export interface CrossAppAction {
  type: 'navigate' | 'cinema_search' | 'speak_reply';
  target?: CrossAppActionTarget;
  query?: string;
  labelAr: string;
}

export interface OmniChannelConfig {
  autoSpeak: boolean;
  webhookUrl: string;
  autoSendWebhook: boolean;
  allowCrossAppControl: boolean;
  connectedWebhooks: ConnectedWebhookApp[];
}

export interface OmniShareLinks {
  mailtoUrl: string;
  gmailUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
  googleCalendarUrl: string;
  googleMapsUrl: string;
  youtubeUrl: string;
  spotifyUrl: string;
  githubUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
}

export interface InternalAppEntry {
  target: CrossAppActionTarget;
  nameAr: string;
  summaryAr: string;
}

export const INTERNAL_CONNECTED_APPS: InternalAppEntry[] = [
  { target: 'cinema', nameAr: 'فالدريون · السينما والبث', summaryAr: 'أفلام، مسلسلات، قنوات وبث مباشر' },
  { target: 'novels', nameAr: 'فالدريون · الروايات والمانهوا', summaryAr: 'قراءة وتأليف الروايات والمانهوا' },
  { target: 'private-ai', nameAr: 'فالدريون · الخزنة الخاصة', summaryAr: 'مساحة مشفّرة مستقلة بالكامل' },
  { target: 'godot', nameAr: 'محرك ألعاب Godot 4', summaryAr: 'ربط حي عبر WebSocket لبناء الألعاب' },
  { target: 'voice', nameAr: 'التواصل الصوتي الحي', summaryAr: 'محادثة صوتية فورية بالمايكروفون' },
  { target: 'connectors', nameAr: 'موصّلات الإنترنت الحي', summaryAr: 'GitHub · Wikipedia · ArXiv · الطقس · العملات' },
  { target: 'brain', nameAr: 'العقل والذاكرة الشخصية', summaryAr: 'إدارة ملفك وحقائقك وذاكرتك الدائمة' },
  { target: 'deconstruct', nameAr: 'مختبر تفكيك المشاريع', summaryAr: 'تحليل الملفات والأكواد بعمق' },
  { target: 'agents', nameAr: 'دليل الوكلاء والمستشار', summaryAr: 'استعراض جميع الوكلاء المتخصصين' },
];

const OMNI_CHANNEL_STORAGE_KEY = 'valdrion_omni_channel_v1';

export function createDefaultOmniChannelConfig(): OmniChannelConfig {
  return {
    autoSpeak: false,
    webhookUrl: '',
    autoSendWebhook: false,
    allowCrossAppControl: true,
    connectedWebhooks: [],
  };
}

export function loadOmniChannelConfig(): OmniChannelConfig {
  try {
    if (typeof window === 'undefined') return createDefaultOmniChannelConfig();
    const raw = window.localStorage.getItem(OMNI_CHANNEL_STORAGE_KEY);
    if (!raw) return createDefaultOmniChannelConfig();
    const parsed = JSON.parse(raw) as Partial<OmniChannelConfig>;
    const connectedWebhooks: ConnectedWebhookApp[] = Array.isArray(parsed.connectedWebhooks)
      ? parsed.connectedWebhooks
          .filter(
            (w): w is ConnectedWebhookApp =>
              Boolean(w) && typeof w.id === 'string' && typeof w.url === 'string' && w.url.trim().length > 0
          )
          .slice(0, 12)
      : [];
    return {
      autoSpeak: Boolean(parsed.autoSpeak),
      webhookUrl: typeof parsed.webhookUrl === 'string' ? parsed.webhookUrl.trim().slice(0, 300) : '',
      autoSendWebhook: Boolean(parsed.autoSendWebhook),
      allowCrossAppControl: parsed.allowCrossAppControl !== false,
      connectedWebhooks,
    };
  } catch {
    return createDefaultOmniChannelConfig();
  }
}

export function saveOmniChannelConfig(config: OmniChannelConfig): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OMNI_CHANNEL_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota issues
  }
}

/**
 * Validates user-supplied webhook URL (allows https:// or local 127.0.0.1/localhost http:// only).
 */
export function validateWebhookUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: true, normalized: '' };
  try {
    const u = new URL(trimmed);
    const isLocal = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    if (u.protocol === 'https:') {
      return { valid: true, normalized: u.toString() };
    }
    if (u.protocol === 'http:' && isLocal) {
      return { valid: true, normalized: u.toString() };
    }
    return {
      valid: false,
      error: 'يجب أن يبدأ رابط Webhook بـ https:// أو http://127.0.0.1 فقط.',
    };
  } catch {
    return { valid: false, error: 'صيغة رابط Webhook غير صحيحة.' };
  }
}

/**
 * Detects real cross-app control commands requested by the user so the Commander can
 * act across ALL internal apps in the platform (Cinema, Novels, Private Vault, Godot 4,
 * Video Studio, Live Voice, Internet Connectors, Brain Memory, Deconstructor, Agents).
 */
export function detectCrossAppActions(prompt: string): CrossAppAction[] {
  const norm = normalizeArabicText(prompt);
  const actions: CrossAppAction[] = [];

  if (/(افتح|شغل|روح|انتقل|ادخل).*(روايات|سطور|novels)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'novels', labelAr: 'فتح تطبيق سُطور للروايات' });
  }
  if (/(افتح|شغل|روح|انتقل|ادخل).*(سينما|افلام|مسلسلات|المشاهده|cinema)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'cinema', labelAr: 'فتح تطبيق المشاهدة والسينما' });
  }
  if (/(افتح|شغل|روح|انتقل|ادخل).*(خزنه|خزنتي|سري|ذكائي الخاص|vault)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'private-ai', labelAr: 'فتح خزنة ذكائي الخاص السري' });
  }
  if (/(افتح|شغل|ادخل).*(جودوت|godot|محرك الالعاب)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'godot', labelAr: 'فتح محرك ألعاب Godot 4' });
  }
  if (/(افتح|شغل|ابد[اأ]).*(صوت|تحدث حي|مكالمه|محادثه صوتيه|live voice)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'voice', labelAr: 'فتح التواصل الصوتي الحي' });
  }
  if (/(افتح|شغل|ادخل).*(موصلات|بوابه الويب|الطقس|العملات|جيت هاب|github|connectors)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'connectors', labelAr: 'فتح موصّلات الإنترنت الحي' });
  }
  if (/(افتح|شغل|ادخل).*(الذاكره|العقل|ملفي الشخصي|brain)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'brain', labelAr: 'فتح العقل والذاكرة الشخصية' });
  }
  if (/(افتح|شغل|ادخل).*(مختبر|تفكيك|فحص المشروع|deconstruct)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'deconstruct', labelAr: 'فتح مختبر تفكيك المشاريع' });
  }
  if (/(افتح|شغل|اعرض).*(دليل الوكلاء|الوكلاء المتخصصين|agents)/i.test(norm)) {
    actions.push({ type: 'navigate', target: 'agents', labelAr: 'فتح دليل الوكلاء المتخصصين' });
  }
  if (/(اقرا الرد|انطق|بصوت عال|تحدث بالرد|speak)/i.test(norm)) {
    actions.push({ type: 'speak_reply', labelAr: 'قراءة الإجابة صوتياً' });
  }

  return actions;
}

/**
 * Extracts a safe public HTTP/HTTPS URL from user text for live inspection by Seeker Agent.
 */
export function extractPublicUrlFromPrompt(prompt: string): string | null {
  const match = prompt.match(/https?:\/\/[^\s<>"'،؛)]+/i);
  if (!match) return null;
  try {
    const u = new URL(match[0]);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Builds direct external communication & productivity app links for 1-click dispatch:
 * WhatsApp, Telegram, Gmail, Email (mailto), Google Calendar, Google Maps, YouTube,
 * Spotify, GitHub, X (Twitter), and LinkedIn.
 */
export function buildOmniShareLinks(title: string, content: string): OmniShareLinks {
  const cleanTitle = (title || 'تقرير القائد الشامل').replace(/\s+/g, ' ').trim().slice(0, 100);
  const plain = content
    .replace(/```[\s\S]*?```/g, '[مرفق كود]')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  const subject = encodeURIComponent(cleanTitle);
  const body = encodeURIComponent(`${cleanTitle}\n\n${plain}`);
  const shortQuery = encodeURIComponent(cleanTitle.slice(0, 80));
  const tweetBody = encodeURIComponent(`${cleanTitle}\n${plain.slice(0, 210)}`);

  return {
    mailtoUrl: `mailto:?subject=${subject}&body=${body}`,
    gmailUrl: `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
    whatsappUrl: `https://wa.me/?text=${body}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent('https://valdrion.app')}&text=${body}`,
    googleCalendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${body}`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${shortQuery}`,
    youtubeUrl: `https://www.youtube.com/results?search_query=${shortQuery}`,
    spotifyUrl: `https://open.spotify.com/search/${shortQuery}`,
    githubUrl: `https://github.com/search?q=${shortQuery}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${tweetBody}`,
    linkedinUrl: `https://www.linkedin.com/feed/?shareActive=true&mini=true&text=${body}`,
  };
}

/**
 * Detects target webhook platform (Discord, Slack, Zapier, Make, n8n, Home Assistant, Generic)
 * and formats the JSON payload natively so Discord/Slack render messages immediately without glue code.
 */
export function detectWebhookPlatform(webhookUrl: string): WebhookPlatformId {
  const lower = webhookUrl.toLowerCase();
  if (lower.includes('discord.com/api/webhooks') || lower.includes('discordapp.com/api/webhooks')) {
    return 'discord';
  }
  if (lower.includes('hooks.slack.com')) return 'slack';
  if (lower.includes('hooks.zapier.com')) return 'zapier';
  if (lower.includes('hook.') && (lower.includes('make.com') || lower.includes('integromat.com'))) {
    return 'make';
  }
  if (lower.includes('n8n') || lower.includes('/webhook/')) return 'n8n';
  if (lower.includes('home-assistant') || lower.includes(':8123/api/webhook')) {
    return 'home_assistant';
  }
  return 'custom';
}

export function buildWebhookPayloadForTarget(params: {
  webhookUrl: string;
  prompt: string;
  reply: string;
  generation: number;
  agentsUsed: string[];
}): Record<string, unknown> {
  const platform = detectWebhookPlatform(params.webhookUrl);
  const summaryHeader = `**القائد الشامل (الجيل ${params.generation})**\n**الطلب:** ${params.prompt.slice(0, 240)}`;
  const cleanReply = params.reply.slice(0, 1700);

  if (platform === 'discord') {
    return {
      username: 'VALDRION Commander',
      content: `${summaryHeader}\n\n${cleanReply}`.slice(0, 1980),
    };
  }
  if (platform === 'slack') {
    return {
      text: `*القائد الشامل (الجيل ${params.generation})*\n*الطلب:* ${params.prompt.slice(0, 240)}\n\n${cleanReply}`,
    };
  }
  return {
    source: 'VALDRION_OMNI_COMMANDER',
    platform,
    generation: params.generation,
    timestamp: new Date().toISOString(),
    prompt: params.prompt,
    reply: params.reply.slice(0, 8000),
    agentsUsed: params.agentsUsed,
  };
}

/**
 * Downloads a clean Markdown file (.md) ready for Notion, Obsidian, GitHub, or Apple Notes.
 */
export function downloadMarkdownForApp(title: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const safeName = (title || 'commander-note')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'commander-note';
  const md = `# ${title || 'ملاحظة القائد الشامل'}\n\n${content}\n`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Dispatches a structured mission event JSON payload to the user's configured Webhook
 * (Discord / Slack / Zapier / Make / n8n / Home Assistant / custom backend).
 * Uses server-side relay (/api/ai/omni-webhook) for public HTTPS URLs so browser CORS never blocks Discord/Slack/Zapier!
 */
export async function dispatchToUserWebhook(params: {
  webhookUrl: string;
  prompt: string;
  reply: string;
  generation: number;
  agentsUsed: string[];
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  const check = validateWebhookUrl(params.webhookUrl);
  if (!check.valid || !check.normalized) {
    return { ok: false, error: check.error || 'لم يتم ضبط رابط Webhook بعد.' };
  }

  const parsedUrl = new URL(check.normalized);
  const isLoopback = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost';
  const payload = buildWebhookPayloadForTarget({
    ...params,
    webhookUrl: check.normalized,
  });

  // In browser, route public HTTPS webhooks through our backend relay to eliminate CORS errors on Discord/Slack/Zapier/Make
  if (!isLoopback && typeof window !== 'undefined') {
    try {
      const relayRes = await fetch('/api/ai/omni-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: check.normalized,
          payload,
        }),
      });
      const data = (await relayRes.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: number;
        error?: string;
      };
      if (!relayRes.ok || data.ok === false) {
        return {
          ok: false,
          status: data.status || relayRes.status,
          error: data.error || `الـ Webhook أعاد رمز HTTP ${data.status || relayRes.status}.`,
        };
      }
      return { ok: true, status: data.status || 200 };
    } catch {
      return { ok: false, error: 'تعذّر الوصول لخادم التوجيه لإرسال الـ Webhook.' };
    }
  }

  try {
    const res = await fetch(check.normalized, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `الـ Webhook أعاد رمز HTTP ${res.status}.` };
    }
    return { ok: true, status: res.status };
  } catch {
    return {
      ok: false,
      error: 'تعذّر إرسال البيانات للـ Webhook (تحقق من الرابط واتصال الشبكة).',
    };
  }
}

export async function dispatchToAllConnectedWebhooks(params: {
  config: OmniChannelConfig;
  prompt: string;
  reply: string;
  generation: number;
  agentsUsed: string[];
}): Promise<{ sentCount: number; failedCount: number }> {
  const urls = new Set<string>();
  if (params.config.webhookUrl.trim()) {
    urls.add(params.config.webhookUrl.trim());
  }
  for (const app of params.config.connectedWebhooks || []) {
    if (app.enabled && app.url.trim()) {
      urls.add(app.url.trim());
    }
  }
  let sentCount = 0;
  let failedCount = 0;
  for (const url of urls) {
    const res = await dispatchToUserWebhook({
      webhookUrl: url,
      prompt: params.prompt,
      reply: params.reply,
      generation: params.generation,
      agentsUsed: params.agentsUsed,
    });
    if (res.ok) sentCount += 1;
    else failedCount += 1;
  }
  return { sentCount, failedCount };
}
