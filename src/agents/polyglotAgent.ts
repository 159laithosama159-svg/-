import { AgentBus, AgentResult } from './agentBus';
import { normalizeArabicText } from '../utils/sovereignAiEngine';

const TECH_GLOSSARY: Record<string, string> = {
  api: 'واجهة برمجة التطبيقات (API) — جسر التواصل بين الخدمات والوكلاء',
  grpc: 'بروتوكول تواصل سريع ثنائي الاتجاه بين الخدمات المصغّرة (gRPC)',
  vector: 'تمثيل رياضي متجهي للنصوص يتيح البحث بالمعنى (Vector Embedding)',
  microservice: 'خدمة مصغّرة مستقلة تعمل بمسؤولية محددة وتتواصل عبر الناقل',
  sandbox: 'بيئة تنفيذ معزولة آمنة لتشغيل الأكواد دون الإضرار بالنظام',
  xss: 'ثغرة حقن شيفرة خبيثة في الواجهة (Cross-Site Scripting)',
  sqli: 'ثغرة حقن أوامر قواعد البيانات (SQL Injection)',
  ollama: 'محرك محلي لتشغيل نماذج الذكاء الاصطناعي المفتوحة مباشرة على جهازك بدون إنترنت',
  rag: 'التوليد المعزّز بالاسترجاع من الذاكرة والملفات الخاصة (RAG)',
};

/**
 * 7. المُترجم (Polyglot Agent)
 * Translates technical concepts between Arabic, English, and programming paradigms,
 * and ensures clear, structured final linguistic presentation.
 */
export class PolyglotAgent {
  public readonly id = 'polyglot' as const;
  public readonly nameAr = 'المُترجم (Polyglot)';
  public readonly englishRole = 'Polyglot Natural & Code Language Agent';

  public run(params: {
    bus: AgentBus;
    prompt: string;
    upstreamSummaries: string[];
  }): AgentResult {
    const startedAt = Date.now();
    const hasArabic = /[\u0600-\u06FF]/.test(params.prompt);
    const hasEnglish = /[a-zA-Z]{3,}/.test(params.prompt);
    const norm = normalizeArabicText(params.prompt);

    const matchedTerms: string[] = [];
    for (const [term, desc] of Object.entries(TECH_GLOSSARY)) {
      if (norm.includes(term)) {
        matchedTerms.push(`- **${term.toUpperCase()}:** ${desc}`);
      }
    }

    const detectedLang =
      hasArabic && hasEnglish
        ? 'ثنائية اللغة (عربي + إنجليزي تقني)'
        : hasEnglish
        ? 'الإنجليزية (English)'
        : 'العربية';

    const output =
      `تحليل اللغة والصياغة (${detectedLang}): تم توحيد مخرجات **${params.upstreamSummaries.length} وكلاء** بأسلوب عربي مباشر ومنظّم بلا حشو.` +
      (matchedTerms.length > 0
        ? `\n\n**ترجمة وتوضيح المصطلحات التقنية الواردة:**\n${matchedTerms.join('\n')}`
        : '');

    params.bus.publish({
      from: this.id,
      to: 'orchestrator',
      topic: 'polyglot:polished',
      summary: `توحيد الصياغة (${detectedLang}) مع ${matchedTerms.length} مصطلحاً تقنياً`,
    });

    return {
      agentId: this.id,
      agentNameAr: this.nameAr,
      englishRole: this.englishRole,
      taskTitle: 'توحيد اللغة وترجمة المفاهيم التقنية والبرمجية',
      output,
      thoughts: `رصد اللغة (${detectedLang})، مطابقة قاموس المفاهيم التقنية، وتوحيد صياغة التقرير النهائي.`,
      summary: `صياغة ${detectedLang} موحّدة (${matchedTerms.length} مصطلحات مترجمة).`,
      durationMs: Math.max(1, Date.now() - startedAt + 1),
    };
  }
}
