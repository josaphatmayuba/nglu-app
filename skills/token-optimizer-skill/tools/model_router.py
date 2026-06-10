#!/usr/bin/env python3
"""
model_router.py - Routeur simple pour recommander le modèle/effort avant une tâche.

But:
- Classer la tâche en fast / balanced / reliable.
- Donner une raison courte.
- Toujours demander confirmation humaine avant de commencer.

Usage:
  python tools/model_router.py "corrige le CSS du bouton login"
  python tools/model_router.py "ajoute gestion transaction debit credit avec Prisma" --json
  python tools/model_router.py --task-file task.txt

Note:
Ce script ne change pas magiquement le modèle dans toutes les interfaces.
Il produit une décision que l'utilisateur ou le wrapper peut appliquer.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

FAST_KEYWORDS = [
    "css", "style", "couleur", "button", "bouton", "texte", "prompt", "ticket",
    "message", "email", "readme", "typo", "tradu", "html simple", "label",
    "icone", "icon", "responsive simple", "petite correction", "small fix",
]

BALANCED_KEYWORDS = [
    "feature", "fonctionnalité", "api", "endpoint", "formulaire", "service", "controller",
    "component", "composant", "route", "store", "state", "validation", "test", "unit",
    "crud", "dashboard", "interface", "frontend", "backend", "intégration", "integration",
]

RELIABLE_KEYWORDS = [
    "sécurité", "security", "auth", "permission", "role", "jwt", "oauth", "keycloak",
    "transaction", "debit", "débit", "credit", "crédit", "comptable", "accounting",
    "prisma", "migration", "database", "base de données", "postgres", "sql", "schema",
    "architecture", "refactor", "refactorisation", "audit", "production", "bug complexe",
    "performance", "concurrence", "race condition", "paiement", "payment", "finance",
    "données sensibles", "secret", "env", "docker", "deploy", "nginx", "ci/cd",
]

HIGH_RISK_HINTS = [
    "prod", "production", "paiement", "payment", "argent", "finance", "comptable",
    "juridique", "legal", "sécurité", "secret", "client", "données", "database",
    "migration", "delete", "drop", "truncate", "rm -rf",
]

TASK_TYPES = [
    ("analyse sécurité", ["sécurité", "security", "audit", "vuln", "vulnerability"]),
    ("architecture", ["architecture", "refactor", "refactorisation", "structure", "microservice"]),
    ("base de données", ["prisma", "migration", "schema", "postgres", "sql", "database", "base de données"]),
    ("transaction/finance", ["transaction", "debit", "débit", "credit", "crédit", "comptable", "finance"]),
    ("fonctionnalité moyenne", ["ajoute", "crée", "feature", "fonctionnalité", "api", "crud"]),
    ("correction simple", ["corrige", "fix", "css", "typo", "style", "bouton"]),
    ("prompt", ["prompt", "skill", "instructions"]),
]


def normalize(text: str) -> str:
    return text.lower().strip()


def count_matches(text: str, keywords: List[str]) -> int:
    score = 0
    for kw in keywords:
        if kw in text:
            score += 1
    return score


def infer_task_type(text: str) -> str:
    for label, keys in TASK_TYPES:
        if any(k in text for k in keys):
            return label
    return "tâche générale"


def estimate_size(text: str) -> int:
    # Indicateurs simples qui suggèrent plus de contexte/fichiers.
    size = 0
    size += len(re.findall(r"\b(fichier|files?|module|service|controller|component|route|table)\b", text))
    size += len(re.findall(r"\b(projet complet|tout le projet|plusieurs|multi|full)\b", text)) * 2
    size += 1 if len(text) > 350 else 0
    return size


def route(task: str) -> Dict[str, object]:
    text = normalize(task)
    fast = count_matches(text, FAST_KEYWORDS)
    balanced = count_matches(text, BALANCED_KEYWORDS)
    reliable = count_matches(text, RELIABLE_KEYWORDS)
    risk = count_matches(text, HIGH_RISK_HINTS)
    size = estimate_size(text)

    # Décision conservatrice: fiabilité > économie quand le risque est réel.
    if reliable >= 1 or risk >= 1:
        profile = "reliable"
        effort = "élevé" if reliable + risk + size >= 2 else "moyen"
        reliability = "critique" if risk >= 1 or reliable >= 2 else "haute"
        project_risk = "élevé" if risk >= 1 else "moyen"
        reason = "La tâche touche une zone risquée ou critique où une erreur peut coûter cher."
    elif balanced >= 1 or size >= 2:
        profile = "balanced"
        effort = "moyen"
        reliability = "haute"
        project_risk = "moyen"
        reason = "La tâche semble toucher plusieurs éléments ou une logique métier standard."
    else:
        profile = "fast"
        effort = "faible"
        reliability = "normale"
        project_risk = "faible"
        reason = "La tâche semble ciblée, simple et peu risquée."

    label = {
        "fast": "modèle rapide / économique",
        "balanced": "modèle équilibré",
        "reliable": "modèle raisonnement fort",
    }[profile]
    cost = {"fast": "bas", "balanced": "moyen", "reliable": "élevé"}[profile]

    return {
        "task_type": infer_task_type(text),
        "effort": effort,
        "reliability": reliability,
        "project_risk": project_risk,
        "recommended_profile": profile,
        "recommended_model_class": label,
        "estimated_token_cost": cost,
        "reason": reason,
        "requires_user_confirmation": True,
        "start_allowed": False,
        "scores": {"fast": fast, "balanced": balanced, "reliable": reliable, "risk": risk, "size": size},
    }


def format_text(decision: Dict[str, object], task: str) -> str:
    return f"""Recommandation modèle :
- Tâche : {decision['task_type']}
- Niveau d’effort : {decision['effort']}
- Fiabilité nécessaire : {decision['reliability']}
- Risque projet : {decision['project_risk']}
- Coût token estimé : {decision['estimated_token_cost']}
- Modèle recommandé : {decision['recommended_model_class']}
- Profil à utiliser : profiles/{decision['recommended_profile']}.json
- Pourquoi : {decision['reason']}

Confirme si je continue avec ce modèle ou si tu veux changer avant que je commence."""


def main() -> int:
    parser = argparse.ArgumentParser(description="Recommande un profil modèle selon effort/fiabilité/risque.")
    parser.add_argument("task", nargs="?", help="Description de la tâche")
    parser.add_argument("--task-file", help="Lire la tâche depuis un fichier texte")
    parser.add_argument("--json", action="store_true", help="Sortie JSON pour wrapper automatique")
    parser.add_argument("--show-scores", action="store_true", help="Afficher les scores internes")
    args = parser.parse_args()

    if args.task_file:
        task = Path(args.task_file).read_text(encoding="utf-8", errors="replace")
    elif args.task:
        task = args.task
    else:
        parser.error("Fournis une tâche ou --task-file")

    decision = route(task)
    if not args.show_scores:
        decision.pop("scores", None)

    if args.json:
        print(json.dumps(decision, ensure_ascii=False, indent=2))
    else:
        print(format_text(decision, task))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
