import { useEffect } from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre à la Comptabilité. Aucun diagnostic financier n'est simulé :
// le widget reste visible, mais il signale clairement que le backend IA n'est pas branché.
const COMPTA_AI = {
  app: "Comptabilité · NgoluApp",
  accent: "#3b82f6",
  accent2: "#1d4ed8",
  disabled: true,
  greeting:
    "L'assistant IA comptable n'est pas encore connecté au backend. Les recommandations automatiques sont désactivées pour éviter d'afficher des chiffres ou diagnostics inventés.",
  disabledMessage:
    "Assistant IA non connecté. Les écrans comptables affichent uniquement les données réelles disponibles via le backend ; aucune réponse financière automatique n'est générée pour le moment.",
  prompts: [],
  reco: [],
  replies: [],
};

export function AiAssistant({ config = COMPTA_AI }) {
  useEffect(() => mountAiWidget(config), [config]);
  return null;
}

export default AiAssistant;
