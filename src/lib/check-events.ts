type CheckEventType =
  | "check_started"
  | "check_progress"
  | "check_error"
  | "check_done";

export interface CheckEventPayload {
  type: CheckEventType;
  itemId?: string;
  itemName?: string;
  batchId?: string;
  status?: string;
  error?: string;
  checked?: number;
  total?: number;
  item?: Record<string, unknown>;
  timestamp: string;
}

type Listener = (event: CheckEventPayload) => void;

interface EventBusState {
  listeners: Map<string, Listener>;
}

declare global {
  // eslint-disable-next-line no-var
  var __bumptCheckEventBus: EventBusState | undefined;
}

function getBus(): EventBusState {
  if (!globalThis.__bumptCheckEventBus) {
    globalThis.__bumptCheckEventBus = { listeners: new Map() };
  }
  return globalThis.__bumptCheckEventBus;
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function publishCheckEvent(event: Omit<CheckEventPayload, "timestamp">): void {
  const bus = getBus();
  const payload: CheckEventPayload = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  for (const listener of bus.listeners.values()) {
    try {
      listener(payload);
    } catch {
      // Ignore listener errors to keep broadcast resilient.
    }
  }
}

export function subscribeCheckEvents(listener: Listener): () => void {
  const bus = getBus();
  const id = randomId();
  bus.listeners.set(id, listener);
  return () => {
    bus.listeners.delete(id);
  };
}
