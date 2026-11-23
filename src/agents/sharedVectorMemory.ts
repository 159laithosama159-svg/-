import { normalizeArabicText } from '../utils/sovereignAiEngine';

export interface VectorMemoryRecord {
  id: string;
  kind: 'mission' | 'fact' | 'trained_pair' | 'skill' | 'project' | 'web_note';
  title: string;
  content: string;
  response?: string;
  tags: string[];
  agentSource: string;
  vector: number[];
  createdAt: number;
  updatedAt: number;
}

export interface VectorSearchHit {
  record: VectorMemoryRecord;
  similarity: number;
}

const VECTOR_STORAGE_KEY = 'valdrion_shared_vector_memory_v1';
const VECTOR_DIM = 96;

function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Pure TypeScript 96-dimension semantic embedding using Arabic/English word stems + character trigrams.
 * Runs 100% locally inside the browser or Node with 0 external APIs.
 */
export function computeLocalEmbedding(text: string): number[] {
  const vec = new Array<number>(VECTOR_DIM).fill(0);
  const norm = normalizeArabicText(text);
  if (!norm) return vec;

  const words = norm
    .split(/[^a-z0-9\u0600-\u06FF]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  for (const rawWord of words) {
    const w = rawWord.length >= 4 && rawWord.startsWith('ال') ? rawWord.slice(2) : rawWord;
    // Word-level feature (stronger weight)
    const wHash = fnv1aHash(`w:${w}`);
    const wIdx = wHash % VECTOR_DIM;
    const wSign = (wHash & 1) === 0 ? 1 : -1;
    vec[wIdx] += 2.2 * wSign;

    // Character trigram features for morphological similarity
    const padded = `^${w}$`;
    for (let i = 0; i <= padded.length - 3; i++) {
      const tri = padded.slice(i, i + 3);
      const tHash = fnv1aHash(`t:${tri}`);
      const tIdx = tHash % VECTOR_DIM;
      const tSign = (tHash & 1) === 0 ? 1 : -1;
      vec[tIdx] += 0.85 * tSign;
    }
  }

  // L2 normalization
  let normSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    normSq += vec[i] * vec[i];
  }
  const mag = Math.sqrt(normSq);
  if (mag > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] = Number((vec[i] / mag).toFixed(5));
    }
  }
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, Number(dot.toFixed(4))));
}

export class SharedVectorMemoryStore {
  private records: VectorMemoryRecord[];

  constructor(initialRecords?: VectorMemoryRecord[]) {
    this.records = initialRecords ? [...initialRecords] : this.loadFromStorage();
  }

  private loadFromStorage(): VectorMemoryRecord[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = window.localStorage.getItem(VECTOR_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as VectorMemoryRecord[];
      return Array.isArray(parsed) ? parsed.slice(0, 400) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(this.records.slice(0, 400)));
    } catch {
      // ignore quota errors
    }
  }

  public listAll(): VectorMemoryRecord[] {
    return [...this.records];
  }

  public count(): number {
    return this.records.length;
  }

  public upsert(input: {
    id?: string;
    kind: VectorMemoryRecord['kind'];
    title: string;
    content: string;
    response?: string;
    tags?: string[];
    agentSource: string;
  }): VectorMemoryRecord {
    const now = Date.now();
    const textForVec = `${input.title} ${input.content} ${(input.tags || []).join(' ')}`;
    const vector = computeLocalEmbedding(textForVec);
    const id = input.id || `vec_${now}_${Math.random().toString(36).slice(2, 7)}`;

    const existingIdx = this.records.findIndex(
      (r) =>
        r.id === id ||
        (r.kind === input.kind &&
          normalizeArabicText(r.title) === normalizeArabicText(input.title) &&
          normalizeArabicText(r.content) === normalizeArabicText(input.content))
    );

    const record: VectorMemoryRecord = {
      id: existingIdx >= 0 ? this.records[existingIdx].id : id,
      kind: input.kind,
      title: input.title.trim().slice(0, 180),
      content: input.content.trim().slice(0, 3000),
      response: input.response?.trim().slice(0, 4000),
      tags: (input.tags || []).slice(0, 12),
      agentSource: input.agentSource,
      vector,
      createdAt: existingIdx >= 0 ? this.records[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      this.records[existingIdx] = record;
    } else {
      this.records = [record, ...this.records].slice(0, 400);
    }
    this.persist();
    return record;
  }

  public remove(id: string): void {
    this.records = this.records.filter((r) => r.id !== id);
    this.persist();
  }

  public clear(): void {
    this.records = [];
    this.persist();
  }

  public search(
    query: string,
    opts?: { topK?: number; minScore?: number; kinds?: VectorMemoryRecord['kind'][] }
  ): VectorSearchHit[] {
    const topK = opts?.topK ?? 6;
    const minScore = opts?.minScore ?? 0.16;
    const queryVec = computeLocalEmbedding(query);
    const normQuery = normalizeArabicText(query);

    const hits: VectorSearchHit[] = [];
    for (const rec of this.records) {
      if (opts?.kinds && !opts.kinds.includes(rec.kind)) continue;
      let sim = cosineSimilarity(queryVec, rec.vector);
      const normContent = normalizeArabicText(`${rec.title} ${rec.content}`);
      if (normQuery.length >= 4 && normContent.includes(normQuery)) {
        sim = Math.min(1, sim + 0.38);
      }
      if (rec.kind === 'trained_pair' || rec.kind === 'skill') {
        sim = Math.min(1, sim * 1.18);
      }
      if (sim >= minScore) {
        hits.push({ record: rec, similarity: Number(sim.toFixed(4)) });
      }
    }

    return hits.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }
}

let singletonStore: SharedVectorMemoryStore | null = null;

export function getSharedVectorMemory(): SharedVectorMemoryStore {
  if (!singletonStore) {
    singletonStore = new SharedVectorMemoryStore();
  }
  return singletonStore;
}
