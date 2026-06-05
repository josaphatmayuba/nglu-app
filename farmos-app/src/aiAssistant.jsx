/* eslint-disable */
import React from "react";
import { mountAiWidget } from "./aiWidget.js";

// Config IA propre à FarmOS (élevage). Réponses simulées (maquette).
const FARMOS_AI = {
  app: "FarmOS · NgoluApp",
  accent: "#16a34a",
  accent2: "#15803d",
  greeting:
    "Bonjour 👋 Je suis l’assistant IA de FarmOS. Je surveille la santé du troupeau, la reproduction, l’alimentation et la production pour t’aider à améliorer tes résultats d’élevage. Pose ta question ou ouvre l’onglet Recommandations.",
  prompts: [
    "Quels animaux sont à surveiller ?",
    "Optimise la ration alimentaire",
    "Quand prévoir les vaccinations ?",
    "Analyse ma production laitière",
  ],
  reco: [
    { icon: "🐄", tag: "Reproduction", title: "Vaches en chaleur", text: "Des chaleurs sont détectées. Planifie l’insémination sous 12 h pour maximiser le taux de fécondation." },
    { icon: "🌾", tag: "Alimentation", title: "Coût de ration élevé", text: "La ration dépasse l’optimum. Ajuste le ratio fourrage/concentré pour réduire le coût sans baisser la production." },
    { icon: "💉", tag: "Prophylaxie", title: "Rappel vaccinal proche", text: "Un rappel vaccinal arrive à échéance. Commande les doses dès maintenant pour éviter une rupture." },
    { icon: "📉", tag: "Production", title: "Production laitière en baisse", text: "La production baisse sur les dernières semaines. Vérifie l’abreuvement et le stress thermique." },
  ],
  replies: [
    { k: ["chaleur", "reprod", "insémin", "animal", "animaux", "surveil", "santé"], a: "À surveiller en priorité : les vaches en chaleur (à inséminer sous 12 h) et tout animal avec baisse d’ingestion. Une détection précoce des chaleurs améliore le taux de fécondation et l’intervalle vêlage-vêlage." },
    { k: ["ration", "aliment", "nourri", "fourrage", "concentr"], a: "Pour optimiser la ration : augmente la part de fourrage de qualité et réduis le concentré acheté quand c’est possible. Tu réduis le coût alimentaire sans perte de production." },
    { k: ["vaccin", "prophylax", "traitement", "rappel", "soin"], a: "Consulte le calendrier : le prochain rappel vaccinal approche. Commande les doses à l’avance et vérifie le protocole antiparasitaire saisonnier." },
    { k: ["lait", "production", "rendement", "laitière"], a: "Une baisse de production laitière vient souvent d’un abreuvement insuffisant, d’un stress thermique ou d’une transition alimentaire. Commence par vérifier l’accès à l’eau et la ventilation." },
  ],
};

export function AiAssistant({ config = FARMOS_AI }) {
  React.useEffect(() => {
    const unmount = mountAiWidget(config);
    return unmount;
  }, [config]);
  return null;
}

export default AiAssistant;
