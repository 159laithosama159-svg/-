import type { AiMissionStep } from '../types/cinema';

export interface OrchestratorAgentRef {
  id: string;
  name: string;
  englishRole: string;
}

export interface RawCommanderPlan {
  missionSummary?: unknown;
  steps?: unknown;
}

/**
 * Validates and normalizes the Commander's JSON delegation plan into 2-4 clean,
 * non-duplicate specialist agent steps with safe fallback if the model output is partial.
 */
export function sanitizeCommanderPlan(
  raw: RawCommanderPlan | null | undefined,
  availableAgents: OrchestratorAgentRef[],
  userPrompt: string,
  maxSteps = 4
): { missionSummary: string; steps: AiMissionStep[] } {
  const byId = new Map<string, OrchestratorAgentRef>();
  for (const ag of availableAgents) {
    byId.set(ag.id, ag);
  }

  const missionSummary =
    typeof raw?.missionSummary === 'string' && raw.missionSummary.trim()
      ? raw.missionSummary.trim().slice(0, 260)
      : `تخطيط وتنفيذ المهمة عبر فريق الوكلاء المتخصصين: ${userPrompt.slice(0, 90)}`;

  const rawSteps = Array.isArray(raw?.steps) ? raw.steps : [];
  const usedAgents = new Set<string>();
  const steps: AiMissionStep[] = [];

  for (let i = 0; i < rawSteps.length && steps.length < maxSteps; i += 1) {
    const entry = rawSteps[i] as Record<string, unknown> | null;
    if (!entry || typeof entry !== 'object') continue;

    const requestedId = typeof entry.agentId === 'string' ? entry.agentId.trim() : '';
    if (requestedId && usedAgents.has(requestedId)) continue;

    const matchedAgent =
      byId.get(requestedId) ||
      availableAgents.find((a) => a.id !== 'omni_commander' && !usedAgents.has(a.id));

    if (!matchedAgent || usedAgents.has(matchedAgent.id)) continue;
    usedAgents.add(matchedAgent.id);

    const taskTitle =
      typeof entry.taskTitle === 'string' && entry.taskTitle.trim()
        ? entry.taskTitle.trim().slice(0, 120)
        : `تحليل وتنفيذ جزء ${matchedAgent.name}`;
    const instruction =
      typeof entry.instruction === 'string' && entry.instruction.trim()
        ? entry.instruction.trim().slice(0, 600)
        : `${taskTitle} لطلب المستخدم: ${userPrompt.slice(0, 280)}`;

    steps.push({
      stepId: `step_${steps.length + 1}_${matchedAgent.id}`,
      agentId: matchedAgent.id,
      agentName: matchedAgent.name,
      englishRole: matchedAgent.englishRole,
      taskTitle,
      instruction,
      needsWebSearch: Boolean(entry.needsWebSearch),
      status: 'pending',
    });
  }

  // Guarantee at least 2 distinct specialist agents for genuine multi-agent teamwork
  const preferredFallbacks = ['deep_scout', 'code_architect', 'nova_inventor'];
  const fallbackPool: OrchestratorAgentRef[] = [
    ...preferredFallbacks
      .map((id) => byId.get(id))
      .filter((a): a is OrchestratorAgentRef => Boolean(a)),
    ...availableAgents.filter((a) => a.id !== 'omni_commander'),
  ];

  for (const ag of fallbackPool) {
    if (steps.length >= 2) break;
    if (usedAgents.has(ag.id)) continue;
    usedAgents.add(ag.id);
    steps.push({
      stepId: `step_${steps.length + 1}_${ag.id}`,
      agentId: ag.id,
      agentName: ag.name,
      englishRole: ag.englishRole,
      taskTitle:
        ag.id === 'deep_scout'
          ? 'جمع الحقائق والتحليل المرجعي'
          : ag.id === 'code_architect'
          ? 'الهيكلة العملية وبناء الحل'
          : 'الابتكار وصياغة التوصيات المتقدمة',
      instruction: `نفّذ دورك كـ ${ag.name} بدقة وعمق لخدمة طلب المستخدم: ${userPrompt.slice(0, 320)}`,
      needsWebSearch: ag.id === 'deep_scout',
      status: 'pending',
    });
  }

  return { missionSummary, steps };
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'blockquote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' };

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * Pure, dependency-free Markdown block parser tailored for RTL Arabic + LTR Code
 * Claude/Gemini-grade assistant responses.
 */
export function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block ```lang
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim().toLowerCase() || 'text';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i += 1;
      }
      blocks.push({ type: 'code', language: lang, code: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // Headings # / ## / ###
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() });
      i += 1;
      continue;
    }

    // Table (header | ... + separator | --- |)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (coalesce contiguous plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !(
        lines[i].trim().includes('|') &&
        i + 1 < lines.length &&
        isTableSeparatorRow(lines[i + 1])
      )
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

export function formatElapsedSeconds(ms: number): string {
  const safe = Math.max(0, ms);
  const secs = Math.round(safe / 100) / 10;
  if (secs < 60) return `${secs.toFixed(1)} ث`;
  const mins = Math.floor(secs / 60);
  const rem = Math.round(secs % 60);
  return `${mins} د ${rem} ث`;
}
