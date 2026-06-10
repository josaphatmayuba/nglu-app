# Token Optimizer Skill

Skill pour réduire la consommation de tokens avec Codex / Claude Code pendant le développement.

## Démarrage rapide

1. Copier le dossier `token-optimizer-skill/` dans ton projet ou ton dossier de skills.
2. Lire `SKILL.md` dans Claude/Codex ou créer un `AGENTS.md` qui pointe vers ce skill.
3. Avant chaque tâche, lancer le routeur :

```bash
python token-optimizer-skill/tools/model_router.py "décris ici la tâche"
```

4. Confirmer le profil recommandé avant de commencer.

## Profils

- `profiles/fast.json` : tâches simples, coût bas.
- `profiles/balanced.json` : tâches moyennes, plusieurs fichiers, fiabilité haute.
- `profiles/reliable.json` : sécurité, DB, transaction, architecture, production.
