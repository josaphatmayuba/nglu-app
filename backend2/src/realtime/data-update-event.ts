import {
  DATA_UPDATE_RULES,
  type DataUpdateEntity,
} from "./data-update-rules";

export const DATA_UPDATE_CHANNEL = "data-updates";
export const DATA_UPDATED_EVENT_TYPE = "data.updated";

export type DataUpdateAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "status_changed";

export type DataUpdateScope = {
  module: string;
  tenantId?: number | null;
  propertyId?: number | null;
  unitId?: number | null;
};

export type DataUpdatedEvent = {
  type: typeof DATA_UPDATED_EVENT_TYPE;
  entity: DataUpdateEntity;
  action: DataUpdateAction;
  entityId: number | string;
  scope: DataUpdateScope;
  permissions: string[];
  tags: string[];
  version: number;
  actorUserId?: number | null;
};

export type BuildDataUpdatedEventInput = {
  entity: DataUpdateEntity;
  action: DataUpdateAction;
  entityId: number | string;
  scope?: Partial<DataUpdateScope>;
  permissions?: string[];
  tags?: string[];
  version?: number;
  actorUserId?: number | null;
};

export function buildDataUpdatedEvent(input: BuildDataUpdatedEventInput): DataUpdatedEvent {
  const rule = DATA_UPDATE_RULES[input.entity];

  return {
    type: DATA_UPDATED_EVENT_TYPE,
    entity: input.entity,
    action: input.action,
    entityId: input.entityId,
    scope: {
      module: input.scope?.module ?? rule.module,
      tenantId: input.scope?.tenantId ?? null,
      propertyId: input.scope?.propertyId ?? null,
      unitId: input.scope?.unitId ?? null,
    },
    permissions: dedupe(input.permissions ?? rule.permissions),
    tags: dedupe(input.tags ?? rule.tags),
    version: input.version ?? Date.now(),
    actorUserId: input.actorUserId ?? null,
  };
}

export function validateDataUpdatedEvent(event: DataUpdatedEvent): string[] {
  const failures: string[] = [];

  if (event.type !== DATA_UPDATED_EVENT_TYPE) failures.push("type must be data.updated");
  if (!DATA_UPDATE_RULES[event.entity]) failures.push(`unknown entity: ${event.entity}`);
  if (!event.action) failures.push("action is required");
  if (event.entityId === "" || event.entityId === null || event.entityId === undefined) {
    failures.push("entityId is required");
  }
  if (!event.scope?.module) failures.push("scope.module is required");
  if (!event.permissions?.length) failures.push("permissions must be non-empty");
  if (!event.tags?.length) failures.push("tags must be non-empty");
  if (!Number.isFinite(event.version) || event.version <= 0) {
    failures.push("version must be a positive timestamp");
  }

  return failures;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values)).filter(Boolean);
}
