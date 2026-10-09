// Domus — Notifications SMS au PROPRIETAIRE (bailleur legal du bien).
//
// Quatre evenements, tous best-effort : un echec d'envoi ne doit JAMAIS faire
// echouer l'operation metier (creation de dossier, de bail, de paiement, ni la
// boucle de rappels de retard).
//   1. tenant_created_owner   — un dossier locataire est ouvert sur son bien
//   2. lease_created_owner    — un bail est cree sur son bien
//   3. payment_received_owner — un loyer est encaisse sur son bien
//   4. payment_overdue_owner  — un loyer de son bien est en retard
//
// Ce service porte aussi les messages adresses au LOCATAIRE (renderMessage est
// public) : tous les textes Domus passent par le meme rendu, donc tous sont
// modifiables depuis Reglages.
//
// Chaque SMS reste court (1-2 segments : un SMS = 160 caracteres, au-dela le
// cout est multiplie) et se termine par un lien court vers le portail
// proprietaire, ou il retrouve la fiche complete du locataire et de ses baux.
//
// Les textes sont surchargeables depuis Reglages > Messages & notifications
// (table email_templates, eventType ci-dessus). Sans template actif, le texte
// par defaut code ici est utilise.
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  emailTemplates,
  realEstateDelegateAssignments,
  realEstateDelegates,
  realEstateLeases,
  realEstateOwners,
  realEstateProperties,
  realEstateUnits,
  tenantDetails,
} from "../database/schema";
import type { Database } from "../database/types";
import { CompatService } from "../compat/compat.service";
import { DelegatePortalService } from "./delegate-portal.service";
import { OwnerPortalService } from "./owner-portal.service";
import { TenantPortalService } from "./tenant-portal.service";

/**
 * Proprietaire a notifier. `propertyId` n'est renseigne que lorsque la
 * notification porte sur un bien precis (bail, paiement, retard) ; il est
 * absent pour une annonce generale adressee a tout le portefeuille.
 */
type OwnerTarget = { id: number; name: string; phone: string; propertyId?: number };

@Injectable()
export class OwnerNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(OwnerNotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly sms: CompatService,
    private readonly delegatePortal: DelegatePortalService,
    private readonly ownerPortal: OwnerPortalService,
    private readonly tenantPortal: TenantPortalService,
  ) {}

  /**
   * Catalogue des messages Domus : un modele modifiable par evenement.
   * Il est insere en base au premier demarrage (voir onModuleInit) pour que
   * CHAQUE texte envoye soit visible et editable depuis Reglages > Messages &
   * notifications, sans qu'un gestionnaire ait a cliquer sur "Generer des
   * exemples". Les textes de repli qui subsistent dans le code ne servent
   * donc plus qu'a couvrir le cas ou une ligne serait supprimee a la main.
   */
  private static readonly DEFAULT_TEMPLATES: Array<{
    name: string;
    eventType: string;
    subject: string;
    body: string;
  }> = [
    {
      name: "Lien d'inscription locataire",
      eventType: "tenant_onboarding",
      subject: "Votre lien d'inscription locataire",
      body: "Bonjour {firstName}, completez votre dossier locataire Domus ici : {url}",
    },
    {
      name: "Enquete de prelocation",
      eventType: "tenant_prescreening",
      subject: "Enquete de prelocation",
      body: "Bonjour {firstName}, veuillez completer votre enquete de prelocation ici : {url}",
    },
    {
      name: "Dossier locataire cree",
      eventType: "tenant_created",
      subject: "Votre dossier locataire est cree",
      body: "Bonjour {firstName}, votre dossier locataire est cree. Consultez-le ici : {url}",
    },
    {
      name: "Contrat a signer",
      eventType: "contract_signature",
      subject: "Votre contrat de bail est pret a etre signe",
      body:
        "Bonjour {tenantName}, votre bail est pret. Signez-le ici : {url} (valable 7 j). {companyName}",
    },
    {
      name: "Confirmation de bail",
      eventType: "lease_created",
      subject: "Votre bail {reference} est confirme",
      body:
        "Bonjour {tenantName}, bail {reference} actif : {address}, loyer {amount}. " +
        "Proprietaire : {landlordName}. {companyName}",
    },
    {
      name: "Bienvenue apres signature",
      eventType: "contract_signed",
      subject: "Bienvenue ! Votre bail {reference} est signe et confirme",
      body:
        "Bonjour {tenantName}, bail {reference} signe. Bienvenue au {address}, appt {unit}, " +
        "du {startDate} au {endDate}. Contact : {contacts}",
    },
    {
      name: "Quittance / paiement recu",
      eventType: "payment_received",
      subject: "Paiement recu — bail {reference}",
      body:
        "Bonjour {firstName}, paiement de {amount} recu (bail {reference}). Quittance : {url}. Merci !",
    },
    {
      name: "Rappel de loyer en retard",
      eventType: "payment_reminder",
      subject: "Rappel : loyer en retard — bail {reference}",
      body:
        "Bonjour {tenantName}, votre loyer de {amount} (bail {reference}) a {daysLate} j de retard. " +
        "Merci de regulariser rapidement. Contact : {contacts}",
    },
    {
      name: "Rappel de loyer — personne de contact",
      eventType: "payment_reminder_contact",
      subject: "Loyer en retard de {tenantName}",
      body:
        "Bonjour, {tenantName} a {daysLate} j de retard de loyer ({amount}). " +
        "Merci de l'inviter a regulariser : {contacts}",
    },
    {
      name: "Justificatif de paiement refuse",
      eventType: "payment_proof_rejected",
      subject: "Justificatif de paiement refuse — bail {reference}",
      body: "Bonjour {tenantName}, justificatif refuse (bail {reference}) : {reason}. Renvoyez-le ici : {url}",
    },
    {
      name: "Preavis pour defaut de paiement — locataire",
      eventType: "default_notice",
      subject: "Preavis pour defaut de paiement — bail {reference}",
      body:
        "Bonjour {tenantName}, {monthsBehind} mois de loyer impayes ({amount}). " +
        "Sans paiement, un preavis de defaut sera depose. Contact : {contacts}",
    },
    {
      name: "Preavis defaut de paiement — personne de contact",
      eventType: "default_notice_contact",
      subject: "Preavis pour defaut de paiement de {tenantName}",
      body:
        "Bonjour, {tenantName} a {monthsBehind} mois de loyer impayes ({amount}). " +
        "Un preavis sera depose sans paiement. Merci de l'inviter a contacter {contacts}",
    },
    {
      name: "Proprietaire — preavis pour defaut de paiement",
      eventType: "default_notice_owner",
      subject: "Preavis notifie — bail {reference}",
      body:
        "Preavis pour defaut de paiement notifie a {tenantName} ({property}) : " +
        "{monthsBehind} mois impayes, {amount}. {url}",
    },
    {
      name: "Proprietaire — nouveau dossier locataire",
      eventType: "tenant_created_owner",
      subject: "Nouveau dossier locataire",
      body:
        "Nouveau locataire : {tenantName} ({tenantPhone}). " +
        "{profession} chez {employer}, revenu {income}. Urgence : {emergencyContact}.",
    },
    {
      name: "Proprietaire — nouveau bail",
      eventType: "lease_created_owner",
      subject: "Nouveau bail {reference} sur votre bien",
      body:
        "Bail {tenantName}, {unit}. {startDate} au {endDate}. " +
        "Loyer {amount}, caut. {deposit}. {url}",
    },
    {
      name: "Delegue — loyer en retard a confirmer",
      eventType: "payment_overdue_delegate",
      subject: "Loyer en retard a verifier",
      body:
        "{tenantName} doit {amount} pour {property}, {daysLate} j de retard. " +
        "A-t-il paye ? Repondez ici : {url}",
    },
    {
      name: "Fin de bail — locataire",
      eventType: "lease_expiring",
      subject: "Votre bail se termine le {endDate}",
      body:
        "Bonjour {firstName}, votre bail {address} se termine le {endDate}. " +
        "Pour le renouveler ou nous informer de votre depart, contactez {contacts}.",
    },
    {
      name: "Proprietaire — fin de bail",
      eventType: "lease_expiring_owner",
      subject: "Fin de bail {reference} sur votre bien",
      body:
        "Fin de bail : {tenantName}, {unit} se termine le {endDate}. " +
        "Loyer {amount}. {url}",
    },
    {
      name: "Proprietaire — loyer en retard",
      eventType: "payment_overdue_owner",
      subject: "Loyer en retard — bail {reference}",
      body:
        "Loyer en retard : {tenantName} doit {amount} pour {property}, " +
        "{daysLate} j de retard. {url}",
    },
    {
      name: "Proprietaire — paiement recu",
      eventType: "payment_received_owner",
      subject: "Paiement recu — bail {reference}",
      body:
        "Paiement recu : {tenantName} a regle {amount} pour {property}. {url}",
    },
  ];

  /** Anciens textes par defaut (trop longs pour 1 SMS) : remplaces au demarrage uniquement si la ligne est restee identique. */
  private static readonly LEGACY_DEFAULT_BODIES: Record<string, string> = {
    contract_signature: "Bonjour {tenantName}, votre contrat de bail est pret a etre signe. Signez-le ici : {url} (lien valable 7 jours). — {companyName}",
    lease_created: "Bonjour {tenantName}, bienvenue ! Votre bail ({reference}) pour {address}, loyer {amount}, est actif. Proprietaire : {landlordName}. — {companyName}",
    contract_signed: "Bonjour {tenantName}, felicitations ! Votre contrat de bail {reference} est bien signe. Bienvenue dans votre nouveau logement : {address}, appartement {unit}. Votre bailleur est {landlordName}. Votre location court du {startDate} au {endDate} ({duration}). Pour toute question, contactez {contacts}. — {companyName}",
    payment_received: "Bonjour {firstName}, nous confirmons la reception de votre paiement de {amount} pour le bail {reference}. Votre quittance et le detail de vos paiements : {url}. Merci !",
    payment_reminder: "Bonjour {tenantName}, nous constatons que le loyer de {address} (bail {reference}), d'un montant de {amount}, est en retard de {daysLate} jours. Nous vous invitons gentiment a regulariser ce paiement des que possible afin d'eviter l'annulation de votre contrat de location. Pour tout reglement ou question, contactez {contacts}. — {companyName}",
    payment_reminder_contact: "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que son loyer pour {address} ({amount}) est en retard de {daysLate} jours. Merci de bien vouloir l'inviter a regulariser ce paiement aupres de {contacts}. — {companyName}",
    default_notice: "Bonjour {tenantName}, malgre nos rappels, {monthsBehind} mois de loyer restent impayes pour {address} (bail {reference}), soit {amount}. Sans regularisation de votre part, un preavis pour defaut de paiement sera depose. Merci de contacter {contacts} sans tarder.",
    default_notice_contact: "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que {monthsBehind} mois de loyer ({amount}) restent impayes pour {address}. Sans regularisation, un preavis pour defaut de paiement sera depose. Merci de l'inviter a contacter {contacts}.",
    tenant_created_owner: "Nouveau dossier locataire : {tenantName} ({tenantPhone}). {profession} chez {employer}, revenu {income}. {maritalStatus} {spouse}. {occupants} occupants. Contact : {emergencyContact}.",
  };

  /**
   * Reference de contact sortante : les anciens modeles renvoyaient le
   * locataire vers le numero generique de la societe. Elle est reecrite au
   * demarrage vers {contacts} (proprietaire + gestionnaire du bien).
   */
  private static readonly LEGACY_CONTACT_FRAGMENTS: Array<[RegExp, string]> = [
    [/\{companyName\}\{contactPhone\}/g, "{contacts}"],
    [/contactez-nous au \{contactPhone\}/g, "contactez {contacts}"],
    [/\{contactPhone\}/g, "{contacts}"],
  ];

  /**
   * Insere les modeles manquants au demarrage, et remplace dans les modeles
   * existants la seule reference au contact generique de la societe par
   * {contacts}. Idempotent : hors ce fragment, un modele deja en base (meme
   * modifie, meme desactive) n'est jamais touche — on ne doit pas ecraser la
   * personnalisation d'un gestionnaire a chaque redemarrage.
   * Best-effort : une erreur ici ne doit pas empecher l'application de demarrer.
   */
  async onModuleInit() {
    try {
      const existing = await this.db
        .select({ id: emailTemplates.id, eventType: emailTemplates.eventType, body: emailTemplates.body })
        .from(emailTemplates);
      const known = new Set(existing.map((r) => r.eventType).filter(Boolean));

      const missing = OwnerNotificationsService.DEFAULT_TEMPLATES.filter((t) => !known.has(t.eventType));
      if (missing.length) {
        await this.db.insert(emailTemplates).values(
          missing.map((t) => ({
            name: t.name,
            subject: t.subject,
            body: t.body,
            eventType: t.eventType,
            status: "true",
          })),
        );
        this.logger.log(`Message templates seeded: ${missing.map((t) => t.eventType).join(", ")}`);
      }

      const norm = (v: string) => v.replace(/\s+/g, " ").trim();
      for (const row of existing) {
        const body = row.body || "";
        const legacy = row.eventType ? OwnerNotificationsService.LEGACY_DEFAULT_BODIES[row.eventType] : undefined;
        const fresh = OwnerNotificationsService.DEFAULT_TEMPLATES.find((t) => t.eventType === row.eventType);
        if (legacy && fresh && norm(body) === norm(legacy)) {
          await this.db.update(emailTemplates).set({ body: fresh.body }).where(eq(emailTemplates.id, row.id));
          this.logger.log(`Message template shortened for SMS: ${row.eventType}`);
          continue;
        }
        let next = body;
        for (const [re, to] of OwnerNotificationsService.LEGACY_CONTACT_FRAGMENTS) {
          next = next.replace(re, to);
        }
        if (next === body) continue;
        await this.db
          .update(emailTemplates)
          .set({ body: next })
          .where(eq(emailTemplates.id, row.id));
        this.logger.log(`Message template contact placeholder migrated: ${row.eventType}`);
      }
    } catch (error) {
      this.logger.warn(
        `Message templates seeding skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delegues a prevenir pour un bien, pour un evenement donne.
   *
   * Un delegue est joint quand il suit ce bien precis (scope 'property') OU
   * tout le portefeuille de son proprietaire (scope 'owner') : la seconde
   * portee le rattache automatiquement aux biens acquis plus tard, sans
   * reaffectation. Le drapeau d'abonnement filtre par evenement, pour ne pas
   * inonder un mandataire engage seulement sur les retards.
   *
   * Comme pour les proprietaires, un delegue sans telephone est saute en
   * silence : l'operation metier ne doit jamais echouer sur un envoi.
   */
  private async resolveDelegatesForProperty(
    propertyId: number,
    orgId: number,
    event: "lease" | "overdue" | "payment",
  ): Promise<OwnerTarget[]> {
    try {
      const [property] = await this.db
        .select({ ownerId: realEstateProperties.ownerId })
        .from(realEstateProperties)
        .where(and(
          eq(realEstateProperties.id, propertyId),
          eq(realEstateProperties.organizationId, orgId),
        ))
        .limit(1);
      if (!property) return [];

      const flag =
        event === "lease"
          ? realEstateDelegateAssignments.notifyLease
          : event === "overdue"
            ? realEstateDelegateAssignments.notifyOverdue
            : realEstateDelegateAssignments.notifyPayment;

      // Le bien lui-meme, ou le portefeuille de son proprietaire quand il en a un.
      const scopeMatch = property.ownerId
        ? or(
            and(
              eq(realEstateDelegateAssignments.scopeType, "property"),
              eq(realEstateDelegateAssignments.scopeId, propertyId),
            ),
            and(
              eq(realEstateDelegateAssignments.scopeType, "owner"),
              eq(realEstateDelegateAssignments.scopeId, Number(property.ownerId)),
            ),
          )
        : and(
            eq(realEstateDelegateAssignments.scopeType, "property"),
            eq(realEstateDelegateAssignments.scopeId, propertyId),
          );

      const rows = await this.db
        .select({
          id: realEstateDelegates.id,
          displayName: realEstateDelegates.displayName,
          phone: realEstateDelegates.phone,
          phone2: realEstateDelegates.phone2,
        })
        .from(realEstateDelegateAssignments)
        .innerJoin(
          realEstateDelegates,
          eq(realEstateDelegates.id, realEstateDelegateAssignments.delegateId),
        )
        .where(and(
          eq(realEstateDelegateAssignments.organizationId, orgId),
          eq(realEstateDelegateAssignments.isActive, 1),
          eq(realEstateDelegates.organizationId, orgId),
          eq(realEstateDelegates.isActive, 1),
          eq(flag, 1),
          scopeMatch,
        ));

      // Un delegue cumulant les deux portees (le bien ET son proprietaire)
      // remonte deux fois : il ne doit recevoir qu'un seul SMS.
      const seen = new Set<number>();
      const targets: OwnerTarget[] = [];
      for (const row of rows) {
        const id = Number(row.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const phone = (row.phone || row.phone2 || "").trim();
        if (!phone) continue;
        targets.push({ id, name: row.displayName, phone, propertyId });
      }
      return targets;
    } catch (error) {
      this.logger.warn(
        `resolveDelegatesForProperty failed (property ${propertyId}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Relaie aux delegues du bien le message deja rendu pour le proprietaire.
   * Le texte est identique : un seul modele a maintenir dans Reglages, et le
   * delegue lit exactement ce que lit le bailleur. Best-effort, comme send().
   */
  private async sendToDelegates(
    propertyId: number,
    orgId: number,
    event: "lease" | "overdue" | "payment",
    message: string,
    smsType: string,
    relatedType: string,
    relatedId: number,
  ) {
    const delegates = await this.resolveDelegatesForProperty(propertyId, orgId, event);
    for (const delegate of delegates) {
      await this.send(delegate, message, smsType, relatedType, relatedId, orgId);
    }
  }

  /**
   * Proprietaire d'un bien, seulement s'il a un telephone exploitable.
   * Retourne null (et non une erreur) quand le bien n'a pas de proprietaire
   * assigne ou que celui-ci n'a pas de numero : la notification est simplement
   * sautee, l'operation metier continue.
   */
  private async resolveOwnerForProperty(propertyId: number, orgId: number): Promise<OwnerTarget | null> {
    const [row] = await this.db
      .select({
        ownerId: realEstateOwners.id,
        displayName: realEstateOwners.displayName,
        phone: realEstateOwners.phone,
        phone2: realEstateOwners.phone2,
        isActive: realEstateOwners.isActive,
      })
      .from(realEstateProperties)
      .innerJoin(realEstateOwners, eq(realEstateOwners.id, realEstateProperties.ownerId))
      .where(and(
        eq(realEstateProperties.id, propertyId),
        eq(realEstateProperties.organizationId, orgId),
        eq(realEstateOwners.organizationId, orgId),
      ))
      .limit(1);

    if (!row || !row.isActive) return null;
    const phone = (row.phone || row.phone2 || "").trim();
    if (!phone) return null;
    return { id: Number(row.ownerId), name: row.displayName, phone, propertyId };
  }

  /**
   * Tous les proprietaires actifs de l'organisation ayant un telephone
   * exploitable. Sert aux annonces qui ne visent pas un bien precis (ouverture
   * d'un dossier locataire) : la ou resolveOwnerForProperty cible le bailleur
   * d'UN bien, celle-ci renvoie le portefeuille complet. Les bailleurs sans
   * numero sont simplement ignores, jamais une erreur.
   */
  private async activeOwnersWithPhone(orgId: number): Promise<OwnerTarget[]> {
    const rows = await this.db
      .select({
        id: realEstateOwners.id,
        displayName: realEstateOwners.displayName,
        phone: realEstateOwners.phone,
        phone2: realEstateOwners.phone2,
      })
      .from(realEstateOwners)
      .where(and(
        eq(realEstateOwners.organizationId, orgId),
        eq(realEstateOwners.isActive, 1),
      ));

    return rows
      .map((row) => {
        const phone = (row.phone || row.phone2 || "").trim();
        return phone
          ? { id: Number(row.id), name: row.displayName, phone }
          : null;
      })
      .filter((o): o is OwnerTarget => o !== null);
  }

  /**
   * Contacts a donner au LOCATAIRE pour un bien : le proprietaire (bailleur)
   * et le gestionnaire assigne a ce bien (delegue du suivi de loyer).
   *
   * Le locataire ne doit plus etre renvoye vers un numero d'entreprise
   * generique : il appelle les personnes reellement en charge de SON immeuble.
   * Le gestionnaire retenu est le premier delegue actif abonne aux retards,
   * qu'il suive ce bien precis ou tout le portefeuille du proprietaire.
   *
   * Best-effort : un bien sans proprietaire joignable ou sans gestionnaire
   * renvoie simplement des chaines vides — les placeholders disparaissent alors
   * du message via tidy(), plutot que de bloquer l'envoi.
   */
  async propertyContactVars(
    propertyId: number | null | undefined,
    orgId: number,
  ): Promise<{ ownerContact: string; managerContact: string; contacts: string }> {
    const empty = { ownerContact: "", managerContact: "", contacts: "" };
    if (!propertyId) return empty;
    try {
      const [owner, delegates] = await Promise.all([
        this.resolveOwnerForProperty(Number(propertyId), orgId).catch(() => null),
        this.resolveDelegatesForProperty(Number(propertyId), orgId, "overdue"),
      ]);

      const label = (t: OwnerTarget | null | undefined) =>
        t && t.phone ? `${t.name} au ${t.phone}` : "";
      const ownerContact = label(owner);
      // Le gestionnaire est parfois aussi le proprietaire : on ne repete pas
      // le meme numero deux fois dans un SMS de 160 caracteres.
      const manager = delegates.find((d) => !owner || d.phone !== owner.phone);
      const managerContact = label(manager);

      const parts = [
        ownerContact ? `proprietaire ${ownerContact}` : "",
        managerContact ? `gestionnaire ${managerContact}` : "",
      ].filter(Boolean);

      return { ownerContact, managerContact, contacts: parts.join(", ") };
    } catch (error) {
      this.logger.warn(
        `propertyContactVars failed (property ${propertyId}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return empty;
    }
  }

  /**
   * Texte du message : template configure (Reglages > Messages & notifications)
   * si present, sinon le defaut fourni. Les placeholders sont substitues dans
   * les deux cas. Public : PropertyManagementService et ContractsService s'en
   * servent aussi pour leurs messages au locataire, afin qu'AUCUN texte envoye
   * ne reste code en dur et non modifiable depuis les Reglages.
   */
  async renderMessage(
    eventType: string,
    fallback: string,
    vars: Record<string, string>,
    opts?: { tenantId?: number | null; sex?: string | null },
  ): Promise<string> {
    let text = fallback;
    // Civilite (Mr/Mme) pour tout message ADRESSE au locataire : {tenantName} et
    // {firstName} deviennent "Mr Prenom Nom" quand le sexe est connu (tenantId ->
    // tenant_details.sex, ou sex fourni, ex. dossier d'inscription).
    if (opts?.tenantId || opts?.sex) {
      const civil = opts.tenantId
        ? await this.civilNameForTenant(Number(opts.tenantId))
        : this.civilName(opts.sex, vars.firstName, vars.lastName ?? "");
      if (civil) vars = { ...vars, tenantName: civil, firstName: civil };
    }
    try {
      const [tpl] = await this.db
        .select({ body: emailTemplates.body })
        .from(emailTemplates)
        .where(and(eq(emailTemplates.eventType, eventType), eq(emailTemplates.status, "true")))
        .limit(1);
      if (tpl?.body) text = tpl.body;
    } catch (error) {
      this.logger.warn(
        `Template ${eventType} unreadable, falling back to default: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value ?? "");
    }
    // Un template mal rempli peut laisser des placeholders inconnus : on les
    // retire plutot que d'envoyer "{foo}" tel quel au destinataire.
    return this.fitOneSms(this.tidy(text.replace(/\{[a-zA-Z]+\}/g, "")));
  }

  /**
   * Nettoie un texte dont des placeholders ont ete remplaces par du vide :
   * un bail sans unite ne doit pas produire "12 rue X, appartement ," mais
   * "12 rue X.". On supprime les mots d'introduction restes orphelins, puis
   * la ponctuation et les espaces en double.
   */
  tidy(text: string) {
    let out = text
      // Parentheses et guillemets vides laisses par un placeholder absent.
      .replace(/\(\s*\)/g, "")
      .replace(/«\s*»/g, "");

    // Les mots de liaison qui introduisaient une valeur disparue ("chez ,",
    // "revenu .", "Contact :.") n'ont plus de sens : on les retire. Repete
    // car supprimer un fragment peut en exposer un autre juste avant.
    const orphans = [
      // "<mot d'introduction>" suivi immediatement d'une ponctuation de fin
      /\s*\b(chez|revenu|contact|contactez|contactez-nous|proprietaire|bailleur|appartement|appt|unite|de|a|au|pour|du|avec)\b\s*:?\s*(?=[.,;)]|$)/gi,
      // "Marie a ." / "Marie(e) avec ." -> mention retiree quand le conjoint
      // n'est pas renseigne. Le lookbehind sur un debut de phrase evite de
      // supprimer le PRENOM "Marie" dans "Bonjour Marie, ...".
      /(?<=^|[.;])\s*mari[ée]e?(?:\([ée]?e?\))?\s*(?:a|avec)?\s*(?=[.,;]|$)/gi,
      // segment entre ponctuations ne contenant qu'un mot d'introduction
      /([.,;])\s*\b(chez|revenu|contact|occupants?|enfants?)\b\s*(?=[.,;]|$)/gi,
    ];
    for (let i = 0; i < 3; i += 1) {
      for (const re of orphans) out = out.replace(re, (m, g1) => (g1 && /[.,;]/.test(g1) ? g1 : ""));
    }

    return out
      .replace(/\s+([.,;!?])/g, "$1")
      // Ponctuations accumulees par les suppressions : "..", ". .", ",." , ":."
      .replace(/[.,;:]\s*(?=[.,;:])/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Garantit qu'un message tient dans UN seul SMS (160 caracteres GSM-7).
   * Au-dela, l'operateur facture un segment de plus par tranche entamee, d'ou
   * la contrainte. Si le texte contient une URL, elle est preservee integrale :
   * un lien tronque est inutilisable, donc c'est le corps du message qui est
   * coupe, sur une frontiere de phrase ou de mot, avec une ellipse.
   */
  fitOneSms(text: string, limit = 160): string {
    if (text.length <= limit) return text;

    // Coupe sur une frontiere de mot et garantit <= limit : le .trim() et le
    // retrait du dernier mot peuvent raccourcir, jamais rallonger, et un
    // ultime slice() protege contre tout depassement residuel.
    const clip = (t: string, max: number) => {
      if (t.length <= max) return t;
      const head = t.slice(0, max - 1).replace(/\s+\S*$/, "").trimEnd();
      return `${head}…`.slice(0, max);
    };

    const url = text.match(/https?:\/\/\S+/)?.[0] ?? "";
    if (!url) return clip(text, limit);

    // On garde " <url>" en fin de message et on rogne ce qui precede.
    const body = text.replace(url, "").trim();
    const room = limit - url.length - 1;
    if (room <= 0) return url.slice(0, limit);
    return `${clip(body, room)} ${url}`.trim().slice(0, limit);
  }

  /** Envoi best-effort, trace dans sms_logs comme tous les autres envois. */
  private async send(target: OwnerTarget, message: string, smsType: string, relatedType: string, relatedId: number, orgId: number) {
    try {
      const res = await this.sms.sendSms({
        phone: target.phone,
        message,
        organizationId: orgId,
        smsType,
        relatedType,
        relatedId,
      });
      if (!res?.success) {
        this.logger.warn(`Owner SMS not sent (${smsType}, owner ${target.id}, ${target.phone}): ${res?.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `Owner SMS error (${smsType}, owner ${target.id}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Avis de retard aux DELEGUES du bien, avec lien de confirmation.
   *
   * Message distinct de celui du proprietaire : le bailleur est informe, le
   * delegue est interroge. Chaque delegue recoit SON propre lien — un token
   * partage permettrait a l un de repondre a la place de l autre et rendrait
   * la tracabilite inutilisable.
   *
   * Best-effort de bout en bout : un delegue dont le lien ne peut etre genere
   * est saute, la boucle de rappels n est jamais interrompue.
   */
  private async notifyOverdueDelegates(
    leaseId: number,
    propertyId: number,
    orgId: number,
    baseVars: Record<string, string>,
  ) {
    const delegates = await this.resolveDelegatesForProperty(propertyId, orgId, "overdue");
    for (const delegate of delegates) {
      try {
        const { url } = await this.delegatePortal.generateRentCheckLink(
          delegate.id,
          leaseId,
          orgId,
          propertyId,
        );
        const fallback =
          "{tenantName} doit {amount} pour {property}, {daysLate} j de retard. " +
          "A-t-il paye ? Repondez ici : {url}";
        const message = await this.renderMessage(
          "payment_overdue_delegate",
          fallback,
          { ...baseVars, delegateName: delegate.name, url },
        );
        await this.send(
          delegate, message, "payment_overdue_delegate", "real-estate-lease", leaseId, orgId,
        );
      } catch (error) {
        this.logger.warn(
          `notifyOverdueDelegates failed (lease ${leaseId}, delegate ${delegate.id}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Nom du proprietaire d'un bien, pour l'afficher au LOCATAIRE (message de
   * bail : il doit savoir a qui il loue). Contrairement a resolveOwnerForProperty,
   * n'exige pas de telephone : on veut le nom meme si le bailleur n'est pas
   * joignable par SMS. Retourne "" si le bien n'a pas de proprietaire assigne.
   */
  async ownerNameForProperty(propertyId: number | null | undefined, orgId: number): Promise<string> {
    if (!propertyId) return "";
    try {
      const [row] = await this.db
        .select({ displayName: realEstateOwners.displayName })
        .from(realEstateProperties)
        .innerJoin(realEstateOwners, eq(realEstateOwners.id, realEstateProperties.ownerId))
        .where(and(
          eq(realEstateProperties.id, propertyId),
          eq(realEstateProperties.organizationId, orgId),
          eq(realEstateOwners.organizationId, orgId),
        ))
        .limit(1);
      return row?.displayName || "";
    } catch {
      return "";
    }
  }

  /**
   * Libelle lisible de l'etat civil pour un SMS. La base stocke un code neutre
   * (migration 0207 : single/married/common_law/divorced/widowed) mais les
   * fiches anterieures gardent des valeurs FR libres : les deux sont acceptees,
   * comme cote frontend (MARITAL_LEGACY_TO_CODE dans locataires.jsx).
   * Retourne "" si l'etat civil n'est pas renseigne.
   */
  private maritalLabel(status?: string | null): string {
    const key = String(status || "").trim().toLowerCase();
    if (!key) return "";
    const legacy: Record<string, string> = {
      "célibataire": "single", celibataire: "single", single: "single",
      "marié": "married", marie: "married", married: "married",
      "conjoint de fait": "common_law", "union libre": "common_law", common_law: "common_law",
      "divorcé": "divorced", divorce: "divorced", divorced: "divorced",
      veuf: "widowed", veuve: "widowed", widowed: "widowed",
    };
    const labels: Record<string, string> = {
      single: "Celibataire",
      married: "Marie(e)",
      common_law: "Conjoint de fait",
      divorced: "Divorce(e)",
      widowed: "Veuf/Veuve",
    };
    const code = legacy[key] || key;
    return labels[code] || String(status || "");
  }

  /**
   * Date au format JJ/MM/AA. Un SMS coute 160 caracteres : "01/10/26" fait 8
   * caracteres la ou "2026-10-01" en fait 10, et le format court est celui que
   * lisent les destinataires en RDC. Retourne "" si la date est absente.
   */
  shortDate(value?: string | null): string {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
  }

  private fullName(firstName?: string | null, lastName?: string | null) {
    return [firstName, lastName].filter(Boolean).join(" ").trim();
  }

  // "Mr Prenom Nom" / "Mme Prenom Nom" selon tenant_details.sex (M/F) ; sans
  // sexe renseigne, nom complet seul. Utilise pour {tenantName} dans les SMS.
  civilName(sex: string | null | undefined, firstName?: string | null, lastName?: string | null) {
    const name = this.fullName(firstName, lastName);
    if (!name) return name;
    const s = String(sex || "").trim().toUpperCase();
    const civility = s.startsWith("F") ? "Mme" : s.startsWith("M") ? "Mr" : "";
    return civility ? `${civility} ${name}` : name;
  }

  /** "Mr/Mme Prenom Nom" d'un locataire (customers + tenant_details.sex) ; "" si introuvable. */
  async civilNameForTenant(tenantId: number): Promise<string> {
    try {
      const [t] = await this.db
        .select({ firstName: customers.firstName, lastName: customers.lastName, sex: tenantDetails.sex })
        .from(customers)
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(eq(customers.id, tenantId))
        .limit(1);
      return t ? this.civilName(t.sex, t.firstName, t.lastName) : "";
    } catch {
      return "";
    }
  }

  private money(amount: unknown, code?: string | null) {
    const n = Number(amount ?? 0);
    const formatted = Number.isFinite(n) ? n.toLocaleString("fr-FR") : String(amount ?? "");
    return code ? `${formatted} ${code}` : formatted;
  }

  // ── 1. Dossier locataire cree sur un bien du proprietaire ────────────────

  /**
   * Prevenu a la creation du dossier locataire, quand un bien est renseigne.
   * Sans bien (dossier ouvert hors contexte), il n'y a pas de proprietaire a
   * notifier : on attend la creation du bail, qui elle porte toujours un bien.
   */
  async notifyTenantCreated(tenantId: number, orgId: number) {
    try {
      // Diffusion a TOUS les proprietaires actifs joignables de l'organisation.
      // A la creation du dossier, aucun bien n'est encore rattache au locataire
      // (le rattachement reel, c'est le bail) : il n'existe donc aucun
      // proprietaire a cibler, et l'information circule a l'ensemble du
      // portefeuille. Le ciblage sur UN bailleur intervient a la creation du
      // bail (notifyLeaseCreated), quand le bien loue est enfin connu.
      const owners = await this.activeOwnersWithPhone(orgId);
      if (!owners.length) return;

      // Fiche complete : le proprietaire doit pouvoir juger le dossier depuis
      // le SMS. Tous ces champs sont exposes comme placeholders ; le modele par
      // defaut n'en utilise qu'une partie pour tenir dans un seul SMS, les
      // autres restent disponibles depuis Reglages > Messages.
      const [tenant] = await this.db
        .select({
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
          phone2: tenantDetails.phone2,
          nationality: tenantDetails.nationality,
          maritalStatus: tenantDetails.maritalStatus,
          idDocumentType: tenantDetails.idDocumentType,
          idNumber: tenantDetails.idNumber,
          professionalStatus: tenantDetails.professionalStatus,
          mainActivity: tenantDetails.mainActivity,
          entityName: tenantDetails.entityName,
          contractType: tenantDetails.contractType,
          monthlyPay: tenantDetails.monthlyPay,
          otherMonthlyIncome: tenantDetails.otherMonthlyIncome,
          salaryCurrencySymbol: currencies.currencySymbol,
          occupantNumber: tenantDetails.occupantNumber,
          childNumber: tenantDetails.childNumber,
          partenairName: tenantDetails.partenairName,
          partenairNumber: tenantDetails.partenairNumber,
          oldLessor: tenantDetails.oldLessor,
          contactedPerson: tenantDetails.contactedPerson,
          contactedPersonPhoneNumber: tenantDetails.contactedPersonPhoneNumber,
        })
        .from(customers)
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        // Devise du salaire : regle projet, un montant ne s'affiche jamais nu.
        .leftJoin(currencies, eq(currencies.id, tenantDetails.salaryCurrencyId))
        .where(and(eq(customers.id, tenantId), eq(customers.organizationId, orgId)))
        .limit(1);
      if (!tenant) return;

      const tenantName = this.fullName(tenant.firstName, tenant.lastName);
      // Nom du conjoint suivi de son numero entre parentheses, quand l'un ou
      // l'autre est renseigne.
      const spouseLabel = tenant.partenairName
        ? `${tenant.partenairName}${tenant.partenairNumber ? ` (${tenant.partenairNumber})` : ""}`
        : (tenant.partenairNumber || "");
      const baseVars = {
        tenantName,
        tenantPhone: tenant.phone || "",
        tenantPhone2: tenant.phone2 || "",
        tenantEmail: tenant.email || "",
        tenantAddress: tenant.address || "",
        nationality: tenant.nationality || "",
        maritalStatus: this.maritalLabel(tenant.maritalStatus),
        idNumber: [tenant.idDocumentType, tenant.idNumber].filter(Boolean).join(" "),
        profession: tenant.professionalStatus || "",
        activity: tenant.mainActivity || "",
        employer: tenant.entityName || "",
        contractType: tenant.contractType || "",
        income: tenant.monthlyPay != null ? this.money(tenant.monthlyPay, tenant.salaryCurrencySymbol) : "",
        otherIncome: tenant.otherMonthlyIncome != null ? this.money(tenant.otherMonthlyIncome, tenant.salaryCurrencySymbol) : "",
        occupants: tenant.occupantNumber != null ? String(tenant.occupantNumber) : "",
        children: tenant.childNumber != null ? String(tenant.childNumber) : "",
        // Conjoint : le formulaire ne demande ces champs que pour un locataire
        // marie / en conjoint de fait. La liaison "avec" est portee par la
        // valeur elle-meme et non par le modele : sans conjoint, {spouse} est
        // vide et la phrase se reduit a l'etat civil seul ("Celibataire."),
        // au lieu de laisser un "avec" orphelin a nettoyer.
        // Le numero est entre parentheses pour rester lisible a cote du nom ;
        // {spouseName} et {spousePhone} restent disponibles separement.
        spouse: spouseLabel ? `avec ${spouseLabel}` : "",
        spouseName: tenant.partenairName || "",
        spousePhone: tenant.partenairNumber || "",
        oldLessor: tenant.oldLessor || "",
        emergencyContact: [tenant.contactedPerson, tenant.contactedPersonPhoneNumber].filter(Boolean).join(" "),
      };
      // Pas de {property} ici : a ce stade le locataire n'est rattache a AUCUN
      // bien (le rattachement reel, c'est le bail). Le bien choisi au formulaire
      // sert uniquement a savoir quel proprietaire prevenir, l'annoncer dans le
      // message laisserait croire a une affectation qui n'existe pas.
      // Pas de lien dans le texte par defaut : la place gagnee sert aux infos
      // du dossier, que le proprietaire lit directement dans le SMS. {url}
      // reste disponible pour qui veut l'ajouter depuis Reglages > Messages.
      const fallback =
        "Nouveau dossier locataire : {tenantName} ({tenantPhone}). " +
        "{profession} chez {employer}, revenu {income}. {maritalStatus} {spouse}. " +
        "{occupants} occupants. Contact : {emergencyContact}.";
      // Un lien portail par proprietaire : chacun n'ouvre que SA vue du dossier,
      // jamais celle d'un confrere. Envois sequentiels (pas de Promise.all) pour
      // ne pas saturer la passerelle SMS sur un portefeuille de 50 bailleurs.
      for (const owner of owners) {
        const { url } = await this.ownerPortal.generateOwnerPortalLink(owner.id, tenantId, orgId, null);
        const message = await this.renderMessage("tenant_created_owner", fallback, {
          ...baseVars,
          ownerName: owner.name,
          url,
        });
        await this.send(owner, message, "tenant_created_owner", "tenant", tenantId, orgId);
      }
    } catch (error) {
      this.logger.warn(
        `notifyTenantCreated failed (tenant ${tenantId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 2. Bail cree sur un bien du proprietaire ─────────────────────────────

  /**
   * Recapitulatif du bail : locataire, adresse du logement, duree, loyer,
   * caution, et charges/syndic quand une taxe par bail est configuree.
   */
  async notifyLeaseCreated(leaseId: number, orgId: number) {
    try {
      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          propertyId: realEstateLeases.propertyId,
          tenantId: realEstateLeases.tenantId,
          startDate: realEstateLeases.startDate,
          endDate: realEstateLeases.endDate,
          rentAmount: realEstateLeases.rentAmount,
          securityDeposit: realEstateLeases.securityDeposit,
          billingCycle: realEstateLeases.billingCycle,
          taxName: realEstateLeases.taxName,
          taxType: realEstateLeases.taxType,
          taxValue: realEstateLeases.taxValue,
          currencySymbol: currencies.currencySymbol,
          propertyName: realEstateProperties.name,
          propertyAddress: realEstateProperties.address,
          propertyCity: realEstateProperties.city,
          unitName: realEstateUnits.name,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease) return;

      const owner = await this.resolveOwnerForProperty(Number(lease.propertyId), orgId);
      if (!owner) return;

      const { url } = await this.ownerPortal.generateOwnerPortalLink(
        owner.id,
        Number(lease.tenantId),
        orgId,
        Number(lease.propertyId),
      );

      // {address} = bien + adresse complete, unite comprise quand le bail porte
      // sur un appartement ; {unit} l'expose aussi seule pour les modeles qui
      // preferent l'ecrire explicitement ("appartement {unit}").
      const address = [lease.propertyName, lease.unitName, lease.propertyAddress, lease.propertyCity]
        .filter(Boolean)
        .join(", ");
      // "Syndic"/charges : le modele ne porte pas de champ dedie, la seule
      // charge recurrente parametrable par bail est la taxe (taxName/taxValue).
      const charges =
        lease.taxName && lease.taxValue != null
          ? `${lease.taxName} ${lease.taxType === "percent" ? `${Number(lease.taxValue)}%` : this.money(lease.taxValue, lease.currencySymbol)}`
          : "";

      const vars = {
        ownerName: owner.name,
        tenantName: this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName),
        reference: lease.reference || String(lease.id),
        address,
        unit: lease.unitName || "",
        startDate: this.shortDate(lease.startDate),
        endDate: this.shortDate(lease.endDate),
        amount: this.money(lease.rentAmount, lease.currencySymbol),
        deposit: this.money(lease.securityDeposit, lease.currencySymbol),
        charges: charges ? ` Charges : ${charges}.` : "",
        url,
      };
      // Format compact impose par la limite d'UN SMS : avec un lien de ~52
      // caracteres, la version longue sautait le loyer et la caution. Ici tout
      // l'essentiel passe sans troncature (locataire, unite, debut, fin,
      // loyer, caution) ; l'adresse complete et les charges restent accessibles
      // via le lien, et les placeholders {address} / {charges} restent
      // disponibles pour qui veut les remettre depuis Reglages.
      const fallback =
        "Bail {tenantName}, {unit}. {startDate} au {endDate}. " +
        "Loyer {amount}, caut. {deposit}. {url}";
      const message = await this.renderMessage("lease_created_owner", fallback, vars);
      await this.send(owner, message, "lease_created_owner", "real-estate-lease", leaseId, orgId);
      await this.sendToDelegates(
        Number(lease.propertyId), orgId, "lease", message,
        "lease_created_delegate", "real-estate-lease", leaseId,
      );
    } catch (error) {
      this.logger.warn(
        `notifyLeaseCreated failed (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 3. Loyer encaisse sur un bien du proprietaire ────────────────────────

  /**
   * Quittance SMS au LOCATAIRE a chaque paiement encaisse. Le template
   * "payment_received" (Reglages > Messages) est deja propose dans l'UI ; il
   * sert ici de source du texte, avec repli sur un defaut court. Le lien
   * portail locataire est ajoute en pied par TenantPortalService, comme pour
   * les autres messages qui s'adressent au locataire lui-meme.
   */
  async notifyPaymentReceivedTenant(paymentId: number, leaseId: number, amount: unknown, orgId: number) {
    try {
      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          tenantId: realEstateLeases.tenantId,
          currencySymbol: currencies.currencySymbol,
          propertyName: realEstateProperties.name,
          unitName: realEstateUnits.name,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease?.tenantPhone) return;

      const tenantName = this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName);
      // {url} = espace locataire public (/domus/mon-espace?token=...), ou il
      // retrouve le detail de SES paiements et quittances. On le resout ici
      // pour que le template puisse le placer ou il veut dans le texte ; s'il
      // ne l'utilise pas, le footer standard l'ajoute en fin de message.
      let portalUrl = "";
      try {
        portalUrl = (await this.tenantPortal.generateTenantPortalLink(Number(lease.tenantId), orgId)).url;
      } catch {
        portalUrl = "";
      }
      const vars = {
        tenantName,
        firstName: tenantName,
        reference: lease.reference || String(lease.id),
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        amount: this.money(amount, lease.currencySymbol),
        url: portalUrl,
      };
      const fallback =
        "Bonjour {firstName}, paiement de {amount} recu (bail {reference}). Quittance : {url}. Merci !";
      const message = await this.renderMessage("payment_received", fallback, vars);
      // Footer ajoute seulement si le template n'a pas deja place le lien :
      // sinon le locataire recevrait deux fois la meme URL (et 2 segments SMS).
      // Le footer ajoute le lien APRES le rendu : on re-ajuste pour rester
      // dans un seul SMS, en preservant l'URL intacte.
      const withFooter = this.fitOneSms(
        portalUrl && message.includes(portalUrl)
          ? message
          : await this.tenantPortal.appendPortalFooterToSms(message, Number(lease.tenantId), orgId),
      );

      const res = await this.sms.sendSms({
        phone: lease.tenantPhone,
        message: withFooter,
        organizationId: orgId,
        smsType: "payment_received",
        relatedType: "real-estate-rent-payment",
        relatedId: paymentId,
      });
      if (!res?.success) {
        this.logger.warn(`Tenant receipt SMS not sent (payment ${paymentId}): ${res?.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `notifyPaymentReceivedTenant failed (payment ${paymentId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * SMS au locataire quand le gestionnaire refuse son justificatif : il doit
   * savoir pourquoi et pouvoir renvoyer depuis son espace. Best-effort.
   */
  async notifyProofRejectedTenant(paymentId: number, leaseId: number, reason: string, orgId: number) {
    try {
      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          tenantId: realEstateLeases.tenantId,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease?.tenantPhone) return;

      const tenantName = this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName);
      const fallback =
        "Bonjour {tenantName}, justificatif refuse (bail {reference}) : {reason}. Renvoyez-le ici : {url}";
      let portalUrl = "";
      try {
        portalUrl = (await this.tenantPortal.generateTenantPortalLink(Number(lease.tenantId), orgId)).url;
      } catch {
        portalUrl = "";
      }
      const message = await this.renderMessage("payment_proof_rejected", fallback, {
        tenantName,
        firstName: tenantName,
        reference: lease.reference || String(lease.id),
        reason,
        url: portalUrl,
      });
      const withFooter = this.fitOneSms(
        portalUrl && message.includes(portalUrl)
          ? message
          : await this.tenantPortal.appendPortalFooterToSms(message, Number(lease.tenantId), orgId),
      );
      const res = await this.sms.sendSms({
        phone: lease.tenantPhone,
        message: withFooter,
        organizationId: orgId,
        smsType: "payment_proof_rejected",
        relatedType: "real-estate-rent-payment",
        relatedId: paymentId,
      });
      if (!res?.success) {
        this.logger.warn(`Proof rejection SMS not sent (payment ${paymentId}): ${res?.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `notifyProofRejectedTenant failed (payment ${paymentId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 4. Loyer en retard sur un bien du proprietaire ───────────────────────

  /**
   * Avis de retard au bailleur, envoye par RentReminderService au meme rythme
   * que le rappel adresse au locataire (une fois par periode impayee, pilote
   * par lastOverdueReminderDate). Le propriétaire doit savoir que le loyer de
   * SON bien n'est pas rentre, sans avoir a consulter l'application.
   * Best-effort : un echec n'interrompt jamais la boucle de rappels.
   */
  async notifyPaymentOverdue(
    leaseId: number,
    propertyId: number,
    daysLate: number,
    orgId: number,
    only: { owner: boolean; delegates: boolean } = { owner: true, delegates: true },
  ) {
    try {
      const owner = await this.resolveOwnerForProperty(propertyId, orgId);
      if (!owner) return;

      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          tenantId: realEstateLeases.tenantId,
          rentAmount: realEstateLeases.rentAmount,
          currencySymbol: currencies.currencySymbol,
          propertyName: realEstateProperties.name,
          propertyAddress: realEstateProperties.address,
          propertyCity: realEstateProperties.city,
          unitName: realEstateUnits.name,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease) return;

      const { url } = await this.ownerPortal.generateOwnerPortalLink(
        owner.id,
        Number(lease.tenantId),
        orgId,
        propertyId,
      );

      const vars = {
        ownerName: owner.name,
        tenantName: this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName),
        tenantPhone: lease.tenantPhone || "",
        reference: lease.reference || String(lease.id),
        address: [lease.propertyName, lease.unitName, lease.propertyAddress, lease.propertyCity]
          .filter(Boolean)
          .join(", "),
        unit: lease.unitName || "",
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        amount: this.money(lease.rentAmount, lease.currencySymbol),
        daysLate: String(daysLate),
        url,
      };
      const fallback =
        "Loyer en retard : {tenantName} doit {amount} pour {property}, " +
        "{daysLate} j de retard. {url}";
      const message = await this.renderMessage("payment_overdue_owner", fallback, vars);
      if (only.owner) await this.send(owner, message, "payment_overdue_owner", "real-estate-lease", leaseId, orgId);
      // Le delegue ne recoit PAS le message du proprietaire : le sien porte une
      // question a laquelle il doit repondre (le locataire a-t-il paye ?) et un
      // lien d action, la ou celui du bailleur est purement informatif.
      if (only.delegates) await this.notifyOverdueDelegates(leaseId, propertyId, orgId, vars);
    } catch (error) {
      this.logger.warn(
        `notifyPaymentOverdue failed (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }


  /**
   * PREAVIS POUR DEFAUT DE PAIEMENT notifie au locataire : le bailleur (et les
   * gestionnaires delegues du bien) sont informes que la procedure a ete
   * engagee sur leur bien. Best-effort : un echec ici ne doit pas faire
   * echouer le preavis deja envoye au locataire, d'ou le retour booleen plutot
   * qu'une exception.
   *
   * Les variables sont fournies par l'appelant (PropertyManagementService), qui
   * a deja calcule les mois dus et le solde ; on ne les recalcule pas ici pour
   * que le proprietaire lise exactement les memes chiffres que le locataire.
   */
  async notifyDefaultNotice(
    leaseId: number,
    propertyId: number,
    tenantId: number,
    tenantVars: Record<string, string>,
    orgId: number,
    only: { owner: boolean; delegates: boolean } = { owner: true, delegates: true },
  ): Promise<boolean> {
    try {
      const owner = await this.resolveOwnerForProperty(propertyId, orgId);
      if (!owner) return false;

      const { url } = await this.ownerPortal.generateOwnerPortalLink(
        owner.id,
        tenantId,
        orgId,
        propertyId,
      );

      const vars = { ...tenantVars, ownerName: owner.name, url };
      const fallback =
        "Preavis pour defaut de paiement notifie a {tenantName} ({property}) : " +
        "{monthsBehind} mois impayes, {amount}. {url}";
      const message = await this.renderMessage("default_notice_owner", fallback, vars);
      if (only.owner) await this.send(owner, message, "default_notice_owner", "real-estate-lease", leaseId, orgId);
      if (only.delegates) await this.sendToDelegates(
        propertyId, orgId, "overdue", message,
        "default_notice_delegate", "real-estate-lease", leaseId,
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `notifyDefaultNotice failed (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  // ── 5. Bail arrivant a echeance sur un bien du proprietaire ──────────────

  /**
   * Previent le bailleur que le bail de son bien arrive a echeance, pour qu'il
   * anticipe le renouvellement ou la relocation. Declenche par
   * RentReminderService.runExpiryReminders, une seule fois par echeance.
   */
  async notifyLeaseExpiring(leaseId: number, propertyId: number, orgId: number) {
    try {
      const owner = await this.resolveOwnerForProperty(propertyId, orgId);
      if (!owner) return;

      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          tenantId: realEstateLeases.tenantId,
          endDate: realEstateLeases.endDate,
          rentAmount: realEstateLeases.rentAmount,
          currencySymbol: currencies.currencySymbol,
          propertyName: realEstateProperties.name,
          propertyAddress: realEstateProperties.address,
          unitName: realEstateUnits.name,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease) return;

      const { url } = await this.ownerPortal.generateOwnerPortalLink(
        owner.id,
        Number(lease.tenantId),
        orgId,
        propertyId,
      );

      const vars = {
        ownerName: owner.name,
        tenantName: this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName),
        tenantPhone: lease.tenantPhone || "",
        reference: lease.reference || String(lease.id),
        address: lease.propertyAddress || lease.propertyName || "",
        unit: lease.unitName ? `Appt ${lease.unitName}` : "",
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        endDate: this.shortDate(lease.endDate),
        amount: this.money(lease.rentAmount, lease.currencySymbol),
        url,
      };
      const fallback =
        "Fin de bail : {tenantName}, {unit} se termine le {endDate}. " +
        "Loyer {amount}. {url}";
      const message = await this.renderMessage("lease_expiring_owner", fallback, vars);
      await this.send(owner, message, "lease_expiring_owner", "real-estate-lease", leaseId, orgId);
      await this.sendToDelegates(
        propertyId, orgId, "lease", message,
        "lease_expiring_delegate", "real-estate-lease", leaseId,
      );
    } catch (error) {
      this.logger.warn(
        `notifyLeaseExpiring failed (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Confirmation d'encaissement. Le locataire recoit sa quittance de son cote
   * (notifyPaymentReceivedTenant) ; ici on previent le bailleur que l'argent
   * de SON bien est rentre.
   */
  async notifyPaymentReceived(paymentId: number, leaseId: number, amount: unknown, orgId: number) {
    try {
      const [lease] = await this.db
        .select({
          id: realEstateLeases.id,
          reference: realEstateLeases.reference,
          propertyId: realEstateLeases.propertyId,
          tenantId: realEstateLeases.tenantId,
          currencySymbol: currencies.currencySymbol,
          propertyName: realEstateProperties.name,
          unitName: realEstateUnits.name,
          tenantFirstName: customers.firstName,
          tenantLastName: customers.lastName,
          tenantSex: tenantDetails.sex,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease) return;

      const owner = await this.resolveOwnerForProperty(Number(lease.propertyId), orgId);
      if (!owner) return;

      const { url } = await this.ownerPortal.generateOwnerPortalLink(
        owner.id,
        Number(lease.tenantId),
        orgId,
        Number(lease.propertyId),
      );

      const vars = {
        ownerName: owner.name,
        tenantName: this.civilName(lease.tenantSex, lease.tenantFirstName, lease.tenantLastName),
        reference: lease.reference || String(lease.id),
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        unit: lease.unitName || "",
        amount: this.money(amount, lease.currencySymbol),
        url,
      };
      const fallback =
        "Paiement recu : {tenantName} a regle {amount} pour {property}. {url}";
      const message = await this.renderMessage("payment_received_owner", fallback, vars);
      await this.send(owner, message, "payment_received_owner", "real-estate-rent-payment", paymentId, orgId);
      if (owner.propertyId) {
        await this.sendToDelegates(
          owner.propertyId, orgId, "payment", message,
          "payment_received_delegate", "real-estate-rent-payment", paymentId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `notifyPaymentReceived failed (payment ${paymentId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
