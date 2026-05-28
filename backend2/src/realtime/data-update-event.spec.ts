import {
  buildDataUpdatedEvent,
  validateDataUpdatedEvent,
  DATA_UPDATED_EVENT_TYPE,
  type DataUpdatedEvent,
} from "./data-update-event";
import { DATA_UPDATE_RULES } from "./data-update-rules";

describe("buildDataUpdatedEvent", () => {
  it("sets type to data.updated", () => {
    const event = buildDataUpdatedEvent({ entity: "property", action: "created", entityId: 1 });
    expect(event.type).toBe(DATA_UPDATED_EVENT_TYPE);
  });

  it("copies entity and action", () => {
    const event = buildDataUpdatedEvent({ entity: "unit", action: "deleted", entityId: 42 });
    expect(event.entity).toBe("unit");
    expect(event.action).toBe("deleted");
    expect(event.entityId).toBe(42);
  });

  it("inherits permissions and tags from DATA_UPDATE_RULES when not provided", () => {
    const event = buildDataUpdatedEvent({ entity: "lease", action: "updated", entityId: "L1" });
    const rule = DATA_UPDATE_RULES["lease"];
    expect(event.permissions).toEqual(expect.arrayContaining(rule.permissions));
    expect(event.tags).toEqual(expect.arrayContaining(rule.tags));
  });

  it("builds contract events with contract refresh tags", () => {
    const event = buildDataUpdatedEvent({ entity: "contract", action: "status_changed", entityId: 7 });
    expect(event.scope.module).toBe("propertyManagement");
    expect(event.tags).toEqual(expect.arrayContaining(["propertyManagement", "contracts", "leases"]));
    expect(event.permissions).toEqual(expect.arrayContaining(["readAll-propertyManagement"]));
  });

  it("uses provided permissions and tags, deduped", () => {
    const event = buildDataUpdatedEvent({
      entity: "property",
      action: "created",
      entityId: 1,
      permissions: ["read-x", "read-x", "write-x"],
      tags: ["foo", "foo", "bar"],
    });
    expect(event.permissions).toEqual(["read-x", "write-x"]);
    expect(event.tags).toEqual(["foo", "bar"]);
  });

  it("uses rule module when scope not provided", () => {
    const event = buildDataUpdatedEvent({ entity: "payment", action: "created", entityId: 99 });
    expect(event.scope.module).toBe(DATA_UPDATE_RULES["payment"].module);
  });

  it("overrides scope fields from input", () => {
    const event = buildDataUpdatedEvent({
      entity: "property",
      action: "updated",
      entityId: 5,
      scope: { module: "custom", propertyId: 7 },
    });
    expect(event.scope.module).toBe("custom");
    expect(event.scope.propertyId).toBe(7);
  });

  it("sets version to a positive number when not provided", () => {
    const before = Date.now();
    const event = buildDataUpdatedEvent({ entity: "maintenance", action: "created", entityId: 3 });
    const after = Date.now();
    expect(event.version).toBeGreaterThanOrEqual(before);
    expect(event.version).toBeLessThanOrEqual(after);
  });

  it("uses provided version", () => {
    const event = buildDataUpdatedEvent({
      entity: "property",
      action: "created",
      entityId: 1,
      version: 12345,
    });
    expect(event.version).toBe(12345);
  });

  it("sets actorUserId to null when not provided", () => {
    const event = buildDataUpdatedEvent({ entity: "unit", action: "created", entityId: 1 });
    expect(event.actorUserId).toBeNull();
  });

  it("stores provided actorUserId", () => {
    const event = buildDataUpdatedEvent({ entity: "unit", action: "created", entityId: 1, actorUserId: 42 });
    expect(event.actorUserId).toBe(42);
  });
});

describe("validateDataUpdatedEvent", () => {
  function validEvent(): DataUpdatedEvent {
    return {
      type: DATA_UPDATED_EVENT_TYPE,
      entity: "property",
      action: "created",
      entityId: 1,
      scope: { module: "propertyManagement" },
      permissions: ["readAll-propertyManagement"],
      tags: ["properties"],
      version: Date.now(),
      actorUserId: null,
    };
  }

  it("returns no failures for a valid event", () => {
    expect(validateDataUpdatedEvent(validEvent())).toHaveLength(0);
  });

  it("fails when type is wrong", () => {
    const e = { ...validEvent(), type: "wrong" as typeof DATA_UPDATED_EVENT_TYPE };
    expect(validateDataUpdatedEvent(e)).toContain("type must be data.updated");
  });

  it("fails when entity is unknown", () => {
    const e = { ...validEvent(), entity: "unknown" as "property" };
    expect(validateDataUpdatedEvent(e)).toContain("unknown entity: unknown");
  });

  it("fails when action is empty", () => {
    const e = { ...validEvent(), action: "" as "created" };
    expect(validateDataUpdatedEvent(e)).toContain("action is required");
  });

  it("fails when entityId is empty string", () => {
    const e = { ...validEvent(), entityId: "" };
    expect(validateDataUpdatedEvent(e)).toContain("entityId is required");
  });

  it("fails when permissions is empty", () => {
    const e = { ...validEvent(), permissions: [] };
    expect(validateDataUpdatedEvent(e)).toContain("permissions must be non-empty");
  });

  it("fails when tags is empty", () => {
    const e = { ...validEvent(), tags: [] };
    expect(validateDataUpdatedEvent(e)).toContain("tags must be non-empty");
  });

  it("fails when version is 0 or negative", () => {
    const e0 = { ...validEvent(), version: 0 };
    const eNeg = { ...validEvent(), version: -1 };
    expect(validateDataUpdatedEvent(e0)).toContain("version must be a positive timestamp");
    expect(validateDataUpdatedEvent(eNeg)).toContain("version must be a positive timestamp");
  });

  it("fails when scope.module is missing", () => {
    const e = { ...validEvent(), scope: { module: "" } };
    expect(validateDataUpdatedEvent(e)).toContain("scope.module is required");
  });
});
