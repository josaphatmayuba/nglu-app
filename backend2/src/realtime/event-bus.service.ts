import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter } from "events";
import type { DataUpdatedEvent } from "./data-update-event";
import type { PermissionsUpdatedEvent } from "./permissions-update-event";

export type RealtimeEvent = DataUpdatedEvent | PermissionsUpdatedEvent;

const MAX_LISTENERS = 500; // one per SSE connection

@Injectable()
export class EventBusService implements OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(MAX_LISTENERS);
  }

  publish(event: RealtimeEvent): void {
    this.emitter.emit(event.type, event);
  }

  subscribe<T extends RealtimeEvent>(
    eventType: string,
    handler: (event: T) => void,
  ): () => void {
    this.emitter.on(eventType, handler);
    return () => this.emitter.off(eventType, handler);
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
  }
}
