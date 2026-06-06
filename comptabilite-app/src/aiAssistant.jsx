import { useEffect } from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre à la Comptabilité (calquée sur le mockup). Réponses simulées ;
// le branchement d'un vrai LLM se fera dans aiWidget.js (fonction reply()).
const COMPTA_AI = {
  app: "Comptabilité · NgoluApp",
  accent: "#3b82f6",
  accent2: "#1d4ed8",
  greeting:
    "Bonjour 👋 Je suis l’assistant IA comptable. Je peux lire la trésorerie, les écritures, la TVA et l’analytique pour t’aider à décider. Pose ta question ou ouvre l’onglet Recommandations.",
  prompts: [
    "Avons-nous de quoi financer un projet ?",
    "Quelles factures sont en retard ?",
    "Explique mon écart de TVA",
    "Résume le bilan",
  ],
  reco: [
    { icon: "💵", tag: "Trésorerie", title: "Capacité de financement limitée", text: "Disponible réel : 17,3 M (après dettes et fonds affectés). Tout projet supérieur passe en zone risquée dès le creux d’août." },
    { icon: "🧾", tag: "TVA", title: "TVA déductible non lettrée", text: "3 factures fournisseurs non rapprochées. Régularise avant la déclaration du 15 pour ne pas perdre la déduction." },
    { icon: "⏳", tag: "Créances", title: "Créances de plus de 60 j", text: "Une relance ciblée des plus gros clients sécuriserait la trésorerie d’août." },
    { icon: "📊", tag: "Analytique", title: "Projet en dépassement", text: "Le budget de charges d’un projet est dépassé. Réaffecte ou alerte le bailleur avant la fin du trimestre." },
  ],
  replies: [
    { k: ["projet", "financ", "trésor", "argent", "capacit", "disponible"], a: "Capacité de financement :\n\n• Trésorerie\n• − Dettes court terme\n• − Fonds affectés (bailleurs)\n• = Disponible réel\n\nOuvre « Plan de trésorerie » pour le détail. Au-delà du disponible réel, le creux d’août te fait passer sous le seuil de sécurité → risqué." },
    { k: ["facture", "retard", "créance", "impay", "client"], a: "Les factures clients dépassant 60 j sont à relancer en priorité (les plus gros montants d’abord). Je peux générer les lettres de relance — ouvre l’écran Tiers." },
    { k: ["tva", "taxe", "déclaration"], a: "Ton écart de TVA vient souvent de factures fournisseurs dont la TVA déductible n’est pas lettrée. Une fois rapprochées, l’écart se résorbe. Pense à déclarer avant le 15." },
    { k: ["bilan", "résultat", "compte", "actif", "passif"], a: "Résumé : vérifie que l’actif = passif (bilan équilibré). Le résultat peut être positif mais une part de la trésorerie est souvent affectée à des bailleurs : la marge de manœuvre réelle est le disponible libre." },
  ],
};

export function AiAssistant({ config = COMPTA_AI }) {
  useEffect(() => mountAiWidget(config), [config]);
  return null;
}

export default AiAssistant;
