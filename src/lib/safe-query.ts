/**
 * Runs a database query and returns `fallback` instead of throwing if it
 * fails (connection timeout, pool exhaustion, transient outage, etc).
 *
 * Detail pages call lookup queries from metadata/page rendering. A transient
 * database error should degrade to the page's explicit fallback rather than
 * crash the whole render. The diagnostic log records root-cause details but
 * never logs SQL text or bound query parameters.
 */
type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  cause?: unknown;
  errors?: unknown;
};

function errorLike(value: unknown): ErrorLike | null {
  return value !== null && typeof value === "object" ? (value as ErrorLike) : null;
}

function errorCode(value: unknown): string | number | undefined {
  const code = errorLike(value)?.code;
  return typeof code === "string" || typeof code === "number" ? code : undefined;
}

function errorName(value: unknown): string | undefined {
  const name = errorLike(value)?.name;
  return typeof name === "string" ? name : undefined;
}

function safeErrorMessage(value: unknown): string | undefined {
  const message = errorLike(value)?.message;
  if (typeof message !== "string" || !message.trim()) return undefined;

  // Drizzle's wrapper message embeds SQL and bound values. Never log that.
  if (/failed query:\s*(select|insert|update|delete|with)\b/i.test(message)) {
    return undefined;
  }

  return message
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "[redacted database URL]")
    .replace(/\bparams:\s*.*$/i, "params: [redacted]")
    .slice(0, 300);
}

function deepestCause(error: unknown): unknown {
  let current = error;
  const seen = new Set<object>();

  for (let depth = 0; depth < 5; depth += 1) {
    if (current === null || typeof current !== "object" || seen.has(current)) break;
    const currentObject = errorLike(current);
    if (!currentObject) break;
    seen.add(current);

    const nestedErrors = Array.isArray(currentObject.errors) ? currentObject.errors : [];
    const next = currentObject.cause ?? nestedErrors[0];
    if (!next || next === current) break;
    current = next;
  }

  return current;
}

export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const rootCause = deepestCause(error);

    console.error("[safeQuery] DB query threw — returning fallback instead of crashing.", {
      errorName: errorName(error) ?? (error instanceof Error ? error.name : typeof error),
      errorCode: errorCode(error),
      rootCauseName: errorName(rootCause),
      rootCauseCode: errorCode(rootCause),
      rootCauseMessage: safeErrorMessage(rootCause),
    });

    return fallback;
  }
}
