import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { env } from "../config/env";

type JmapResponse = {
  methodResponses?: Array<[string, Record<string, any>, string]>;
};

type CreateMailboxResult = {
  email: string;
  accountId: string;
};

@Injectable()
export class MailAccountsService {
  private readonly logger = new Logger(MailAccountsService.name);

  async createEmployeeMailbox(input: {
    firstName?: string;
    lastName?: string;
    password: string;
    reservedEmails?: string[];
  }): Promise<CreateMailboxResult | null> {
    if (!input.firstName || !input.lastName) return null;
    if (!env.stalwart.adminUser || !env.stalwart.adminPass) {
      throw new BadRequestException("Stalwart is not configured for mailbox creation.");
    }

    const domainId = await this.domainId();
    const baseName = this.mailboxName(input.firstName, input.lastName);
    const accountName = await this.availableAccountName(baseName, input.reservedEmails ?? []);
    const email = `${accountName}@${env.stalwart.domain}`;
    const accountId = await this.createAccount(domainId, accountName, input.password);

    return { email, accountId };
  }

  async createManualMailbox(input: {
    localPart: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<CreateMailboxResult> {
    if (!env.stalwart.adminUser || !env.stalwart.adminPass) {
      throw new BadRequestException("Stalwart is not configured for mailbox creation.");
    }

    const accountName = this.manualAccountName(input.localPart);
    if (await this.accountExists(accountName)) {
      throw new BadRequestException("This mailbox already exists.");
    }

    const domainId = await this.domainId();
    const accountId = await this.createAccount(domainId, accountName, input.password);
    return { email: `${accountName}@${env.stalwart.domain}`, accountId };
  }

  async deleteMailbox(accountId: string) {
    if (!accountId) return;
    try {
      await this.jmap([["x:Account/set", { destroy: [accountId] }, "destroy"]]);
    } catch (error) {
      this.logger.warn(`Failed to rollback Stalwart account ${accountId}: ${this.errorMessage(error)}`);
    }
  }

  normalizeNamePart(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.+/g, ".");
  }

  private manualAccountName(value: string) {
    const trimmed = String(value ?? "").trim().toLowerCase();
    const localPart = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
    const domain = trimmed.includes("@") ? trimmed.split("@").slice(1).join("@") : env.stalwart.domain;

    if (domain !== env.stalwart.domain) {
      throw new BadRequestException(`Only ${env.stalwart.domain} mailboxes can be created from the CRM.`);
    }

    if (!/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPart)) {
      throw new BadRequestException("Mailbox name must use letters, numbers, dots, underscores or hyphens.");
    }

    if (localPart.includes("..")) {
      throw new BadRequestException("Mailbox name cannot contain consecutive dots.");
    }

    return localPart;
  }

  private mailboxName(firstName: string, lastName: string) {
    const first = this.normalizeNamePart(firstName);
    const last = this.normalizeNamePart(lastName);
    const name = [first, last].filter(Boolean).join(".");
    if (!name) throw new BadRequestException("First name and last name are required to generate an email address.");
    return name;
  }

  private async availableAccountName(baseName: string, reservedEmails: string[]) {
    const reserved = new Set(reservedEmails.map((email) => email.toLowerCase()));
    for (let suffix = 0; suffix < 100; suffix += 1) {
      const candidate = suffix === 0 ? baseName : `${baseName}${suffix + 1}`;
      const email = `${candidate}@${env.stalwart.domain}`.toLowerCase();
      if (reserved.has(email)) continue;
      if (!(await this.accountExists(candidate))) return candidate;
    }
    throw new BadRequestException("Unable to generate a unique mailbox address.");
  }

  private async domainId() {
    const response = await this.jmap([["x:Domain/query", { filter: { name: env.stalwart.domain } }, "q"]]);
    const query = response.methodResponses?.[0]?.[1];
    const ids = Array.isArray(query?.ids) ? query.ids : [];
    if (!ids.length) {
      throw new BadRequestException(`Stalwart domain ${env.stalwart.domain} was not found.`);
    }
    return String(ids[0]);
  }

  private async accountExists(name: string) {
    const response = await this.jmap([["x:Account/query", { filter: { name } }, "q"]]);
    const query = response.methodResponses?.[0]?.[1];
    return Array.isArray(query?.ids) && query.ids.length > 0;
  }

  private async createAccount(domainId: string, name: string, password: string) {
    const response = await this.jmap([
      [
        "x:Account/set",
        {
          create: {
            new1: {
              "@type": "User",
              name,
              domainId,
              credentials: {
                "0": {
                  "@type": "Password",
                  secret: password,
                },
              },
              memberGroupIds: {},
              roles: { "@type": "User" },
              permissions: { "@type": "Inherit" },
              quotas: {},
              aliases: {},
              encryptionAtRest: { "@type": "Disabled" },
            },
          },
        },
        "create",
      ],
    ]);
    const set = response.methodResponses?.[0]?.[1];
    const createdId = set?.created?.new1?.id;
    if (!createdId) {
      this.logger.warn(`Stalwart account create failed: ${JSON.stringify(set)}`);
      throw new BadRequestException("Stalwart mailbox creation failed.");
    }
    return String(createdId);
  }

  private async jmap(methodCalls: any[]): Promise<JmapResponse> {
    const credentials = Buffer.from(`${env.stalwart.adminUser}:${env.stalwart.adminPass}`).toString("base64");
    const response = await fetch(env.stalwart.jmapUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        using: ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
        methodCalls,
      }),
    });

    if (!response.ok) {
      throw new BadRequestException(`Stalwart API returned ${response.status}.`);
    }
    return (await response.json()) as JmapResponse;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
