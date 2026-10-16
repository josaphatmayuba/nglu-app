import { BadRequestException, ConflictException } from "@nestjs/common";
import { AnnouncementsService } from "./announcements.service";

type Fake = { selectQueue: any[][]; inserts: any[]; updates: any[]; affected: number; db: any };

function makeFake(selectQueue: any[][] = []): Fake {
  const f: Fake = { selectQueue, inserts: [], updates: [], affected: 1, db: null };
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        return () => p;
      },
    });
    return p;
  };
  f.db = {
    select: () => chain(() => f.selectQueue.shift() ?? []),
    update: () => ({
      set: (v: any) => {
        f.updates.push(v);
        return chain(() => [{ affectedRows: f.affected }]);
      },
    }),
    insert: () => ({
      values: (v: any) => {
        f.inserts.push(v);
        return { $returningId: () => Promise.resolve([{ id: 7 }]) };
      },
    }),
  };
  return f;
}

function rcpt(customerId: number, name: string, phone: string | null) {
  return { customerId, name, phone, firstName: name, civilName: name, email: null, isPrincipal: true };
}

function makeService(fake: Fake, recipients: any[], smsEnabled = 1) {
  const svc = Object.create(AnnouncementsService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn(), error: jest.fn() };
  svc.sms = { sendSms: jest.fn().mockResolvedValue({ success: true }) };
  svc.ownerNotifications = { leaseRecipients: jest.fn().mockResolvedValue(new Map([[1, recipients]])) };
  svc.propertyManagement = { resendSmsLog: jest.fn() };
  svc.smsEnabled = jest.fn().mockResolvedValue(smsEnabled !== 0);
  return svc as AnnouncementsService & Record<string, any>;
}

// select queue : [baux actifs], [fiches clients (selection seulement)], [quota du jour]
describe("AnnouncementsService", () => {
  it("dedoublonne par numero E.164 et exclut sans telephone / invalide", async () => {
    const fake = makeFake([[{ id: 1 }]]);
    const svc = makeService(fake, [
      rcpt(1, "A", "0991234567"),
      rcpt(2, "B", "+243 991 234 567"), // meme numero que A
      rcpt(3, "C", null),
      rcpt(4, "D", "12"),
    ]);
    const res = await svc.preview({ propertyId: 5 }, 1, "all");
    expect(res.count).toBe(1);
    expect(res.duplicates).toBe(1);
    expect(res.recipients[0]).toMatchObject({ tenantId: 1, phone: "+243991234567" });
    expect(res.excluded).toEqual([
      { tenantId: 3, name: "C", reason: "no_phone" },
      { tenantId: 4, name: "D", reason: "invalid_phone" },
    ]);
  });

  it("refuse l'envoi si SMS desactives", async () => {
    const svc = makeService(makeFake(), [], 0);
    await expect(svc.create({ propertyId: 5, message: "Bonjour" }, 1, 9, "all")).rejects.toThrow(/désactivé/);
  });

  it("refuse message vide ou trop long", async () => {
    const svc = makeService(makeFake(), []);
    await expect(svc.create({ propertyId: 5, message: "   " }, 1, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create({ propertyId: 5, message: "x".repeat(481) }, 1, 9, "all")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuse une selection hors organisation / sans bail actif", async () => {
    const fake = makeFake([[{ id: 1 }]]);
    const svc = makeService(fake, [rcpt(1, "A", "0991234567")]);
    await expect(svc.preview({ tenantIds: [1, 999] }, 1, "all")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse propertyId ET tenantIds, ou aucun des deux", async () => {
    const svc = makeService(makeFake(), []);
    await expect(svc.preview({ propertyId: 1, tenantIds: [1] }, 1, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.preview({}, 1, "all")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("cree l'annonce (queued) et repond avant l'envoi", async () => {
    jest.useFakeTimers();
    try {
      const fake = makeFake([[{ id: 1 }], [{ total: "0" }]]);
      const svc = makeService(fake, [rcpt(1, "A", "0991234567"), rcpt(3, "C", null)]);
      const res = await svc.create({ propertyId: 5, message: "  Coupure d'eau  " }, 1, 9, "all");
      expect(res).toEqual({ id: 7, recipientsCount: 1 });
      expect(fake.inserts[0]).toMatchObject({
        organizationId: 1,
        message: "Coupure d'eau",
        status: "queued",
        skippedCount: 1,
        audience: "property",
      });
      expect((svc as any).sms.sendSms).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("refuse la creation au-dela du quota quotidien", async () => {
    const fake = makeFake([[{ id: 1 }], [{ total: "999" }]]);
    const svc = makeService(fake, [rcpt(1, "A", "0991234567"), rcpt(2, "B", "0997654321")]);
    await expect(svc.create({ propertyId: 5, message: "Bonjour" }, 1, 9, "all")).rejects.toThrow(/Quota/);
    expect(fake.inserts).toHaveLength(0);
  });

  it("retire les caracteres de controle du message (garde saut de ligne)", async () => {
    jest.useFakeTimers();
    try {
      const fake = makeFake([[{ id: 1 }], [{ total: "0" }]]);
      const svc = makeService(fake, [rcpt(1, "A", "0991234567")]);
      await svc.create({ propertyId: 5, message: "a\u0000b\u0007\nc" }, 1, 9, "all");
      expect(fake.inserts[0].message).toBe("ab\nc");
    } finally {
      jest.useRealTimers();
    }
  });

  it("au boot, finalise les annonces bloquees depuis sms_logs", async () => {
    const fake = makeFake([
      [{ id: 3, organizationId: 1 }],
      [
        { recipient: "+1", status: "sent" },
        { recipient: "+2", status: "failed" },
        { recipient: "+2", status: "failed" },
        { recipient: "+3", status: "failed" },
        { recipient: "+3", status: "sent" },
      ],
    ]);
    const svc = makeService(fake, []);
    await svc.onModuleInit();
    expect(fake.updates).toContainEqual({ sentCount: 2, failedCount: 1, status: "done" });
  });

  it("onModuleInit ne leve jamais d'erreur", async () => {
    const fake = makeFake();
    fake.db.select = () => {
      throw new Error("db down");
    };
    const svc = makeService(fake, []);
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
  });

  describe("resendFailed", () => {
    const ann = { id: 3, status: "done" };
    it("409 si la prise atomique ne touche aucune ligne", async () => {
      const fake = makeFake([[ann], [{ id: 10, recipient: "+1", status: "failed" }]]);
      fake.affected = 0;
      const svc = makeService(fake, []);
      await expect(svc.resendFailed(3, 1, "all")).rejects.toBeInstanceOf(ConflictException);
    });

    it("ne renvoie pas un numero ayant deja 3 tentatives", async () => {
      const fake = makeFake([
        [ann],
        [
          { id: 10, recipient: "+1", status: "failed" },
          { id: 11, recipient: "+1", status: "failed" },
          { id: 12, recipient: "+1", status: "failed" },
          { id: 13, recipient: "+2", status: "failed" },
        ],
      ]);
      const svc = makeService(fake, []);
      jest.spyOn(svc as any, "runResend").mockResolvedValue(undefined);
      const res = await svc.resendFailed(3, 1, "all");
      expect(res).toEqual({ id: 3, retrying: 1 });
    });
  });
});
