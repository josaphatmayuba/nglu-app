import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomInt } from "crypto";
import { and, asc, eq, gt } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktRegisters } from "../database/schema";
import type { Database } from "../database/types";
import { CreateRegisterDto, UpdateRegisterDto } from "./dto/registers.dto";

const PAIRING_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class RegistersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number, branchId?: number) {
    const conditions = [eq(ktRegisters.organizationId, orgId), eq(ktRegisters.status, "true")];
    if (branchId !== undefined) conditions.push(eq(ktRegisters.branchId, branchId));
    return this.db
      .select()
      .from(ktRegisters)
      .where(and(...conditions))
      .orderBy(asc(ktRegisters.name));
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktRegisters)
      .where(and(eq(ktRegisters.id, id), eq(ktRegisters.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Caisse introuvable.");
    return rows[0];
  }

  async create(input: CreateRegisterDto, orgId: number) {
    const [result] = await this.db.insert(ktRegisters).values({
      organizationId: orgId,
      branchId: input.branchId,
      name: input.name,
      deviceLabel: input.deviceLabel,
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdateRegisterDto, orgId: number) {
    await this.findOne(id, orgId);

    await this.db
      .update(ktRegisters)
      .set({
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.deviceLabel !== undefined ? { deviceLabel: input.deviceLabel } : {}),
      })
      .where(and(eq(ktRegisters.id, id), eq(ktRegisters.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktRegisters)
      .set({ status: "false" })
      .where(and(eq(ktRegisters.id, id), eq(ktRegisters.organizationId, orgId)));
    return { message: "Caisse desactivee." };
  }

  /**
   * Genere un code numerique a 6 chiffres (facile a lire/taper sur un
   * scanner mobile), valable 5 minutes. Ecrase tout code precedent, meme
   * non expire — une seule demande de jumelage active a la fois par caisse.
   */
  async generatePairingCode(id: number, orgId: number) {
    await this.findOne(id, orgId);
    const code = String(randomInt(100000, 1000000));
    const pairedUntil = new Date(Date.now() + PAIRING_CODE_TTL_MS);

    await this.db
      .update(ktRegisters)
      .set({ pairingCode: code, pairedUntil })
      .where(and(eq(ktRegisters.id, id), eq(ktRegisters.organizationId, orgId)));

    return { pairingCode: code, pairedUntil };
  }

  /**
   * Jumelage depuis le scanner mobile : verifie le code + son expiration,
   * puis retourne juste l'identite du register (id/name/branchId) pour que
   * le mobile sache ou rattacher ses scans. Aucun token separe n'est emis —
   * l'utilisateur reste authentifie par son propre JWT (kodatill_pos_operate).
   *
   * Choix : le pairingCode N'EST PAS invalide apres un pairing reussi. Motif :
   * plusieurs appareils (ex. 2 scanners) peuvent vouloir rejoindre la meme
   * caisse pendant la fenetre de 5 minutes, et le pairing ne cree aucun etat
   * de session serveur sensible — il sert uniquement a identifier le register
   * cote client. Le code expire de toute facon a pairedUntil (TTL court).
   */
  async pairWithCode(pairingCode: string, orgId: number) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(ktRegisters)
      .where(
        and(
          eq(ktRegisters.organizationId, orgId),
          eq(ktRegisters.pairingCode, pairingCode),
          eq(ktRegisters.status, "true"),
          gt(ktRegisters.pairedUntil, now),
        ),
      )
      .limit(1);

    if (!rows.length) {
      throw new BadRequestException("Code invalide ou expire.");
    }

    const register = rows[0];
    return { id: register.id, name: register.name, branchId: register.branchId };
  }
}
