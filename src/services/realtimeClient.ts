/**
 * Real-time WebSocket client for VALDRION Watch Party & Phone-to-TV QR Remote.
 * Uses the same origin & port (ws:// or wss:// + /ws/realtime) with automatic reconnection.
 */

export type RealtimeMessage = Record<string, unknown>;

export class ValdrionRealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: RealtimeMessage) => void>();
  private openListeners = new Set<() => void>();
  private pendingQueue: string[] = [];
  private closedManually = false;
  private reconnectTimer: number | null = null;

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.closedManually = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/realtime`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      while (this.pendingQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
        const next = this.pendingQueue.shift();
        if (next) ws.send(next);
      }
      this.openListeners.forEach((cb) => cb());
    };

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.data)) as RealtimeMessage;
        this.listeners.forEach((cb) => cb(parsed));
      } catch {
        // Ignore malformed packets
      }
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.closedManually && this.listeners.size > 0) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), 2000);
      }
    };

    ws.onerror = () => {
      // Handled gracefully by onclose reconnect
    };
  }

  send(payload: RealtimeMessage) {
    const serialized = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialized);
    } else {
      this.pendingQueue.push(serialized);
      this.connect();
    }
  }

  subscribe(onMessage: (msg: RealtimeMessage) => void, onOpen?: () => void): () => void {
    this.listeners.add(onMessage);
    if (onOpen) this.openListeners.add(onOpen);
    this.connect();

    return () => {
      this.listeners.delete(onMessage);
      if (onOpen) this.openListeners.delete(onOpen);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  disconnect() {
    this.closedManually = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingQueue = [];
  }
}

export const realtimeClient = new ValdrionRealtimeClient();
