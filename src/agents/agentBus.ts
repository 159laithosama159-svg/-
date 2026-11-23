export type AgentId7 =
  | 'orchestrator'
  | 'visionary'
  | 'architect'
  | 'seeker'
  | 'archivist'
  | 'sentinel'
  | 'polyglot';

export interface BusMessage {
  id: string;
  from: AgentId7;
  to: AgentId7;
  topic: string;
  summary: string;
  payload?: Record<string, unknown>;
  ts: number;
}

export interface AgentResult {
  agentId: AgentId7;
  agentNameAr: string;
  englishRole: string;
  taskTitle: string;
  output: string;
  thoughts: string;
  summary: string;
  durationMs: number;
  artifacts?: Array<{ title: string; html: string }>;
  sources?: Array<{ title: string; uri: string; source?: string }>;
  data?: Record<string, unknown>;
}

/**
 * Inter-Agent Communication Protocol (The Bus).
 * Decouples the 7 independent agents so Orchestrator can route outputs dynamically
 * (e.g. Seeker -> Architect -> Sentinel -> Archivist -> Polyglot).
 */
export class AgentBus {
  private trace: BusMessage[] = [];
  private listeners = new Map<string, Array<(msg: BusMessage) => void>>();

  public publish(params: {
    from: AgentId7;
    to: AgentId7;
    topic: string;
    summary: string;
    payload?: Record<string, unknown>;
  }): BusMessage {
    const msg: BusMessage = {
      id: `bus_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from: params.from,
      to: params.to,
      topic: params.topic,
      summary: params.summary,
      payload: params.payload,
      ts: Date.now(),
    };
    this.trace.push(msg);

    const subs = this.listeners.get(params.topic) || [];
    for (const fn of subs) fn(msg);
    const wild = this.listeners.get('*') || [];
    for (const fn of wild) fn(msg);

    return msg;
  }

  public subscribe(topic: string, listener: (msg: BusMessage) => void): () => void {
    const list = this.listeners.get(topic) || [];
    list.push(listener);
    this.listeners.set(topic, list);
    return () => {
      const next = (this.listeners.get(topic) || []).filter((l) => l !== listener);
      this.listeners.set(topic, next);
    };
  }

  public getTrace(): BusMessage[] {
    return [...this.trace];
  }
}
