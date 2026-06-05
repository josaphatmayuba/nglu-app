import { useEffect } from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre au CRM NGOLU (multi-modules : clients, ventes, factures,
// immobilier, équipe). Réponses simulées (maquette) ; le branchement d'un vrai
// LLM se fera dans aiWidget.js (fonction reply()).
const CRM_AI = {
  app: "NGOLU · CRM",
  accent: "#4f46e5",
  accent2: "#4338ca",
  greeting:
    "Bonjour 👋 Je suis l’assistant IA de NGOLU. Je peux analyser tes clients, ventes, factures et modules métier pour t’aider à faire avancer ton activité. Pose ta question ou ouvre l’onglet Recommandations.",
  prompts: [
    "Quelles factures sont en retard ?",
    "Quels clients relancer en priorité ?",
    "Résume l’activité du mois",
    "Où puis-je gagner du chiffre d’affaires ?",
  ],
  reco: [
    { icon: "🧾", tag: "Facturation", title: "Factures impayées", text: "Des factures dépassent leur échéance. Une relance ciblée des plus gros montants améliorerait directement ta trésorerie." },
    { icon: "👥", tag: "Clients", title: "Clients à réactiver", text: "Plusieurs clients n’ont pas commandé depuis 90 j. Une campagne de réactivation peut récupérer du chiffre." },
    { icon: "📈", tag: "Ventes", title: "Opportunités à conclure", text: "Des devis sont en attente depuis plus d’une semaine. Relance-les tant qu’ils sont chauds." },
    { icon: "🏠", tag: "Immobilier", title: "Loyers & baux", text: "Des loyers sont en retard et des baux arrivent à échéance. Anticipe les relances et renouvellements." },
  ],
  replies: [
    { k: ["facture", "impay", "retard", "trésor", "paiement"], a: "Pour les factures en retard, priorise les 20 % de clients qui représentent l’essentiel du montant dû. Je peux préparer des relances graduées (rappel, puis mise en demeure)." },
    { k: ["client", "relance", "réactiv", "fidél"], a: "Relance en priorité : les clients à fort panier moyen sans commande récente, et ceux avec un devis ouvert. Une relance personnalisée convertit mieux qu’un envoi de masse." },
    { k: ["vente", "chiffre", "ca", "opportunit", "devis"], a: "Pistes de chiffre d’affaires : conclure les devis en attente, remonter le panier moyen via des offres groupées, et réactiver les clients dormants. Commence par les devis chauds." },
    { k: ["mois", "activité", "résumé", "rapport", "bilan"], a: "Résumé type : chiffre d’affaires vs mois précédent, top produits/clients, taux de recouvrement des factures, et alertes (impayés, stock, baux). Dis-moi le module précis et je détaille." },
    { k: ["loyer", "bail", "immobilier", "locataire", "bien"], a: "Côté immobilier : relance les loyers en retard et prépare le renouvellement des baux proches de l’échéance pour éviter la vacance. L’app Domus reprend ces données en détail." },
  ],
};

export function AiAssistant({ config = CRM_AI }) {
  useEffect(() => {
    const unmount = mountAiWidget(config);
    return unmount;
  }, [config]);
  return null;
}

export default AiAssistant;
