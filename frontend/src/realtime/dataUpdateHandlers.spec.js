import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDataUpdateHandler } from "./dataUpdateHandlers";
import { loadContracts, loadPropertyManagement } from "../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { broadcastDataUpdated } from "./dataBroadcastChannel";

vi.mock("../redux/rtk/features/propertyManagement/propertyManagementSlice", () => ({
  loadContracts: vi.fn(() => ({ type: "propertyManagement/loadContracts" })),
  loadPropertyManagement: vi.fn(() => ({ type: "propertyManagement/loadAll" })),
}));

vi.mock("./dataBroadcastChannel", () => ({
  broadcastDataUpdated: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDataUpdateHandler", () => {
  it("reloads contracts when a contract realtime event arrives", () => {
    const dispatch = vi.fn();
    const handler = createDataUpdateHandler(dispatch);

    handler({ type: "data.updated", entity: "contract", tags: ["contracts"] });
    vi.advanceTimersByTime(600);

    expect(loadContracts).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "propertyManagement/loadContracts" });
    expect(loadPropertyManagement).not.toHaveBeenCalled();
    expect(broadcastDataUpdated).toHaveBeenCalledTimes(1);
  });

  it("reloads contracts and property management for full property contract events", () => {
    const dispatch = vi.fn();
    const handler = createDataUpdateHandler(dispatch);

    handler({ type: "data.updated", entity: "contract", tags: ["propertyManagement", "contracts", "leases"] });
    vi.advanceTimersByTime(600);

    expect(loadContracts).toHaveBeenCalledTimes(1);
    expect(loadPropertyManagement).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "propertyManagement/loadContracts" });
    expect(dispatch).toHaveBeenCalledWith({ type: "propertyManagement/loadAll" });
  });
});
