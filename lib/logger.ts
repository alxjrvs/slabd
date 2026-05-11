export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  correlationId?: string;
  timestamp: number;
}

export type LogSink = (record: LogRecord) => void;

const sinks: LogSink[] = [];
let correlationStack: string[] = [];

const consoleSink: LogSink = (record) => {
  const payload =
    record.data === undefined
      ? { correlationId: record.correlationId }
      : { correlationId: record.correlationId, ...record.data };
  switch (record.level) {
    case "debug":
      console.debug(record.message, payload);
      return;
    case "info":
      console.info(record.message, payload);
      return;
    case "warn":
      console.warn(record.message, payload);
      return;
    case "error":
      console.error(record.message, payload);
      return;
  }
};

function emit(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const record: LogRecord = {
    level,
    message,
    data,
    correlationId: correlationStack[correlationStack.length - 1],
    timestamp: Date.now(),
  };
  consoleSink(record);
  for (const sink of sinks) {
    try {
      sink(record);
    } catch {
      // sinks must never break the caller
    }
  }
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    emit("debug", message, data);
  },
  info(message: string, data?: Record<string, unknown>) {
    emit("info", message, data);
  },
  warn(message: string, data?: Record<string, unknown>) {
    emit("warn", message, data);
  },
  error(message: string, data?: Record<string, unknown>) {
    emit("error", message, data);
  },
  // Sync-only. The stack pops in the `finally` of the wrapping call, so any
  // `await` inside `fn` will see the popped value on resume. For async flows,
  // pass the correlation id explicitly through `data.correlation_id`.
  withCorrelationId<T>(id: string, fn: () => T): T {
    correlationStack.push(id);
    try {
      return fn();
    } finally {
      correlationStack.pop();
    }
  },
  registerSink(sink: LogSink): () => void {
    sinks.push(sink);
    return () => {
      const i = sinks.indexOf(sink);
      if (i >= 0) sinks.splice(i, 1);
    };
  },
  __resetForTests() {
    sinks.length = 0;
    correlationStack = [];
  },
};

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  if (err && typeof err === "object") {
    return { ...(err as Record<string, unknown>) };
  }
  return { value: String(err) };
}
