type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const SENSITIVE_KEY =
  /authorization|cookie|email|password|secret|token|api.?key|user.?id/i;

function redact(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)],
      ),
    );
  }
  return value;
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
) {
  const safeContext = redact(context) as LogContext;
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeContext,
  });

  console[level](payload);
}

export const redactLogContext = (context: LogContext) =>
  redact(context) as LogContext;
