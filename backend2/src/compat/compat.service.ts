import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { join } from "path";
import { IMAGE_OR_PDF_MIME_TYPES, saveValidatedUploadFile } from "../common/upload-security";
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
  smsLogs,
  suppliers,
} from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class CompatService {
  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");
  private readonly googleClient = new OAuth2Client();

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) {}

  async googleLogin(body: Record<string, any>) {
    const profile = await this.verifyGoogleCredential(body.credential);
    const googleId = profile.sub;

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
    const saved = (files ?? []).map((file) => {
      return saveValidatedUploadFile(file, this.uploadDir, {
        allowedMimeTypes: IMAGE_OR_PDF_MIME_TYPES,
        prefix: "compat",
        maxBytes: 5 * 1024 * 1024,
      }).name;
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

  private readonly logger = new Logger(CompatService.name);

  async sendSms(body: Record<string, any>) {
    if (!body.phone) return { success: false, message: "Phone is required." };

    const smsType = body.smsType || "notification";
    const organizationId = body.organizationId ?? 1;
    const relatedType = body.relatedType ?? null;
    const relatedId = body.relatedId == null ? null : String(body.relatedId);
    const messageText = body.message || body.text || "Message de NgoluApp";

    const logId = await this.createSmsLog({
      organizationId,
      smsType,
      recipient: body.phone,
      messageText,
      relatedType,
      relatedId,
    });

    const { accountSid, authToken, from, messagingServiceSid } = env.twilio;
    if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
      await this.updateSmsLog(logId, "skipped", "SMS service is not configured.");
      return { success: false, message: "SMS service is not configured." };
    }

    try {
      const params = new URLSearchParams();
      if (messagingServiceSid) {
        params.set("MessagingServiceSid", messagingServiceSid);
      } else {
        params.set("From", from);
      }
      params.set("To", body.phone);
      params.set("Body", messageText);
      // Option A : StatusCallback par message. Twilio rappellera cette URL a
      // chaque changement de statut (sent/delivered/failed) pour tracer la
      // livraison reelle. L'appelant fournit l'URL publique (endpoint signe).
      if (body.statusCallback) {
        params.set("StatusCallback", String(body.statusCallback));
      }

      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );
      const data: any = await res.json();
      if (!res.ok) {
        this.logger.error(`SMS failed to ${body.phone}: ${data?.message}`);
        await this.updateSmsLog(logId, "failed", data?.message || "SMS delivery failed.", data?.sid ?? null);
        return { success: false, message: data?.message || "SMS delivery failed." };
      }
      // Un 2xx ne garantit pas l'acceptation : Twilio peut renvoyer un statut
      // d'echec (failed/undelivered) ou un error_code. On ne declare un succes
      // que si le message a bien ete pris en charge (queued/accepted/sending/sent/delivered).
      const status = String(data?.status || "").toLowerCase();
      if (data?.error_code || status === "failed" || status === "undelivered") {
        this.logger.error(
          `SMS rejected by Twilio to ${body.phone}: status=${status || "?"} error_code=${data?.error_code ?? "?"} ${data?.error_message ?? ""}`,
        );
        await this.updateSmsLog(logId, "failed", data?.error_message || "SMS delivery failed.", data?.sid ?? null);
        return { success: false, message: data?.error_message || "SMS delivery failed." };
      }
      await this.updateSmsLog(logId, "sent", null, data.sid ?? null);
      return { success: true, sid: data.sid, status: data.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMS failed to ${body.phone}: ${message}`);
      await this.updateSmsLog(logId, "failed", "SMS delivery failed.");
      return { success: false, message: "SMS delivery failed." };
    }
  }

  private async createSmsLog(input: {
    organizationId: number;
    smsType: string;
    recipient: string;
    messageText: string;
    relatedType?: string | null;
    relatedId?: string | null;
  }) {
    const [result] = await this.db.insert(smsLogs).values({
      organizationId: input.organizationId,
      smsType: input.smsType,
      recipient: input.recipient,
      body: input.messageText,
      status: "pending",
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return Number(result.insertId);
  }

  private async updateSmsLog(
    id: number,
    status: "sent" | "failed" | "skipped",
    errorMessage?: string | null,
    providerMessageId?: string | null,
  ) {
    await this.db
      .update(smsLogs)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        providerMessageId: providerMessageId ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(smsLogs.id, id));
  }

  async purchaseReport(query: Record<string, string>) {
    const conditions = [eq(purchaseInvoices.status, "true")];
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
      .where(and(inArray(purchaseInvoiceProducts.invoiceId, invoiceIds), eq(purchaseInvoices.status, "true")));

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

  private async verifyGoogleCredential(credential?: string) {
    if (!credential) throw new UnauthorizedException("Connexion Google invalide.");
    if (!env.google.clientId) throw new BadRequestException("Connexion Google non configuree.");

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: env.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || (payload.email && !payload.email_verified)) {
        throw new UnauthorizedException("Connexion Google invalide.");
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Connexion Google invalide.");
    }
  }
}
