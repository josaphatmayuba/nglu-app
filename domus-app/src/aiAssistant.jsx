import { useEffect } from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre à Domus (gestion locative). Réponses simulées (maquette) ;
// le branchement d'un vrai LLM se fera dans aiWidget.js (fonction reply()).
const DOMUS_AI = {
  app: "Domus · NgoluApp",
  accent: "#6366f1",
  accent2: "#4f46e5",
  greeting:
    "Bonjour 👋 Je suis l’assistant IA de Domus. Je surveille les loyers, les baux, les biens et la maintenance pour t’aider à optimiser ta gestion locative. Pose ta question ou ouvre l’onglet Recommandations.",
  prompts: [
    "Quels loyers sont en retard ?",
    "Quel bien est le moins rentable ?",
    "Rédige une relance locataire",
    "Quand renouveler les baux ?",
  ],
  reco: [
    { icon: "🏠", tag: "Loyers", title: "Loyers en retard", text: "Des loyers restent impayés. Je peux générer une relance groupée — le modèle de courrier est prêt." },
    { icon: "📑", tag: "Baux", title: "Baux bientôt expirés", text: "Certains baux arrivent à échéance. Propose le renouvellement tôt pour éviter une vacance locative." },
    { icon: "🔧", tag: "Maintenance", title: "Biens à coûts récurrents", text: "Un bien cumule plusieurs tickets de maintenance par mois. Un audit ponctuel réduirait les coûts." },
    { icon: "📈", tag: "Rendement", title: "Loyer sous le marché", text: "Un logement est loué sous le prix du marché. Réévalue le loyer au prochain renouvellement." },
  ],
  replies: [
    { k: ["loyer", "retard", "impay", "paiement"], a: "Pour les loyers en retard, je te conseille une relance graduée : rappel courtois, puis mise en demeure si besoin. Ouvre l’écran Loyers pour la liste exacte — je peux rédiger les courriers." },
    { k: ["bail", "renouvel", "expire", "échéance"], a: "Pour les baux proches de l’échéance, contacte les locataires en avance et propose le renouvellement afin d’éviter la vacance. Je peux préparer les avenants." },
    { k: ["bien", "rentab", "rendement", "rentable", "propriété"], a: "Pour identifier le bien le moins rentable, je croise loyer encaissé, vacance et coûts de maintenance. Une réévaluation au renouvellement ou un audit maintenance améliore le rendement net." },
    { k: ["relance", "locataire", "courrier", "lettre"], a: "Modèle de relance :\n\n« Madame/Monsieur, sauf erreur de notre part, le loyer de [mois] d’un montant de [montant] reste impayé. Merci de régulariser sous 8 jours… »\n\nDonne-moi le locataire et le montant, je personnalise." },
  ],
};

export function AiAssistant({ config = DOMUS_AI }) {
  useEffect(() => {
    const unmount = mountAiWidget(config);
    return unmount;
  }, [config]);
  return null;
}

export default AiAssistant;
