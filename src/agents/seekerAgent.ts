import { AgentBus, AgentResult } from './agentBus';
import { extractPublicUrlFromPrompt } from './omniChannelBridge';
import { normalizeArabicText } from '../utils/sovereignAiEngine';

export interface OpenWebSearchHit {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface AccountSnapshot {
  isSignedIn: boolean;
  displayName?: string | null;
  email?: string | null;
  sessions: Array<{ id: string; title: string; snippet: string }>;
  brainNotes: string[];
  favoriteMediaCount?: number;
  novelsCount?: number;
}

export interface AccountSearchHit {
  area: string;
  title: string;
  snippet: string;
}

/**
 * 3. الباحث (Seeker Agent)
 * 1) Real Live Open-Web Search (Wikipedia AR/EN + DuckDuckGo + GitHub + HackerNews + ArXiv)
 *    via /api/ai/open-web-search — ZERO OpenAI or Google Gemini required!
 * 2) Consent-Gated Account Search — searches user's signed-in account sessions, profile,
 *    brain memories, and saved collections ONLY AFTER explicit user approval.
 */
export class SeekerAgent {
  public readonly id = 'seeker' as const;
  public readonly nameAr = 'الباحث (Seeker)';
  public readonly englishRole = 'Seeker Live Web & Account Agent';

  public detectAccountSearchIntent(prompt: string): boolean {
    const norm = normalizeArabicText(prompt);
    return /(حسابي|بحسابي|في حسابي|محادثاتي|مشاريعي المحفوظه|بياناتي المحفوظه|ايميلي|بريدي|سجل دخولي|فوت بحسابي|ادخل حسابي|ابحث في حسابي|search my account|my sessions)/i.test(
      norm
    );
  }

  public detectWebSearchIntent(prompt: string, webSearchEnabled: boolean): boolean {
    if (webSearchEnabled) return true;
    if (extractPublicUrlFromPrompt(prompt)) return true;
    const norm = normalizeArabicText(prompt);
    return /(ابحث|بحث في الويب|بحث ويب|الانترنت|الويب|اخبار|احدث|تقنيه جديده|معلومات عن|ما هو|ما هي|من هو|search|latest|news|wikipedia|github|arxiv)/i.test(
      norm
    );
  }

  public searchUserAccount(query: string, account: AccountSnapshot): AccountSearchHit[] {
    const normQ = normalizeArabicText(query);
    const tokens = normQ
      .split(/[^a-z0-9\u0600-\u06FF]+/i)
      .filter((t) => t.length >= 2 && !/^(ابحث|في|حسابي|بحسابي|عن|فوت|ادخل|شو|ما)$/.test(t));

    const hits: AccountSearchHit[] = [];

    if (account.isSignedIn || account.email || account.displayName) {
      hits.push({
        area: 'ملف الحساب المسجّل',
        title: account.displayName || 'حسابك المسجّل',
        snippet: account.email
          ? `البريد المسجّل: ${account.email} · عدد الجلسات: ${account.sessions.length}`
          : `جلسات محفوظة في حسابك: ${account.sessions.length}`,
      });
    }

    for (const s of account.sessions) {
      const hay = normalizeArabicText(`${s.title} ${s.snippet}`);
      const matched = tokens.length === 0 || tokens.some((t) => hay.includes(t));
      if (matched) {
        hits.push({
          area: 'محادثاتك ومشاريعك',
          title: s.title,
          snippet: s.snippet.slice(0, 180),
        });
      }
      if (hits.length >= 7) break;
    }

    for (const note of account.brainNotes) {
      const hay = normalizeArabicText(note);
      const matched = tokens.length === 0 || tokens.some((t) => hay.includes(t));
      if (matched) {
        hits.push({
          area: 'ذاكرة عقلك الشخصي',
          title: 'معلومة محفوظة في حسابك',
          snippet: note.slice(0, 180),
        });
      }
      if (hits.length >= 10) break;
    }

    return hits;
  }

  public async run(params: {
    bus: AgentBus;
    prompt: string;
    allowWebSearch: boolean;
    allowAccountSearch: boolean;
    accountSnapshot?: AccountSnapshot;
    signal?: AbortSignal;
    fetchWeb?: (query: string, signal?: AbortSignal) => Promise<OpenWebSearchHit[]>;
  }): Promise<{
    result: AgentResult;
    webHits: OpenWebSearchHit[];
    accountHits: AccountSearchHit[];
  }> {
    const startedAt = Date.now();
    let webHits: OpenWebSearchHit[] = [];
    let accountHits: AccountSearchHit[] = [];

    // 1A. Public URL Live Reader (if user pasted a URL)
    const publicUrl = extractPublicUrlFromPrompt(params.prompt);
    if (publicUrl && typeof fetch !== 'undefined' && !params.fetchWeb) {
      try {
        const urlRes = await fetch('/api/ai/open-url-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl }),
          signal: params.signal,
        });
        if (urlRes.ok) {
          const preview = (await urlRes.json()) as {
            title?: string;
            description?: string;
            excerpt?: string;
            url?: string;
            hostname?: string;
          };
          webHits.push({
            title: preview.title || preview.hostname || publicUrl,
            snippet: (preview.description || preview.excerpt || '').slice(0, 260),
            url: preview.url || publicUrl,
            source: `قراءة موقع حي (${preview.hostname || 'Web'})`,
          });
        }
      } catch {
        // ignore URL fetch error and continue open-web search
      }
    }

    // 1B. Live Open-Web Search (Zero LLM cloud dependency)
    if (params.allowWebSearch) {
      try {
        if (params.fetchWeb) {
          webHits = [...webHits, ...(await params.fetchWeb(params.prompt, params.signal))];
        } else if (typeof fetch !== 'undefined') {
          const res = await fetch('/api/ai/open-web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: params.prompt }),
            signal: params.signal,
          });
          if (res.ok) {
            const data = (await res.json()) as { results?: OpenWebSearchHit[] };
            if (Array.isArray(data.results)) {
              webHits = [...webHits, ...data.results.slice(0, 8)].slice(0, 9);
            }
          }
        }
      } catch {
        // keep any URL hit already gathered
      }
    }

    // 2. Consent-Gated Account Search (ONLY when explicitly approved!)
    if (params.allowAccountSearch && params.accountSnapshot) {
      accountHits = this.searchUserAccount(params.prompt, params.accountSnapshot);
    }

    const sections: string[] = [];
    if (accountHits.length > 0) {
      sections.push(
        `### نتائج البحث داخل حسابك (بإذنك الصريح)\n` +
          accountHits
            .map((h) => `- **[${h.area}] ${h.title}:** ${h.snippet}`)
            .join('\n')
      );
    }
    if (webHits.length > 0) {
      sections.push(
        `### نتائج البحث الحي الموثّق من الويب المفتوح\n` +
          webHits
            .map((w) => `- **[${w.source}] ${w.title}:** ${w.snippet} ([المصدر](${w.url}))`)
            .join('\n')
      );
    }
    if (sections.length === 0) {
      sections.push(
        params.allowWebSearch
          ? 'لم تُرجع محركات الويب المفتوحة نتائج إضافية لهذا الاستعلام — تم تمرير المهمة للذاكرة المتجهية والمهندس.'
          : 'البحث في الويب متوقف حالياً (وضع 0 إنترنت). يمكنك تفعيل زر **البحث الحي** للبحث في الويب المفتوح فوراً دون OpenAI أو Google Gemini.'
      );
    }

    const output = sections.join('\n\n');
    const sources = webHits.map((w) => ({ title: `${w.title} (${w.source})`, uri: w.url, source: w.source }));

    params.bus.publish({
      from: this.id,
      to: 'architect',
      topic: 'seeker:findings',
      summary: `تمرير ${webHits.length} نتيجة ويب و ${accountHits.length} نتيجة من الحساب إلى المهندس`,
      payload: { webCount: webHits.length, accountCount: accountHits.length },
    });

    return {
      webHits,
      accountHits,
      result: {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle:
          accountHits.length > 0
            ? 'البحث داخل حسابك (بإذنك) + البحث الحي في الويب'
            : 'البحث اللحظي الموثق عبر الويب المفتوح',
        output,
        thoughts: `استعلام الويب المفتوح (${webHits.length} مصادر) + بحث الحساب المأذون (${accountHits.length} عناصر).`,
        summary:
          webHits.length > 0 || accountHits.length > 0
            ? `تم جمع ${webHits.length} مصدر ويب حي و ${accountHits.length} عنصر من حسابك.`
            : 'اكتمل فحص المصادر بدون نتائج خارجية.',
        durationMs: Math.max(2, Date.now() - startedAt),
        sources,
      },
    };
  }
}
