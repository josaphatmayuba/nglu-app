type LoggerLike = { warn(message: string): void; log(message: string): void };
type EmitterLike = { on(event: string, listener: (...args: any[]) => void): unknown };

export const REDIS_ERROR_LOG_INTERVAL_MS = 60_000;

/** Reconnect backoff: min(times*1000, 60000) ms. */
export function redisRetryStrategy(times: number) {
  return Math.min(times * 1000, 60_000);
}

/**
 * Throttle "Redis connection error" logs: first failure logged, then at most
 * one per interval with the failure count since the last log; one log on recovery.
 */
export function attachThrottledRedisErrorLog(
  redis: EmitterLike,
  logger: LoggerLike,
  errorMessage: (error: unknown) => string,
  now: () => number = Date.now,
  intervalMs = REDIS_ERROR_LOG_INTERVAL_MS,
) {
  let failing = false;
  let lastLogAt = 0;
  let suppressed = 0;

  redis.on("error", (error: unknown) => {
    const t = now();
    if (!failing) {
      failing = true;
      lastLogAt = t;
      suppressed = 0;
      logger.warn(`Redis connection error: ${errorMessage(error)}`);
      return;
    }
    suppressed += 1;
    if (t - lastLogAt >= intervalMs) {
      logger.warn(`Redis connection error: ${errorMessage(error)} (${suppressed} echecs depuis le dernier log)`);
      lastLogAt = t;
      suppressed = 0;
    }
  });

  redis.on("ready", () => {
    if (!failing) return;
    failing = false;
    suppressed = 0;
    logger.log("Redis reconnecté");
  });
}
