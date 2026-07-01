// Handoff léger entre l'écran Propriétés et l'écran Réservations : le bouton
// contextuel « Réserver » mémorise le bien à présélectionner, l'écran
// Réservations le consomme une seule fois à l'ouverture.
let prefillPropertyId = null;

export function setReservationPrefill(propertyId) {
  prefillPropertyId = propertyId != null ? String(propertyId) : null;
}

export function takeReservationPrefill() {
  const value = prefillPropertyId;
  prefillPropertyId = null;
  return value;
}

// Même mécanisme de handoff pour « Créer un bail » depuis un bien : on mémorise
// le bien et son unité à présélectionner dans le formulaire de bail.
let prefillLease = null;

export function setLeasePrefill(propertyId, unitId) {
  prefillLease = {
    propertyId: propertyId != null ? String(propertyId) : "",
    unitId: unitId != null ? String(unitId) : "",
  };
}

export function takeLeasePrefill() {
  const value = prefillLease;
  prefillLease = null;
  return value;
}
