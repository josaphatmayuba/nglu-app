# Jira Ticket Template

## Infos du Ticket

| Champ | Valeur |
|-------|--------|
| **Titre** | Formulaires pour Paiements et Baux - Mockup Complet |
| **Type** | Story |
| **Projet** | SCRUM |
| **Component** | Immobilier |
| **Assigné à** | josaphatmayuba |

---

## Description

### Contexte
Création des formulaires UX pour l'ajout/enregistrement de paiements et création de baux avec tous les champs requis et autocomplete sur les devises.

---

## 1️⃣ Formulaire "Ajouter un paiement"

**Accès:** Bouton "+ Enregistrer paiement" en haut du tableau Paiements

### Champs requis
- **Sélecteur bail** (dropdown)
  - Format: `#BAIL-XXXX · Locataire · Propriété (Loyer/mois)`
  - Exemple: `#BAIL-2023-014 · Paul Lumumba · Lemba Salongo (1,200,000 CDF/mois)`

- **Montant du paiement** (input number + devise)
  - Devise autocomplete avec icône 🔍
  - Options: CDF, USD, EUR

- **Date de paiement** (date picker)
  - Par défaut: aujourd'hui

- **Méthode de paiement** (select)
  - Virement bancaire
  - Chèque
  - Espèces
  - Mobile Money
  - Virement Orange Money
  - Autre

### Champs optionnels
- **Numéro de référence** (text)
  - Placeholder: "ex: TRF-2026-05-001"
- **Date de confirmation** (date picker)
- **Notes** (textarea)

### Features
- Checkbox "Marquer comme confirmé/reçu" (activé par défaut)
- Validation des champs requis
- Toast de succès/erreur

### Boutons
- Annuler
- Ajouter

---

## 2️⃣ Formulaire "Enregistrer paiement" (pré-rempli)

**Accès:** Bouton "Payer" sur les lignes EN RETARD dans le tableau

### Champs pré-remplis (lecture seule)
- **Bail** (non modifiable)
  - Affiche: `#BAIL-XXXX · Locataire · Propriété`
  
- **Montant** (non modifiable)
  - Montant exact du paiement en retard

- **Date** (non modifiable)
  - Aujourd'hui

### Champs à compléter
- **Méthode de paiement** (select requis)
- **Numéro de référence** (text optionnel)
- **Notes** (textarea optionnel)

### Features
- **Récapitulatif** (zone verte)
  - "Montant à enregistrer: CDF 1,200,000"
  - "✓ Résoudra le paiement en retard"

### Boutons
- Annuler
- Enregistrer

---

## 3️⃣ Bouton "Envoyer rappel"

**Accès:** Bouton "Rappel" sur les lignes EN RETARD dans le tableau

### Fonctionnalité
- Appel API: `POST /property-management/payments/reminder`
- Envoie email nodemailer au locataire
- Email inclut:
  - Bail référence
  - Montant dû
  - Appel à régulariser

### Gestion
- SMTP: si non configuré, retour OK sans envoi
- Toast de succès/erreur

---

## 4️⃣ Formulaire "Créer un nouveau bail"

**Accès:** Bouton "+ Nouveau bail" dans l'onglet Baux

### Champs requis
- **Bien** (dropdown) - 3 colonnes
- **Unité** (dropdown) - 3 colonnes
- **Locataire** (dropdown) - 3 colonnes
- **Début** (date)
- **Loyer** (input number + devise autocomplete)

### Champs optionnels
- **Statut** (select: Actif/Inactif)
- **Fin** (date d'expiration)
- **Prochaine facture** (date)
- **Cycle** (select: Mensuel/Trimestriel/Annuel)
- **Dépôt** (input number - montant)
- **Relevé compteur entrée** (text)
- **Conditions / clauses** (textarea)

### Features
- Calcul automatique de la date de fin selon durée
- Validation des champs requis
- Layout responsive

### Boutons
- Annuler
- Créer

---

## 🎨 Détails techniques

### Champ Devise (tous les formulaires)
```
Label: "Devise"
Type: Autocomplete input (pas select)
Icon: 🔍 (search)
Placeholder: "Devise par défaut"
Options: CDF, USD, EUR
```

### Modales
- Backdrop semi-transparent avec blur (opacity 50%)
- Fermeture par:
  - Clic sur bouton X
  - Clic sur "Annuler"
  - Clic en dehors de la modale
- Toast de succès après validation
- Réinitialisation du formulaire à la fermeture
- Responsive (mobile/tablet/desktop)

### Validation
- Champs requis en rouge (*)
- Messages d'erreur clairs
- Désactiver bouton si validation échoue

---

## ✅ Acceptance Criteria

- [ ] Formulaire "Ajouter paiement" fonctionne et enregistre les données en DB
- [ ] Bouton "Payer" ouvre formulaire pré-rempli avec bail et montant
- [ ] Bouton "Rappel" envoie email au locataire via endpoint POST
- [ ] Formulaire "Créer bail" avec tous les champs et validation
- [ ] Champ Devise avec autocomplete dans les 3 formulaires
- [ ] Messages de succès/erreur appropriés
- [ ] Design responsive (mobile/tablet/desktop)
- [ ] Tests unitaires des validations
- [ ] Intégration Redux pour les dropdowns (leases, tenants, payment methods)

---

## 📚 Ressources

- **Mockup HTML:** `mockup/frontendcrm/design-mockup.html`
- **Plan associé:** SCRUM-167 (Actions pour régler paiements en retard)
- **Endpoint backend:** `POST /property-management/payments/reminder`

---

## 🔗 Dépendances

### Backend
- Endpoint `POST /property-management/payments/reminder` (nodemailer)
- Endpoint `POST /property-management/payments` (ajout paiement)
- Endpoint `POST /property-management/leases` (création bail)

### Frontend
- Redux: state pour leases, tenants, payment methods, currencies
- Ant Design: forms, buttons, modales, toasts
- React Hook Form: gestion formulaires complexes
- Validation: Yup ou Zod

---

## 🎯 Priorité

Haute - Fonctionnalité critique pour Immobilier (SCRUM-167)

---

## 📝 Notes

Mockup complet avec interactions JavaScript disponible dans `mockup/frontendcrm/design-mockup.html`
- Ouvre l'HTML dans un navigateur
- Navigue: Immobilier > Paiements
- Teste les boutons "+ Enregistrer paiement", "Payer", "Rappel"
- Navigue: Immobilier > Baux
- Teste le bouton "+ Nouveau bail"
