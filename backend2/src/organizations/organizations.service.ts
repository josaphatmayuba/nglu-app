import { randomBytes } from "crypto";
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { desc, eq, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { DRIZZLE } from "../database/database.constants";
import { provisionOrgChartOfAccounts } from "../database/provisioning/chart-of-accounts";
import { cloneRolesForOrg } from "../database/provisioning/org-roles";
import { organizations, users } from "../database/schema";
import type { Database } from "../database/types";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

// P4 multi-tenant : console du proprietaire de la plateforme (super_owner).
// Lister / creer / suspendre les organisations clientes. Toutes les routes du
// controller sont gardees par SuperOwnerGuard. Suppression = soft (status).
@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  /** Liste des organisations + nombre d utilisateurs actifs. Jamais l id interne en 1er plan. */
  async findAll() {
    const rows = await this.db
      .select({
        id: organizations.id,
        publicId: organizations.publicId,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        createdAt: organizations.createdAt,
        userCount: sql<number>`(select count(*) from ${users} where ${users.organizationId} = ${organizations.id} and ${users.status} = 'true')`,
      })
      .from(organizations)
      .orderBy(desc(organizations.id));
    return rows.map((r) => ({ ...r, userCount: Number(r.userCount) }));
  }

  async findOne(publicId: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.publicId, publicId))
      .limit(1);
    if (!org) throw new NotFoundException("Organisation introuvable.");
    return org;
  }

  /** Creation par le proprietaire (sans auto-login) : org + 1er admin + plan comptable. */
  async create(dto: CreateOrganizationDto, ctx: AuditContext = {}) {
    const email = dto.adminEmail.trim().toLowerCase();
    const slug = dto.slug.trim().toLowerCase();

    const [emailTaken] = await this.db.select({ id: users.id }).from(users).where(eq(users.username, email)).limit(1);
    if (emailTaken) throw new ConflictException("Un compte existe deja avec cet email.");
    const [slugTaken] = await this.db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (slugTaken) throw new ConflictException("Cette adresse est deja utilisee.");

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const publicId = `org_${randomBytes(6).toString("hex")}`;

    const created = await this.db.transaction(async (tx) => {
      const [orgRes] = await tx.insert(organizations).values({
        publicId,
        name: dto.name,
        slug,
        status: dto.status ?? "active",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);
      const orgId = Number((orgRes as any).insertId);

      // Phase 0 multi-tenant : chaque org recoit SON propre jeu de roles +
      // permissions, copie depuis l org modele (org 1). L admin pointe sur le
      // role « admin » de SA nouvelle org (et non celui partage de l org 1).
      const adminRoleId = await cloneRolesForOrg(tx as unknown as Database, orgId);
      if (!adminRoleId) throw new BadRequestException("Role admin introuvable dans l org modele (seed manquant).");

      await tx.insert(users).values({
        organizationId: orgId,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        username: email,
        email,
        password: passwordHash,
        roleId: adminRoleId,
        status: "true",
        isLogin: "false",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);

      await provisionOrgChartOfAccounts(tx as unknown as Database, orgId);
      return { orgId };
    });

    await this.audit.log("org.create", `org:${created.orgId}`, ctx, { slug, publicId, by: "super_owner" });
    return this.findOne(publicId);
  }

  /** Suspendre (soft) une organisation : status='suspended'. Reversible. */
  async suspend(publicId: string, reason: string | undefined, ctx: AuditContext = {}) {
    const org = await this.findOne(publicId);
    await this.db
      .update(organizations)
      .set({ status: "suspended", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(organizations.id, org.id));
    await this.audit.log("org.suspend", `org:${org.id}`, ctx, { slug: org.slug, reason: reason ?? null });
    return { ...org, status: "suspended" };
  }

  /** Reactiver une organisation suspendue. */
  async reactivate(publicId: string, ctx: AuditContext = {}) {
    const org = await this.findOne(publicId);
    await this.db
      .update(organizations)
      .set({ status: "active", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(organizations.id, org.id));
    await this.audit.log("org.reactivate", `org:${org.id}`, ctx, { slug: org.slug });
    return { ...org, status: "active" };
  }

}
