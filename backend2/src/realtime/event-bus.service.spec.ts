import { EventBusService } from "./event-bus.service";
import { DATA_UPDATED_EVENT_TYPE, type DataUpdatedEvent } from "./data-update-event";
import { DATA_UPDATE_RULES } from "./data-update-rules";

function makeEvent(overrides: Partial<DataUpdatedEvent> = {}): DataUpdatedEvent {
  return {
    type: DATA_UPDATED_EVENT_TYPE,
    entity: "property",
    action: "created",
    entityId: 1,
    scope: { module: "propertyManagement" },
    permissions: DATA_UPDATE_RULES["property"].permissions,
    tags: DATA_UPDATE_RULES["property"].tags,
    version: Date.now(),
    actorUserId: null,
    ...overrides,
  };
}

describe("EventBusService", () => {
  let bus: EventBusService;

  beforeEach(() => {
    bus = new EventBusService();
  });

  afterEach(() => {
    bus.onModuleDestroy();
  });

  it("delivers event to subscriber", () => {
    const received: DataUpdatedEvent[] = [];
    bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => received.push(e));
    const event = makeEvent();
    bus.publish(event);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  it("delivers to multiple subscribers", () => {
    const a: DataUpdatedEvent[] = [];
    const b: DataUpdatedEvent[] = [];
    bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => a.push(e));
    bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => b.push(e));
    bus.publish(makeEvent());
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("does not deliver after unsubscribe", () => {
    const received: DataUpdatedEvent[] = [];
    const unsubscribe = bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => received.push(e));
    unsubscribe();
    bus.publish(makeEvent());
    expect(received).toHaveLength(0);
  });

  it("does not deliver events of a different type", () => {
    const received: DataUpdatedEvent[] = [];
    bus.subscribe<DataUpdatedEvent>("other.event", (e) => received.push(e));
    bus.publish(makeEvent());
    expect(received).toHaveLength(0);
  });

  it("delivers multiple events in order", () => {
    const received: number[] = [];
    bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => received.push(e.entityId as number));
    bus.publish(makeEvent({ entityId: 1 }));
    bus.publish(makeEvent({ entityId: 2 }));
    bus.publish(makeEvent({ entityId: 3 }));
    expect(received).toEqual([1, 2, 3]);
  });

  it("onModuleDestroy removes all listeners (no delivery after destroy)", () => {
    const received: DataUpdatedEvent[] = [];
    bus.subscribe<DataUpdatedEvent>(DATA_UPDATED_EVENT_TYPE, (e) => received.push(e));
    bus.onModuleDestroy();
    bus.publish(makeEvent());
    expect(received).toHaveLength(0);
  });
});
