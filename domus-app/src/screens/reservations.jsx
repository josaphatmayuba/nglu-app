import { useEffect, useMemo, useState } from "react";
import {
  Bath,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Home,
  ImageOff,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { takeReservationPrefill } from "./reservationPrefill.js";

// Réservation temporaire type hôtel : un client occupe un bien entier OU une
// unité sur une plage de dates, au tarif par jour. Recette au check-out.

const STATUS_LABEL = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "Arrivée",
  checked_out: "Départ (soldée)",
  cancelled: "Annulée",
};
const STATUS_CLASS = {
  pending: "chip-amber",
  confirmed: "chip-iris",
  checked_in: "chip-brand",
  checked_out: "chip-green",
  cancelled: "chip-ink",
};

const emptyReservation = {
  propertyId: "",
  unitId: "",
  guestName: "",
  guestPhone: "",
  guestEmail: "",
  checkIn: "",
  checkOut: "",
  dailyRate: "",
  depositAmount: "",
  currencyId: "",
  notes: "",
};

function toId(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
const compactDate = (value) => (value ? String(value).slice(0, 10) : "-");

// Nombre de jours facturés (borné à 1), aligné sur le backend.
function daysBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = Math.round((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000);
  return Math.max(1, diff);
}

export function Reservations({ go }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [view, setView] = useState("stay"); // "stay" = galerie type Airbnb, "list" = réservations
  const [searchIn, setSearchIn] = useState("");
  const [searchOut, setSearchOut] = useState("");
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null); // fiche bien type Airbnb
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const reservationsApi = useApi(() => api.reservations(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const photosApi = useApi(() => api.propertyPhotos(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  useRealtimeReload(reservationsApi.reload, ["payment"]);

  const loading = reservationsApi.loading || propertiesApi.loading || unitsApi.loading;
  const error = reservationsApi.error || propertiesApi.error || unitsApi.error;

  const reservations = useMemo(() => {
    const raw = reservationsApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [reservationsApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const currency = useMemo(() => normalizeCurrencyModule(currenciesApi.data, settingApi.data), [currenciesApi.data, settingApi.data]);

  // Photos regroupées par bien : cover = photo primaire ou 1re disponible (pattern biens.jsx).
  const photosByProperty = useMemo(() => {
    const grouped = new Map();
    const raw = photosApi.data;
    const list = Array.isArray(raw) ? raw : raw?.propertyPhotos || raw?.data || [];
    list.forEach((photo) => {
      const pid = Number(photo.propertyId);
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid).push({ ...photo, url: api.propertyPhotoUrl(photo.id) });
    });
    return grouped;
  }, [photosApi.data]);
  const coverFor = (propertyId) => {
    const photos = photosByProperty.get(Number(propertyId)) || [];
    return photos.find((p) => p.isPrimary) || photos[0] || null;
  };

  // Bouton « Réserver » depuis un bien : ouvre le formulaire pré-rempli.
  useEffect(() => {
    if (loading) return;
    const prefill = takeReservationPrefill();
    if (prefill) setModal({ ...emptyReservation, propertyId: prefill, currencyId: currency.defaultCurrencyId || "" });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const propertyName = (id) => properties.find((p) => String(p.id) === String(id))?.name || `Bien ${id}`;
  const unitName = (id) => (id ? units.find((u) => String(u.id) === String(id))?.name || `Unité ${id}` : null);
  const resSymbol = (r) => {
    const byId = r?.currencyId != null ? currency.currencyById?.get(Number(r.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations.filter((r) => {
      if (filter === "active" && ["checked_out", "cancelled"].includes(r.status)) return false;
      if (filter === "checked_out" && r.status !== "checked_out") return false;
      if (!q) return true;
      return [r.reference, r.guestName, r.guestPhone, propertyName(r.propertyId), unitName(r.unitId)]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [reservations, query, filter, properties, units]);

  const counts = {
    active: reservations.filter((r) => !["checked_out", "cancelled"].includes(r.status)).length,
    checked_out: reservations.filter((r) => r.status === "checked_out").length,
    all: reservations.length,
  };
  const filterChips = [
    { key: "active", label: "En cours", count: counts.active },
    { key: "checked_out", label: "Soldées", count: counts.checked_out },
    { key: "all", label: "Toutes", count: counts.all },
  ];

  // Logements réservables (galerie type Airbnb) : chaque bien SANS unité = bien
  // entier ; chaque unité = une carte. Prix suggéré = loyer connu (défaut/mensuel).
  const stays = useMemo(() => {
    const propsWithUnit = new Set(units.map((u) => Number(u.propertyId)));
    const fromUnits = units.map((u) => {
      const owner = properties.find((p) => Number(p.id) === Number(u.propertyId)) || {};
      return {
        key: `u-${u.id}`,
        propertyId: Number(u.propertyId),
        unitId: Number(u.id),
        title: u.name || u.code || `Unité ${u.id}`,
        propertyName: owner.name || `Bien ${u.propertyId}`,
        type: u.unitType || owner.propertyType || "Logement",
        city: owner.city || "",
        address: [owner.address, owner.city].filter(Boolean).join(", ") || "Adresse non renseignée",
        beds: Number(u.bedrooms || 0),
        baths: Number(u.bathrooms || 0),
        dailyRate: Number(u.monthlyRent || owner.defaultRent || 0),
        currencyId: u.currencyId || owner.currencyId || currency.defaultCurrencyId || "",
        cover: coverFor(u.propertyId),
        photos: photosByProperty.get(Number(u.propertyId)) || [],
        description: u.description || owner.description || "",
        amenities: u.amenities || "",
      };
    });
    const fromProps = properties
      .filter((p) => !propsWithUnit.has(Number(p.id)))
      .map((p) => ({
        key: `p-${p.id}`,
        propertyId: Number(p.id),
        unitId: null,
        title: p.name || `Bien ${p.id}`,
        propertyName: p.name || `Bien ${p.id}`,
        type: p.propertyType || "Bien entier",
        city: p.city || "",
        address: [p.address, p.city].filter(Boolean).join(", ") || "Adresse non renseignée",
        beds: Number(p.bedrooms || 0),
        baths: Number(p.bathrooms || 0),
        dailyRate: Number(p.defaultRent || 0),
        currencyId: p.currencyId || currency.defaultCurrencyId || "",
        cover: coverFor(p.id),
        photos: photosByProperty.get(Number(p.id)) || [],
        description: p.description || "",
        amenities: p.amenities || "",
      }));
    return [...fromProps, ...fromUnits];
  }, [properties, units, photosByProperty, currency.defaultCurrencyId]);

  // Une réservation active (non annulée/soldée) occupe un logement sur sa plage.
  const activeReservations = useMemo(
    () => reservations.filter((r) => !["cancelled", "checked_out"].includes(r.status)),
    [reservations],
  );
  // Chevauchement [aIn,aOut) ∩ [bIn,bOut). Sans dates de recherche : occupé si une
  // réservation active court aujourd'hui ou dans le futur.
  const isStayAvailable = (stay) => {
    const relevant = activeReservations.filter((r) => {
      if (Number(r.propertyId) !== stay.propertyId) return false;
      // Bien entier occupé => toutes ses unités occupées, et inversement.
      if (stay.unitId == null || r.unitId == null) return true;
      return Number(r.unitId) === stay.unitId;
    });
    if (searchIn && searchOut) {
      const inD = new Date(searchIn), outD = new Date(searchOut);
      return !relevant.some((r) => new Date(r.checkIn) < outD && inD < new Date(r.checkOut));
    }
    const today = new Date(new Date().toISOString().slice(0, 10));
    return !relevant.some((r) => new Date(r.checkOut) > today);
  };

  const availableStays = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stays.filter((s) => {
      if (!isStayAvailable(s)) return false;
      if (!q) return true;
      return [s.title, s.propertyName, s.type, s.city, s.address].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [stays, activeReservations, searchIn, searchOut, query]);

  const searchDaysInvalid = searchIn && searchOut && new Date(searchOut) <= new Date(searchIn);

  // Clic sur une carte => ouvre la fiche détail type Airbnb (photos + réservation).
  const openBooking = (stay) => setDetail(stay);

  const reloadAll = async () => {
    await Promise.all([reservationsApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const runAction = async (id, fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    setActionError("");
    try {
      await fn();
      await reservationsApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reloadAll} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>Réservations</h1>
          <p>Séjours courte durée (type hôtel), facturés au jour</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === "stay" ? "Ville, bien, type..." : "Réf, client, bien..."} />
          </label>
          <button className="immo-btn primary" onClick={() => setModal({ ...emptyReservation, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> Réservation
          </button>
        </div>
      </div>

      <div className="maintenance-toolbar">
        <div className="immo-filter-group">
          <button type="button" className={view === "stay" ? "active" : ""} onClick={() => setView("stay")}>
            Réserver un bien <span>{availableStays.length}</span>
          </button>
          <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            Réservations <span>{counts.all}</span>
          </button>
        </div>
      </div>

      {actionError && <div className="api-error" style={{ marginBottom: 12 }}>{actionError}</div>}

      {view === "stay" ? (
        <>
          <div className="reserve-searchbar">
            <label className="reserve-daterange">
              <span>Arrivée</span>
              <input type="date" value={searchIn} onChange={(e) => setSearchIn(e.target.value)} />
            </label>
            <label className="reserve-daterange">
              <span>Départ</span>
              <input type="date" value={searchOut} onChange={(e) => setSearchOut(e.target.value)} />
            </label>
            {(searchIn || searchOut) && (
              <button className="immo-btn" onClick={() => { setSearchIn(""); setSearchOut(""); }}>Effacer les dates</button>
            )}
            <span className="reserve-search-hint">
              {searchDaysInvalid
                ? "Le départ doit être après l'arrivée."
                : searchIn && searchOut
                  ? `Biens libres du ${searchIn} au ${searchOut}`
                  : "Biens libres actuellement — précisez des dates pour affiner"}
            </span>
          </div>

          <div className="reserve-gallery">
            {availableStays.map((stay) => (
              <StayCard
                key={stay.key}
                stay={stay}
                nights={daysBetween(searchIn, searchOut)}
                symbol={(currency.currencyById?.get(Number(stay.currencyId)) ? cleanCurrencySymbol(currency.currencyById.get(Number(stay.currencyId))) : "") || currency.defaultCurrencySymbol}
                onBook={() => openBooking(stay)}
              />
            ))}
            {availableStays.length === 0 && (
              <div className="card maintenance-empty">Aucun bien disponible pour ce filtre.</div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="maintenance-toolbar">
            <div className="immo-filter-group">
              {filterChips.map((chip) => (
                <button key={chip.key} type="button" className={filter === chip.key ? "active" : ""} onClick={() => setFilter(chip.key)}>
                  {chip.label} <span>{chip.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="maintenance-list">
            {filtered.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                busy={busyId === r.id}
                symbol={resSymbol(r)}
                propertyName={propertyName(r.propertyId)}
                unitName={unitName(r.unitId)}
                onEdit={() => setModal(reservationToForm(r, currency.defaultCurrencyId))}
                onConfirm={() => runAction(r.id, () => api.confirmReservation(r.id))}
                onCheckIn={() => runAction(r.id, () => api.checkInReservation(r.id))}
                onCheckOut={() => setModal({ _checkout: r })}
                onCancel={() => runAction(r.id, () => api.cancelReservation(r.id), `Annuler la réservation ${r.reference} ?`)}
                onDelete={() => runAction(r.id, () => api.deleteReservation(r.id), `Supprimer la réservation ${r.reference} ?`)}
              />
            ))}
            {filtered.length === 0 && <div className="card maintenance-empty">Aucune réservation pour ce filtre.</div>}
          </div>
        </>
      )}

      {detail && (
        <StayDetailModal
          stay={detail}
          currency={currency}
          initialCheckIn={!searchDaysInvalid ? searchIn : ""}
          initialCheckOut={!searchDaysInvalid ? searchOut : ""}
          onClose={() => { setDetail(null); setActionError(""); }}
          onBooked={async () => { setDetail(null); await reloadAll(); }}
          onError={setActionError}
        />
      )}

      {modal && !modal._checkout && (
        <ReservationModal
          value={modal}
          properties={properties}
          units={units}
          currency={currency}
          busy={busyId === "save"}
          onClose={() => { setModal(null); setActionError(""); }}
          onSaved={async () => { setModal(null); await reloadAll(); }}
          onError={setActionError}
        />
      )}

      {modal?._checkout && (
        <CheckOutModal
          reservation={modal._checkout}
          symbol={resSymbol(modal._checkout)}
          onClose={() => { setModal(null); setActionError(""); }}
          onDone={async () => { setModal(null); await reservationsApi.reload(); }}
          onError={setActionError}
        />
      )}
    </>
  );
}

// Carte type Airbnb : photo en grand, détails, prix. Clic => réserver ce bien.
function StayCard({ stay, nights, symbol, onBook }) {
  const total = nights > 0 ? nights * toMoney(stay.dailyRate) : 0;
  return (
    <article className="reserve-card" onClick={onBook} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBook(); } }}>
      <div className="reserve-card-media">
        {stay.cover
          ? <img src={stay.cover.url} alt={stay.title} loading="lazy" />
          : <div className="reserve-card-noimg"><ImageOff size={26} /></div>}
        <span className="reserve-card-badge">Disponible</span>
      </div>
      <div className="reserve-card-body">
        <div className="reserve-card-title">
          <h3>{stay.title}</h3>
          <span className="reserve-card-type">{stay.type}{stay.city ? ` · ${stay.city}` : ""}</span>
        </div>
        <p className="reserve-card-addr"><MapPin size={13} /> {stay.address}</p>
        {stay.unitId != null && <p className="reserve-card-owner"><Home size={13} /> {stay.propertyName}</p>}
        <div className="reserve-card-specs">
          {stay.beds > 0 && <span><BedDouble size={14} /> {stay.beds} ch.</span>}
          {stay.baths > 0 && <span><Bath size={14} /> {stay.baths} sdb</span>}
        </div>
        <div className="reserve-card-price">
          {total > 0
            ? <><b>{money(total, symbol)}</b> <span>au total · {nights} j</span></>
            : <><b>{money(stay.dailyRate, symbol)}</b> <span>/ jour</span></>}
        </div>
      </div>
    </article>
  );
}

function ReservationCard({ reservation: r, busy, symbol, propertyName, unitName, onEdit, onConfirm, onCheckIn, onCheckOut, onCancel, onDelete }) {
  const closed = ["checked_out", "cancelled"].includes(r.status);
  return (
    <article className="ticket-card maintenance-ticket">
      <div className="ticket-head">
        <span className={`chip ${STATUS_CLASS[r.status] || "chip-amber"}`}>{STATUS_LABEL[r.status] || r.status}</span>
        <span className="chip chip-ink"><BedDouble size={11} /> {r.reference}</span>
      </div>
      <h3>{r.guestName}</h3>
      <p>{propertyName}{unitName ? ` — ${unitName}` : " (bien entier)"}</p>
      <div className="ticket-meta">
        <span><CalendarDays size={14} /> {compactDate(r.checkIn)} → {compactDate(r.checkOut)}</span>
        <span><CalendarCheck size={14} /> {r.days} j × {money(r.dailyRate, symbol)}</span>
        <span title="Total du séjour"><b>{money(r.totalAmount, symbol)}</b></span>
        {r.guestPhone && <span><User size={14} /> {r.guestPhone}</span>}
      </div>
      {!closed && (
        <div className="immo-header-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {r.status === "pending" && <button className="immo-btn" disabled={busy} onClick={onConfirm}><CheckCircle2 size={15} /> Confirmer</button>}
          {["pending", "confirmed"].includes(r.status) && <button className="immo-btn" disabled={busy} onClick={onCheckIn}><LogIn size={15} /> Arrivée</button>}
          <button className="immo-btn primary" disabled={busy} onClick={onCheckOut}><LogOut size={15} /> Check-out</button>
          <button className="immo-btn" disabled={busy} onClick={onEdit}>Modifier</button>
          <button className="immo-btn" disabled={busy} onClick={onCancel}><XCircle size={15} /> Annuler</button>
          <button className="immo-btn" disabled={busy} onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      )}
    </article>
  );
}

function reservationToForm(r, defaultCurrencyId) {
  return {
    id: r.id,
    propertyId: r.propertyId ? String(r.propertyId) : "",
    unitId: r.unitId ? String(r.unitId) : "",
    guestName: r.guestName || "",
    guestPhone: r.guestPhone || "",
    guestEmail: r.guestEmail || "",
    checkIn: compactDate(r.checkIn) === "-" ? "" : compactDate(r.checkIn),
    checkOut: compactDate(r.checkOut) === "-" ? "" : compactDate(r.checkOut),
    dailyRate: r.dailyRate ?? "",
    depositAmount: r.depositAmount ?? "",
    currencyId: r.currencyId || defaultCurrencyId || "",
    notes: r.notes || "",
  };
}

// Fiche détail type Airbnb : galerie photos + specs à gauche, panneau
// réservation (dates, tarif, client) à droite. Le bien/unité sont verrouillés.
function StayDetailModal({ stay, currency, initialCheckIn, initialCheckOut, onClose, onBooked, onError }) {
  const photos = Array.isArray(stay.photos) && stay.photos.length ? stay.photos : (stay.cover ? [stay.cover] : []);
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({
    guestName: "", guestPhone: "", guestEmail: "",
    checkIn: initialCheckIn || "", checkOut: initialCheckOut || "",
    dailyRate: stay.dailyRate || "", depositAmount: "",
    currencyId: stay.currencyId || currency.defaultCurrencyId || "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));

  const symbol = (() => {
    const byId = form.currencyId ? currency.currencyById?.get(Number(form.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  })();
  const days = daysBetween(form.checkIn, form.checkOut);
  const total = days * toMoney(form.dailyRate);
  const datesInvalid = form.checkIn && form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn);
  const canBook = form.guestName.trim() && form.checkIn && form.checkOut && !datesInvalid;

  const book = async () => {
    setBusy(true);
    onError("");
    try {
      const payload = {
        propertyId: Number(stay.propertyId),
        unitId: stay.unitId != null ? Number(stay.unitId) : null,
        guestName: form.guestName.trim(),
        guestPhone: form.guestPhone.trim() || null,
        guestEmail: form.guestEmail.trim() || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        dailyRate: toMoney(form.dailyRate),
        depositAmount: toMoney(form.depositAmount),
        currencyId: toId(form.currencyId) ?? null,
        notes: form.notes.trim() || null,
      };
      if (!canBook) throw new Error("Client et dates valides obligatoires.");
      await api.createReservation(payload);
      await onBooked();
    } catch (err) {
      onError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={stay.title} subtitle={`${stay.type}${stay.city ? ` · ${stay.city}` : ""}`} icon={<BedDouble size={20} />} className="stay-detail-modal" onClose={onClose}>
      <div className="stay-detail">
        <div className="stay-detail-left">
          <div className="stay-gallery">
            <div className="stay-gallery-main">
              {photos[active]
                ? <img src={photos[active].url} alt={stay.title} />
                : <div className="stay-gallery-noimg"><ImageOff size={30} /> Pas de photo</div>}
            </div>
            {photos.length > 1 && (
              <div className="stay-gallery-thumbs">
                {photos.map((p, i) => (
                  <button key={p.id || i} className={i === active ? "active" : ""} onClick={() => setActive(i)}>
                    <img src={p.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="stay-detail-addr"><MapPin size={14} /> {stay.address}</p>
          {stay.unitId != null && <p className="stay-detail-owner"><Home size={14} /> {stay.propertyName}</p>}
          <div className="stay-detail-specs">
            {stay.beds > 0 && <span><BedDouble size={16} /> {stay.beds} chambre{stay.beds > 1 ? "s" : ""}</span>}
            {stay.baths > 0 && <span><Bath size={16} /> {stay.baths} salle{stay.baths > 1 ? "s" : ""} de bain</span>}
          </div>
          {stay.description && <p className="stay-detail-desc">{stay.description}</p>}
          {stay.amenities && <p className="stay-detail-desc"><b>Équipements :</b> {stay.amenities}</p>}
        </div>

        <aside className="stay-booking">
          <div className="stay-booking-price">
            <b>{money(stay.dailyRate, symbol)}</b> <span>/ jour</span>
          </div>
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Arrivée" type="date" value={form.checkIn} required onChange={(checkIn) => set({ checkIn })} />
            <DomusPropertyField label="Départ" type="date" value={form.checkOut} required onChange={(checkOut) => set({ checkOut })} />
          </div>
          {datesInvalid && <div className="api-error" style={{ marginTop: 6 }}>Le départ doit être après l'arrivée.</div>}
          {!datesInvalid && days > 0 && (
            <div className="stay-booking-total">
              <span>{money(stay.dailyRate, symbol)} × {days} j</span>
              <b>{money(total, symbol)}</b>
            </div>
          )}
          <div className="stay-booking-guest">
            <DomusPropertyField label="Nom du client" value={form.guestName} required onChange={(guestName) => set({ guestName })} placeholder="ex. Jean Kabila" />
            <DomusPhoneField label="Téléphone" value={form.guestPhone} onChange={(guestPhone) => set({ guestPhone })} />
            <DomusPropertyField label="Email" type="email" value={form.guestEmail} onChange={(guestEmail) => set({ guestEmail })} />
            <MoneyField label="Tarif par jour" value={form.dailyRate} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(dailyRate) => set({ dailyRate })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <MoneyField label="Caution (info)" value={form.depositAmount} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(depositAmount) => set({ depositAmount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
          </div>
          <button className="immo-btn primary stay-booking-cta" disabled={busy || !canBook} onClick={book}>
            {busy ? "Réservation…" : "Réserver"}
          </button>
          <p className="stay-booking-note">Vous ne payez pas la réservation tout de suite — encaissement au check-out.</p>
        </aside>
      </div>
    </Modal>
  );
}

function ReservationModal({ value, properties, units, currency, onClose, onSaved, onError }) {
  const [form, setForm] = useState({ ...value });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const propertyUnits = units.filter((u) => !form.propertyId || String(u.propertyId) === String(form.propertyId));
  const symbol = (() => {
    const byId = form.currencyId ? currency.currencyById?.get(Number(form.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  })();
  const days = daysBetween(form.checkIn, form.checkOut);
  const total = days * toMoney(form.dailyRate);
  const datesInvalid = form.checkIn && form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn);

  const save = async () => {
    setBusy(true);
    onError("");
    try {
      const payload = {
        propertyId: toId(form.propertyId),
        unitId: toId(form.unitId) ?? null,
        guestName: form.guestName?.trim(),
        guestPhone: form.guestPhone?.trim() || null,
        guestEmail: form.guestEmail?.trim() || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        dailyRate: toMoney(form.dailyRate),
        depositAmount: toMoney(form.depositAmount),
        currencyId: toId(form.currencyId) ?? null,
        notes: form.notes?.trim() || null,
      };
      if (!payload.propertyId || !payload.guestName || !payload.checkIn || !payload.checkOut) {
        throw new Error("Bien, client et dates obligatoires.");
      }
      if (form.id) await api.updateReservation(form.id, payload);
      else await api.createReservation(payload);
      await onSaved();
    } catch (err) {
      onError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={form.id ? "Modifier la réservation" : "Réservation rapide"} subtitle="Séjour courte durée, tarif par jour" icon={<BedDouble size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<DoorOpen size={14} />} title="Bien & séjour">
          <div className="domus-property-form-grid">
            <DomusPropertySelect label="Bien" value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label="Unité (option — sinon bien entier)" value={form.unitId} onChange={(unitId) => set({ unitId })} options={[["", "— Bien entier —"], ...propertyUnits.map((u) => [String(u.id), u.name])]} />
            <DomusPropertyField label="Arrivée (check-in)" type="date" value={form.checkIn} required onChange={(checkIn) => set({ checkIn })} />
            <DomusPropertyField label="Départ (check-out)" type="date" value={form.checkOut} required onChange={(checkOut) => set({ checkOut })} />
            <MoneyField label="Tarif par jour" value={form.dailyRate} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(dailyRate) => set({ dailyRate })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <MoneyField label="Caution (info)" value={form.depositAmount} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(depositAmount) => set({ depositAmount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
          </div>
          {datesInvalid && <div className="api-error" style={{ marginTop: 8 }}>La date de départ doit être postérieure à l'arrivée.</div>}
          {!datesInvalid && days > 0 && (
            <div className="ops-score" style={{ marginTop: 8 }}>
              <span>{days} jour{days > 1 ? "s" : ""} × {money(form.dailyRate || 0, symbol)}</span>
              <b>{money(total, symbol)}</b>
            </div>
          )}
        </FormSection>
        <FormSection icon={<User size={14} />} title="Client">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Nom du client" value={form.guestName} required onChange={(guestName) => set({ guestName })} placeholder="ex. Jean Kabila" />
            <DomusPhoneField label="Téléphone" value={form.guestPhone} onChange={(guestPhone) => set({ guestPhone })} />
            <DomusPropertyField label="Email" type="email" value={form.guestEmail} onChange={(guestEmail) => set({ guestEmail })} />
          </div>
          <DomusPropertyField label="Notes" value={form.notes} onChange={(notes) => set({ notes })} textarea />
        </FormSection>
      </div>
      <ModalActions busy={busy} disabled={!form.propertyId || !form.guestName || !form.checkIn || !form.checkOut || datesInvalid} onClose={onClose} onSave={save} />
    </Modal>
  );
}

function CheckOutModal({ reservation: r, symbol, onClose, onDone, onError }) {
  const [form, setForm] = useState({ paymentDate: new Date().toISOString().slice(0, 10), method: "cash", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));

  const submit = async () => {
    setBusy(true);
    onError("");
    try {
      await api.checkOutReservation(r.id, {
        paymentDate: form.paymentDate || undefined,
        method: form.method || "cash",
        notes: form.notes?.trim() || null,
      });
      await onDone();
    } catch (err) {
      onError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Check-out — ${r.reference}`} subtitle={`${r.guestName} · recette enregistrée en comptabilité`} icon={<LogOut size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<CalendarCheck size={14} />} title="Encaissement du séjour">
          <div className="ops-score" style={{ marginBottom: 10 }}>
            <span>{r.days} jour{r.days > 1 ? "s" : ""} × {money(r.dailyRate, symbol)}</span>
            <b>{money(r.totalAmount, symbol)}</b>
          </div>
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Date d'encaissement" type="date" value={form.paymentDate} onChange={(paymentDate) => set({ paymentDate })} />
            <DomusPropertySelect label="Moyen de paiement" value={form.method} onChange={(method) => set({ method })} options={[["cash", "Cash (Caisse)"], ["bank", "Banque"], ["card", "Carte"], ["cheque", "Chèque"]]} />
          </div>
          <DomusPropertyField label="Notes" value={form.notes} onChange={(notes) => set({ notes })} textarea />
        </FormSection>
      </div>
      <ModalActions busy={busy} disabled={false} onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions, onAmountChange, onCurrencyChange }) {
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <div className="domus-money-input">
        <input type="number" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.symbol || option.label}</option>)}
        </select>
      </div>
    </label>
  );
}
