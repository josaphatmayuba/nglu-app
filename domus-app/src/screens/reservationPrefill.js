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
