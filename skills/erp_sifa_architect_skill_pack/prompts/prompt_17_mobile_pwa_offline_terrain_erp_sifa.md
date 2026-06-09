# PROMPT 17 — MOBILE, PWA, MODE HORS-LIGNE ET UTILISATION TERRAIN ERP/SIFA

## Objectif

Ce prompt sert à concevoir l’expérience mobile, tablette, PWA et hors-ligne de l’ERP/SIFA.

Le système doit pouvoir être utilisé dans des contextes terrain :

```text
ferme
entrepôt
chantier
mission logistique
inventaire
élevage
agriculture
collecte de documents
approbation rapide
```

Dans plusieurs régions, la connexion internet peut être faible ou instable.  
L’ERP/SIFA doit donc prévoir une stratégie progressive pour fonctionner correctement sur mobile et éventuellement hors-ligne.

---

# 1. Mission principale

L’agent doit produire :

1. stratégie mobile
2. stratégie PWA
3. écrans mobiles prioritaires
4. mode hors-ligne
5. synchronisation
6. gestion des conflits
7. stockage local
8. sécurité mobile
9. upload différé
10. UX terrain
11. tickets techniques

---

# 2. Règle absolue

Le mode hors-ligne ne doit jamais permettre de contourner :

```text
permissions
workflow
audit
validation métier
budget
stock
organisationId
```

Si une action est saisie hors-ligne, elle doit être validée lors de la synchronisation.

---

# 3. Usages mobiles prioritaires

Priorités :

```text
voir dashboard simple
approuver demande
créer demande d’achat
prendre photo document
scanner QR code
scanner produit
entrée stock
sortie stock
inventaire
enregistrer traitement animal
enregistrer récolte
enregistrer dépense terrain
enregistrer mission logistique
```

---

# 4. PWA

Prévoir :

```text
installation sur téléphone
cache application
mode faible connexion
notifications
saisie locale
synchronisation différée
```

---

# 5. Stockage local

Données locales possibles :

```text
profil utilisateur
permissions minimales
liste sites autorisés
produits récents
animaux récents
champs récents
formulaires brouillons
documents/photos en attente upload
actions en attente sync
```

Ne pas stocker inutilement :

```text
mots de passe
tokens longs non protégés
données sensibles non nécessaires
salaires
rapports confidentiels
```

---

# 6. File de synchronisation

Créer :

```text
offline_queue
```

Champs :

```text
id
localId
userId
organizationId
entityType
action
payload
status
attempts
lastError
createdAt
syncedAt
```

Statuts :

```text
PENDING
SYNCING
SYNCED
FAILED
CONFLICT
```

---

# 7. Gestion conflits

Cas de conflits :

```text
stock changé entre temps
animal modifié par autre utilisateur
budget dépassé après reconnexion
demande déjà approuvée/rejetée
document déjà remplacé
```

Stratégies :

```text
bloquer et demander correction
fusion manuelle
priorité serveur
créer nouvelle version
alerter superviseur
```

---

# 8. Écrans mobiles prioritaires

## Mes approbations

```text
liste demandes
montant
demandeur
site
statut
approuver/rejeter
```

## Stock mobile

```text
scanner produit
entrée
sortie
transfert
inventaire
photo justificatif
```

## Élevage mobile

```text
scanner animal/lot
traitement
vaccination
mortalité
alimentation
photo
```

## Agriculture mobile

```text
champ
culture
intrant utilisé
récolte
photo terrain
observation
```

## Documents mobile

```text
prendre photo
joindre à transaction
joindre à facture
joindre à animal/champ/projet
upload différé
```

---

# 9. Sécurité mobile

Prévoir :

```text
expiration session
verrouillage local
MFA pour actions sensibles
chiffrement stockage local si possible
suppression données à déconnexion
permissions serveur à la sync
audit sync
```

---

# 10. Tickets attendus

Créer tickets :

```text
1. Créer stratégie PWA
2. Ajouter service worker
3. Créer offline_queue
4. Créer SyncService
5. Créer écran approbations mobile
6. Créer écran stock mobile
7. Créer scanner QR/barcode
8. Créer upload photo différé
9. Créer écran traitement animal mobile
10. Créer écran récolte mobile
11. Créer gestion conflits sync
12. Créer sécurité stockage local
13. Créer audit actions offline
14. Créer tests offline
```

---

# 11. Format final attendu

```text
1. Résumé exécutif
2. Usages mobiles prioritaires
3. Architecture PWA
4. Mode offline
5. Synchronisation
6. Gestion conflits
7. UX mobile
8. Sécurité
9. Tickets techniques
10. Roadmap mobile
```

---

# Conclusion

Le mobile est un avantage important pour l’Afrique, les fermes, les chantiers et les opérations terrain.

Mais il faut commencer simple :

```text
mobile responsive
approbations
photos/documents
stock
terrain
```

Puis ajouter le vrai hors-ligne progressivement.
