import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { documentLinks, documents } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class DocumentsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Enregistre un document (metadonnees + URL deja stockee), avec liens optionnels. */
  async create(
    input: {
      name: string;
      type?: string;
      fileUrl?: string;
      mimeType?: string;
      contentHash?: string;
      sizeBytes?: number;
      links?: Array<{ entityType: string; entityId: string }>;
    },
    orgId: number,
    userId?: number,
  ) {
    const [doc] = await this.db
      .insert(documents)
      .values({
        organizationId: orgId,
        name: input.name,
        type: input.type,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        contentHash: input.contentHash,
        sizeBytes: input.sizeBytes,
        uploadedBy: userId,
      })
      .$returningId();
    for (const link of input.links ?? []) {
      await this.link(doc.id, link.entityType, link.entityId, orgId);
    }
    return { id: doc.id };
  }

  /** Rattache un document a une entite metier (idempotent). */
  async link(documentId: number, entityType: string, entityId: string, orgId: number) {
    const [doc] = await this.db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, orgId)))
      .limit(1);
    if (!doc) throw new NotFoundException(`Document #${documentId} introuvable.`);
    const [existing] = await this.db
      .select({ id: documentLinks.id })
      .from(documentLinks)
      .where(
        and(
          eq(documentLinks.documentId, documentId),
          eq(documentLinks.entityType, entityType),
          eq(documentLinks.entityId, entityId),
        ),
      )
      .limit(1);
    if (existing) return { id: existing.id, alreadyLinked: true };
    const [row] = await this.db
      .insert(documentLinks)
      .values({ organizationId: orgId, documentId, entityType, entityId })
      .$returningId();
    return { id: row.id };
  }

  /** Documents rattaches a une entite (ex. tous les justificatifs d'une facture). */
  async forEntity(entityType: string, entityId: string, orgId: number) {
    return this.db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        fileUrl: documents.fileUrl,
        mimeType: documents.mimeType,
        createdAt: documents.createdAt,
      })
      .from(documentLinks)
      .innerJoin(documents, eq(documents.id, documentLinks.documentId))
      .where(
        and(
          eq(documentLinks.organizationId, orgId),
          eq(documentLinks.entityType, entityType),
          eq(documentLinks.entityId, entityId),
          eq(documents.isActive, 1),
        ),
      )
      .orderBy(desc(documents.id));
  }

  /** Soft-delete d'un document. */
  async remove(documentId: number, orgId: number) {
    await this.db
      .update(documents)
      .set({ isActive: 0 })
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, orgId)));
    return { id: documentId, removed: true };
  }
}
