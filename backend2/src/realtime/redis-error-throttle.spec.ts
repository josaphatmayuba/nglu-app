import { EventEmitter } from "events";
import { attachThrottledRedisErrorLog, redisRetryStrategy } from "./redis-error-throttle";

describe("redis-error-throttle", () => {
  it("backoff plafonne a 60s", () => {
    expect(redisRetryStrategy(1)).toBe(1000);
    expect(redisRetryStrategy(30)).toBe(30000);
    expect(redisRetryStrategy(500)).toBe(60000);
  });

  it("1 log au premier echec, puis 1/min avec compteur, puis reconnecte", () => {
    const redis = new EventEmitter();
    const logger = { warn: jest.fn(), log: jest.fn() };
    let t = 1_000_000;
    attachThrottledRedisErrorLog(redis, logger, (e) => (e as Error).message, () => t);
    const err = new Error("EAI_AGAIN");

    redis.emit("error", err);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) {
      t += 7000;
      redis.emit("error", err);
    }
    expect(logger.warn).toHaveBeenCalledTimes(1);

    t += 30_000; // > 60s depuis le 1er log
    redis.emit("error", err);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn.mock.calls[1][0]).toContain("6 echecs");

    redis.emit("ready");
    expect(logger.log).toHaveBeenCalledWith("Redis reconnecté");
    redis.emit("ready");
    expect(logger.log).toHaveBeenCalledTimes(1);

    redis.emit("error", err);
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });
});
