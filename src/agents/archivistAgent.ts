import { AgentBus, AgentResult } from './agentBus';
import {
  SharedVectorMemoryStore,
  VectorSearchHit,
} from './sharedVectorMemory';
import { CommanderFreedomSettings } from '../utils/commanderPolicy';
import {
  analyzeDocumentLocally,
  bm25RankDocuments,
  LocalIndexedDoc,
} from '../utils/localCommanderKernel';

/**
 * 5. الحافظ (Archivist Agent)
 * Owns Shared Vector Memory ("حوض الصحراء"): indexes projects, facts, trained pairs,
 * self-evolved skills, and uploaded books/files using hybrid Vector Cosine + Okapi BM25.
 */
export class ArchivistAgent {
  public readonly id = 'archivist' as const;
  public readonly nameAr = 'الحافظ (Archivist)';
  public readonly englishRole = 'Archivist Shared Vector DB Agent';

  public syncSettingsToVectorDb(
    store: SharedVectorMemoryStore,
    settings: CommanderFreedomSettings
  ): void {
    for (const pair of settings.trainedPairs) {
      store.upsert({
        id: `pair_${pair.id}`,
        kind: 'trained_pair',
        title: pair.prompt,
        content: pair.prompt,
        response: pair.response,
        tags: ['تدريب_شخصي'],
        agentSource: this.id,
      });
    }
    for (const f of settings.learnedFacts) {
      store.upsert({
        id: `fact_${f.id}`,
        kind: 'fact',
        title: 'حقيقة محفوظة من المستخدم',
        content: f.fact,
        tags: ['ذاكرة_شخصية'],
        agentSource: this.id,
      });
    }
  }

  public run(params: {
    bus: AgentBus;
    store: SharedVectorMemoryStore;
    prompt: string;
    settings: CommanderFreedomSettings;
    fileText?: { name: string; content: string } | null;
  }): {
    result: AgentResult;
    vectorHits: VectorSearchHit[];
    trainedMatch?: { prompt: string; response: string; score: number };
    docSummary?: ReturnType<typeof analyzeDocumentLocally>;
  } {
    const startedAt = Date.now();
    this.syncSettingsToVectorDb(params.store, params.settings);

    // Hybrid search: 1) Vector Cosine Similarity over Shared Vector DB
    const vectorHits = params.store.search(params.prompt, { topK: 5, minScore: 0.17 });

    // 2) Okapi BM25 exact/morphological check over trained pairs & facts & file
    const bm25Docs: LocalIndexedDoc[] = [
      ...params.settings.trainedPairs.map((p) => ({
        id: p.id,
        sourceType: 'trained_pair' as const,
        title: p.prompt,
        text: p.prompt,
        response: p.response,
      })),
      ...params.settings.learnedFacts.map((f) => ({
        id: f.id,
        sourceType: 'learned_fact' as const,
        title: 'حقيقة شخصية',
        text: f.fact,
      })),
    ];

    let docSummary: ReturnType<typeof analyzeDocumentLocally> | undefined;
    if (params.fileText?.content) {
      docSummary = analyzeDocumentLocally(params.fileText.name, params.fileText.content);
      params.store.upsert({
        kind: 'project',
        title: `ملف: ${params.fileText.name}`,
        content: docSummary.keySentences.join(' '),
        tags: docSummary.topKeywords.map((k) => k.term),
        agentSource: this.id,
      });
      const chunks = params.fileText.content
        .split(/\n{2,}/)
        .map((c) => c.trim())
        .filter((c) => c.length >= 20);
      chunks.slice(0, 50).forEach((chunk, idx) => {
        bm25Docs.push({
          id: `file_${idx}`,
          sourceType: 'attached_file',
          title: `${params.fileText!.name} — مقطع ${idx + 1}`,
          text: chunk,
        });
      });
    }

    const bm25Hits = bm25RankDocuments(params.prompt, bm25Docs, 4);

    let trainedMatch: { prompt: string; response: string; score: number } | undefined;
    const topBm25 = bm25Hits[0];
    if (topBm25 && topBm25.doc.sourceType === 'trained_pair' && topBm25.score >= 1.1) {
      trainedMatch = {
        prompt: topBm25.doc.title,
        response: topBm25.doc.response || topBm25.doc.text,
        score: topBm25.score,
      };
    } else {
      const vecTrained = vectorHits.find(
        (h) => (h.record.kind === 'trained_pair' || h.record.kind === 'skill') && h.similarity >= 0.42
      );
      if (vecTrained?.record.response) {
        trainedMatch = {
          prompt: vecTrained.record.title,
          response: vecTrained.record.response,
          score: vecTrained.similarity,
        };
      }
    }

    const outputParts: string[] = [];
    if (trainedMatch) {
      outputParts.push(`**مطابقة مباشرة من تدريبك/مهاراتك (درجة ${trainedMatch.score}):** ${trainedMatch.response}`);
    }
    if (docSummary) {
      outputParts.push(
        `**تحليل الملف «${docSummary.title}»:** ${docSummary.wordCount} كلمة · المفاهيم الأهم: ${docSummary.topKeywords
          .map((k) => k.term)
          .join('، ')}\n` + docSummary.keySentences.map((s) => `- ${s}`).join('\n')
      );
    }
    if (vectorHits.length > 0 && !trainedMatch) {
      outputParts.push(
        `**ذكريات وسياقات مسترجعة من الذاكرة المتجهية الموحدة (${params.store.count()} سجل):**\n` +
          vectorHits
            .slice(0, 3)
            .map(
              (h) =>
                `- [${Math.round(h.similarity * 100)}%] **${h.record.title}**: ${
                  h.record.response || h.record.content
                }`
            )
            .join('\n')
      );
    }
    if (outputParts.length === 0) {
      outputParts.push(
        `الذاكرة المتجهية الموحدة جاهزة (${params.store.count()} سجل متجهي محلي). سيتم أرشفة هذه المهمة تلقائياً لاستمرار شخصية النظام.`
      );
    }

    const output = outputParts.join('\n\n');
    params.bus.publish({
      from: this.id,
      to: 'orchestrator',
      topic: 'archivist:context',
      summary: `استرجاع ${vectorHits.length} سجل متجهي من أصل ${params.store.count()}`,
      payload: { vectorCount: params.store.count(), hitCount: vectorHits.length, hasTrainedMatch: Boolean(trainedMatch) },
    });

    return {
      vectorHits,
      trainedMatch,
      docSummary,
      result: {
        agentId: this.id,
        agentNameAr: this.nameAr,
        englishRole: this.englishRole,
        taskTitle: 'البحث في الذاكرة المتجهية الموحدة (Shared Vector DB)',
        output,
        thoughts: `بحث هجين (Vector Cosine 96-dim + BM25) عبر ${params.store.count()} سجل محلي.`,
        summary: trainedMatch
          ? 'تم إيجاد إجابة مطابقة من تدريبك ومهاراتك المحلية.'
          : `فحص ${params.store.count()} سجل متجهي (${vectorHits.length} نتائج ذات صلة).`,
        durationMs: Math.max(1, Date.now() - startedAt + 2),
      },
    };
  }
}
