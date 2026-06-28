# FarmOS Pro — Memo risque de nom (COMP-P0-002)

> **PROPOSITION / aide a la decision** — la decision finale (garder / modifier / renommer) t'appartient. Ce memo cadre le risque et propose des options.

- Date : **28 juin 2026** · Statut tache : **a decider**

## Le risque

Il existe un projet open-source etabli **farmOS** (farmos.org) — gestion agricole, communaute active. Risques d'utiliser « FarmOS » / « FarmOS Pro » publiquement :

- **Confusion de marque** : les utilisateurs/partenaires peuvent croire a un lien avec le projet farmOS.
- **SEO** : difficile de ressortir face a farmos.org sur les recherches « farmos ».
- **Juridique** : selon les depots de marque, risque d'opposition (surtout si on depose « FarmOS » a l'identique).

A noter : le nom interne du module dans ce repo est `farmos` (routes `/farmos`, tables `farmos_*`) — **le nom technique peut rester** ; seul le **nom commercial public** est concerne.

## Verifications a faire (checklist)

- [ ] Recherche de marque (INPI / OAPI pour l'Afrique francophone / WIPO) sur « FarmOS » et variantes.
- [ ] Disponibilite de domaine (.com, .africa, .cd) du nom commercial retenu.
- [ ] Disponibilite des comptes reseaux/stores (Play Store, App Store) — un nom proche de farmOS peut etre refuse.
- [ ] Verifier l'usage de farmos.org (licence, marque deposee ou non).

## Options

1. **Garder « FarmOS Pro »** — risque modere ; a eviter si on vise une marque forte/depot.
2. **Renommer le produit public** (le code reste `farmos`) — recommande pour lever toute ambiguite.
3. **Nom hybride** — garder une racine reconnaissable sans collision.

## Recommandation

**Renommer le nom commercial public** (option 2), tout en gardant le nom technique `farmos` interne. Cela supprime le risque de confusion/SEO/juridique pour un cout faible (le code ne change pas).

## 3 alternatives de nom proposees (a valider / completer)

> Suggestions de depart, a verifier en marque/domaine avant tout usage public :

1. **Elevia** — evoque « elevage » ; court, francophone, .com/.africa a verifier.
2. **Bergerie** / **Bergeria** — univers ferme francophone, chaleureux.
3. **Cheptel** / **Cheptel Pro** — terme metier direct (le cheptel = l'ensemble des animaux), tres clair pour la cible francophone.

(Autres pistes possibles : « Fermalia », « Agropas », « Kazi Farm ».)

## Decision

- Decision retenue : `[A DECIDER : garder / renommer / hybride]`
- Si renommage, nom retenu : `[A DECIDER]`
- **Aucune campagne publique ne doit etre lancee avant cette decision** (critere d'acceptation P0-002).

## Criteres d'acceptation (COMP-P0-002)

- [ ] Decision documentee : garder, modifier ou renommer.
- [x] 3 alternatives de nom preparees (ci-dessus).
- [x] Rappel : aucune campagne publique sans decision.
