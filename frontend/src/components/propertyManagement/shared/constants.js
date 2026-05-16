// Shared static data for the Property Management modules.
// These values are copied (not moved) from PropertyManagement.jsx during the
// soft migration — keep both in sync until the legacy file is removed.

export const propertyTypes = [
  { label: "🏢 Immeuble",         value: "building" },
  { label: "🏠 Maison",            value: "house" },
  { label: "🏡 Villa",             value: "villa" },
  { label: "🏪 Local commercial",  value: "commercial" },
  { label: "🟫 Terrain",           value: "land" },
];

export const unitTypes = [
  { label: "Appartement", value: "apartment" },
  { label: "Studio", value: "studio" },
  { label: "Bureau", value: "office" },
  { label: "Magasin", value: "shop" },
  { label: "Maison entière", value: "house" },
];

export const maritalStatuses = [
  { label: "Célibataire", value: "célibataire" },
  { label: "Marié", value: "marié" },
  { label: "Conjoint de fait", value: "conjoint de fait" },
  { label: "Divorcé", value: "divorcé" },
  { label: "Veuf", value: "veuf" },
];

export const coupleStatuses = ["marié", "marie", "conjoint de fait", "union libre"];

export const statusColor = {
  available: "green",
  vacant: "green",
  active: "green",
  occupied: "blue",
  reserved: "gold",
  draft: "default",
  open: "gold",
  in_progress: "blue",
  done: "green",
  ended: "red",
  cancelled: "red",
};

export const typeLabel = {
  apartment: "Appartement",
  studio: "Studio",
  office: "Bureau",
  shop: "Commerce",
  house: "Maison",
  villa: "Maison",
  building: "Immeuble",
  commercial: "Commerce",
  land: "Terrain",
};

export const statusLabel = {
  available: "Disponible",
  vacant: "Disponible",
  active: "Actif",
  occupied: "Loué",
  reserved: "Réservé",
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  done: "Terminé",
  ended: "Terminé",
  cancelled: "Annulé",
  maintenance: "Maintenance",
};

export const paymentMethodLabels = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile money",
  cheque: "Cheque",
};

export const onboardingStatus = {
  sent: { label: "Lien envoyé", color: "blue" },
  draft: { label: "Brouillon en cours", color: "gold" },
  submitted: { label: "Soumis", color: "green" },
  validated: { label: "Validé", color: "purple" },
  expired: { label: "Expiré", color: "red" },
};

export const currencySymbolFallbacks = {
  DOLLAR: "$",
  EURO: "€",
  BDT: "৳",
  POUND: "£",
  RUPEE: "₹",
  YEN: "¥",
  WON: "₩",
  YUAN: "¥",
  PESO: "₱",
  LIRA: "₺",
  REAL: "R$",
  RUBLE: "₽",
  RINGGIT: "RM",
  CAD: "CA$",
};

export const avatarColors = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];

export const typeFilters = [
  { label: "Tous", value: "all" },
  { label: "Appartement", value: "apartment" },
  { label: "Maison", value: "house" },
  { label: "Bureau", value: "office" },
  { label: "Commerce", value: "shop" },
];

export const propertyListColumns = [
  { key: "code", label: "Code" },
  { key: "name", label: "Nom" },
  { key: "type", label: "Type" },
  { key: "status", label: "Statut" },
  { key: "tenant", label: "Locataire" },
  { key: "rent", label: "Loyer", align: "right" },
];

export const modalSelectProps = {
  popupClassName: "immo-select-popup",
  getPopupContainer: (trigger) => trigger?.parentElement || document.body,
};
