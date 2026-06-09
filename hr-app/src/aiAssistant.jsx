import { useEffect, useRef } from "react";
import { api } from "./api.js";
import { mountAiWidget } from "./aiWidget.js";

const ACCENT = "#14b8a6";
const ACCENT2 = "#0d9488";

const BASE_CONFIG = {
  app: "RH · NgoluApp",
  accent: ACCENT,
  accent2: ACCENT2,
  greeting:
    "Bonjour 👋 Je suis l'assistant IA des RH. Je lis les données en direct : contrats, présences, paie, timesheets et recrutement. Pose ta question ou ouvre l'onglet Alertes.",
  prompts: [
    "Quels contrats expirent bientôt ?",
    "Combien d'employés sont absents aujourd'hui ?",
    "Qui n'a pas soumis son timesheet ?",
    "Quel est l'état de la paie ce mois-ci ?",
    "Combien de candidats sont en attente ?",
  ],
};

function buildReplies(ctx) {
  const s = ctx?.summary || {};
  const alerts = ctx?.alerts || [];
  const date = ctx?.date || "";
  const total = ctx?.totalEmployees || 0;

  const byCategory = {};
  for (const a of alerts) byCategory[a.category] = a;

  return [
    {
      k: ["contrat", "expire", "cdd", "échéance", "renouvel"],
      a: byCategory.contrats
        ? `${byCategory.contrats.detail}\n\nPour agir : ouvre la page Contrats, filtre par date de fin, et génère un avenant depuis Dossiers & documents.`
        : `Aucun contrat n'arrive à échéance dans les 30 prochains jours. La situation est sous contrôle.`,
    },
    {
      k: ["absent", "présence", "pointage", "aujourd'hui"],
      a: byCategory.presences
        ? `${byCategory.presences.detail}\n\nConsulte la page Présences & pointage pour identifier les employés concernés et régulariser.`
        : `Aucune absence anormale détectée pour le ${date}. Tous les employés actifs (${total}) ont un pointage.`,
    },
    {
      k: ["timesheet", "temps", "feuille", "heure", "semaine"],
      a: byCategory.timesheet
        ? `${byCategory.timesheet.detail}\n\nRelance-les depuis la page Temps projets avant la clôture de la semaine.`
        : `Tous les timesheets de la semaine ont été soumis. Aucun manquant.`,
    },
    {
      k: ["paie", "salaire", "bulletin", "brouillon", "clôture"],
      a: byCategory.paie
        ? `${byCategory.paie.detail}\n\nValide-les depuis la page Paie → actions Valider en ligne, puis Marquer payé.`
        : `Aucun bulletin en brouillon pour ce mois-ci. La paie est à jour.`,
    },
    {
      k: ["candidat", "recrut", "pipeline", "embauche", "poste"],
      a: byCategory.recrutement
        ? `${byCategory.recrutement.detail}\n\nConsulte la page Recrutement pour faire avancer chaque candidat dans le pipeline.`
        : `Le pipeline de recrutement est vide ou tous les candidats ont été traités.`,
    },
    {
      k: ["résumé", "résume", "situation", "bilan", "état", "overview"],
      a: (() => {
        if (!ctx) return "Chargement du contexte RH en cours…";
        const parts = [];
        if (s.expiringContracts > 0) parts.push(`• ${s.expiringContracts} contrat(s) expirent sous 30 j`);
        if (s.absentToday > 0) parts.push(`• ${s.absentToday} absent(s) aujourd'hui`);
        if (s.missingTimesheets > 0) parts.push(`• ${s.missingTimesheets} timesheet(s) manquant(s) cette semaine`);
        if (s.draftPayrolls > 0) parts.push(`• ${s.draftPayrolls} bulletin(s) en brouillon ce mois`);
        if (s.pendingCandidates > 0) parts.push(`• ${s.pendingCandidates} candidat(s) en attente de décision`);
        if (!parts.length) return `Situation RH au ${date} : aucun point d'attention. Les ${total} employés actifs, la paie, les présences et les timesheets sont à jour.`;
        return `Situation RH au ${date} (${total} employés actifs) :\n\n${parts.join("\n")}\n\nOuvre l'onglet Alertes pour les détails et les actions recommandées.`;
      })(),
    },
  ];
}

function buildRecos(ctx) {
  const alerts = ctx?.alerts || [];
  const ICONS = { contrats: "📄", presences: "🕐", timesheet: "⏱️", paie: "💰", recrutement: "👤" };
  const TAGS = { contrats: "Contrats", presences: "Présences", timesheet: "Timesheet", paie: "Paie", recrutement: "Recrutement" };
  return alerts.map((a) => ({
    icon: ICONS[a.category] || "💡",
    tag: TAGS[a.category] || a.category,
    title: a.title,
    text: a.detail,
  }));
}

export function AiAssistant() {
  const unmountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Monter d'abord avec config de base (aucune alerte = en attente)
      const loadingConfig = {
        ...BASE_CONFIG,
        greeting: "Bonjour 👋 Chargement des données RH en cours…",
        reco: [],
        replies: buildReplies(null),
      };
      if (unmountRef.current) unmountRef.current();
      unmountRef.current = mountAiWidget(loadingConfig);

      // Charger le contexte réel
      let ctx = null;
      try {
        ctx = await api.aiContext();
      } catch {
        // Contexte indisponible — on garde le widget avec réponses génériques
        return;
      }
      if (cancelled) return;

      // Remonter avec les données réelles
      if (unmountRef.current) unmountRef.current();
      const recos = buildRecos(ctx);
      const greeting = recos.length > 0
        ? `Bonjour 👋 J'ai analysé les données RH du ${ctx.date} (${ctx.totalEmployees} employés). ${recos.length} point${recos.length > 1 ? "s" : ""} d'attention détecté${recos.length > 1 ? "s" : ""}. Ouvre l'onglet Alertes ou pose ta question.`
        : `Bonjour 👋 J'ai analysé les données RH du ${ctx.date} (${ctx.totalEmployees} employés actifs). Aucun point d'attention — tout est à jour. Pose ta question si besoin.`;

      unmountRef.current = mountAiWidget({
        ...BASE_CONFIG,
        greeting,
        reco: recos,
        replies: buildReplies(ctx),
      });
    }

    boot();
    return () => {
      cancelled = true;
      if (unmountRef.current) unmountRef.current();
    };
  }, []);

  return null;
}

export default AiAssistant;
