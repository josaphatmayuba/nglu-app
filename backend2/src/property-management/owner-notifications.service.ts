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
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  emailTemplates,
  realEstateLeases,
  realEstateOwners,
  realEstateProperties,
  realEstateUnits,
  tenantDetails,
} from "../database/schema";
import type { Database } from "../database/types";
import { CompatService } from "../compat/compat.service";
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
        "Bonjour {tenantName}, votre contrat de bail est pret a etre signe. " +
        "Signez-le ici : {url} (lien valable 7 jours). — {companyName}",
    },
    {
      name: "Confirmation de bail",
      eventType: "lease_created",
      subject: "Votre bail {reference} est confirme",
      body:
        "Bonjour {tenantName}, bienvenue ! Votre bail ({reference}) pour {address}, " +
        "loyer {amount}, est actif. Proprietaire : {landlordName}. — {companyName}",
    },
    {
      name: "Bienvenue apres signature",
      eventType: "contract_signed",
      subject: "Bienvenue ! Votre bail {reference} est signe et confirme",
      body:
        "Bonjour {tenantName}, felicitations ! Votre contrat de bail {reference} est bien signe. " +
        "Bienvenue dans votre nouveau logement : {address}, appartement {unit}. " +
        "Votre bailleur est {landlordName}. Votre location court du {startDate} au {endDate} ({duration}). " +
        "Pour toute question, contactez-nous au {contactPhone}. — Votre gestionnaire",
    },
    {
      name: "Quittance / paiement recu",
      eventType: "payment_received",
      subject: "Paiement recu — bail {reference}",
      body:
        "Bonjour {firstName}, nous confirmons la reception de votre paiement de {amount} " +
        "pour le bail {reference}. Votre quittance et le detail de vos paiements : {url}. Merci !",
    },
    {
      name: "Rappel de loyer en retard",
      eventType: "payment_reminder",
      subject: "Rappel : loyer en retard — bail {reference}",
      body:
        "Bonjour {tenantName}, nous constatons que le loyer de {address} (bail {reference}), " +
        "d'un montant de {amount}, est en retard de {daysLate} jours. Nous vous invitons gentiment a " +
        "regulariser ce paiement des que possible afin d'eviter l'annulation de votre contrat de location. " +
        "Pour tout reglement ou question, contactez {companyName}{contactPhone}. — {companyName}",
    },
    {
      name: "Rappel de loyer — personne de contact",
      eventType: "payment_reminder_contact",
      subject: "Loyer en retard de {tenantName}",
      body:
        "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que son loyer pour " +
        "{address} ({amount}) est en retard de {daysLate} jours. Merci de bien vouloir l'inviter a regulariser " +
        "ce paiement aupres de {companyName}{contactPhone}. — {companyName}",
    },
    {
      name: "Proprietaire — nouveau dossier locataire",
      eventType: "tenant_created_owner",
      subject: "Nouveau dossier locataire",
      body:
        "Nouveau dossier locataire : {tenantName} ({tenantPhone}). " +
        "{profession} chez {employer}, revenu {income}. {maritalStatus} {spouse}. " +
        "{occupants} occupants. Contact : {emergencyContact}.",
    },
    {
      name: "Proprietaire — nouveau bail",
      eventType: "lease_created_owner",
      subject: "Nouveau bail {reference} sur votre bien",
      body:
        "Nouveau bail {reference} sur {address}, appartement {unit}. Locataire : {tenantName}. " +
        "Du {startDate} au {endDate}. Loyer : {amount}. Caution : {deposit}.{charges} " +
        "Details ici : {url}",
    },
    {
      name: "Proprietaire — loyer en retard",
      eventType: "payment_overdue_owner",
      subject: "Loyer en retard — bail {reference}",
      body:
        "Loyer en retard : {tenantName} ({tenantPhone}) doit {amount} pour {property} " +
        "(bail {reference}), en retard de {daysLate} jours. Details ici : {url}",
    },
    {
      name: "Proprietaire — paiement recu",
      eventType: "payment_received_owner",
      subject: "Paiement recu — bail {reference}",
      body:
        "Paiement recu : {tenantName} a regle {amount} pour {property} (bail {reference}). " +
        "Details ici : {url}",
    },
  ];

  /**
   * Insere les modeles manquants au demarrage. Idempotent : un evenement qui a
   * deja une ligne (meme modifiee, meme desactivee) n'est jamais touche — on ne
   * doit pas ecraser la personnalisation d'un gestionnaire a chaque redemarrage.
   * Best-effort : une erreur ici ne doit pas empecher l'application de demarrer.
   */
  async onModuleInit() {
    try {
      const existing = await this.db
        .select({ eventType: emailTemplates.eventType })
        .from(emailTemplates);
      const known = new Set(existing.map((r) => r.eventType).filter(Boolean));

      const missing = OwnerNotificationsService.DEFAULT_TEMPLATES.filter((t) => !known.has(t.eventType));
      if (!missing.length) return;

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
    } catch (error) {
      this.logger.warn(
        `Message templates seeding skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
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
  ): Promise<string> {
    let text = fallback;
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
      /\s*\b(chez|revenu|contact|proprietaire|bailleur|appartement|appt|unite|de|a|au|pour|du|avec)\b\s*:?\s*(?=[.,;)]|$)/gi,
      // "Marie a ." / "Mariee a ," -> mention entiere retiree quand le
      // conjoint n'est pas renseigne (locataire non marie).
      /\s*\bmari[ée]e?\b\s*(?=[.,;]|$)/gi,
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

    const url = text.match(/https?:\/\/\S+/)?.[0] ?? "";
    if (!url) return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;

    // On garde " <url>" en fin de message et on rogne ce qui precede.
    const body = text.replace(url, "").trim();
    const room = limit - url.length - 1;
    if (room <= 0) return url.slice(0, limit);
    const cut = body.length <= room
      ? body
      : `${body.slice(0, room - 1).replace(/\s+\S*$/, "")}…`;
    return `${cut} ${url}`.trim();
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

  private fullName(firstName?: string | null, lastName?: string | null) {
    return [firstName, lastName].filter(Boolean).join(" ").trim();
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
        income: tenant.monthlyPay != null ? this.money(tenant.monthlyPay) : "",
        otherIncome: tenant.otherMonthlyIncome != null ? this.money(tenant.otherMonthlyIncome) : "",
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
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
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
        tenantName: this.fullName(lease.tenantFirstName, lease.tenantLastName),
        reference: lease.reference || String(lease.id),
        address,
        unit: lease.unitName || "",
        startDate: lease.startDate || "",
        endDate: lease.endDate || "",
        amount: this.money(lease.rentAmount, lease.currencySymbol),
        deposit: this.money(lease.securityDeposit, lease.currencySymbol),
        charges: charges ? ` Charges : ${charges}.` : "",
        url,
      };
      const fallback =
        "Nouveau bail {reference} sur {address}, appartement {unit}. Locataire : {tenantName}. " +
        "Du {startDate} au {endDate}. Loyer : {amount}. Caution : {deposit}.{charges} " +
        "Details ici : {url}";
      const message = await this.renderMessage("lease_created_owner", fallback, vars);
      await this.send(owner, message, "lease_created_owner", "real-estate-lease", leaseId, orgId);
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
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease?.tenantPhone) return;

      const tenantName = this.fullName(lease.tenantFirstName, lease.tenantLastName);
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
        firstName: lease.tenantFirstName || tenantName,
        reference: lease.reference || String(lease.id),
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        amount: this.money(amount, lease.currencySymbol),
        url: portalUrl,
      };
      const fallback =
        "Bonjour {firstName}, nous confirmons la reception de votre paiement de {amount} " +
        "pour le bail {reference}. Votre quittance et le detail de vos paiements : {url}. Merci !";
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

  // ── 4. Loyer en retard sur un bien du proprietaire ───────────────────────

  /**
   * Avis de retard au bailleur, envoye par RentReminderService au meme rythme
   * que le rappel adresse au locataire (une fois par periode impayee, pilote
   * par lastOverdueReminderDate). Le propriétaire doit savoir que le loyer de
   * SON bien n'est pas rentre, sans avoir a consulter l'application.
   * Best-effort : un echec n'interrompt jamais la boucle de rappels.
   */
  async notifyPaymentOverdue(leaseId: number, propertyId: number, daysLate: number, orgId: number) {
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
          tenantPhone: customers.phone,
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
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
        tenantName: this.fullName(lease.tenantFirstName, lease.tenantLastName),
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
        "Loyer en retard : {tenantName} ({tenantPhone}) doit {amount} pour {property} " +
        "(bail {reference}), en retard de {daysLate} jours. Details ici : {url}";
      const message = await this.renderMessage("payment_overdue_owner", fallback, vars);
      await this.send(owner, message, "payment_overdue_owner", "real-estate-lease", leaseId, orgId);
    } catch (error) {
      this.logger.warn(
        `notifyPaymentOverdue failed (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
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
        })
        .from(realEstateLeases)
        .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
        .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
        .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
        .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
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
        tenantName: this.fullName(lease.tenantFirstName, lease.tenantLastName),
        reference: lease.reference || String(lease.id),
        property: [lease.propertyName, lease.unitName].filter(Boolean).join(", "),
        unit: lease.unitName || "",
        amount: this.money(amount, lease.currencySymbol),
        url,
      };
      const fallback =
        "Paiement recu : {tenantName} a regle {amount} pour {property} (bail {reference}). " +
        "Details ici : {url}";
      const message = await this.renderMessage("payment_received_owner", fallback, vars);
      await this.send(owner, message, "payment_received_owner", "real-estate-rent-payment", paymentId, orgId);
    } catch (error) {
      this.logger.warn(
        `notifyPaymentReceived failed (payment ${paymentId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
