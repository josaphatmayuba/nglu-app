import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend2/src/realtime/data-update-event.ts"), "utf8");
const publisherSource = readFileSync(resolve("backend2/src/realtime/realtime-data-publisher.service.ts"), "utf8");
const required = [
  'DATA_UPDATE_CHANNEL = "data-updates"',
  'DATA_UPDATED_EVENT_TYPE = "data.updated"',
  "export type DataUpdatedEvent",
  "entity: DataUpdateEntity",
  "action: DataUpdateAction",
  "entityId: number | string",
  "scope: DataUpdateScope",
  "permissions: string[]",
  "tags: string[]",
  "version: number",
  "actorUserId?: number | null",
  "buildDataUpdatedEvent",
  "validateDataUpdatedEvent",
];

const missing = required.filter((pattern) => !source.includes(pattern));
const publisherMissing = [
  "RealtimeDataPublisher",
  "publishDataUpdated",
  "Redis data publisher disabled",
  "Redis publish failed",
].filter((pattern) => !publisherSource.includes(pattern));

if (missing.length > 0 || publisherMissing.length > 0) {
  console.error("Data update event contract check failed:");
  for (const pattern of missing) console.error(`- missing: ${pattern}`);
  for (const pattern of publisherMissing) console.error(`- publisher missing: ${pattern}`);
  process.exit(1);
}

console.log("Data update event contract check passed.");
