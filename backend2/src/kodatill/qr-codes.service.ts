import { randomBytes } from "crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { ktQrCodes, organizations } from "../database/schema";
import type { Database } from "../database/types";
import { CreateQrCodeDto, UpdateQrCodeDto } from "./dto/qr-codes.dto";

@Injectable()
export class QrCodesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Jeton opaque non devinable, genere cote application (meme approche que le publicId d'organisation). */
  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  async list(orgId: number, branchId?: number) {
    const conditions = [eq(ktQrCodes.organizationId, orgId), eq(ktQrCodes.status, "true")];
    if (branchId !== undefined) conditions.push(eq(ktQrCodes.branchId, branchId));
    return this.db
      .select()
      .from(ktQrCodes)
      .where(and(...conditions));
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktQrCodes)
      .where(and(eq(ktQrCodes.id, id), eq(ktQrCodes.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("QR code introuvable.");
    return rows[0];
  }

  async create(input: CreateQrCodeDto, orgId: number) {
    const [result] = await this.db.insert(ktQrCodes).values({
      organizationId: orgId,
      branchId: input.branchId,
      label: input.label,
      type: input.type ?? "table",
      slug: input.slug,
      publicToken: this.generateToken(),
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdateQrCodeDto, orgId: number) {
    await this.findOne(id, orgId);

    await this.db
      .update(ktQrCodes)
      .set({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
      })
      .where(and(eq(ktQrCodes.id, id), eq(ktQrCodes.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  /** Regenere le jeton public : l'ancien lien/QR imprime devient invalide immediatement. */
  async regenerate(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktQrCodes)
      .set({ publicToken: this.generateToken() })
      .where(and(eq(ktQrCodes.id, id), eq(ktQrCodes.organizationId, orgId)));
    return this.findOne(id, orgId);
  }

  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktQrCodes)
      .set({ status: "false" })
      .where(and(eq(ktQrCodes.id, id), eq(ktQrCodes.organizationId, orgId)));
    return { message: "QR code desactive." };
  }

  /** Construit l'URL publique /kodatill/r/:orgSlug/:qrToken et retourne un PNG. */
  async generateImage(id: number, orgId: number): Promise<Buffer> {
    const qrCode = await this.findOne(id, orgId);

    const orgRows = await this.db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (!orgRows.length) throw new NotFoundException("Organisation introuvable.");

    const publicUrl = `${env.appUrl.replace(/\/$/, "")}/kodatill/r/${orgRows[0].slug}/${qrCode.publicToken}`;
    return QRCode.toBuffer(publicUrl, { type: "png", errorCorrectionLevel: "M", margin: 2 });
  }
}
