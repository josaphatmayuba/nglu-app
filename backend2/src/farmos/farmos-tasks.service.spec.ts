import { FarmosService } from "./farmos.service";

// Workflow critique : taches d'equipe (COMP-P1-010, couvert par P0-005).
// On verifie que createTask/updateTask gerent correctement done_at selon le statut
// et que le soft-delete passe par is_active.

function makeService(taskRow: any = null) {
  const inserts: any[] = [];
  const updates: any[] = [];
  const db: any = {
    insert: () => ({
      values: (vals: any) => { inserts.push(vals); return { $returningId: () => Promise.resolve([{ id: 1 }]) }; },
    }),
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve(taskRow ? [taskRow] : []) }),
      }),
    }),
    update: () => ({
      set: (vals: any) => ({ where: () => { updates.push(vals); return Promise.resolve(); } }),
    }),
  };
  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosService(db, {} as any, realtime, {} as any, {} as any);
  return { service, inserts, updates };
}

const ORG = 1;
const USER = 7;

describe("FarmosService tasks (P0-005)", () => {
  it("createTask pose done_at quand le statut est done", async () => {
    const { service, inserts } = makeService();
    await service.createTask({ title: "T", status: "done" }, ORG, USER);
    expect(inserts[0].doneAt).toBeInstanceOf(Date);
    expect(inserts[0].createdBy).toBe(USER);
  });

  it("createTask laisse done_at null pour un statut todo", async () => {
    const { service, inserts } = makeService();
    await service.createTask({ title: "T" }, ORG, USER);
    expect(inserts[0].doneAt).toBeNull();
    expect(inserts[0].status).toBe("todo");
  });

  it("updateTask vers done pose done_at", async () => {
    const { service, updates } = makeService({ id: 1, doneAt: null });
    await service.updateTask(1, { status: "done" }, ORG);
    expect(updates[0].status).toBe("done");
    expect(updates[0].doneAt).toBeInstanceOf(Date);
  });

  it("updateTask qui repasse hors done efface done_at", async () => {
    const { service, updates } = makeService({ id: 1, doneAt: new Date() });
    await service.updateTask(1, { status: "in_progress" }, ORG);
    expect(updates[0].status).toBe("in_progress");
    expect(updates[0].doneAt).toBeNull();
  });

  it("deleteTask fait un soft delete (is_active=0)", async () => {
    const { service, updates } = makeService({ id: 1 });
    await service.deleteTask(1, ORG);
    expect(updates[0].isActive).toBe(0);
  });

  it("updateTask sur une tache inexistante leve une erreur", async () => {
    const { service } = makeService(null);
    await expect(service.updateTask(999, { status: "done" }, ORG)).rejects.toThrow();
  });
});
