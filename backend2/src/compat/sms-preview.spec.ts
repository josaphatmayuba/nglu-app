import { ConflictException } from "@nestjs/common";
import { captureSms, isPreviewing, notePreviewMissing, smsSegments, withSmsPreview } from "./sms-preview";

// Faux envoi : reproduit l'appel CompatService.sendSms (capture d'abord, sinon envoi reel).
function makeAction(text: () => string) {
  const sent: string[] = [];
  const writes: string[] = [];
  const run = async () => {
    const message = text();
    if (!captureSms({ phone: "+243810000000", message, smsType: "payment_reminder", label: "Locataire · A" })) {
      sent.push(message);
    }
    notePreviewMissing("Contact d'urgence");
    if (!isPreviewing()) writes.push("lastOverdueReminderDate");
    return { ok: true };
  };
  return { run, sent, writes };
}

describe("withSmsPreview", () => {
  it("hors apercu : comportement historique, envoi direct (envois automatiques inchanges)", async () => {
    const a = makeAction(() => "Bonjour");
    expect(captureSms({ phone: "x", message: "y", smsType: "t", label: null })).toBe(false);
    expect(await withSmsPreview({}, a.run)).toEqual({ ok: true });
    expect(a.sent).toEqual(["Bonjour"]);
    expect(a.writes).toEqual(["lastOverdueReminderDate"]);
  });

  it("apercu : renvoie le texte exact, n'envoie rien et n'ecrit rien", async () => {
    const a = makeAction(() => "Bonjour A");
    const res: any = await withSmsPreview({ preview: true, smsDisabled: async () => true }, a.run);
    expect(res.preview).toBe(true);
    expect(res.smsDisabled).toBe(true);
    expect(res.missing).toEqual(["Contact d'urgence"]);
    expect(res.messages).toEqual([
      { phone: "+243810000000", label: "Locataire · A", text: "Bonjour A", unicode: false, length: 9, segments: 1 },
    ]);
    expect(a.sent).toEqual([]);
    expect(a.writes).toEqual([]);
  });

  it("confirmation : envoie le texte vu a l'apercu", async () => {
    const a = makeAction(() => "Bonjour A");
    const { hash }: any = await withSmsPreview({ preview: true }, a.run);
    await withSmsPreview({ previewHash: hash }, a.run);
    expect(a.sent).toEqual(["Bonjour A"]);
    expect(a.writes).toEqual(["lastOverdueReminderDate"]);
  });

  it("confirmation refusee si le texte a change depuis l'apercu", async () => {
    let text = "Montant du : 100 USD";
    const a = makeAction(() => text);
    const { hash }: any = await withSmsPreview({ preview: true }, a.run);
    text = "Montant du : 50 USD";
    await expect(withSmsPreview({ previewHash: hash }, a.run)).rejects.toBeInstanceOf(ConflictException);
    expect(a.sent).toEqual([]);
  });
});

describe("smsSegments", () => {
  it("GSM 7 bits : 160 caracteres = 1 SMS, 161 = 2", () => {
    expect(smsSegments("a".repeat(160)).segments).toBe(1);
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
  });

  it("une ellipse ou un emoji passe en unicode : 70 caracteres par SMS", () => {
    const s = smsSegments(`${"a".repeat(80)}…`);
    expect(s.unicode).toBe(true);
    expect(s.segments).toBe(2);
  });
});
