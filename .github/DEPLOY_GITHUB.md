# Déploiement via GitHub Actions

Migration du CI/CD depuis Bitbucket Pipelines. Les deux coexistent : tant que les
secrets GitHub ne sont pas remplis, seul Bitbucket déploie réellement.

## Équivalences

| Bitbucket | GitHub Actions |
|---|---|
| `bitbucket-pipelines.yml` branche `develop` | `.github/workflows/deploy-dev.yml` |
| `bitbucket-pipelines.yml` branche `master` | `.github/workflows/deploy-prod.yml` |
| `condition.changesets.includePaths` | `dorny/paths-filter` (job `changes`) |
| pipeline custom `deploy-all-dev` / `deploy-all-prod` | `workflow_dispatch` + input `deploy_all: true` |
| anchor `avelomi-ssh-setup` | `.github/actions/ssh-setup` (action composite) |
| clé SSH native `BITBUCKET_SSH_KEY_FILE` | **aucun équivalent** → secret explicite obligatoire |

## Secrets à créer

`Settings > Secrets and variables > Actions > New repository secret`

| Secret | Contenu | Sans lui |
|---|---|---|
| `SSH_PRIVATE_KEY` | Clé privée SSH du serveur ongdngolu (`admin@16.54.167.125`) | Tous les déploiements ongdngolu échouent |
| `AVELOMI_SSH_KEY` | Clé privée SSH du serveur Avelomi (`admin@3.128.45.29`) | Tous les déploiements Avelomi échouent |
| `AVELOMI_DB_PASSWORD` | Mot de passe MySQL de l'utilisateur `avelomi` | `.env.prod` Avelomi non généré → le job backend2 Avelomi se skippe proprement |

Format des clés accepté : PEM brut, PEM avec `\n` échappés, ou base64.

> Sur Bitbucket, la clé ongdngolu était la clé SSH native du runner, jamais stockée
> en variable. Il faut donc récupérer la clé privée correspondante (celle dont la
> publique est dans `~/.ssh/authorized_keys` du serveur) et la mettre dans
> `SSH_PRIVATE_KEY`. Alternative : générer une nouvelle paire et ajouter la
> publique aux `authorized_keys` des serveurs.

## Gate d'approbation prod (recommandé)

Les jobs de `deploy-prod.yml` déclarent `environment: production`.
Dans `Settings > Environments > production`, ajouter un *required reviewer* :
tout déploiement prod attendra alors une approbation manuelle.

## Bascule

1. Remplir les secrets ci-dessus.
2. Tester d'abord le dev : `Actions > Deploy dev > Run workflow` (sans `deploy_all`).
3. Vérifier dev.ongdngolu.org et dev.avelomi.com.
4. Une fois validé, supprimer `bitbucket-pipelines.yml` ou désactiver les pipelines
   côté Bitbucket pour éviter les déploiements en double.

Tant que l'étape 4 n'est pas faite, **un push sur `develop` déclenche les deux CI**
si le dépôt est poussé vers les deux remotes.
