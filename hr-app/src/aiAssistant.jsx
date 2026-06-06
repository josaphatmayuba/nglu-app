import { useEffect } from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre aux RH (calquée sur le mockup RH). Réponses simulées ;
// le branchement d'un vrai LLM se fera dans aiWidget.js (fonction reply()).
const HR_AI = {
  app: "RH · NgoluApp",
  accent: "#14b8a6",
  accent2: "#0d9488",
  greeting:
    "Bonjour 👋 Je suis l’assistant IA des RH. Je peux analyser les contrats, la paie, les présences et les timesheets pour t’aider à piloter ton équipe. Pose ta question ou ouvre l’onglet Recommandations.",
  prompts: [
    "Quels contrats expirent bientôt ?",
    "Optimise la masse salariale par projet",
    "Qui n’a pas soumis son timesheet ?",
    "Rédige une offre d’emploi",
  ],
  reco: [
    { icon: "📄", tag: "Contrats", title: "2 CDD expirent sous 30 j", text: "Anticipe le renouvellement ou la clôture (solde de tout compte) pour rester conforme au code du travail." },
    { icon: "⏱️", tag: "Timesheet", title: "5 feuilles de temps manquantes", text: "Semaine 23 non soumise par 5 employés. Sans timesheet, l’imputation aux bailleurs n’est pas justifiable lors de l’audit." },
    { icon: "💰", tag: "Paie", title: "Dépassement masse salariale", text: "La masse imputée au projet UNICEF dépasse de 6 % son budget. Vérifie les heures avant de clôturer la paie." },
    { icon: "🎓", tag: "Conformité", title: "Certifications PSEA à renouveler", text: "8 agents n’ont pas leur certification PSEA à jour — point bloquant lors de l’audit bailleur." },
  ],
  replies: [
    { k: ["contrat", "expire", "cdd", "échéance", "renouvel"], a: "2 contrats arrivent à échéance dans moins de 30 j :\n\n• 1 CDD chargé de projet — fin 28 juin\n• 1 CDD logisticien — fin 4 juillet\n\nDécide tôt : renouvellement (avenant) ou clôture (préavis + solde de tout compte). Je peux préparer les documents." },
    { k: ["timesheet", "temps", "feuille", "heure"], a: "5 employés n’ont pas soumis la semaine 23. Les timesheets conditionnent la facturation aux bailleurs : relance-les avant vendredi 17 h. Je peux envoyer un rappel automatique." },
    { k: ["paie", "salaire", "masse", "budget"], a: "La masse salariale du mois est cohérente sauf sur le projet UNICEF (+6 % vs budget). Cause probable : heures supplémentaires imputées. Vérifie les pointages avant clôture." },
    { k: ["recrut", "offre", "embauche", "poste"], a: "Voici une trame d’offre :\n\n• Intitulé + lieu + type de contrat\n• Mission (3 lignes)\n• Profil recherché (formation, années d’expérience)\n• Compétences clés + langues\n• Engagement PSEA obligatoire\n\nDonne-moi le poste, je la rédige en entier." },
  ],
};

export function AiAssistant({ config = HR_AI }) {
  useEffect(() => mountAiWidget(config), [config]);
  return null;
}

export default AiAssistant;
