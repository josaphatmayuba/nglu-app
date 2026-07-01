import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bath,
  BedDouble,
  Building2,
  Camera,
  Check,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Grid3X3,
  Home,
  Info,
  Layers,
  List,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../api.js";
import { setReservationPrefill, setLeasePrefill } from "./reservationPrefill.js";
import { filterLeases, filterPayments, filterProperties, filterUnits, useDateRange } from "../dateRange.jsx";
import { groupAmountsByCurrency, money, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { ImmoHeader, Metric, MetricsGrid, MoneyStack, avatarClass } from "./ui.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";

const TYPES = ["Tous", "Appartement", "Maison", "Bureau", "Commerce"];
const TYPE_MAP = {
  apartment: "Appartement",
  residential: "Appartement",
  building: "Appartement",
  house: "Maison",
  villa: "Maison",
  office: "Bureau",
  commercial: "Commerce",
  mixed: "Commerce",
};
const UNIT_TYPE_TO_API = {
  Appartement: "apartment",
  Maison: "house",
  Bureau: "office",
  Commerce: "commercial",
};
const AVATARS = ["iris", "orange", "purple", "emerald", "ink"];

const emptyProperty = {
  name: "",
  code: "",
  propertyType: "building",
  status: "available",
  address: "",
  city: "",
  country: "RDC",
  floors: 1,
  parkingSpaces: 0,
  marketValue: 0,
  defaultRent: 0,
  currencyId: "",
  description: "",
  createFirstUnit: false,
  firstUnitName: "",
  firstUnitType: "apartment",
  firstUnitBedrooms: 0,
  firstUnitBathrooms: 1,
  firstUnitArea: 0,
  firstUnitRent: 0,
  addUnitsNow: false,
  units: [],
};

const emptyUnit = {
  propertyId: "",
  name: "",
  unitType: "apartment",
  status: "vacant",
  floor: "",
  bedrooms: 0,
  bathrooms: 1,
  area: 0,
  monthlyRent: 0,
  securityDeposit: 0,
  amenities: "",
  description: "",
};

export function Biens({ go }) {
  const { data, loading, error, reload } = useApi(loadPropertiesModule, []);
  useRealtimeReload(reload, ["properties", "units", "leases", "payments"]);
  const dateRange = useDateRange();
  const [type, setType] = useState("Tous");
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState(() => {
    // Terme transmis depuis la recherche globale du tableau de bord.
    try {
      const seed = sessionStorage.getItem("domus-search");
      if (seed) { sessionStorage.removeItem("domus-search"); return seed; }
    } catch {}
    return "";
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ city: "", minRent: "", maxRent: "", minBedrooms: "", minArea: "" });
  const [propertyModal, setPropertyModal] = useState(null);
  const [unitModal, setUnitModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const properties = useMemo(() => filterProperties(data?.properties || []).map(normalizeProperty), [data]);
  const photosByProperty = useMemo(() => {
    const grouped = new Map();
    (data?.propertyPhotos || []).forEach((photo) => {
      if (photo.unitId != null) return;
      const propertyId = Number(photo.propertyId);
      if (!grouped.has(propertyId)) grouped.set(propertyId, []);
      grouped.get(propertyId).push({ ...photo, url: api.propertyPhotoUrl(photo.id) });
    });
    return grouped;
  }, [data?.propertyPhotos]);
  const photosByUnit = useMemo(() => {
    const grouped = new Map();
    (data?.propertyPhotos || []).forEach((photo) => {
      if (photo.unitId == null) return;
      const unitId = Number(photo.unitId);
      if (!grouped.has(unitId)) grouped.set(unitId, []);
      grouped.get(unitId).push({ ...photo, url: api.propertyPhotoUrl(photo.id) });
    });
    return grouped;
  }, [data?.propertyPhotos]);
  const leases = useMemo(
    () => filterLeases(data?.leases || [], dateRange),
    [data?.leases, dateRange],
  );
  const paymentsRaw = useMemo(() => {
    const leaseIds = new Set(leases.map((lease) => lease.id));
    return filterPayments(data?.payments || [], dateRange)
      .filter((payment) => leaseIds.has(payment.leaseId));
  }, [data?.payments, dateRange, leases]);
  const currency = useMemo(() => normalizeCurrencyModule(data?.currencies, data?.setting), [data]);
  const leaseStatusByUnit = useMemo(() => buildLeaseStatusByUnit(leases, paymentsRaw), [leases, paymentsRaw]);
  const units = useMemo(
    () => filterUnits(data?.units || [], properties).map((unit, index) => normalizeUnit(unit, properties, leaseStatusByUnit, photosByUnit, index)),
    [data, leaseStatusByUnit, photosByUnit, properties],
  );
  const payments = useMemo(() => paymentsRaw.slice(0, 6).map(normalizePayment), [paymentsRaw]);

  // Une propriete active sans aucun lot doit quand meme apparaitre dans la grille
  // (sinon le compteur affiche "1" mais la grille reste vide -> "Aucune propriete").
  const cards = useMemo(() => {
    const propertyIdsWithUnit = new Set(units.map((u) => Number(u.propertyId)));
    const emptyProperties = properties
      .filter((p) => !propertyIdsWithUnit.has(Number(p.id)))
      .map((property) => normalizeEmptyProperty(property, photosByProperty));
    return [...units, ...emptyProperties];
  }, [units, properties, photosByProperty]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((property) => {
      if (type !== "Tous" && property.type !== type) return false;
      if (filters.city && !property.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.minRent && property.rentValue < Number(filters.minRent)) return false;
      if (filters.maxRent && property.rentValue > Number(filters.maxRent)) return false;
      if (filters.minBedrooms && property.beds < Number(filters.minBedrooms)) return false;
      if (filters.minArea && property.areaValue < Number(filters.minArea)) return false;
      if (!q) return true;
      return `${property.name} ${property.address} ${property.tenant} ${property.code}`
        .toLowerCase()
        .includes(q);
    });
  }, [filters, query, type, cards]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const occupiedCount = units.filter((u) => u.rawStatus === "occupied").length;
  const occupancy = units.length ? Math.round((occupiedCount / units.length) * 100) : 0;
  const activeLeases = leases.filter((lease) => (lease.status || "active") === "active");
  const monthlyRent = activeLeases.length
    ? activeLeases.reduce((sum, lease) => sum + Number(lease.rentAmount || 0), 0)
    : units.reduce((sum, u) => sum + (u.status === "Loue" ? u.rentValue : 0), 0);
  const monthlyRentByCurrency = activeLeases.length
    ? groupAmountsByCurrency(activeLeases, (lease) => lease.rentAmount, currency.defaultCurrencySymbol)
    : groupAmountsByCurrency(units.filter((u) => u.status === "Loue"), (u) => u.rentValue, currency.defaultCurrencySymbol);
  const lateUnits = units.filter((u) => u.paymentStatus === "late");
  const overdueRent = lateUnits.reduce((sum, u) => sum + u.rentValue, 0);
  const overdueRentByCurrency = groupAmountsByCurrency(lateUnits, (u) => u.rentValue, currency.defaultCurrencySymbol);

  async function saveProperty(values) {
    setBusy(true);
    setActionError("");
    try {
      const payload = propertyPayload(values);
      if (values.id) {
        await api.updateProperty(values.id, payload);
      } else {
        const created = await api.createProperty(payload);
        const unitsToCreate = propertyUnitsPayload(values, created?.id);
        for (const unit of unitsToCreate) {
          await api.createUnit(unit);
        }
      }
      setPropertyModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveUnit(values) {
    setBusy(true);
    setActionError("");
    try {
      const payload = unitPayload(values);
      if (values.id) await api.updateUnit(values.id, payload);
      else await api.createUnit(payload);
      setUnitModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Carte propriete sans lot -> ouvrir l'ajout d'un lot pre-rempli ; sinon editer le lot.
  function editCard(row) {
    if (row?.isEmptyProperty) {
      setUnitModal({ ...emptyUnit, propertyId: String(row.propertyId || "") });
      return;
    }
    setUnitModal(unitToForm(row));
  }

  async function removeUnit(row) {
    if (row?.isEmptyProperty) return; // pas de lot a supprimer
    if (!window.confirm(`Supprimer ${row.name} ?`)) return;
    setBusy(true);
    setActionError("");
    try {
      await api.deleteUnit(row.unitId);
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDetailPhoto(file) {
    const propertyId = Number(detailModal?.propertyId);
    const unitId = detailModal?.isEmptyProperty ? null : Number(detailModal?.unitId);
    if (!file || !propertyId) return;
    setBusy(true);
    setActionError("");
    try {
      await api.uploadPropertyPhoto(propertyId, file, Number.isFinite(unitId) ? unitId : null);
      await reload();
      const nextPhotos = await api.propertyPhotosForProperty(propertyId);
      const targetPhotos = nextPhotos.filter((photo) => {
        if (detailModal?.isEmptyProperty) return photo.unitId == null;
        return Number(photo.unitId) === Number(detailModal?.unitId);
      });
      setDetailModal((current) => current ? {
        ...current,
        photos: targetPhotos.map((photo) => ({ ...photo, url: api.propertyPhotoUrl(photo.id) })),
      } : current);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteDetailPhoto(photoId) {
    if (!photoId || !window.confirm("Supprimer cette photo ?")) return;
    setBusy(true);
    setActionError("");
    try {
      await api.deletePropertyPhoto(photoId);
      await reload();
      setDetailModal((current) => current ? {
        ...current,
        photos: (current.photos || []).filter((photo) => Number(photo.id) !== Number(photoId)),
      } : current);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  return (
    <section className="property-crm">
      <ImmoHeader title="Immobilier" subtitle="Proprietes, baux, locataires et paiements de loyer">
        <label className="immo-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher propriete, adresse, locataire..."
          />
        </label>
        <button className="immo-btn" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal size={16} /> Filtres {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>
        <button className="immo-btn primary" onClick={() => setPropertyModal({ ...emptyProperty, currencyId: currency.defaultCurrencyId || "" })}>
          <Plus size={18} /> Nouvelle propriete
        </button>
      </ImmoHeader>

      <MetricsGrid>
        <Metric icon={<Building2 size={20} />} tone="brand" label="Proprietes" value={properties.length}
          helper={`${units.length} lots`} />
        <Metric icon={<Users size={20} />} tone="green" label="Taux d'occupation" value={`${occupiedCount}/${units.length}`}
          helper={<span className="immo-progress"><span style={{ width: `${occupancy}%` }} /></span>} />
        <Metric icon={<CreditCard size={20} />} tone="amber" label="Loyers du mois" value={<MoneyStack rows={monthlyRentByCurrency} fallbackSymbol={currency.defaultCurrencySymbol} />}
          helper={`${occupiedCount} lots loues`} />
        <Metric icon={<AlertTriangle size={20} />} tone="red" label="Loyers en retard" value={<MoneyStack rows={overdueRentByCurrency} fallbackSymbol={currency.defaultCurrencySymbol} emptyText="0" />}
          valueColor="#dc2626" helper={`${lateUnits.length} a recouvrer`} />
      </MetricsGrid>

      {filtersOpen && (
        <div className="card property-filters">
          <Field label="Ville" value={filters.city} onChange={(city) => setFilters((f) => ({ ...f, city }))} />
          <Field label="Loyer min." type="number" value={filters.minRent} onChange={(minRent) => setFilters((f) => ({ ...f, minRent }))} />
          <Field label="Loyer max." type="number" value={filters.maxRent} onChange={(maxRent) => setFilters((f) => ({ ...f, maxRent }))} />
          <Field label="Chambres min." type="number" value={filters.minBedrooms} onChange={(minBedrooms) => setFilters((f) => ({ ...f, minBedrooms }))} />
          <Field label="Surface min." type="number" value={filters.minArea} onChange={(minArea) => setFilters((f) => ({ ...f, minArea }))} />
          <button className="btn" onClick={() => setFilters({ city: "", minRent: "", maxRent: "", minBedrooms: "", minArea: "" })}>
            Reinitialiser
          </button>
        </div>
      )}

      {actionError && <div className="api-error">{actionError}</div>}

      <div className="immo-filters">
        <div className="immo-filter-group">
          <span>Type :</span>
          {TYPES.map((item) => (
            <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="immo-view-switch">
          <span>Vue :</span>
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Grille"><Grid3X3 size={16} /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Liste"><List size={16} /></button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")} title="Carte"><MapIcon size={16} /></button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="brand-logo" style={{ margin: "0 auto 14px" }}><Building2 size={18} color="#fff" /></div>
          <div style={{ fontWeight: 650 }}>Aucune propriete</div>
          <p className="muted" style={{ fontSize: 13 }}>Aucune donnee API ne correspond aux filtres actifs.</p>
          <button className="btn btn-primary" onClick={() => setUnitModal({ ...emptyUnit, propertyId: properties[0]?.id || "" })}>
            <Plus size={16} /> Ajouter une propriete
          </button>
        </div>
      ) : view === "list" ? (
        <PropertyTable
          rows={filtered}
          onOpen={setDetailModal}
          onEdit={editCard}
          onDelete={removeUnit}
          go={go}
        />
      ) : view === "map" ? (
        <PropertyMap rows={filtered} />
      ) : (
        <div className="immo-property-grid">
          {filtered.map((property, index) => (
            <PropertyCard
              key={property.unitId}
              property={property}
              index={index}
              onOpen={() => setDetailModal(property)}
              onEdit={() => editCard(property)}
              onDelete={() => removeUnit(property)}
              go={go}
            />
          ))}
        </div>
      )}

      <RecentPayments payments={payments} go={go} />

      {propertyModal && (
        <PropertyModal
          value={propertyModal}
          busy={busy}
          error={actionError}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          onClose={() => setPropertyModal(null)}
          onSave={saveProperty}
        />
      )}

      {unitModal && (
        <UnitModal
          value={unitModal}
          properties={properties}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          busy={busy}
          error={actionError}
          onClose={() => setUnitModal(null)}
          onSave={saveUnit}
        />
      )}

      {detailModal && (
        <PropertyDetailModal
          property={detailModal}
          busy={busy}
          error={actionError}
          onClose={() => setDetailModal(null)}
          onUploadPhoto={uploadDetailPhoto}
          onDeletePhoto={deleteDetailPhoto}
          onEdit={() => {
            const current = detailModal;
            setDetailModal(null);
            editCard(current);
          }}
          go={go}
        />
      )}
    </section>
  );
}

async function loadPropertiesModule() {
  const [properties, units, payments, leases, currencies, setting, propertyPhotos] = await Promise.all([
    api.properties(),
    api.units(),
    api.payments(),
    api.leases(),
    api.currencies(),
    api.setting(),
    api.propertyPhotos(),
  ]);
  return { properties, units, payments, leases, currencies, setting, propertyPhotos };
}

function PropertyCard({ property, index = 0, onOpen, onEdit, onDelete, go }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasTenant = property.rawStatus === "occupied" && property.tenant && property.tenant !== "A assigner";
  const mediaClass = property.paymentStatus === "late"
    ? "late"
    : property.rawStatus === "maintenance"
      ? "maintenance"
      : property.rawStatus === "occupied"
        ? "leased"
        : "available";
  const statusClass = property.paymentStatus === "late"
    ? "late"
    : property.rawStatus === "maintenance"
      ? "maintenance"
      : "";
  const watermark = property.type === "Maison" ? <Home size={48} /> : <Building2 size={48} />;

  const handleMenuAction = (action) => {
    setMenuOpen(false);
    if (action === "edit") onEdit?.();
    if (action === "assign") go?.("locataires");
    if (action === "payments") go?.("loyers");
    if (action === "lease") go?.("baux");
    if (action === "reserve") { setReservationPrefill(property.propertyId || property.id); go?.("reservations"); }
    if (action === "delete") onDelete?.();
  };

  return (
    <article className={`immo-property-card ${mediaClass}${menuOpen ? " menu-open" : ""}`} onClick={onOpen} role="button" tabIndex={0}>
      <div className={`immo-property-media${property.coverPhoto ? " has-photo" : ""}`}>
        {property.coverPhoto ? <img className="immo-property-photo" src={property.coverPhoto.url} alt={property.name} /> : null}
        <span className={`immo-status-chip ${statusClass}`}>{property.isEmptyProperty ? "Sans lot" : property.status}</span>
        <button className="immo-icon-button" title="Options" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}><MoreHorizontal size={16} /></button>
        {menuOpen && (
          <div className="property-menu immo-property-context-menu" onClick={(e) => e.stopPropagation()}>
            <div className={`immo-menu-head ${hasTenant ? "pendingSignature" : ""}`}>
              <strong>{property.name}</strong>
              <span>{property.code}</span>
            </div>
            <button className="highlight" onClick={() => handleMenuAction("edit")}><Edit3 size={16} /> Modifier l'unite</button>
            <div className="immo-menu-separator" />
            <button onClick={() => handleMenuAction("reserve")}><BedDouble size={16} /> Réserver (courte durée)</button>
            {!hasTenant && (
              <>
                <div className="immo-menu-separator" />
                <button onClick={() => handleMenuAction("assign")}><UserPlus size={16} /> Assigner locataire</button>
              </>
            )}
            {hasTenant && (
              <>
                <div className="immo-menu-separator" />
                <button onClick={() => handleMenuAction("payments")}><DollarSign size={16} /> Voir paiements</button>
                <button onClick={() => handleMenuAction("lease")}><FileText size={16} /> Voir bail</button>
              </>
            )}
            <div className="immo-menu-separator" />
            <button className="danger" onClick={() => handleMenuAction("delete")}><Trash2 size={16} /> Supprimer</button>
          </div>
        )}
        {!property.coverPhoto && <span className="immo-property-watermark">{watermark}</span>}
        <span className="immo-property-code">{property.type} - {property.code}</span>
      </div>
      <div className="immo-property-body">
        <h3>{property.name}</h3>
        <p>{property.address}</p>
        <div className="immo-property-meta">
          {property.beds > 0 && <span><BedDouble size={15} /> {property.beds}</span>}
          <span><Bath size={15} /> {property.baths}</span>
          <span>{property.area}</span>
        </div>
        <div className="immo-property-footer">
          <div className="immo-property-tenant">
            <span className={`mini-avatar ${avatarClass(index)}`}>{property.initials}</span>
            <div className="immo-property-tenant-text"><span className="name">{property.tenant}</span></div>
          </div>
          <div className="immo-property-rent"><strong>{property.rent}</strong><span>/mois</span></div>
        </div>
      </div>
    </article>
  );
}

function PropertyTable({ rows, onOpen, onEdit, onDelete, go }) {
  return (
    <div className="immo-property-list-table">
      <table>
        <thead>
          <tr><th>Propriete</th><th>Type</th><th>Locataire</th><th>Surface</th><th>Loyer</th><th>Statut</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((property) => (
            <tr key={property.unitId} onClick={() => onOpen?.(property)}>
              <td><b>{property.name}</b><div className="muted">{property.address}</div></td>
              <td>{property.type} - {property.code}</td>
              <td>{property.tenant}</td>
              <td>{property.area}</td>
              <td><b>{property.rent}</b><span className="muted"> /mois</span></td>
              <td><StatusPill status={property.status} /></td>
              <td className="row-actions">
                <button title="Modifier" onClick={(e) => { e.stopPropagation(); onEdit(property); }}><Edit3 size={15} /></button>
                <button title="Paiements" onClick={(e) => { e.stopPropagation(); go?.("loyers"); }}>$</button>
                <button title="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(property); }}><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PropertyMap({ rows }) {
  return (
    <div className="card property-map-preview">
      <MapIcon size={34} />
      <b>Carte du patrimoine</b>
      <span>{rows.length} proprietes filtrees</span>
      <div className="map-dot-grid">
        {rows.slice(0, 12).map((row, index) => (
          <span key={row.unitId} style={{ left: `${10 + ((index * 17) % 78)}%`, top: `${18 + ((index * 23) % 64)}%` }}>
            {row.code}
          </span>
        ))}
      </div>
    </div>
  );
}

function PropertyDetailModal({ property, busy, error, onClose, onUploadPhoto, onDeletePhoto, onEdit, go }) {
  const photos = Array.isArray(property.photos) ? property.photos : [];
  const cover = photos[0];
  return (
    <Modal
      title={property.name}
      subtitle={`${property.type} - ${property.code}`}
      icon={property.type === "Maison" ? <Home size={20} /> : <Building2 size={20} />}
      className="domus-property-detail-modal"
      onClose={onClose}
    >
      <div className="domus-property-detail">
        <section className="domus-detail-gallery">
          <div className={`domus-detail-hero${cover ? " has-photo" : ""}`}>
            {cover ? <img src={cover.url} alt={property.name} /> : (
              <div className="domus-detail-empty-photo">
                <Camera size={34} />
                <span>Aucune photo</span>
              </div>
            )}
          </div>
          <div className="domus-photo-strip">
            {photos.map((photo) => (
              <div className="domus-photo-thumb" key={photo.id}>
                <img src={photo.url} alt={photo.originalName || property.name} />
                <button type="button" onClick={() => onDeletePhoto(photo.id)} disabled={busy} title="Supprimer la photo">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <label className="domus-photo-add">
              <Upload size={16} />
              <span>Ajouter</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUploadPhoto(file);
                }}
              />
            </label>
          </div>
        </section>

        <section className="domus-property-detail-summary">
          <div>
            <h3>{property.name}</h3>
            <p>{property.address}</p>
          </div>
          <StatusPill status={property.status} />
        </section>

        <div className="domus-property-detail-grid">
          <DetailLine label="Type" value={property.type} />
          <DetailLine label="Code" value={property.code} />
          <DetailLine label="Locataire" value={property.tenant} />
          <DetailLine label="Loyer" value={`${property.rent} /mois`} />
          <DetailLine label="Chambres" value={property.beds || "0"} />
          <DetailLine label="Salles de bain" value={property.baths || "0"} />
          <DetailLine label="Surface" value={property.area} />
          <DetailLine label="Etages" value={property.floors ?? "-"} />
          <DetailLine label="Parking" value={property.parkingSpaces ?? "0"} />
          <DetailLine label="Ville" value={property.city || "-"} />
        </div>

        {(property.description || property.unitDescription || property.amenities) && (
          <div className="domus-property-detail-notes">
            {property.description && <p><strong>Description bien</strong>{property.description}</p>}
            {property.unitDescription && <p><strong>Description unite</strong>{property.unitDescription}</p>}
            {property.amenities && <p><strong>Equipements</strong>{property.amenities}</p>}
          </div>
        )}

        {error && <div className="api-error">{error}</div>}
      </div>
      <div className="domus-modal-footer">
        <button className="domus-modal-cancel" onClick={onClose} disabled={busy}>Fermer</button>
        <div>
          <button
            className="domus-modal-draft"
            onClick={() => { setReservationPrefill(property.propertyId || property.id); onClose(); go?.("reservations"); }}
            disabled={busy}
          ><BedDouble size={14} /> Réserver</button>
          <button
            className="domus-modal-draft"
            onClick={() => { setLeasePrefill(property.propertyId || property.id, property.unitId); onClose(); go?.("baux"); }}
            disabled={busy}
          ><FileText size={14} /> Créer un bail</button>
          <button className="domus-modal-draft" onClick={() => go?.("loyers")} disabled={busy}><DollarSign size={14} /> Loyers</button>
          <button className="domus-modal-submit" onClick={onEdit} disabled={busy}>
            <Edit3 size={14} /> Modifier
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="domus-property-detail-line">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

function RecentPayments({ payments, go }) {
  return (
    <div className="immo-recent recent-payments">
      <header>
        <h3>Paiements recents</h3>
        <button className="immo-link" onClick={() => go?.("loyers")}>Voir tout</button>
      </header>
      <table>
        <thead>
          <tr><th>Locataire</th><th>Date</th><th>Montant</th><th>Methode</th></tr>
        </thead>
        <tbody>
          {payments.length ? payments.map((payment) => (
            <tr key={payment.id}>
              <td><b>{payment.tenant}</b><div className="muted">{payment.property}</div></td>
              <td>{payment.date}</td>
              <td><b>{payment.amount}</b></td>
              <td>{payment.method}</td>
            </tr>
          )) : (
            <tr><td className="muted">Aucun paiement recent depuis l'API.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PropertyModal({ value, busy, error, currencyOptions = [], defaultCurrencyId = "", onClose, onSave }) {
  const [form, setForm] = useState(value);
  const units = Array.isArray(form.units) ? form.units : [];
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const setUnit = (index, patch) => {
    setForm((current) => ({
      ...current,
      units: (current.units || []).map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, ...patch } : unit,
      ),
    }));
  };
  const addUnit = () => {
    setForm((current) => ({
      ...current,
      addUnitsNow: true,
      units: [
        ...(current.units || []),
        {
          name: "",
          unitType: "apartment",
          floor: "",
          area: "",
          bedrooms: 0,
          bathrooms: 0,
          monthlyRent: current.defaultRent || "",
          securityDeposit: "",
          currencyId: current.currencyId || defaultCurrencyId || "",
        },
      ],
    }));
  };
  const removeUnit = (index) => {
    setForm((current) => ({
      ...current,
      units: (current.units || []).filter((_, unitIndex) => unitIndex !== index),
    }));
  };
  const saveDraft = () => onSave({ ...form, _draft: true });

  return (
    <Modal
      title={form.id ? "Modifier la propriete" : "Nouvelle propriete"}
      subtitle="Ajoutez un bien a votre portefeuille immobilier"
      icon={<Building2 size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Info size={14} />} title="Informations generales">
          <DomusPropertyField label="Nom" value={form.name} onChange={(name) => set({ name })} placeholder="ex. Residence Tombalbaye" required />
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Code interne" value={form.code} onChange={(code) => set({ code })} placeholder="Auto-genere" disabled />
            <DomusPropertySelect label="Type de bien" value={form.propertyType} onChange={(propertyType) => set({ propertyType })} required options={[
              ["building", "Immeuble"],
              ["residential", "Residentiel"],
              ["commercial", "Commercial"],
              ["mixed", "Mixte"],
            ]} />
          </div>
          <div className="domus-property-field">
            <span>Statut initial</span>
            <div className="domus-radio-cards">
              {[
                ["available", "Disponible"],
                ["occupied", "Occupe"],
                ["maintenance", "Maintenance"],
              ].map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  className={form.status === status ? "active" : ""}
                  onClick={() => set({ status })}
                >
                  <i /> {label}
                </button>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection icon={<MapPin size={14} />} title="Localisation">
          <DomusPropertyField label="Adresse" value={form.address} onChange={(address) => set({ address })} placeholder="ex. 15 Av. Tombalbaye" />
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Ville" value={form.city} onChange={(city) => set({ city })} placeholder="Kinshasa" />
            <DomusPropertyField label="Pays" value={form.country} onChange={(country) => set({ country })} placeholder="RDC" />
          </div>
        </FormSection>

        <FormSection icon={<Layers size={14} />} title="Caracteristiques">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Nombre d'etages" type="number" value={form.floors} onChange={(floors) => set({ floors })} />
            <DomusPropertyField label="Places de parking" type="number" value={form.parkingSpaces} onChange={(parkingSpaces) => set({ parkingSpaces })} />
          </div>
          <DomusPropertyField label="Description" value={form.description} onChange={(description) => set({ description })} placeholder="Notes, equipements, particularites du bien..." textarea />
          <label className="domus-checkbox-row">
            <input
              type="checkbox"
              checked={!!form.availableForBooking}
              onChange={(e) => set({ availableForBooking: e.target.checked })}
            />
            <span>Visible sur la page publique de reservation</span>
          </label>
        </FormSection>

        <FormSection icon={<Wallet size={14} />} title="Informations financieres">
          <div className="domus-property-form-grid">
            <DomusMoneyField
              label="Valeur marchande estimee"
              value={form.marketValue}
              currencyId={form.currencyId || defaultCurrencyId || ""}
              currencyOptions={currencyOptions}
              onAmountChange={(marketValue) => set({ marketValue })}
              onCurrencyChange={(currencyId) => set({ currencyId })}
              placeholder="ex. 480000000"
              helper="Pour analyse de patrimoine"
            />
            <DomusMoneyField
              label="Loyer mensuel par defaut"
              value={form.defaultRent}
              currencyId={form.currencyId || defaultCurrencyId || ""}
              currencyOptions={currencyOptions}
              onAmountChange={(defaultRent) => set({ defaultRent })}
              onCurrencyChange={(currencyId) => set({ currencyId })}
              placeholder="ex. 850000"
              helper="Herite par defaut sur chaque unite creee"
            />
          </div>
        </FormSection>
      </div>

      {!form.id && (
        <>
          <label className="domus-units-toggle">
            <input
              type="checkbox"
              checked={Boolean(form.addUnitsNow)}
              onChange={(e) => {
                const addUnitsNow = e.target.checked;
                if (addUnitsNow && !units.length) addUnit();
                else set({ addUnitsNow });
              }}
            />
            <div>
              <strong><Grid3X3 size={14} /> Ajouter des unites maintenant</strong>
              <p>Definissez les appartements/locaux du bien. Vous pourrez aussi le faire plus tard.</p>
            </div>
          </label>

          {form.addUnitsNow && (
            <div className="domus-units-list">
              {units.map((unit, index) => (
                <div className="domus-unit-card" key={index}>
                  <div className="domus-unit-card-head">
                    <div><span>{index + 1}</span> Unite {index + 1}</div>
                    <button type="button" onClick={() => removeUnit(index)} aria-label="Supprimer cette unite"><Trash2 size={14} /></button>
                  </div>
                  <div className="domus-unit-grid">
                    <DomusPropertyField label="Nom" value={unit.name} onChange={(name) => setUnit(index, { name })} placeholder="ex. A-203" required />
                    <DomusPropertySelect label="Type" value={unit.unitType} onChange={(unitType) => setUnit(index, { unitType })} options={[
                      ["apartment", "Appartement"],
                      ["house", "Maison"],
                      ["office", "Bureau"],
                      ["commercial", "Commerce"],
                    ]} />
                    <DomusPropertyField label="Etage" value={unit.floor} onChange={(floor) => setUnit(index, { floor })} placeholder="ex. 2 ou RDC" />
                    <DomusPropertyField label="Surface (m2)" type="number" value={unit.area} onChange={(area) => setUnit(index, { area })} />
                    <DomusPropertyField label="Chambres" type="number" value={unit.bedrooms} onChange={(bedrooms) => setUnit(index, { bedrooms })} />
                    <DomusPropertyField label="Salles de bain" type="number" value={unit.bathrooms} onChange={(bathrooms) => setUnit(index, { bathrooms })} />
                  </div>
                  <div className="domus-unit-grid money">
                    <DomusMoneyField
                      label="Loyer mensuel"
                      value={unit.monthlyRent}
                      currencyId={unit.currencyId || form.currencyId || defaultCurrencyId || ""}
                      currencyOptions={currencyOptions}
                      onAmountChange={(monthlyRent) => setUnit(index, { monthlyRent })}
                      onCurrencyChange={(currencyId) => setUnit(index, { currencyId })}
                      placeholder="850000"
                    />
                    <DomusMoneyField
                      label="Caution"
                      value={unit.securityDeposit}
                      currencyId={unit.currencyId || form.currencyId || defaultCurrencyId || ""}
                      currencyOptions={currencyOptions}
                      onAmountChange={(securityDeposit) => setUnit(index, { securityDeposit })}
                      onCurrencyChange={(currencyId) => setUnit(index, { currencyId })}
                      placeholder="1700000"
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="domus-unit-add" onClick={addUnit}><Plus size={16} /> Ajouter une unite</button>
            </div>
          )}
        </>
      )}

      <div className="domus-form-info-note">
        <Info size={14} />
        <span>
          <strong>Le code interne est genere automatiquement</strong> apres creation
          (format <code>PROP-YYYY-NNN</code>). Vous pourrez ajouter photo et documents juridiques apres la creation.
        </span>
      </div>

      {error && <div className="api-error">{error}</div>}
      <div className="domus-modal-footer">
        <button className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
        <div>
          <button className="domus-modal-draft" onClick={saveDraft} disabled={busy}><Save size={14} /> Brouillon</button>
          <button className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !form.name}>
            <Check size={14} /> {busy ? "Enregistrement..." : form.id ? "Mettre a jour la propriete" : "Creer la propriete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function UnitModal({ value, properties, currencyOptions = [], defaultCurrencyId = "", busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  return (
    <Modal title={form.id ? "Modifier la propriete" : "Ajouter une propriete"} onClose={onClose}>
      <div className="form-grid two">
        <Select
          label="Groupe immobilier"
          value={form.propertyId}
          onChange={(propertyId) => setForm({ ...form, propertyId })}
          options={properties.map((p) => [String(p.id), `${p.name} ${p.code ? `- ${p.code}` : ""}`])}
        />
        <Field label="Nom / numero" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <Select label="Type" value={form.unitType} onChange={(unitType) => setForm({ ...form, unitType })} options={[
          ["apartment", "Appartement"],
          ["house", "Maison"],
          ["office", "Bureau"],
          ["commercial", "Commerce"],
        ]} />
        <Select label="Statut" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[
          ["vacant", "Libre"],
          ["occupied", "Loue"],
          ["maintenance", "Maintenance"],
        ]} />
        <Field label="Etage" value={form.floor} onChange={(floor) => setForm({ ...form, floor })} />
        <Field label="Chambres" type="number" value={form.bedrooms} onChange={(bedrooms) => setForm({ ...form, bedrooms })} />
        <Field label="Salles de bain" type="number" value={form.bathrooms} onChange={(bathrooms) => setForm({ ...form, bathrooms })} />
        <Field label="Surface m2" type="number" value={form.area} onChange={(area) => setForm({ ...form, area })} />
        <MoneyField
          label="Loyer mensuel"
          value={form.monthlyRent}
          currencyId={form.currencyId}
          currencyOptions={currencyOptions}
          onAmountChange={(monthlyRent) => setForm({ ...form, monthlyRent })}
          onCurrencyChange={(currencyId) => setForm({ ...form, currencyId })}
        />
        <MoneyField
          label="Depot garantie"
          value={form.securityDeposit}
          currencyId={form.currencyId}
          currencyOptions={currencyOptions}
          onAmountChange={(securityDeposit) => setForm({ ...form, securityDeposit })}
          onCurrencyChange={(currencyId) => setForm({ ...form, currencyId })}
        />
        <Field label="Equipements" value={form.amenities} onChange={(amenities) => setForm({ ...form, amenities })} />
        <Field label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
      </div>
      <label className="domus-checkbox-row">
        <input
          type="checkbox"
          checked={!!form.availableForBooking}
          onChange={(e) => setForm({ ...form, availableForBooking: e.target.checked })}
        />
        <span>Visible sur la page publique de reservation</span>
      </label>
      {error && <div className="api-error">{error}</div>}
      <ModalActions busy={busy} onClose={onClose} onSave={() => onSave(form)} disabled={!form.propertyId || !form.name} />
    </Modal>
  );
}

export function Modal({ title, subtitle, icon, className = "", children, onClose }) {
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className={`modal-card ${className}`}>
        <div className="modal-head">
          <div className="domus-modal-title">
            {icon && <span className="domus-modal-title-icon">{icon}</span>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormSection({ icon, title, children }) {
  return (
    <section className="domus-form-section">
      <h3>{icon} {title}</h3>
      {children}
    </section>
  );
}

export function DomusPropertyField({ label, value, onChange, type = "text", required = false, placeholder = "", helper = "", disabled = false, textarea = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      {textarea ? (
        <textarea value={value ?? ""} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value ?? ""} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
      {helper && <small>{helper}</small>}
    </label>
  );
}

export function DomusPropertySelect({ label, value, options, onChange, required = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <Autocomplete value={value ?? ""} onChange={onChange} options={options} placeholder="Choisir…" />
    </label>
  );
}

function DomusMoneyField({
  label,
  value,
  currencyId,
  currencyOptions,
  onAmountChange,
  onCurrencyChange,
  placeholder = "",
  helper = "",
  required = false,
}) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <div className="domus-money-input">
        <input type="number" value={value ?? ""} placeholder={placeholder} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.symbol || option.label}</option>
          ))}
        </select>
      </div>
      {helper && <small>{helper}</small>}
    </label>
  );
}

export function ModalActions({ busy, disabled, onClose, onSave }) {
  return (
    <div className="modal-actions">
      <button className="btn" onClick={onClose} disabled={busy}>Annuler</button>
      <button className="btn btn-primary" onClick={onSave} disabled={busy || disabled}>
        {busy ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choisir</option>
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </label>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions, onAmountChange, onCurrencyChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="money-input">
        <input type="number" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.symbol || option.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card property-mini-kpi">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function StatusPill({ status }) {
  const cls = status === "Retard" ? "late" : status === "Loue" ? "leased" : status === "Maintenance" ? "maintenance" : "free";
  return <span className={`status-pill ${cls}`}><i /> {status}</span>;
}

function normalizeProperty(property) {
  return {
    ...property,
    id: Number(property.id),
    name: property.name || `Propriete #${property.id}`,
    code: property.code || `P-${property.id}`,
    city: property.city || "",
    address: [property.address, property.city].filter(Boolean).join(", "),
  };
}

// Carte "propriete sans lot" : meme forme qu'un lot mais sans unitId, pour inviter a ajouter un lot.
function normalizeEmptyProperty(property, photosByProperty = new Map()) {
  const rawType = String(property.propertyType || "").toLowerCase();
  const photos = photosByProperty.get(Number(property.id)) || [];
  return {
    raw: property,
    isEmptyProperty: true,
    unitId: `prop-${property.id}`,
    propertyId: property.id,
    currencyId: property.currencyId,
    code: property.code || `P-${property.id}`,
    type: TYPE_MAP[rawType] || "Appartement",
    status: "Libre",
    rawStatus: "vacant",
    paymentStatus: "ok",
    name: property.name || `Propriete #${property.id}`,
    address: property.address || "Adresse non renseignee",
    city: property.city || "",
    country: property.country || "",
    floors: property.floors,
    parkingSpaces: property.parkingSpaces,
    marketValue: property.marketValue,
    defaultRent: property.defaultRent,
    description: property.description || "",
    photos,
    coverPhoto: photos.find((photo) => photo.isPrimary) || photos[0] || null,
    beds: 0,
    baths: 0,
    areaValue: 0,
    area: "0.00m2",
    tenant: "A assigner",
    initials: "NA",
    avatar: AVATARS[Number(property.id) % AVATARS.length],
    rentValue: Number(property.defaultRent || 0),
    rent: money(Number(property.defaultRent || 0), "$"),
  };
}

function normalizeUnit(unit, properties, leaseStatusByUnit, photosByProperty = new Map(), index) {
  const owner = properties.find((p) => Number(p.id) === Number(unit.propertyId)) || {};
  const photos = photosByProperty.get(Number(unit.id)) || [];
  const rawType = String(unit.unitType || owner.propertyType || "").toLowerCase();
  const type = TYPE_MAP[rawType] || "Appartement";
  const rawStatus = String(unit.status || "").toLowerCase();
  const leaseState = leaseStatusByUnit.get(String(unit.id));
  const status = leaseState?.status === "late"
    ? "Retard"
    : rawStatus === "occupied"
      ? "Loue"
      : rawStatus === "maintenance"
        ? "Maintenance"
        : "Libre";
  const tenant = leaseState?.tenantName || unit.tenantName || unit.currentTenantName || "A assigner";
  const rentValue = Number(leaseState?.rentAmount || unit.monthlyRent || owner.defaultRent || 0);
  const areaValue = Number(unit.area || 0);
  return {
    raw: unit,
    unitId: unit.id,
    currencyId: leaseState?.currencyId || unit.currencyId,
    currencySymbol: leaseState?.currencySymbol || unit.currencySymbol,
    propertyId: unit.propertyId,
    code: unit.name || unit.code || `U-${unit.id}`,
    type,
    status,
    rawStatus,
    paymentStatus: leaseState?.status || "ok",
    name: owner.name || unit.propertyName || `Propriete #${unit.propertyId}`,
    address: [unit.propertyAddress || owner.address, owner.city].filter(Boolean).join(" - ") || "Adresse non renseignee",
    city: owner.city || "",
    country: owner.country || "",
    floors: owner.floors,
    parkingSpaces: owner.parkingSpaces,
    marketValue: owner.marketValue,
    defaultRent: owner.defaultRent,
    description: owner.description || "",
    unitDescription: unit.description || "",
    amenities: unit.amenities || "",
    photos,
    coverPhoto: photos.find((photo) => photo.isPrimary) || photos[0] || null,
    beds: Number(unit.bedrooms || 0),
    baths: Number(unit.bathrooms || 0),
    areaValue,
    area: areaValue ? `${areaValue.toFixed(2)}m2` : "0.00m2",
    tenant,
    initials: initials(tenant),
    avatar: AVATARS[index % AVATARS.length],
    rentValue,
    rent: money(rentValue, leaseState?.currencySymbol || unit.currencySymbol || "$"),
  };
}

function buildLeaseStatusByUnit(leases, payments) {
  const byUnit = new Map();
  const paidByLease = new Map();
  (payments || []).forEach((payment) => {
    if (!payment.leaseId || !payment.paymentDate) return;
    const key = String(payment.leaseId);
    if (!paidByLease.has(key)) paidByLease.set(key, new Set());
    paidByLease.get(key).add(monthKey(payment.paymentDate));
  });
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  (leases || [])
    .filter((lease) => (lease.status || "active") === "active" && lease.unitId)
    .forEach((lease) => {
      const paidMonths = paidByLease.get(String(lease.id)) || new Set();
      let status = "ok";
      if (lease.startDate) {
        const start = new Date(lease.startDate);
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cursor < currentMonth) {
          if (!paidMonths.has(monthKey(cursor))) {
            status = "late";
            break;
          }
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ").trim()
        || lease.tenantName || "";
      byUnit.set(String(lease.unitId), {
        status,
        rentAmount: lease.rentAmount,
        currencyId: lease.currencyId,
        currencySymbol: lease.currencySymbol,
        tenantName,
      });
    });
  return byUnit;
}

function monthKey(dateLike) {
  const date = new Date(dateLike);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizePayment(payment) {
  return {
    id: payment.id,
    tenant: [payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "Locataire",
    property: [payment.propertyName, payment.unitName].filter(Boolean).join(" - ") || "Propriete",
    date: String(payment.paymentDate || "").slice(0, 10) || "-",
    amount: money(payment.amount, payment.currencySymbol || "$"),
    method: payment.method || "-",
  };
}

function propertyPayload(form) {
  return {
    name: form.name,
    code: form.code || undefined,
    propertyType: form.propertyType || "building",
    status: form.status || "available",
    address: form.address || null,
    city: form.city || null,
    country: form.country || null,
    floors: toNumber(form.floors),
    parkingSpaces: toNumber(form.parkingSpaces),
    marketValue: toNumber(form.marketValue),
    defaultRent: toNumber(form.defaultRent),
    ...(form.currencyId ? { currencyId: toNumber(form.currencyId) } : {}),
    description: form.description || null,
  };
}

function propertyUnitsPayload(form, propertyId) {
  if (!propertyId) return [];
  if (form.addUnitsNow && Array.isArray(form.units)) {
    return form.units
      .filter((unit) => unit?.name)
      .map((unit) => ({
        propertyId: Number(propertyId),
        name: unit.name,
        unitType: unit.unitType || "apartment",
        status: "vacant",
        floor: unit.floor || null,
        bedrooms: toNumber(unit.bedrooms),
        bathrooms: toNumber(unit.bathrooms),
        area: toNumber(unit.area),
        monthlyRent: toNumber(unit.monthlyRent || form.defaultRent),
        securityDeposit: toNumber(unit.securityDeposit),
        ...(unit.currencyId || form.currencyId ? { currencyId: toNumber(unit.currencyId || form.currencyId) } : {}),
      }));
  }
  if (!form.createFirstUnit) return [];
  return [{
    propertyId: Number(propertyId),
    name: form.firstUnitName || form.code || "Principal",
    unitType: form.firstUnitType || "apartment",
    status: "vacant",
    bedrooms: toNumber(form.firstUnitBedrooms),
    bathrooms: toNumber(form.firstUnitBathrooms),
    area: toNumber(form.firstUnitArea),
    monthlyRent: toNumber(form.firstUnitRent || form.defaultRent),
    securityDeposit: 0,
    ...(form.currencyId ? { currencyId: toNumber(form.currencyId) } : {}),
  }];
}

function unitPayload(form) {
  return {
    propertyId: toNumber(form.propertyId),
    name: form.name,
    unitType: form.unitType || UNIT_TYPE_TO_API[form.type] || "apartment",
    status: form.status || "vacant",
    floor: form.floor || null,
    bedrooms: toNumber(form.bedrooms),
    bathrooms: toNumber(form.bathrooms),
    area: toNumber(form.area),
    monthlyRent: toNumber(form.monthlyRent),
    securityDeposit: toNumber(form.securityDeposit),
    ...(form.currencyId ? { currencyId: toNumber(form.currencyId) } : {}),
    amenities: form.amenities || null,
    description: form.description || null,
  };
}

function unitToForm(row) {
  const unit = row.raw || {};
  return {
    ...emptyUnit,
    id: unit.id,
    propertyId: String(unit.propertyId || ""),
    name: unit.name || "",
    unitType: unit.unitType || "apartment",
    status: unit.status || "vacant",
    floor: unit.floor || "",
    bedrooms: unit.bedrooms || 0,
    bathrooms: unit.bathrooms || 0,
    area: unit.area || 0,
    monthlyRent: unit.monthlyRent || 0,
    securityDeposit: unit.securityDeposit || 0,
    currencyId: unit.currencyId || row.currencyId || "",
    amenities: unit.amenities || "",
    description: unit.description || "",
  };
}

function initials(name) {
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  if (!parts.length || name === "A assigner") return "NA";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
