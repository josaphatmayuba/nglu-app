import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { eq, sql } from "drizzle-orm";
import { env } from "../config/env";
import { smtpTransportOptions } from "../config/smtp";
import { DRIZZLE } from "../database/database.constants";
import { systemEmailLogs } from "../database/schema";
import type { Database } from "../database/types";

export type SystemEmailType =
  | "contract_signature"
  | "contract_signed"
  | "payment_reminder"
  | "password_reset"
  | "form_link"
  | "notification"
  | "test";

type SendTemplateInput = {
  to: string;
  type: SystemEmailType;
  variables?: Record<string, string | number | null | undefined>;
  relatedType?: string;
  relatedId?: string | number;
  required?: boolean;
};

type SendInput = SendTemplateInput & {
  subject: string;
  html: string;
  text?: string;
};

const templates: Record<SystemEmailType, { subject: string; html: string }> = {
  contract_signature: {
    subject: "Votre contrat de bail est prêt à être signé",
    html: `<p>Bonjour {{tenantName}},</p>
<p>Votre contrat de bail est prêt à être signé électroniquement.</p>
<p><a href="{{signingUrl}}" style="background:#1677ff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Signer mon contrat</a></p>
<p>Ce lien est valide pendant <strong>{{expiresIn}}</strong>.</p>`,
  },
  contract_signed: {
    subject: "Contrat signé - confirmation",
    html: `<p>Bonjour {{tenantName}},</p>
<p>Votre contrat a bien été signé électroniquement.</p>
<p>Merci.</p>`,
  },
  payment_reminder: {
    subject: "Rappel de paiement de loyer - Bail #{{leaseReference}}",
    html: `<p>Bonjour {{tenantName}},</p>
<p>Nous vous rappelons que votre loyer pour le bail <strong>#{{leaseReference}}</strong> est en retard.</p>
<p><strong>Montant dû:</strong> {{amount}}</p>
<p>Merci de régulariser ce paiement au plus tôt possible.</p>
<p>Cordialement,<br>L'équipe de gestion immobilière</p>`,
  },
  password_reset: {
    subject: "Réinitialisation de mot de passe - NgoluApp",
    html: `<p>Bonjour {{username}},</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
<p><a href="{{resetUrl}}">Cliquez ici pour définir un nouveau mot de passe</a></p>
<p>Ce lien expire dans {{ttlMinutes}} minutes.</p>
<p>Si vous n'avez pas effectué cette demande, ignorez cet email.</p>`,
  },
  form_link: {
    subject: "{{title}}",
    html: `<p>Bonjour {{recipientName}},</p>
<p>{{message}}</p>
<p><a href="{{url}}">{{buttonLabel}}</a></p>`,
  },
  notification: {
    subject: "{{title}}",
    html: `<p>Bonjour {{recipientName}},</p><p>{{message}}</p>`,
  },
  test: {
    subject: "Test email système Ngolu",
    html: `<p>Bonjour,</p><p>Ceci est un test d'envoi email système depuis {{from}}.</p>`,
  },
};

@Injectable()
export class SystemEmailService {
  private readonly logger = new Logger(SystemEmailService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  isConfigured() {
    return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from);
  }

  async sendTemplate(input: SendTemplateInput) {
    const template = templates[input.type];
    const variables = { ...(input.variables ?? {}), from: env.smtp.from };
    return this.send({
      ...input,
      subject: this.render(template.subject, variables),
      html: this.render(template.html, variables),
    });
  }

  async send(input: SendInput) {
    const logId = await this.createLog(input, "pending");

    if (!this.isConfigured()) {
      await this.updateLog(logId, "skipped", "SMTP not configured.");
      this.logger.warn(`SMTP not configured; skipped ${input.type} email to ${input.to}.`);
      if (input.required) throw new BadRequestException("SMTP is not configured.");
      return { sent: false, skipped: true, logId };
    }

    try {
      const transporter = nodemailer.createTransport(smtpTransportOptions());
      const info = await transporter.sendMail({
        from: env.smtp.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      await this.updateLog(logId, "sent", null, info.messageId);
      return { sent: true, skipped: false, logId, messageId: info.messageId };
    } catch (error) {
      const message = this.safeError(error);
      await this.updateLog(logId, "failed", message);
      this.logger.error(`Failed to send ${input.type} email to ${input.to}: ${message}`);
      if (input.required) throw new BadRequestException("Email delivery failed.");
      return { sent: false, skipped: false, logId, error: message };
    }
  }

  private async createLog(input: SendInput, status: "pending" | "sent" | "failed" | "skipped") {
    const [result] = await this.db.insert(systemEmailLogs).values({
      emailType: input.type,
      recipient: input.to,
      sender: env.smtp.from,
      subject: input.subject,
      status,
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId == null ? null : String(input.relatedId),
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return Number(result.insertId);
  }

  private async updateLog(
    id: number,
    status: "sent" | "failed" | "skipped",
    errorMessage?: string | null,
    providerMessageId?: string | null,
  ) {
    await this.db
      .update(systemEmailLogs)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        providerMessageId: providerMessageId ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(systemEmailLogs.id, id));
  }

  private render(template: string, variables: Record<string, string | number | null | undefined>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => this.escape(String(variables[key] ?? "")));
  }

  private escape(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private safeError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(env.smtp.pass, "[redacted]").slice(0, 1000);
  }
}
