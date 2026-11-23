import type {
  LocalEndpointConfig,
  SovereignDepth,
} from '../utils/sovereignAiEngine';
import { validateLocalEndpointUrl } from '../utils/sovereignAiEngine';

export interface SovereignStreamCallbacks {
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams a reply from the stateless, zero-logging server proxy (/api/ai/private-sovereign).
 */
export async function streamZeroLogSovereignAi(
  params: {
    systemInstruction: string;
    messages: Array<{ role: 'user' | 'assistant'; text: string }>;
    depth: SovereignDepth;
  },
  callbacks: SovereignStreamCallbacks
): Promise<string> {
  const res = await fetch('/api/ai/private-sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: callbacks.signal,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let errText = 'تعذّر الاتصال بمحرك الذكاء الخاص.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) errText = data.error;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }

  if (!res.body) {
    throw new Error('لم يصل بث الاستجابة من الخادم.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonPart = line.slice(6).trim();
        if (!jsonPart) continue;
        let parsed: { type?: string; text?: string; error?: string };
        try {
          parsed = JSON.parse(jsonPart) as { type?: string; text?: string; error?: string };
        } catch {
          continue;
        }
        if (parsed.type === 'delta' && parsed.text) {
          fullText += parsed.text;
          callbacks.onDelta(parsed.text);
        } else if (parsed.type === 'error') {
          throw new Error(parsed.error || 'حدث خطأ أثناء التوليد.');
        }
      }
    }
  }

  return fullText;
}

/**
 * Connects DIRECTLY from the user's browser to their own local AI server (Ollama / LM Studio).
 * Zero bytes pass through our Express server or any external cloud.
 */
export async function streamDirectLocalEndpointAi(
  params: {
    endpoint: LocalEndpointConfig;
    systemInstruction: string;
    messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  },
  callbacks: SovereignStreamCallbacks
): Promise<string> {
  const check = validateLocalEndpointUrl(params.endpoint.url);
  if (!check.valid || !check.normalized) {
    throw new Error(check.error || 'رابط الخادم المحلي غير صالح.');
  }

  const modelName = params.endpoint.modelName.trim() || 'llama3.2';
  const formattedMessages = [
    ...(params.systemInstruction
      ? [{ role: 'system', content: params.systemInstruction }]
      : []),
    ...params.messages.map((m) => ({
      role: m.role,
      content: m.text,
    })),
  ];

  const isOllama = params.endpoint.format === 'ollama';
  const payload = isOllama
    ? { model: modelName, messages: formattedMessages, stream: true }
    : { model: modelName, messages: formattedMessages, stream: true };

  let res: Response;
  try {
    res = await fetch(check.normalized, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: callbacks.signal,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `تعذّر الاتصال بخادمك المحلي (${check.normalized}). تأكد أن Ollama أو LM Studio يعمل ومسموح له بـ CORS على جهازك، أو بدّل لمحرك «أوفلاين بالمتصفح» أو «سحابي بدون تسجيل».`
    );
  }

  if (!res.ok) {
    throw new Error(`الخادم المحلي أعاد رمز خطأ ${res.status}. تأكد من اسم النموذج (${modelName}).`);
  }

  if (!res.body) {
    const json = (await res.json()) as {
      message?: { content?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.message?.content ?? json.choices?.[0]?.message?.content ?? '';
    if (text) callbacks.onDelta(text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (isOllama) {
        try {
          const parsed = JSON.parse(line) as { message?: { content?: string }; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          const delta = parsed.message?.content ?? '';
          if (delta) {
            fullText += delta;
            callbacks.onDelta(delta);
          }
        } catch (err) {
          if (err instanceof Error && !/JSON/.test(err.message)) throw err;
        }
      } else {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            callbacks.onDelta(delta);
          }
        } catch {
          // ignore partial chunks
        }
      }
    }
  }

  return fullText;
}

/**
 * Runs a full 3-stage 7-Agent Commander mission directly against the user's own local
 * Ollama / LM Studio GPU server (0 cloud servers, 0 external monitoring, 100% user rules).
 */
export async function runLocalOllamaCommanderMission(
  params: {
    endpoint: LocalEndpointConfig;
    prompt: string;
    rulesBlock: string;
    history: Array<{ role: 'user' | 'assistant'; text: string }>;
    webContext?: string;
    accountContext?: string;
    vectorContext?: string;
  },
  callbacks: {
    onStage?: (stage: 'planning' | 'delegating' | 'synthesizing', label: string) => void;
    onChunk: (delta: string) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  callbacks.onStage?.('planning', `المُنسّق يتصل بنموذجك المحلي (${params.endpoint.modelName}) مباشرة على جهازك...`);

  const systemInstruction =
    `أنت القائد الشامل المستقل (VALDRION OmniCommander) المكون من 7 وكلاء: الرائي، المهندس، الباحث، المُنسّق، الحافظ، الحامي، والمُترجم.\n` +
    `تعمل محلياً 100% على جهاز المستخدم بدون أي خادم سحابي.\n` +
    `قدّم إجابة متكاملة عالية الجودة بالعربية المنظمة (Markdown واضح، جداول، وكود كامل قابل للتشغيل عند الحاجة).\n\n` +
    (params.rulesBlock ? `${params.rulesBlock}\n\n` : '') +
    (params.vectorContext ? `[الذاكرة المتجهية الموحدة]:\n${params.vectorContext}\n\n` : '') +
    (params.webContext ? `[نتائج البحث الحي من الويب المفتوح]:\n${params.webContext}\n\n` : '') +
    (params.accountContext ? `[نتائج البحث داخل حساب المستخدم (بإذنه الصريح)]:\n${params.accountContext}\n\n` : '');

  callbacks.onStage?.('synthesizing', `النموذج المحلي (${params.endpoint.modelName}) يصوغ الإجابة النهائية مباشرة على جهازك...`);

  return streamDirectLocalEndpointAi(
    {
      endpoint: params.endpoint,
      systemInstruction,
      messages: [
        ...params.history.slice(-8),
        { role: 'user', text: params.prompt },
      ],
    },
    {
      onDelta: callbacks.onChunk,
      signal: callbacks.signal,
    }
  );
}

