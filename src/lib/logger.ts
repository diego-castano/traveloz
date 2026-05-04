/**
 * Structured logger for server actions, API routes, and instrumentation.
 *
 * Why hand-rolled instead of pino:
 *   • zero dependencies (works in Vercel/Railway edge + node without bundling
 *     pino's worker thread machinery)
 *   • emits single-line JSON in production for log aggregators (Railway,
 *     Datadog, Better Stack) and a friendlier coloured form locally
 *   • structured fields instead of free-form strings — every log line carries
 *     `event`, `op`, optional `userId/brandId/requestId`, and an `err` block
 *     when something throws
 *
 * Usage:
 *   const log = logger.child({ op: "package.create", userId, brandId });
 *   log.info("creating", { titulo });
 *   try { ... } catch (err) { log.error("failed", err); throw err; }
 *
 * For server actions we expose `withLogging(op, fn)` which wraps the action
 * body with timing + automatic error capture so callers don't need try/catch
 * just to get observability.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const isProd = process.env.NODE_ENV === "production";

interface LogContext {
  op?: string;
  userId?: string;
  brandId?: string;
  requestId?: string;
  [key: string]: unknown;
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err.cause ? { cause: serializeError(err.cause) } : {}),
    };
  }
  return { message: String(err) };
}

function emit(
  level: LogLevel,
  context: LogContext,
  msg: string,
  extra?: Record<string, unknown> | unknown,
): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;

  const isErrorPayload = extra instanceof Error || (extra && typeof extra === "object" && "stack" in (extra as Record<string, unknown>));
  const fields = isErrorPayload
    ? { err: serializeError(extra) }
    : (extra as Record<string, unknown> | undefined);

  if (isProd) {
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...context,
      ...(fields ?? {}),
    };
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](JSON.stringify(payload));
    return;
  }

  // Dev: friendly coloured one-liner. Keeps fields visible without flooding.
  const colour =
    level === "error"
      ? "\x1b[31m"
      : level === "warn"
        ? "\x1b[33m"
        : level === "info"
          ? "\x1b[36m"
          : "\x1b[90m";
  const reset = "\x1b[0m";
  const head = `${colour}[${level.toUpperCase()}]${reset}`;
  const tag = context.op ? ` ${context.op}` : "";
  const ctx = Object.entries(context)
    .filter(([k]) => k !== "op")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const tail = fields ? " " + JSON.stringify(fields) : "";
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    `${head}${tag} ${msg}${ctx ? " | " + ctx : ""}${tail}`,
  );
}

export interface Logger {
  child(extra: LogContext): Logger;
  debug(msg: string, extra?: Record<string, unknown> | unknown): void;
  info(msg: string, extra?: Record<string, unknown> | unknown): void;
  warn(msg: string, extra?: Record<string, unknown> | unknown): void;
  error(msg: string, extra?: Record<string, unknown> | unknown): void;
}

function makeLogger(context: LogContext = {}): Logger {
  return {
    child: (extra) => makeLogger({ ...context, ...extra }),
    debug: (msg, extra) => emit("debug", context, msg, extra),
    info: (msg, extra) => emit("info", context, msg, extra),
    warn: (msg, extra) => emit("warn", context, msg, extra),
    error: (msg, extra) => emit("error", context, msg, extra),
  };
}

export const logger: Logger = makeLogger();

/**
 * Wrap a server action body with logging + timing. The wrapper:
 *   1. logs `op.start` at debug,
 *   2. logs `op.ok` at info on success with duration_ms,
 *   3. logs `op.fail` at error on throw with duration_ms + serialized error,
 *      then re-throws so the caller still sees the original error.
 *
 * Use sparingly — for the hot path (read queries) the start/ok pair adds noise.
 * Reserve it for writes and anything that mutates state.
 */
export async function withLogging<T>(
  op: string,
  ctx: LogContext,
  fn: (log: Logger) => Promise<T>,
): Promise<T> {
  const log = logger.child({ op, ...ctx });
  const started = Date.now();
  log.debug(`${op}.start`);
  try {
    const result = await fn(log);
    log.info(`${op}.ok`, { duration_ms: Date.now() - started });
    return result;
  } catch (err) {
    log.error(`${op}.fail`, { duration_ms: Date.now() - started, err: serializeError(err) });
    throw err;
  }
}
