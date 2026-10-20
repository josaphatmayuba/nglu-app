import { ConflictException } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

/**
 * Apercu des SMS avant envoi (bouton « Confirmer l'envoi »).
 *
 * Le principe : l'action d'envoi EXISTANTE est executee dans un contexte de
 * capture. CompatService.sendSms et SystemEmailService.send y enregistrent le
 * message au lieu de l'envoyer ; les ecritures metier (date de relance, date de
 * preavis...) sont sautees via isPreviewing(). Le texte montre est donc produit
 * par le meme code que l'envoi reel.
 *
 * A la confirmation, l'apercu est recalcule et son empreinte comparee a celle
 * que l'utilisateur a vue : si le texte ou les destinataires ont change entre
 * temps, rien ne part (409) et un nouvel apercu est demande.
 *
 * Hors de ce contexte (envois automatiques, anciens appels), rien ne change.
 */
export type CapturedSms = {
  phone: string;
  message: string;
  smsType: string;
  label: string | null;
};

type PreviewStore = { messages: CapturedSms[]; missing: string[] };

const store = new AsyncLocalStorage<PreviewStore>();

/** Vrai pendant le calcul d'un apercu : aucune ecriture metier ne doit avoir lieu. */
export function isPreviewing(): boolean {
  return store.getStore() !== undefined;
}

/** Appele par CompatService.sendSms : true = message capture, ne pas l'envoyer. */
export function captureSms(sms: CapturedSms): boolean {
  const current = store.getStore();
  if (!current) return false;
  current.messages.push(sms);
  return true;
}

/** Destinataire prevu sans numero : affiche « ne recevra pas le SMS ». */
export function notePreviewMissing(label: string) {
  store.getStore()?.missing.push(label);
}

// Jeu GSM 7 bits (de base) ; les caracteres d'extension comptent double.
// Meme table que domus-app/src/screens/communiques.jsx (smsInfo).
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

export function smsSegments(text: string) {
  const s = String(text || "");
  let septets = 0;
  let unicode = false;
  for (const ch of s) {
    if (GSM_BASIC.includes(ch)) septets += 1;
    else if (GSM_EXT.includes(ch)) septets += 2;
    else { unicode = true; break; }
  }
  const units = unicode ? [...s].length : septets;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
  return { unicode, length: [...s].length, segments };
}

function previewHash(messages: CapturedSms[]) {
  return createHash("sha256")
    .update(JSON.stringify(messages.map((m) => [m.phone, m.message])))
    .digest("hex");
}

async function capture(run: () => Promise<unknown>) {
  const current: PreviewStore = { messages: [], missing: [] };
  await store.run(current, run);
  return current;
}

/**
 * Point d'entree des endpoints d'envoi :
 * - { preview: true }  -> renvoie l'apercu, rien n'est envoye ;
 * - { previewHash }    -> recalcule l'apercu, refuse s'il differe, puis envoie ;
 * - ni l'un ni l'autre -> comportement historique (envoi direct).
 */
export async function withSmsPreview<T>(
  options: { preview?: boolean; previewHash?: string; smsDisabled?: () => Promise<boolean> },
  run: () => Promise<T>,
) {
  if (options.preview) {
    const { messages, missing } = await capture(run);
    return {
      preview: true as const,
      hash: previewHash(messages),
      smsDisabled: options.smsDisabled ? await options.smsDisabled() : false,
      missing,
      messages: messages.map((m) => ({ phone: m.phone, label: m.label, text: m.message, ...smsSegments(m.message) })),
    };
  }
  if (options.previewHash) {
    const { messages } = await capture(run);
    if (previewHash(messages) !== options.previewHash) {
      throw new ConflictException("Le message a change depuis l'apercu. Verifiez le nouvel apercu avant d'envoyer.");
    }
  }
  return run();
}
