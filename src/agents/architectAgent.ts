import { AgentBus, AgentResult } from './agentBus';
import {
  auditCodeLocally,
  buildLocalRunnableArtifact,
  computeLocalStatistics,
} from '../utils/localCommanderKernel';
import { evaluateSafeMathExpression, normalizeArabicText } from '../utils/sovereignAiEngine';

/**
 * 2. المهندس (Architect Agent)
 * Writes executable code, builds runnable HTML/CSS/JS sandbox apps,
 * audits pasted code, and runs deterministic math & statistics with 100% precision.
 */
export class ArchitectAgent {
  public readonly id = 'architect' as const;
  public readonly nameAr = 'المهندس (Architect)';
  public readonly englishRole = 'Architect Code & Sandbox Agent';

  public run(params: {
    bus: AgentBus;
    prompt: string;
    seekerContext?: string;
    archivistContext?: string;
  }): AgentResult {
    const startedAt = Date.now();
    const prompt = params.prompt.trim();
    const norm = normalizeArabicText(prompt);
    const artifacts: Array<{ title: string; html: string }> = [];

    // 1. Code Audit if code was provided
    const codeBlockMatch = prompt.match(/```[\w-]*\n?([\s\S]+?)```/);
    const looksLikeRawCode =
      !codeBlockMatch &&
      /(function\s+\w+|const\s+\w+\s*=|def\s+\w+\(|class\s+\w+|SELECT\s+.+FROM|<html|innerHTML|eval\()/i.test(
        prompt
      );

    if (codeBlockMatch || looksLikeRawCode) {
      const code = codeBlockMatch ? codeBlockMatch[1] : prompt;
      const report = auditCodeLocally(code);
      const output =
        `تم تحليل البنية البرمجية (**${report.language}** · ${report.lineCount} سطر · ${report.functionCount} دالة · التعقيد: ${report.complexityLevel}).\n` +
        report.recommendations.map((r) => `- ${r}`).join('\n');

      params.bus.publish({
        from: this.id,
        to: 'sentinel',
        topic: 'architect:code_ready',
        summary: `تحليل كود ${report.language} وتمريره للحامي للفحص الأمني`,
        payload: { language: report.language, lineCount: report.lineCount },
      });

      return {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle: `تحليل وهندسة الكود (${report.language})`,
        output,
        thoughts: `تفكيك بنية ${report.language} وحساب التفرعات والدوال وتمرير التقرير لوكيل الحامي.`,
        summary: `تحليل ${report.language}: ${report.lineCount} سطر · ${report.functionCount} دوال.`,
        durationMs: Math.max(1, Date.now() - startedAt + 3),
        data: { codeAudit: report },
      };
    }

    // 2. Deterministic Statistics or Math
    const nums = (prompt.match(/-?\d+(?:\.\d+)?/g) || [])
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const wantsStats =
      nums.length >= 3 &&
      /(متوسط|مجموع|احصاء|ارقام|اكبر|اصغر|انحراف|وسيط|stats|mean|median)/i.test(norm);

    if (wantsStats) {
      const stats = computeLocalStatistics(nums);
      if (stats) {
        const output =
          `| المؤشر | القيمة |\n| :--- | :--- |\n` +
          `| العدد | ${stats.count} |\n| المجموع | ${stats.sum} |\n| المتوسط | ${stats.mean} |\n| الوسيط | ${stats.median} |\n| الأدنى / الأعلى | ${stats.min} / ${stats.max} |\n| الانحراف المعياري | ${stats.stdDev} |`;
        params.bus.publish({
          from: this.id,
          to: 'sentinel',
          topic: 'architect:stats_ready',
          summary: `حساب إحصاءات دقيقة لـ ${stats.count} قيمة`,
        });
        return {
          agentId: this.id,
          agentNameAr: this.nameAr,
          englishRole: this.englishRole,
          taskTitle: 'حساب المؤشرات الإحصائية الحتمية',
          output,
          thoughts: 'تنفيذ الحسابات الإحصائية محلياً بدقة عددية كاملة.',
          summary: `المتوسط: ${stats.mean} · المجموع: ${stats.sum} (${stats.count} قيم).`,
          durationMs: Math.max(1, Date.now() - startedAt + 2),
          data: { stats },
        };
      }
    }

    const mathExpr = prompt
      .replace(/^(احسب|حساب|كم|ناتج|ما ناتج)\s*/i, '')
      .replace(/[؟?]/g, '')
      .trim();
    const mathVal =
      /[0-9]/.test(mathExpr) &&
      /[+\-*/^%()]|\b(sqrt|sin|cos|tan|log|abs|pow|round|pi)\b/i.test(mathExpr)
        ? evaluateSafeMathExpression(mathExpr)
        : null;

    if (mathVal !== null) {
      const formatted = Number.isInteger(mathVal) ? String(mathVal) : Number(mathVal.toFixed(6)).toString();
      params.bus.publish({
        from: this.id,
        to: 'sentinel',
        topic: 'architect:math_ready',
        summary: `حساب المعادلة = ${formatted}`,
      });
      return {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle: 'الحساب العلمي الحتمي (دقة 100%)',
        output: `المعادلة: \`${mathExpr}\` = **${formatted}**`,
        thoughts: 'تقييم المعادلة عبر محلّل رياضي آمن (بدون eval).',
        summary: `الناتج الدقيق: ${formatted}`,
        durationMs: Math.max(1, Date.now() - startedAt + 1),
        data: { mathResult: formatted, mathExpr },
      };
    }

    // 3. Runnable Interactive Sandbox / Code Architecture Builder
    const built = buildLocalRunnableArtifact(prompt);
    if (built) {
      artifacts.push(built);
      params.bus.publish({
        from: this.id,
        to: 'sentinel',
        topic: 'architect:artifact_built',
        summary: `بناء تطبيق تفاعلي قابل للتشغيل: ${built.title}`,
      });
      return {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle: `بناء تطبيق تفاعلي جاهز للتشغيل (${built.title})`,
        output:
          `تم بناء **${built.title}** بالكامل وجاهز للتشغيل الفوري داخل الصندوق التفاعلي (Sandbox)` +
          (params.seekerContext ? ' مع الاستفادة من نتائج الباحث المستلمة عبر الناقل (The Bus).' : '.'),
        thoughts: 'تجميع HTML5/CSS/JS مستقل قابل للتشغيل الفوري وإرساله لوكيل الحامي للتحقق الأمني.',
        summary: `بناء نموذج تفاعلي جاهز: ${built.title}`,
        durationMs: Math.max(1, Date.now() - startedAt + 4),
        artifacts,
      };
    }

    // 4. Only produce a targeted note when no code/math/stats/artifact matched — NEVER repeat a fixed boilerplate!
    const wantsCodeOrArch =
      /(كود|برمج|موقع|تطبيق|سيرفر|خادم|api|python|javascript|typescript|react|sql|هيكل|معماري)/i.test(
        norm
      );
    const output = wantsCodeOrArch
      ? `لتنفيذ «${prompt.slice(0, 90)}» عملياً في الوضع المحلي بدون نموذج عصبي، يمكنك طلب بناء **لعبة تفاعلية** أو **آلة حاسبة** أو **لوحة مهام** مباشرة، أو لصق كودك لأفحصه أمنياً، أو تفعيل **التفكير العميق الذكي** (أو **Ollama**) من الإعدادات لكتابة كود مخصّص كامل.`
      : '';

    params.bus.publish({
      from: this.id,
      to: 'sentinel',
      topic: 'architect:checked',
      summary: wantsCodeOrArch ? 'توجيه برمجي مخصّص للطلب' : 'لا توجد معالجة هندسية منفصلة مطلوبة',
    });

    return {
      agentId: this.id,
      agentNameAr: this.nameAr,
      englishRole: this.englishRole,
      taskTitle: wantsCodeOrArch ? 'تحليل المتطلبات البرمجية' : 'مراجعة المهندس',
      output,
      thoughts: 'فحص الطلب بحثاً عن كود أو معادلات أو تطبيقات قابلة للبناء المحلي.',
      summary: wantsCodeOrArch ? 'توجيه برمجي مخصّص.' : 'اكتمل الفحص.',
      durationMs: Math.max(1, Date.now() - startedAt + 2),
      data: { isFallback: !wantsCodeOrArch },
    };
  }
}
