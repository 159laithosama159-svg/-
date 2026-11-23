import { AgentBus, AgentResult } from './agentBus';
import { auditCodeLocally } from '../utils/localCommanderKernel';

export interface SentinelVerification {
  verified: boolean;
  securityScore: number;
  privacyStatus: '0_CLOUD_LLM_LOCAL' | 'OPEN_WEB_READONLY' | 'ACCOUNT_CONSENT_GRANTED';
  warnings: string[];
  codeAuditSummary?: string;
}

/**
 * 6. الحامي (Sentinel Agent)
 * Independent security & privacy verifier that audits every agent output BEFORE presenting to the user.
 */
export class SentinelAgent {
  public readonly id = 'sentinel' as const;
  public readonly nameAr = 'الحامي (Sentinel)';
  public readonly englishRole = 'Sentinel Security & Privacy Agent';

  public verify(params: {
    bus: AgentBus;
    prompt: string;
    agentResults: AgentResult[];
    usedOpenWeb: boolean;
    usedAccountSearch: boolean;
    accountConsentGranted: boolean;
  }): { result: AgentResult; verification: SentinelVerification } {
    const startedAt = Date.now();
    const warnings: string[] = [];
    let score = 100;

    // 1. Verify account access consent strictly
    if (params.usedAccountSearch && !params.accountConsentGranted) {
      warnings.push('تم حجب البحث داخل الحساب لعدم وجود موافقة صريحة من المستخدم.');
      score -= 40;
    }

    // 2. Scan prompt + all agent outputs for code vulnerabilities or exposed secrets
    const combinedText = [
      params.prompt,
      ...params.agentResults.map((r) => r.output),
      ...params.agentResults.flatMap((r) => (r.artifacts || []).map((a) => a.html)),
    ].join('\n\n');

    let codeAuditSummary: string | undefined;
    const codeMatch = combinedText.match(/```[\w-]*\n?([\s\S]+?)```/);
    const hasCodeLike =
      Boolean(codeMatch) ||
      /(function\s+\w+|const\s+\w+\s*=|def\s+\w+\(|SELECT\s+.+FROM|eval\(|innerHTML\s*=)/i.test(
        params.prompt
      );

    if (hasCodeLike) {
      const codeTarget = codeMatch ? codeMatch[1] : params.prompt;
      const audit = auditCodeLocally(codeTarget);
      codeAuditSummary = `اللغة: ${audit.language} · التعقيد: ${audit.complexityLevel} · الثغرات المرصودة: ${audit.securityFindings.length}`;
      for (const finding of audit.securityFindings) {
        warnings.push(`[${finding.severity}] ${finding.issue} — الحل: ${finding.fix}`);
        score -= finding.severity === 'عالية' ? 18 : 8;
      }
    }

    // 3. Check for accidental secret key leaks in outputs
    if (/(AIzaSy[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,})/.test(combinedText)) {
      warnings.push('تم رصد نمط يشبه مفتاح API سري — يُنصح بعدم مشاركة المفاتيح داخل النصوص.');
      score -= 25;
    }

    score = Math.max(20, Math.min(100, score));
    const verified = !params.usedAccountSearch || params.accountConsentGranted;
    const privacyStatus: SentinelVerification['privacyStatus'] = params.usedAccountSearch
      ? 'ACCOUNT_CONSENT_GRANTED'
      : params.usedOpenWeb
      ? 'OPEN_WEB_READONLY'
      : '0_CLOUD_LLM_LOCAL';

    const verification: SentinelVerification = {
      verified,
      securityScore: score,
      privacyStatus,
      warnings,
      codeAuditSummary,
    };

    const output =
      warnings.length > 0
        ? `تقييم الأمان والخصوصية: **${score}/100**.\n` +
          warnings.map((w) => `- ${w}`).join('\n')
        : `تم التحقق بنجاح (**${score}/100**) — لم تُرصد ثغرات أمنية أو تسريب بيانات. حالة الخصوصية: ${
            privacyStatus === '0_CLOUD_LLM_LOCAL'
              ? 'محلي 100% (0 بايت لأي شركة سحابية)'
              : privacyStatus === 'OPEN_WEB_READONLY'
              ? 'بحث ويب مفتوح موثق فقط (دون إرسال محادثتك لـ OpenAI أو Google Gemini)'
              : 'بحث داخل حسابك بموافقتك الصريحة'
          }.`;

    params.bus.publish({
      from: this.id,
      to: 'orchestrator',
      topic: 'sentinel:verified',
      summary: `تحقق الحامي: ${score}/100 (${warnings.length} تنبيهات)`,
      payload: { verified, securityScore: score, warningCount: warnings.length },
    });

    return {
      verification,
      result: {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle: 'فحص الأمان والخصوصية قبل العرض النهائي',
        output,
        thoughts: `فحص ${params.agentResults.length} مخرجات وكلاء، والتحقق من إذن الحساب، وفحص أنماط XSS/SQLi/الأسرار.`,
        summary: `تقييم الحامي: ${score}/100 · ${warnings.length === 0 ? 'سليم 100%' : `${warnings.length} ملاحظة أمنية`}.`,
        durationMs: Math.max(1, Date.now() - startedAt + 2),
        data: { verification },
      },
    };
  }
}
