/**
 * Single choke point for error reporting. Emits one structured JSON line per error, which Vercel log
 * drains / Datadog / Logtail can index. To add Sentry later, call it here and nowhere else.
 * Never pass request bodies, tokens or card/payment payloads in `context`.
 */
export function reportError(error: unknown, context: Record<string, string | number | boolean | undefined> = {}) {
  const e = error instanceof Error ? error : new Error(String(error));
  console.error(JSON.stringify({ level: "error", ts: new Date().toISOString(), message: e.message, name: e.name, stack: e.stack?.split("\n").slice(0, 8).join("\n"), ...context }));
}
