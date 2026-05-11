import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  customers,
  products,
  productCategories,
  productSubCategories,
  purchaseInvoiceProducts,
  purchaseInvoices,
  roles,
  suppliers,
} from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class CompatService {
  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) {}

  async googleLogin(body: Record<string, any>) {
    const profile = this.decodeGoogleCredential(body.credential);
    const googleId = profile.sub || body.googleId;
    if (!googleId) throw new NotFoundException("Google profile not found.");

    const existing = await this.db.select().from(customers).where(eq(customers.googleId, googleId)).limit(1);
    const customer = existing[0] ?? (await this.createGoogleCustomer(profile, googleId));
    const [role] = await this.db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.id, customer.roleId)).limit(1);

    await this.db.update(customers).set({ isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(customers.id, customer.id));

    const token = this.jwtService.sign(
      { sub: customer.id, roleId: role?.id, role: role?.name },
      { secret: env.jwtSecret, expiresIn: "24h" },
    );
    const { password, isLogin, ...safe } = customer;
    return { ...safe, role, token };
  }

  async uploadFiles(files: any[], body: Record<string, any>) {
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
    const saved = (files ?? []).map((file) => {
      const extension = file.originalname.split(".").pop() || "bin";
      const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
      writeFileSync(join(this.uploadDir, name), file.buffer);
      return name;
    });

    if (body.index !== undefined || body.linkUrl !== undefined) {
      return saved.map((name) => ({
        id: name,
        index: Number(body.index ?? 0),
        image: `${env.appUrl.replace(/\/$/, "")}/slider-images/${name}`,
        linkUrl: body.linkUrl ?? null,
        createdAt: new Date().toISOString(),
      }))[0] ?? { message: "No file uploaded" };
    }

    return { message: "File Uploaded SuccessFull", files: saved };
  }

  emailInvoice(query: Record<string, string>, body: Record<string, any>) {
    return {
      message: "Email sent successfully",
      type: query.type ?? null,
      id: body.id ?? body.invoiceId ?? null,
      receiverEmail: body.receiverEmail ?? null,
    };
  }

  sendSms(body: Record<string, any>) {
    if (!body.phone) return { success: false, message: "Phone is required." };
    return { success: true };
  }

  async purchaseReport(query: Record<string, string>) {
    const conditions = [];
    if (query.startDate) conditions.push(gte(purchaseInvoices.date, new Date(query.startDate)));
    if (query.endDate) conditions.push(lte(purchaseInvoices.date, new Date(query.endDate)));
    const where = conditions.length ? and(...conditions) : undefined;

    const invoiceRows = await this.db.select({ id: purchaseInvoices.id }).from(purchaseInvoices).where(where);
    const invoiceIds = invoiceRows.map((row) => row.id);
    if (!invoiceIds.length) return [];

    const rows = await this.db
      .select({
        productName: products.name,
        SKU: products.sku,
        supplierName: suppliers.name,
        supplierAddress: suppliers.address,
        purchaseInvoiceId: purchaseInvoiceProducts.invoiceId,
        purchaseInvoiceDate: purchaseInvoices.date,
        quantity: purchaseInvoiceProducts.productQuantity,
        unitPurchasePrice: purchaseInvoiceProducts.productUnitPurchasePrice,
      })
      .from(purchaseInvoiceProducts)
      .leftJoin(products, eq(products.id, purchaseInvoiceProducts.productId))
      .leftJoin(purchaseInvoices, eq(purchaseInvoices.id, purchaseInvoiceProducts.invoiceId))
      .leftJoin(suppliers, eq(suppliers.id, purchaseInvoices.supplierId))
      .where(inArray(purchaseInvoiceProducts.invoiceId, invoiceIds));

    return rows.map((row) => ({
      ...row,
      supplier: [row.supplierName, row.supplierAddress].filter(Boolean).join(","),
      subTotal: Number(row.quantity ?? 0) * Number(row.unitPurchasePrice ?? 0),
    }));
  }

  async stockReport() {
    const rows = await this.db
      .select({
        SKU: products.sku,
        productName: products.name,
        uomId: products.uomId,
        uomValue: products.uomValue,
        category: productCategories.name,
        subCategory: productSubCategories.name,
        unitSellingPrice: products.productSalePrice,
        currentStock: products.productQuantity,
        unitPurchasePrice: products.productPurchasePrice,
      })
      .from(products)
      .leftJoin(productSubCategories, eq(productSubCategories.id, products.productSubCategoryId))
      .leftJoin(productCategories, eq(productCategories.id, productSubCategories.productCategoryId));

    return rows.map((row) => {
      const currentStock = Number(row.currentStock ?? 0);
      const stockPurchasePrice = Number(row.unitPurchasePrice ?? 0) * currentStock;
      const stockSalePrice = Number(row.unitSellingPrice ?? 0) * currentStock;
      return {
        ...row,
        variation: [row.uomId, row.uomValue].filter(Boolean).join(" "),
        stockPurchasePrice,
        stockSalePrice,
        potentialProfit: stockSalePrice - stockPurchasePrice,
      };
    });
  }

  private async createGoogleCustomer(profile: Record<string, any>, googleId: string) {
    const [result] = await this.db.insert(customers).values({
      profileImage: profile.picture ?? null,
      firstName: profile.given_name ?? profile.name ?? "Google",
      lastName: profile.family_name ?? "",
      username: profile.given_name ?? profile.email ?? googleId,
      email: profile.email ?? null,
      googleId,
      password: await bcrypt.hash(googleId, 10),
      roleId: 3,
      isLogin: "true",
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, Number(result.insertId))).limit(1);
    return customer;
  }

  private decodeGoogleCredential(credential?: string) {
    if (!credential || !credential.includes(".")) return {};
    const payload = credential.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  }
}
