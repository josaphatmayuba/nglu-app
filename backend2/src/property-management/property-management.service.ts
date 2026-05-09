import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { DRIZZLE } from "../database/database.constants";
import {
  customers,
  realEstateLeases,
  realEstateMaintenanceRequests,
  realEstateProperties,
  realEstateRentPayments,
  realEstateUnits,
  subAccounts,
  transactions,
  transactionTypes,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateLeaseDto,
  CreateMaintenanceDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  CreateUnitDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
  UpdatePropertyDto,
  UpdateUnitDto,
} from "./dto/property-management.dto";

const leaseProperty = alias(realEstateProperties, "leaseProperty");
const leaseUnit = alias(realEstateUnits, "leaseUnit");
const paymentLease = alias(realEstateLeases, "paymentLease");
const paymentProperty = alias(realEstateProperties, "paymentProperty");
const paymentUnit = alias(realEstateUnits, "paymentUnit");
const maintenanceProperty = alias(realEstateProperties, "maintenanceProperty");
const maintenanceUnit = alias(realEstateUnits, "maintenanceUnit");

@Injectable()
export class PropertyManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async dashboard() {
    const [properties] = await this.db.select({ count: sql<number>`count(*)` }).from(realEstateProperties);
    const [units] = await this.db.select({ count: sql<number>`count(*)` }).from(realEstateUnits);
    const [vacantUnits] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateUnits)
      .where(eq(realEstateUnits.status, "vacant"));
    const [occupiedUnits] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateUnits)
      .where(eq(realEstateUnits.status, "occupied"));
    const [activeLeases] = await this.db
      .select({
        count: sql<number>`count(*)`,
        monthlyRent: sql<string>`coalesce(sum(${realEstateLeases.rentAmount}), 0)`,
      })
      .from(realEstateLeases)
      .where(eq(realEstateLeases.status, "active"));
    const [collectedRent] = await this.db
      .select({ total: sql<string>`coalesce(sum(${realEstateRentPayments.amount}), 0)` })
      .from(realEstateRentPayments);
    const [openMaintenance] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateMaintenanceRequests)
      .where(inArray(realEstateMaintenanceRequests.status, ["open", "in_progress"]));

    return {
      properties: Number(properties.count),
      units: Number(units.count),
      vacantUnits: Number(vacantUnits.count),
      occupiedUnits: Number(occupiedUnits.count),
      activeLeases: Number(activeLeases.count),
      monthlyRent: Number(activeLeases.monthlyRent),
      collectedRent: Number(collectedRent.total),
      openMaintenance: Number(openMaintenance.count),
    };
  }

  tenants() {
    return this.db
      .select({
        id: customers.id,
        username: customers.username,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
      })
      .from(customers)
      .where(eq(customers.status, "true"))
      .orderBy(desc(customers.id));
  }

  async properties() {
    const rows = await this.db
      .select({
        id: realEstateProperties.id,
        name: realEstateProperties.name,
        code: realEstateProperties.code,
        propertyType: realEstateProperties.propertyType,
        status: realEstateProperties.status,
        address: realEstateProperties.address,
        city: realEstateProperties.city,
        country: realEstateProperties.country,
        floors: realEstateProperties.floors,
        parkingSpaces: realEstateProperties.parkingSpaces,
        marketValue: realEstateProperties.marketValue,
        defaultRent: realEstateProperties.defaultRent,
        description: realEstateProperties.description,
        createdAt: realEstateProperties.createdAt,
        updatedAt: realEstateProperties.updatedAt,
        unitsCount: sql<number>`count(${realEstateUnits.id})`,
      })
      .from(realEstateProperties)
      .leftJoin(realEstateUnits, eq(realEstateUnits.propertyId, realEstateProperties.id))
      .groupBy(realEstateProperties.id)
      .orderBy(desc(realEstateProperties.id));

    return rows.map((row) => ({ ...row, unitsCount: Number(row.unitsCount) }));
  }

  async createProperty(input: CreatePropertyDto) {
    const [result] = await this.db.insert(realEstateProperties).values({
      name: input.name,
      code: input.code ?? null,
      propertyType: input.propertyType ?? "building",
      status: input.status ?? "available",
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      floors: input.floors ?? 1,
      parkingSpaces: input.parkingSpaces ?? 0,
      marketValue: this.money(input.marketValue),
      defaultRent: this.money(input.defaultRent),
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findProperty(Number(result.insertId));
  }

  async updateProperty(id: number, input: UpdatePropertyDto) {
    await this.ensureExists(realEstateProperties, id, "Property not found.");
    await this.db
      .update(realEstateProperties)
      .set({
        ...this.pick(input, [
          "name",
          "code",
          "propertyType",
          "status",
          "address",
          "city",
          "country",
          "floors",
          "parkingSpaces",
          "description",
        ]),
        ...(input.marketValue !== undefined ? { marketValue: this.money(input.marketValue) } : {}),
        ...(input.defaultRent !== undefined ? { defaultRent: this.money(input.defaultRent) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateProperties.id, id));

    return this.findProperty(id);
  }

  async deleteProperty(id: number) {
    await this.ensureExists(realEstateProperties, id, "Property not found.");
    await this.db.delete(realEstateProperties).where(eq(realEstateProperties.id, id));
    return { message: "Property deleted successfully." };
  }

  units() {
    return this.db
      .select({
        id: realEstateUnits.id,
        propertyId: realEstateUnits.propertyId,
        name: realEstateUnits.name,
        unitType: realEstateUnits.unitType,
        status: realEstateUnits.status,
        floor: realEstateUnits.floor,
        bedrooms: realEstateUnits.bedrooms,
        bathrooms: realEstateUnits.bathrooms,
        area: realEstateUnits.area,
        monthlyRent: realEstateUnits.monthlyRent,
        securityDeposit: realEstateUnits.securityDeposit,
        amenities: realEstateUnits.amenities,
        description: realEstateUnits.description,
        propertyName: realEstateProperties.name,
      })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .orderBy(desc(realEstateUnits.id));
  }

  async createUnit(input: CreateUnitDto) {
    await this.ensureExists(realEstateProperties, input.propertyId, "Property not found.");
    const [result] = await this.db.insert(realEstateUnits).values({
      propertyId: input.propertyId,
      name: input.name,
      unitType: input.unitType ?? "apartment",
      status: input.status ?? "vacant",
      floor: input.floor ?? null,
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      area: this.money(input.area),
      monthlyRent: this.money(input.monthlyRent),
      securityDeposit: this.money(input.securityDeposit),
      amenities: input.amenities ?? null,
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findUnit(Number(result.insertId));
  }

  async updateUnit(id: number, input: UpdateUnitDto) {
    await this.ensureExists(realEstateUnits, id, "Unit not found.");
    if (input.propertyId !== undefined) {
      await this.ensureExists(realEstateProperties, input.propertyId, "Property not found.");
    }
    await this.db
      .update(realEstateUnits)
      .set({
        ...this.pick(input, [
          "propertyId",
          "name",
          "unitType",
          "status",
          "floor",
          "bedrooms",
          "bathrooms",
          "amenities",
          "description",
        ]),
        ...(input.area !== undefined ? { area: this.money(input.area) } : {}),
        ...(input.monthlyRent !== undefined ? { monthlyRent: this.money(input.monthlyRent) } : {}),
        ...(input.securityDeposit !== undefined ? { securityDeposit: this.money(input.securityDeposit) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateUnits.id, id));
    return this.findUnit(id);
  }

  async deleteUnit(id: number) {
    await this.ensureExists(realEstateUnits, id, "Unit not found.");
    await this.db.delete(realEstateUnits).where(eq(realEstateUnits.id, id));
    return { message: "Unit deleted successfully." };
  }

  leases() {
    return this.leaseQuery().orderBy(desc(realEstateLeases.id));
  }

  async createLease(input: CreateLeaseDto) {
    await this.ensureLeaseReferences(input.propertyId, input.unitId, input.tenantId);
    const [result] = await this.db.insert(realEstateLeases).values({
      reference: input.reference || `LEASE-${Date.now()}`,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId: input.tenantId,
      startDate: this.requiredDate(input.startDate),
      endDate: this.date(input.endDate),
      nextInvoiceDate: this.date(input.nextInvoiceDate),
      billingCycle: input.billingCycle ?? "monthly",
      rentAmount: this.money(input.rentAmount),
      securityDeposit: this.money(input.securityDeposit),
      moveInMeterReading:
        input.moveInMeterReading !== undefined && input.moveInMeterReading !== null
          ? this.money(input.moveInMeterReading)
          : null,
      moveInNotes: input.moveInNotes ?? null,
      terms: input.terms ?? null,
      status: input.status ?? "draft",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    if ((input.status ?? "draft") === "active") {
      await this.setUnitStatus(input.unitId, "occupied");
    }

    return this.findLease(Number(result.insertId));
  }

  async updateLease(id: number, input: UpdateLeaseDto) {
    const current = await this.getLeaseOrThrow(id);
    await this.ensureLeaseReferences(
      input.propertyId ?? current.propertyId,
      input.unitId ?? current.unitId,
      input.tenantId ?? current.tenantId,
    );

    await this.db
      .update(realEstateLeases)
      .set({
        ...this.pick(input, [
          "reference",
          "propertyId",
          "unitId",
          "tenantId",
          "billingCycle",
          "moveInNotes",
          "terms",
          "status",
        ]),
        ...(input.startDate !== undefined ? { startDate: this.requiredDate(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: this.date(input.endDate) } : {}),
        ...(input.nextInvoiceDate !== undefined ? { nextInvoiceDate: this.date(input.nextInvoiceDate) } : {}),
        ...(input.rentAmount !== undefined ? { rentAmount: this.money(input.rentAmount) } : {}),
        ...(input.securityDeposit !== undefined ? { securityDeposit: this.money(input.securityDeposit) } : {}),
        ...(input.moveInMeterReading !== undefined
          ? { moveInMeterReading: input.moveInMeterReading === null ? null : this.money(input.moveInMeterReading) }
          : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateLeases.id, id));

    const nextUnitId = input.unitId ?? current.unitId;
    if (input.unitId !== undefined && input.unitId !== current.unitId) {
      await this.setUnitStatus(current.unitId, "vacant");
    }
    if ((input.status ?? current.status) === "active") {
      await this.setUnitStatus(nextUnitId, "occupied");
    }
    if (["ended", "cancelled"].includes(input.status ?? "")) {
      await this.setUnitStatus(nextUnitId, "vacant");
    }

    return this.findLease(id);
  }

  async deleteLease(id: number) {
    const lease = await this.getLeaseOrThrow(id);
    await this.setUnitStatus(lease.unitId, "vacant");
    await this.db.delete(realEstateLeases).where(eq(realEstateLeases.id, id));
    return { message: "Lease deleted successfully." };
  }

  payments() {
    return this.db
      .select({
        id: realEstateRentPayments.id,
        leaseId: realEstateRentPayments.leaseId,
        transactionId: realEstateRentPayments.transactionId,
        paymentDate: realEstateRentPayments.paymentDate,
        amount: realEstateRentPayments.amount,
        method: realEstateRentPayments.method,
        reference: realEstateRentPayments.reference,
        notes: realEstateRentPayments.notes,
        leaseReference: paymentLease.reference,
        propertyName: paymentProperty.name,
        unitName: paymentUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
      })
      .from(realEstateRentPayments)
      .leftJoin(paymentLease, eq(paymentLease.id, realEstateRentPayments.leaseId))
      .leftJoin(paymentProperty, eq(paymentProperty.id, paymentLease.propertyId))
      .leftJoin(paymentUnit, eq(paymentUnit.id, paymentLease.unitId))
      .leftJoin(customers, eq(customers.id, paymentLease.tenantId))
      .orderBy(desc(realEstateRentPayments.id));
  }

  async createPayment(input: CreateRentPaymentDto) {
    const lease = await this.getLeaseOrThrow(input.leaseId);
    const rentPaymentType = await this.getRentPaymentType();
    const debitId = input.paymentAccountId ?? rentPaymentType.debitAccountId;
    await this.ensureExists(subAccounts, debitId, "Payment account not found.");

    const [transactionResult] = await this.db.insert(transactions).values({
      date: new Date(input.paymentDate),
      debitId,
      creditId: rentPaymentType.creditAccountId,
      particulars: input.notes || "Payment for rent",
      amount: input.amount,
      type: "rent_payment",
      relatedId: String(lease.id),
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const [paymentResult] = await this.db.insert(realEstateRentPayments).values({
      leaseId: lease.id,
      transactionId: Number(transactionResult.insertId),
      paymentDate: this.requiredDate(input.paymentDate),
      amount: this.money(input.amount),
      method: input.method ?? "cash",
      reference: input.reference ?? null,
      notes: input.notes || "Payment for rent",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findPayment(Number(paymentResult.insertId));
  }

  maintenance() {
    return this.db
      .select({
        id: realEstateMaintenanceRequests.id,
        propertyId: realEstateMaintenanceRequests.propertyId,
        unitId: realEstateMaintenanceRequests.unitId,
        title: realEstateMaintenanceRequests.title,
        priority: realEstateMaintenanceRequests.priority,
        status: realEstateMaintenanceRequests.status,
        scheduledDate: realEstateMaintenanceRequests.scheduledDate,
        estimatedCost: realEstateMaintenanceRequests.estimatedCost,
        description: realEstateMaintenanceRequests.description,
        propertyName: maintenanceProperty.name,
        unitName: maintenanceUnit.name,
      })
      .from(realEstateMaintenanceRequests)
      .leftJoin(maintenanceProperty, eq(maintenanceProperty.id, realEstateMaintenanceRequests.propertyId))
      .leftJoin(maintenanceUnit, eq(maintenanceUnit.id, realEstateMaintenanceRequests.unitId))
      .orderBy(desc(realEstateMaintenanceRequests.id));
  }

  async createMaintenance(input: CreateMaintenanceDto) {
    await this.ensureExists(realEstateProperties, input.propertyId, "Property not found.");
    if (input.unitId) {
      await this.ensureExists(realEstateUnits, input.unitId, "Unit not found.");
    }
    const [result] = await this.db.insert(realEstateMaintenanceRequests).values({
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      title: input.title,
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      scheduledDate: this.date(input.scheduledDate),
      estimatedCost: this.money(input.estimatedCost),
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findMaintenance(Number(result.insertId));
  }

  async updateMaintenance(id: number, input: UpdateMaintenanceDto) {
    await this.ensureExists(realEstateMaintenanceRequests, id, "Maintenance request not found.");
    if (input.propertyId !== undefined) {
      await this.ensureExists(realEstateProperties, input.propertyId, "Property not found.");
    }
    if (input.unitId) {
      await this.ensureExists(realEstateUnits, input.unitId, "Unit not found.");
    }
    await this.db
      .update(realEstateMaintenanceRequests)
      .set({
        ...this.pick(input, ["propertyId", "unitId", "title", "priority", "status", "description"]),
        ...(input.scheduledDate !== undefined ? { scheduledDate: this.date(input.scheduledDate) } : {}),
        ...(input.estimatedCost !== undefined ? { estimatedCost: this.money(input.estimatedCost) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateMaintenanceRequests.id, id));
    return this.findMaintenance(id);
  }

  async deleteMaintenance(id: number) {
    await this.ensureExists(realEstateMaintenanceRequests, id, "Maintenance request not found.");
    await this.db.delete(realEstateMaintenanceRequests).where(eq(realEstateMaintenanceRequests.id, id));
    return { message: "Maintenance request deleted successfully." };
  }

  async findProperty(id: number) {
    const rows = await this.db.select().from(realEstateProperties).where(eq(realEstateProperties.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Property not found.");
    return rows[0];
  }

  async findUnit(id: number) {
    const rows = await this.units().where(eq(realEstateUnits.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Unit not found.");
    return rows[0];
  }

  async findLease(id: number) {
    const rows = await this.leaseQuery().where(eq(realEstateLeases.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Lease not found.");
    return rows[0];
  }

  async findPayment(id: number) {
    const rows = await this.payments().where(eq(realEstateRentPayments.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Payment not found.");
    return rows[0];
  }

  async findMaintenance(id: number) {
    const rows = await this.maintenance().where(eq(realEstateMaintenanceRequests.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Maintenance request not found.");
    return rows[0];
  }

  private leaseQuery() {
    return this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        propertyId: realEstateLeases.propertyId,
        unitId: realEstateLeases.unitId,
        tenantId: realEstateLeases.tenantId,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        billingCycle: realEstateLeases.billingCycle,
        rentAmount: realEstateLeases.rentAmount,
        securityDeposit: realEstateLeases.securityDeposit,
        moveInMeterReading: realEstateLeases.moveInMeterReading,
        moveInNotes: realEstateLeases.moveInNotes,
        terms: realEstateLeases.terms,
        status: realEstateLeases.status,
        propertyName: leaseProperty.name,
        unitName: leaseUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
      })
      .from(realEstateLeases)
      .leftJoin(leaseProperty, eq(leaseProperty.id, realEstateLeases.propertyId))
      .leftJoin(leaseUnit, eq(leaseUnit.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId));
  }

  private async getLeaseOrThrow(id: number) {
    const rows = await this.db.select().from(realEstateLeases).where(eq(realEstateLeases.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Lease not found.");
    return rows[0];
  }

  private async getRentPaymentType() {
    const rows = await this.db
      .select({
        id: transactionTypes.id,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
      })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, "Rent Payment"), eq(transactionTypes.isActive, true)))
      .limit(1);

    if (!rows.length) {
      throw new BadRequestException("Rent Payment transaction type is missing.");
    }

    return rows[0];
  }

  private async ensureLeaseReferences(propertyId: number, unitId: number, tenantId: number) {
    await this.ensureExists(realEstateProperties, propertyId, "Property not found.");
    await this.ensureExists(realEstateUnits, unitId, "Unit not found.");
    await this.ensureExists(customers, tenantId, "Tenant not found.");
  }

  private async ensureExists(table: any, id: number, message: string) {
    const rows = await this.db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException(message);
    }
  }

  private setUnitStatus(id: number, status: string) {
    return this.db
      .update(realEstateUnits)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateUnits.id, id));
  }

  private money(value: number | undefined | null) {
    return String(value ?? 0);
  }

  private date(value: string | null | undefined) {
    return value ? new Date(value) : null;
  }

  private requiredDate(value: string) {
    return new Date(value);
  }

  private pick(input: object, keys: string[]) {
    const source = input as Record<string, unknown>;
    return keys.reduce<Record<string, unknown>>((result, key) => {
      if (source[key] !== undefined) {
        result[key] = source[key];
      }
      return result;
    }, {});
  }
}
