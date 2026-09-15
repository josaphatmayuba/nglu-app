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

export function setLeasePrefill(propertyId, unitId, tenantId) {
  prefillLease = {
    propertyId: propertyId != null ? String(propertyId) : "",
    unitId: unitId != null ? String(unitId) : "",
    tenantId: tenantId != null ? String(tenantId) : "",
  };
}

export function takeLeasePrefill() {
  const value = prefillLease;
  prefillLease = null;
  return value;
}

// Même mécanisme de handoff pour « Déclarer un problème » depuis un bien : on
// mémorise le bien et son unité à présélectionner dans le ticket de maintenance.
let prefillMaintenance = null;

export function setMaintenancePrefill(propertyId, unitId) {
  prefillMaintenance = {
    propertyId: propertyId != null ? String(propertyId) : "",
    unitId: unitId != null ? String(unitId) : "",
  };
}

export function takeMaintenancePrefill() {
  const value = prefillMaintenance;
  prefillMaintenance = null;
  return value;
}

// Même mécanisme de handoff pour « P&L » depuis un bien (SCRUM-312) : on
// mémorise le bien à présélectionner dans l'écran P&L.
let prefillPnl = null;

export function setPnlPrefill(propertyId) {
  prefillPnl = propertyId != null ? String(propertyId) : null;
}

export function takePnlPrefill() {
  const value = prefillPnl;
  prefillPnl = null;
  return value;
}
