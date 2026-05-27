import { RealtimeDataPublisher } from "./realtime-data-publisher.service";
import { EventBusService } from "./event-bus.service";
import { DATA_UPDATED_EVENT_TYPE } from "./data-update-event";

jest.mock("../config/env", () => ({
  env: {
    redis: {
      enabled: false,
      url: null,
      host: null,
      port: 6379,
      password: null,
      dataUpdatesChannel: null,
    },
  },
}));

describe("RealtimeDataPublisher — Redis disabled", () => {
  let publisher: RealtimeDataPublisher;
  let bus: EventBusService;

  beforeEach(() => {
    bus = new EventBusService();
    publisher = new RealtimeDataPublisher(bus);
  });

  afterEach(async () => {
    await publisher.onModuleDestroy();
    bus.onModuleDestroy();
  });

  it("always emits the event in-process via EventBusService", async () => {
    const received: unknown[] = [];
    bus.subscribe(DATA_UPDATED_EVENT_TYPE, (e) => received.push(e));

    await publisher.publishDataUpdated({ entity: "property", action: "created", entityId: 1 });

    expect(received).toHaveLength(1);
  });

  it("returns published=false when Redis is disabled", async () => {
    const result = await publisher.publishDataUpdated({
      entity: "unit",
      action: "updated",
      entityId: 5,
    });
    expect(result.published).toBe(false);
  });

  it("returns the built event regardless of Redis state", async () => {
    const result = await publisher.publishDataUpdated({
      entity: "lease",
      action: "deleted",
      entityId: "L42",
    });
    expect(result.event.type).toBe(DATA_UPDATED_EVENT_TYPE);
    expect(result.event.entity).toBe("lease");
    expect(result.event.action).toBe("deleted");
    expect(result.event.entityId).toBe("L42");
  });

  it("event contains non-empty permissions and tags", async () => {
    const result = await publisher.publishDataUpdated({
      entity: "maintenance",
      action: "created",
      entityId: 10,
    });
    expect(result.event.permissions.length).toBeGreaterThan(0);
    expect(result.event.tags.length).toBeGreaterThan(0);
  });
});

describe("RealtimeDataPublisher — Redis publish error", () => {
  let publisher: RealtimeDataPublisher;
  let bus: EventBusService;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(async () => {
    await publisher?.onModuleDestroy();
    bus?.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it("does not throw when Redis publish throws — mutation continues", async () => {
    jest.doMock("../config/env", () => ({
      env: {
        redis: {
          enabled: true,
          url: null,
          host: "127.0.0.1",
          port: 9999,
          password: null,
          dataUpdatesChannel: "data-updates",
        },
      },
    }));

    const { RealtimeDataPublisher: Publisher } = await import("./realtime-data-publisher.service");
    const { EventBusService: Bus } = await import("./event-bus.service");

    bus = new Bus();
    publisher = new Publisher(bus);

    // Spy on the private redis client to simulate a publish failure
    const fakeRedis = {
      status: "ready",
      publish: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    (publisher as unknown as { redis: unknown }).redis = fakeRedis;

    const result = await publisher.publishDataUpdated({
      entity: "property",
      action: "created",
      entityId: 1,
    });

    // Must not throw — returns published:false
    expect(result.published).toBe(false);
    expect(result.event).toBeDefined();
  });
});
