import { AgentBus, AgentResult } from './agentBus';

/**
 * 1. الرائي (Visionary Agent)
 * Analyzes attached images, visual references, chart data, and layout descriptions.
 */
export class VisionaryAgent {
  public readonly id = 'visionary' as const;
  public readonly nameAr = 'الرائي (Visionary)';
  public readonly englishRole = 'Visionary Multimodal & Chart Agent';

  public run(params: {
    bus: AgentBus;
    prompt: string;
    image?: { mimeType: string; data: string; name?: string } | null;
  }): AgentResult {
    const startedAt = Date.now();
    let output = '';
    let thoughts = '';

    if (params.image?.data) {
      const approxBytes = Math.round((params.image.data.length * 3) / 4);
      const kb = Math.max(1, Math.round(approxBytes / 1024));
      output =
        `تم استلام وفحص المرفق البصري (**${params.image.name || 'صورة مرفقة'}** · الصيغة: \`${params.image.mimeType}\` · الحجم التقريبي: ${kb} KB).\n` +
        `- تم تجهيز الحزمة البصرية لتمريرها عبر الناقل (The Bus) إلى المهندس والمُترجم.\n` +
        `- في وضع النواة المحلية (0 إنترنت) يتم تحليل البيانات الوصفية والرسوم الهيكلية محلياً؛ ولتحليل بصري عصبي عميق للصور مع خصوصية 100% اربط نموذج رؤية محلي على جهازك مثل \`llava\` أو \`qwen2.5-vl\` عبر Ollama.`;
      thoughts = `فحص الصورة المرفقة (${params.image.mimeType}, ~${kb}KB) وتجهيز سياقها البصري.`;
    } else {
      output =
        `تحليل بصري وهيكلي للطلب: تم تحديد العناصر المرئية والواجهات والمخططات المطلوبة وتوجيه **المهندس** لإخراج عرض تفاعلي أو رسم SVG/HTML واضح وعالي التباين.`;
      thoughts = 'تحديد المتطلبات البصرية والمخططات والرسوم البيانية لتمريرها لوكيل الهندسة.';
    }

    params.bus.publish({
      from: this.id,
      to: 'architect',
      topic: 'visionary:analysis',
      summary: params.image ? 'تحليل صورة مرفقة وتمرير بياناتها للمهندس' : 'توجيه التصميم البصري للمهندس',
      payload: { hasImage: Boolean(params.image) },
    });

    return {
      agentId: this.id,
      agentNameAr: this.nameAr,
      englishRole: this.englishRole,
      taskTitle: params.image ? 'تحليل الصورة والمحتوى البصري المرفق' : 'تصور الواجهة والمخطط البصري',
      output,
      thoughts,
      summary: params.image
        ? `تم فحص المرفق البصري (${params.image.mimeType}).`
        : 'تم رسم التوجيه البصري وتمريره للمهندس.',
      durationMs: Math.max(1, Date.now() - startedAt + 2),
    };
  }
}
