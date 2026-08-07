import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { signatureRequests, signatureSignatures } from "../database/schema";
import type { Database } from "../database/types";

/**
 * Les deux cases a signer sont fixes et definies par le produit : la demande
 * porte une signature "pour Bianca" et une "pour Liam". Elles ne sont pas
 * saisies par l'utilisateur, donc pas stockees sur l'entete : les figer ici
 * garantit que la page publique et l'ecran admin parlent des memes cles.
 */
export const SIGNATURE_PARTIES = [
  { key: "bianca", label: "Bianca" },
  { key: "liam", label: "Liam" },
] as const;

const PARTY_KEYS = new Set(SIGNATURE_PARTIES.map((p) => p.key as string));

/** Un data URL PNG produit par un canvas mobile pese quelques dizaines de Ko. */
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

@Injectable()
export class SignaturesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Cree une demande et son lien public. Le token est le seul secret du lien. */
  async create(input: { title: string; body?: string }, orgId: number, userId?: number) {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException("Le titre est obligatoire");

    const publicToken = randomUUID().replace(/-/g, "");
    const [row] = await this.db.insert(signatureRequests).values({
      organizationId: orgId,
      publicToken,
      title,
      body: input.body?.trim() || null,
      createdBy: userId ?? null,
    });

    return this.findOne(Number((row as { insertId: number }).insertId), orgId);
  }

  /** Liste des demandes de l'organisation, avec l'avancement des signatures. */
  async list(orgId: number) {
    const rows = await this.db
      .select()
      .from(signatureRequests)
      .where(and(eq(signatureRequests.organizationId, orgId), eq(signatureRequests.isActive, 1)))
      .orderBy(desc(signatureRequests.id));

    return Promise.all(rows.map((row) => this.withSignatures(row)));
  }

  /** Detail d'une demande cote admin (signatures tracees incluses). */
  async findOne(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(signatureRequests)
      .where(and(eq(signatureRequests.id, id), eq(signatureRequests.organizationId, orgId)))
      .limit(1);

    if (!row || row.isActive !== 1) throw new NotFoundException("Demande introuvable");
    return this.withSignatures(row);
  }

  /**
   * Resolution du lien public. Aucune verification d'organisation ici : le token
   * EST l'autorisation. On ne renvoie que ce qui doit s'afficher sur la page.
   */
  async findByToken(token: string) {
    const row = await this.requireByToken(token);
    const signed = await this.signaturesFor(row.id);

    return {
      title: row.title,
      body: row.body,
      status: row.status,
      completedAt: row.completedAt,
      parties: SIGNATURE_PARTIES.map((party) => {
        const match = signed.find((s) => s.partyKey === party.key);
        return {
          key: party.key,
          label: party.label,
          signed: Boolean(match),
          signedAt: match?.signedAt ?? null,
          signerName: match?.signerName ?? null,
        };
      }),
    };
  }

  /**
   * Depose une signature. La contrainte UNIQUE (request_id, party_key) est la
   * garantie reelle contre le double envoi ; le pre-check ne sert qu'a rendre
   * l'erreur lisible en cas de course entre deux onglets.
   */
  async sign(
    token: string,
    input: { partyKey: string; signatureData: string; signerName?: string },
    meta: { ip?: string; userAgent?: string },
  ) {
    const row = await this.requireByToken(token);

    if (!PARTY_KEYS.has(input.partyKey)) throw new BadRequestException("Signataire inconnu");

    const party = SIGNATURE_PARTIES.find((p) => p.key === input.partyKey)!;
    const data = input.signatureData ?? "";
    if (!data.startsWith("data:image/png;base64,")) {
      throw new BadRequestException("Signature invalide");
    }
    if (Buffer.byteLength(data, "utf8") > MAX_SIGNATURE_BYTES) {
      throw new BadRequestException("Signature trop volumineuse");
    }

    const already = await this.signaturesFor(row.id);
    if (already.some((s) => s.partyKey === party.key)) {
      throw new ConflictException(`La signature pour ${party.label} a deja ete deposee`);
    }

    try {
      await this.db.insert(signatureSignatures).values({
        requestId: row.id,
        partyKey: party.key,
        partyLabel: party.label,
        signerName: input.signerName?.trim() || null,
        signatureData: data,
        ipAddress: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent ?? null,
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "ER_DUP_ENTRY") {
        throw new ConflictException(`La signature pour ${party.label} a deja ete deposee`);
      }
      throw err;
    }

    const total = already.length + 1;
    const completed = total >= SIGNATURE_PARTIES.length;
    await this.db
      .update(signatureRequests)
      .set({
        status: completed ? "completed" : "partial",
        completedAt: completed ? new Date() : null,
      })
      .where(eq(signatureRequests.id, row.id));

    return this.findByToken(token);
  }

  /** Soft delete (regle projet : jamais de DELETE physique). */
  async deactivate(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(signatureRequests)
      .set({ isActive: 0 })
      .where(and(eq(signatureRequests.id, id), eq(signatureRequests.organizationId, orgId)));
    return { success: true };
  }

  private async requireByToken(token: string) {
    const [row] = await this.db
      .select()
      .from(signatureRequests)
      .where(eq(signatureRequests.publicToken, token))
      .limit(1);

    if (!row || row.isActive !== 1) throw new NotFoundException("Lien invalide ou expire");
    return row;
  }

  private signaturesFor(requestId: number) {
    return this.db
      .select()
      .from(signatureSignatures)
      .where(eq(signatureSignatures.requestId, requestId));
  }

  private async withSignatures(row: typeof signatureRequests.$inferSelect) {
    const signed = await this.signaturesFor(row.id);
    return {
      ...row,
      signatures: SIGNATURE_PARTIES.map((party) => {
        const match = signed.find((s) => s.partyKey === party.key);
        return {
          key: party.key,
          label: party.label,
          signed: Boolean(match),
          signedAt: match?.signedAt ?? null,
          signerName: match?.signerName ?? null,
          signatureData: match?.signatureData ?? null,
        };
      }),
    };
  }
}
