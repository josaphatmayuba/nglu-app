import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../config/env";
import {
  buildDataUpdatedEvent,
  DATA_UPDATE_CHANNEL,
  type BuildDataUpdatedEventInput,
} from "./data-update-event";

@Injectable()
export class RealtimeDataPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeDataPublisher.name);
  private redis: Redis | null = null;
  private disabledWarningLogged = false;

  async publishDataUpdated(input: BuildDataUpdatedEventInput) {
    const event = buildDataUpdatedEvent(input);
    const client = this.client();

    if (!client) {
      this.warnDisabled();
      return { published: false, event };
    }

    try {
      const channel = env.redis.dataUpdatesChannel || DATA_UPDATE_CHANNEL;
      if (client.status === "wait") {
        await client.connect();
      }
      await client.publish(channel, JSON.stringify(event));
      this.logger.log(`Published ${event.type} entity=${event.entity} id=${event.entityId} channel=${channel}`);
      return { published: true, event };
    } catch (error) {
      this.logger.warn(`Redis publish failed for data.updated: ${this.errorMessage(error)}`);
      return { published: false, event };
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  private client() {
    if (this.redis) return this.redis;
    if (!env.redis.url && !env.redis.host) return null;

    this.redis = env.redis.url
      ? new Redis(env.redis.url, this.options())
      : new Redis({
          ...this.options(),
          host: env.redis.host,
          port: env.redis.port,
          password: env.redis.password || undefined,
        });

    this.redis.on("error", (error) => {
      this.logger.warn(`Redis connection error: ${this.errorMessage(error)}`);
    });

    return this.redis;
  }

  private options() {
    return {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    };
  }

  private warnDisabled() {
    if (this.disabledWarningLogged) return;
    this.disabledWarningLogged = true;
    this.logger.warn("Redis data publisher disabled: configure REDIS_HOST or REDIS_URL to enable Pub/Sub.");
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
