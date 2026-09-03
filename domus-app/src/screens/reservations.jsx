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
  Percent,
  Plus,
  Search,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { takeReservationPrefill } from "./reservationPrefill.js";

// Réservation temporaire type hôtel : un client occupe un bien entier OU une
// unité sur une plage de dates, au tarif par jour. Recette au check-out.

const STATUS_LABEL = {
  pending: t("En attente"),
  confirmed: t("Confirmée"),
  checked_in: t("Arrivée"),
  checked_out: t("Départ (soldée)"),
  cancelled: t("Annulée"),
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
  couponCode: "",
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
function roundMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function dailyRateFromMonthly(value) {
  return roundMoney(toMoney(value) / 30);
}
function couponDiscount(coupon, gross) {
  if (!coupon) return 0;
  const value = toMoney(coupon.discountValue);
  const raw = coupon.discountType === "percentage" ? (toMoney(gross) * value) / 100 : value;
  return Math.min(toMoney(gross), Math.max(0, roundMoney(raw)));
}
function reservationRateDefaults(properties, units, propertyId, unitId, defaultCurrencyId) {
  const property = properties.find((p) => String(p.id) === String(propertyId)) || {};
  const unit = unitId ? units.find((u) => String(u.id) === String(unitId)) : null;
  const monthly = unit ? (unit.monthlyRent || property.defaultRent || 0) : (property.defaultRent || 0);
  return {
    dailyRate: dailyRateFromMonthly(monthly),
    currencyId: unit?.currencyId || property.currencyId || defaultCurrencyId || "",
  };
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
  const [couponModal, setCouponModal] = useState(null);
  const [detail, setDetail] = useState(null); // fiche bien type Airbnb
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const confirm = useConfirm();
  const reservationsApi = useApi(() => api.reservations(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const photosApi = useApi(() => api.propertyPhotos(), []);
  const couponsApi = useApi(() => api.coupons(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  useRealtimeReload(reservationsApi.reload, ["payment"]);

  const loading = reservationsApi.loading || propertiesApi.loading || unitsApi.loading || couponsApi.loading;
  const error = reservationsApi.error || propertiesApi.error || unitsApi.error || couponsApi.error;

  const reservations = useMemo(() => {
    const raw = reservationsApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [reservationsApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const coupons = useMemo(() => (Array.isArray(couponsApi.data) ? couponsApi.data : couponsApi.data?.data || []), [couponsApi.data]);
  const couponsById = useMemo(() => new Map(coupons.map((c) => [Number(c.id), c])), [coupons]);
  const currency = useMemo(() => normalizeCurrencyModule(currenciesApi.data, settingApi.data), [currenciesApi.data, settingApi.data]);

  // Photos regroupées par bien : cover = photo primaire ou 1re disponible (pattern biens.jsx).
  const photosByProperty = useMemo(() => {
    const grouped = new Map();
    const raw = photosApi.data;
    const list = Array.isArray(raw) ? raw : raw?.propertyPhotos || raw?.data || [];
    list.forEach((photo) => {
      if (photo.unitId != null) return;
      const pid = Number(photo.propertyId);
      if (!grouped.has(pid)) grouped.set(pid, []);
      grouped.get(pid).push({ ...photo, url: api.propertyPhotoUrl(photo.id) });
    });
    return grouped;
  }, [photosApi.data]);
  const photosByUnit = useMemo(() => {
    const grouped = new Map();
    const raw = photosApi.data;
    const list = Array.isArray(raw) ? raw : raw?.propertyPhotos || raw?.data || [];
    list.forEach((photo) => {
      if (photo.unitId == null) return;
      const unitId = Number(photo.unitId);
      if (!grouped.has(unitId)) grouped.set(unitId, []);
      grouped.get(unitId).push({ ...photo, url: api.propertyPhotoUrl(photo.id) });
    });
    return grouped;
  }, [photosApi.data]);
  const coverFor = (photos) => {
    return photos.find((p) => p.isPrimary) || photos[0] || null;
  };

  // Bouton « Réserver » depuis un bien : ouvre le formulaire pré-rempli.
  useEffect(() => {
    if (loading) return;
    const prefill = takeReservationPrefill();
    if (prefill) {
      setModal({
        ...emptyReservation,
        propertyId: prefill,
        ...reservationRateDefaults(properties, units, prefill, "", currency.defaultCurrencyId),
      });
    }
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
    coupons: coupons.length,
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
      const photos = photosByUnit.get(Number(u.id)) || [];
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
        dailyRate: dailyRateFromMonthly(u.monthlyRent || owner.defaultRent || 0),
        currencyId: u.currencyId || owner.currencyId || currency.defaultCurrencyId || "",
        cover: coverFor(photos),
        photos,
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
        dailyRate: dailyRateFromMonthly(p.defaultRent || 0),
        currencyId: p.currencyId || currency.defaultCurrencyId || "",
        cover: coverFor(photosByProperty.get(Number(p.id)) || []),
        photos: photosByProperty.get(Number(p.id)) || [],
        description: p.description || "",
        amenities: p.amenities || "",
      }));
    return [...fromProps, ...fromUnits];
  }, [properties, units, photosByProperty, photosByUnit, currency.defaultCurrencyId]);

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
    await Promise.all([reservationsApi.reload(), propertiesApi.reload(), unitsApi.reload(), couponsApi.reload()]);
  };

  const runAction = async (id, fn, confirmMsg) => {
    if (confirmMsg && !(await confirm({ message: confirmMsg }))) return;
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

  const runCouponAction = async (id, fn, confirmMsg) => {
    if (confirmMsg && !(await confirm({ message: confirmMsg }))) return;
    setBusyId(id);
    setActionError("");
    try {
      await fn();
      await couponsApi.reload();
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
          <h1>{t("Réservations")}</h1>
          <p>Séjours courte durée (type hôtel), facturés au jour</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === "stay" ? t("Ville, bien, type...") : t("Réf, client, bien...")} />
          </label>
          <button className="immo-btn primary" onClick={() => setModal({ ...emptyReservation, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> Réservation
          </button>
          <button className="immo-btn" onClick={() => setCouponModal({})}>
            <Percent size={16} /> Coupon
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
          <button type="button" className={view === "coupons" ? "active" : ""} onClick={() => setView("coupons")}>
            Coupons <span>{counts.coupons}</span>
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
      ) : view === "coupons" ? (
        <CouponList
          coupons={coupons}
          currency={currency}
          busyId={busyId}
          onCreate={() => setCouponModal({})}
          onEdit={(coupon) => setCouponModal(coupon)}
          onDelete={(coupon) => runCouponAction(`coupon-${coupon.id}`, () => api.deleteCoupon(coupon.id), `Désactiver le coupon ${coupon.code} ?`)}
        />
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
                onEdit={() => setModal(reservationToForm(r, currency.defaultCurrencyId, couponsById.get(Number(r.couponId))?.code))}
                onConfirm={() => runAction(r.id, () => api.confirmReservation(r.id))}
                onCheckIn={() => runAction(r.id, () => api.checkInReservation(r.id))}
                onPay={() => setModal({ _pay: r })}
                onCheckOut={() => (r.paidAt ? runAction(r.id, () => api.checkOutReservation(r.id, {})) : setModal({ _checkout: r }))}
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

      {modal && !modal._checkout && !modal._pay && (
        <ReservationModal
          value={modal}
          properties={properties}
          units={units}
          couponsById={couponsById}
          currency={currency}
          busy={busyId === "save"}
          onClose={() => { setModal(null); setActionError(""); }}
          onSaved={async () => { setModal(null); await reloadAll(); }}
          onError={setActionError}
        />
      )}

      {couponModal && (
        <CouponModal
          value={couponModal}
          currency={currency}
          busy={busyId === "coupon-save"}
          onClose={() => { setCouponModal(null); setActionError(""); }}
          onSaved={async () => { setCouponModal(null); await couponsApi.reload(); }}
          onError={setActionError}
        />
      )}

      {modal?._pay && (
        <PayModal
          reservation={modal._pay}
          symbol={resSymbol(modal._pay)}
          onClose={() => { setModal(null); setActionError(""); }}
          onDone={async () => { setModal(null); await reservationsApi.reload(); }}
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

function ReservationCard({ reservation: r, busy, symbol, propertyName, unitName, onEdit, onConfirm, onCheckIn, onPay, onCheckOut, onCancel, onDelete }) {
  const closed = ["checked_out", "cancelled"].includes(r.status);
  return (
    <article className="ticket-card maintenance-ticket">
      <div className="ticket-head">
        <span className={`chip ${STATUS_CLASS[r.status] || "chip-amber"}`}>{STATUS_LABEL[r.status] || r.status}</span>
        {r.paidAt && <span className="chip chip-green"><Wallet size={11} /> Payé</span>}
        <span className="chip chip-ink"><BedDouble size={11} /> {r.reference}</span>
      </div>
      <h3>{r.guestName}</h3>
      <p>{propertyName}{unitName ? ` — ${unitName}` : " (bien entier)"}</p>
      <div className="ticket-meta">
        <span><CalendarDays size={14} /> {compactDate(r.checkIn)} → {compactDate(r.checkOut)}</span>
        <span><CalendarCheck size={14} /> {r.days} j × {money(r.dailyRate, symbol)}</span>
        {toMoney(r.discountAmount) > 0 && <span><Percent size={14} /> Remise {money(r.discountAmount, symbol)}</span>}
        <span title={t("Total du séjour")}><b>{money(r.totalAmount, symbol)}</b></span>
        {r.guestPhone && <span><User size={14} /> {r.guestPhone}</span>}
      </div>
      {!closed && (
        <div className="immo-header-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {r.status === "pending" && <button className="immo-btn" disabled={busy} onClick={onConfirm}><CheckCircle2 size={15} /> Confirmer</button>}
          {["pending", "confirmed"].includes(r.status) && <button className="immo-btn" disabled={busy} onClick={onCheckIn}><LogIn size={15} /> Arrivée</button>}
          {!r.paidAt && <button className="immo-btn" disabled={busy} onClick={onPay}><Wallet size={15} /> Payer</button>}
          <button className="immo-btn primary" disabled={busy} onClick={onCheckOut}><LogOut size={15} /> Check-out</button>
          <button className="immo-btn" disabled={busy} onClick={onEdit}>Modifier</button>
          <button className="immo-btn" disabled={busy} onClick={onCancel}><XCircle size={15} /> Annuler</button>
          <button className="immo-btn" disabled={busy} onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      )}
    </article>
  );
}

function reservationToForm(r, defaultCurrencyId, couponCode = "") {
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
    couponId: r.couponId ?? null,
    couponCode,
    discountAmount: r.discountAmount ?? 0,
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
    currencyId: stay.currencyId || currency.defaultCurrencyId || "", couponCode: "", notes: "",
  });
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch) => {
    const couponChanged = Object.prototype.hasOwnProperty.call(patch, "couponCode") && patch.couponCode !== form.couponCode;
    const currencyChanged = Object.prototype.hasOwnProperty.call(patch, "currencyId") && patch.currencyId !== form.currencyId;
    if (couponChanged || currencyChanged) {
      setCouponPreview(null);
      setCouponError("");
    }
    setForm((c) => ({ ...c, ...patch }));
  };

  const symbol = (() => {
    const byId = form.currencyId ? currency.currencyById?.get(Number(form.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  })();
  const days = daysBetween(form.checkIn, form.checkOut);
  const gross = roundMoney(days * toMoney(form.dailyRate));
  const discount = couponDiscount(couponPreview, gross);
  const total = Math.max(0, roundMoney(gross - discount));
  const datesInvalid = form.checkIn && form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn);
  const canBook = form.guestName.trim() && form.checkIn && form.checkOut && !datesInvalid;

  const applyCoupon = async () => {
    const code = form.couponCode.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const preview = await api.validateCoupon({ code, amount: gross, currencyId: form.currencyId });
      setCouponPreview(preview);
      setForm((c) => ({ ...c, couponCode: preview.code || code.toUpperCase() }));
    } catch (err) {
      setCouponPreview(null);
      setCouponError(err.message || String(err));
    } finally {
      setCouponBusy(false);
    }
  };

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
        couponCode: form.couponCode.trim() || null,
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
            <DomusPropertyField label={t("Arrivée")} type="date" value={form.checkIn} required onChange={(checkIn) => set({ checkIn })} />
            <DomusPropertyField label={t("Départ")} type="date" value={form.checkOut} required onChange={(checkOut) => set({ checkOut })} />
          </div>
          {datesInvalid && <div className="api-error" style={{ marginTop: 6 }}>Le départ doit être après l'arrivée.</div>}
          {!datesInvalid && days > 0 && <BookingTotal gross={gross} discount={discount} total={total} days={days} dailyRate={form.dailyRate} symbol={symbol} />}
          <div className="stay-booking-guest">
            <DomusPropertyField label={t("Nom du client")} value={form.guestName} required onChange={(guestName) => set({ guestName })} placeholder={t("ex. Jean Kabila")} />
            <DomusPhoneField label={t("Téléphone")} value={form.guestPhone} onChange={(guestPhone) => set({ guestPhone })} />
            <DomusPropertyField label={t("Email")} type="email" value={form.guestEmail} onChange={(guestEmail) => set({ guestEmail })} />
            <MoneyField label={t("Tarif par jour")} value={form.dailyRate} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(dailyRate) => set({ dailyRate })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <CouponField
              value={form.couponCode}
              preview={couponPreview}
              error={couponError}
              busy={couponBusy}
              discount={discount}
              total={total}
              symbol={symbol}
              onChange={(couponCode) => set({ couponCode })}
              onApply={applyCoupon}
              onClear={() => { set({ couponCode: "" }); setCouponPreview(null); setCouponError(""); }}
              disabled={gross <= 0}
            />
            <MoneyField label={t("Caution (info)")} value={form.depositAmount} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(depositAmount) => set({ depositAmount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
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

function ReservationModal({ value, properties, units, couponsById, currency, onClose, onSaved, onError }) {
  const [form, setForm] = useState({ ...value });
  const initialCouponCode = value.couponCode || "";
  const initialCoupon = value.couponId ? couponsById.get(Number(value.couponId)) : null;
  const [couponPreview, setCouponPreview] = useState(initialCoupon || null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch) => {
    const couponChanged = Object.prototype.hasOwnProperty.call(patch, "couponCode") && patch.couponCode !== form.couponCode;
    const currencyChanged = Object.prototype.hasOwnProperty.call(patch, "currencyId") && patch.currencyId !== form.currencyId;
    if (couponChanged || currencyChanged) {
      setCouponPreview(null);
      setCouponError("");
    }
    setForm((c) => ({ ...c, ...patch }));
  };
  const propertyUnits = units.filter((u) => !form.propertyId || String(u.propertyId) === String(form.propertyId));
  const symbol = (() => {
    const byId = form.currencyId ? currency.currencyById?.get(Number(form.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  })();
  const days = daysBetween(form.checkIn, form.checkOut);
  const gross = roundMoney(days * toMoney(form.dailyRate));
  const discount = couponDiscount(couponPreview, gross);
  const total = Math.max(0, roundMoney(gross - discount));
  const datesInvalid = form.checkIn && form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn);

  const applyCoupon = async () => {
    const code = form.couponCode?.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const preview = await api.validateCoupon({ code, amount: gross, currencyId: form.currencyId });
      setCouponPreview(preview);
      setForm((c) => ({ ...c, couponCode: preview.code || code.toUpperCase() }));
    } catch (err) {
      setCouponPreview(null);
      setCouponError(err.message || String(err));
    } finally {
      setCouponBusy(false);
    }
  };

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
      const normalizedCouponCode = form.couponCode?.trim() || "";
      if (!form.id || normalizedCouponCode !== initialCouponCode || normalizedCouponCode) {
        payload.couponCode = normalizedCouponCode || null;
      }
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
    <Modal title={form.id ? t("Modifier la réservation") : t("Réservation rapide")} subtitle={t("Séjour courte durée, tarif par jour")} icon={<BedDouble size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<DoorOpen size={14} />} title={t("Bien & séjour")}>
          <div className="domus-property-form-grid">
            <DomusPropertySelect
              label={t("Bien")}
              value={form.propertyId}
              required
              onChange={(propertyId) => set({ propertyId, unitId: "", ...reservationRateDefaults(properties, units, propertyId, "", currency.defaultCurrencyId) })}
              options={properties.map((p) => [String(p.id), p.name])}
            />
            <DomusPropertySelect
              label={t("Unité (option — sinon bien entier)")}
              value={form.unitId}
              onChange={(unitId) => set({ unitId, ...reservationRateDefaults(properties, units, form.propertyId, unitId, currency.defaultCurrencyId) })}
              options={[["", "— Bien entier —"], ...propertyUnits.map((u) => [String(u.id), u.name])]}
            />
            <DomusPropertyField label={t("Arrivée (check-in)")} type="date" value={form.checkIn} required onChange={(checkIn) => set({ checkIn })} />
            <DomusPropertyField label={t("Départ (check-out)")} type="date" value={form.checkOut} required onChange={(checkOut) => set({ checkOut })} />
            <MoneyField label={t("Tarif par jour")} value={form.dailyRate} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(dailyRate) => set({ dailyRate })} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <MoneyField label={t("Caution (info)")} value={form.depositAmount} currencyId={form.currencyId} currencyOptions={currency.currencyOptions} onAmountChange={(depositAmount) => set({ depositAmount })} onCurrencyChange={(currencyId) => set({ currencyId })} />
          </div>
          {datesInvalid && <div className="api-error" style={{ marginTop: 8 }}>La date de départ doit être postérieure à l'arrivée.</div>}
          <CouponField
            value={form.couponCode}
            preview={couponPreview}
            error={couponError}
            busy={couponBusy}
            discount={discount}
            total={total}
            symbol={symbol}
            onChange={(couponCode) => set({ couponCode })}
            onApply={applyCoupon}
            onClear={() => { set({ couponCode: "" }); setCouponPreview(null); setCouponError(""); }}
            disabled={gross <= 0}
          />
          {!datesInvalid && days > 0 && <BookingTotal gross={gross} discount={discount} total={total} days={days} dailyRate={form.dailyRate} symbol={symbol} />}
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

function BookingTotal({ gross, discount, total, days, dailyRate, symbol }) {
  return (
    <div className="reserve-total">
      <div><span>{days} jour{days > 1 ? "s" : ""} × {money(dailyRate || 0, symbol)}</span><b>{money(gross, symbol)}</b></div>
      {discount > 0 && <div><span>Remise coupon</span><b>-{money(discount, symbol)}</b></div>}
      <div className="net"><span>Total net</span><b>{money(total, symbol)}</b></div>
    </div>
  );
}

function CouponField({ value, preview, error, busy, discount, total, symbol, onChange, onApply, onClear, disabled }) {
  return (
    <div className="reserve-coupon">
      <label className="domus-property-field">
        <span>Code coupon</span>
        <div className="reserve-coupon-input">
          <input value={value || ""} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder="ETE2026" />
          <button type="button" className="immo-btn" disabled={busy || disabled || !value?.trim()} onClick={onApply}>
            {busy ? "..." : "Appliquer"}
          </button>
          {(value || preview) && <button type="button" className="immo-btn" onClick={onClear}>Effacer</button>}
        </div>
      </label>
      {error && <div className="api-error reserve-coupon-error">{error}</div>}
      {preview && !error && (
        <div className="reserve-coupon-preview">
          <span>{preview.code} appliqué</span>
          <b>-{money(discount, symbol)} · net {money(total, symbol)}</b>
        </div>
      )}
    </div>
  );
}

function CouponList({ coupons, currency, busyId, onCreate, onEdit, onDelete }) {
  const symbolFor = (coupon) => {
    const byId = coupon.currencyId != null ? currency.currencyById?.get(Number(coupon.currencyId)) : null;
    return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol;
  };
  return (
    <div className="coupon-panel">
      <div className="maintenance-toolbar">
        <div>
          <h2>Coupons</h2>
          <p>Codes réutilisables pour les réservations courte durée.</p>
        </div>
        <button className="immo-btn primary" onClick={onCreate}><Plus size={16} /> Nouveau coupon</button>
      </div>
      <div className="coupon-grid">
        {coupons.map((coupon) => {
          const usage = coupon.maxUses ? `${coupon.usedCount || 0}/${coupon.maxUses}` : `${coupon.usedCount || 0}`;
          const value = coupon.discountType === "percentage"
            ? `${toMoney(coupon.discountValue)} %`
            : money(coupon.discountValue, symbolFor(coupon));
          return (
            <article className="ticket-card coupon-card" key={coupon.id}>
              <div className="ticket-head">
                <span className="chip chip-brand"><Percent size={11} /> {coupon.code}</span>
                <span className="chip chip-green">Actif</span>
              </div>
              <h3>{value}</h3>
              {coupon.description && <p>{coupon.description}</p>}
              <div className="ticket-meta">
                <span>Validité {compactDate(coupon.validFrom)} → {compactDate(coupon.validTo)}</span>
                <span>Usages {usage}</span>
              </div>
              <div className="immo-header-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
                <button className="immo-btn" disabled={busyId === `coupon-${coupon.id}`} onClick={() => onEdit(coupon)}>Modifier</button>
                <button className="immo-btn" disabled={busyId === `coupon-${coupon.id}`} onClick={() => onDelete(coupon)}><Trash2 size={15} /> Désactiver</button>
              </div>
            </article>
          );
        })}
        {coupons.length === 0 && <div className="card maintenance-empty">Aucun coupon actif.</div>}
      </div>
    </div>
  );
}

function CouponModal({ value, currency, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    id: value.id,
    code: value.code || "",
    description: value.description || "",
    discountType: value.discountType || "percentage",
    discountValue: value.discountValue ?? "",
    currencyId: value.currencyId || currency.defaultCurrencyId || "",
    validFrom: compactDate(value.validFrom) === "-" ? "" : compactDate(value.validFrom),
    validTo: compactDate(value.validTo) === "-" ? "" : compactDate(value.validTo),
    maxUses: value.maxUses ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const fixed = form.discountType === "fixed";

  const save = async () => {
    setBusy(true);
    onError("");
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: toMoney(form.discountValue),
        currencyId: fixed ? (toId(form.currencyId) ?? null) : null,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        maxUses: form.maxUses === "" ? null : Number(form.maxUses),
        isActive: true,
      };
      if (!payload.code || payload.discountValue <= 0) throw new Error("Code et valeur de remise obligatoires.");
      if (form.id) await api.updateCoupon(form.id, payload);
      else await api.createCoupon(payload);
      await onSaved();
    } catch (err) {
      onError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={form.id ? "Modifier le coupon" : "Nouveau coupon"} subtitle="Réduction appliquée aux réservations" icon={<Percent size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<Percent size={14} />} title="Coupon">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Code" value={form.code} required onChange={(code) => set({ code: code.toUpperCase() })} placeholder="ETE2026" />
            <DomusPropertySelect label="Type" value={form.discountType} onChange={(discountType) => set({ discountType })} options={[["percentage", "Pourcentage"], ["fixed", "Montant fixe"]]} />
            <MoneyField
              label={fixed ? "Montant de remise" : "Pourcentage"}
              value={form.discountValue}
              currencyId={fixed ? form.currencyId : ""}
              currencyOptions={fixed ? currency.currencyOptions : [{ value: "", symbol: "%" }]}
              onAmountChange={(discountValue) => set({ discountValue })}
              onCurrencyChange={(currencyId) => set({ currencyId })}
            />
            <DomusPropertyField label="Quota d'usages" type="number" value={form.maxUses} onChange={(maxUses) => set({ maxUses })} placeholder="Illimité" />
            <DomusPropertyField label="Valide à partir du" type="date" value={form.validFrom} onChange={(validFrom) => set({ validFrom })} />
            <DomusPropertyField label="Valide jusqu'au" type="date" value={form.validTo} onChange={(validTo) => set({ validTo })} />
          </div>
          <DomusPropertyField label="Description" value={form.description} onChange={(description) => set({ description })} textarea />
        </FormSection>
      </div>
      <ModalActions busy={busy} disabled={!form.code.trim() || toMoney(form.discountValue) <= 0} onClose={onClose} onSave={save} />
    </Modal>
  );
}

function PayModal({ reservation: r, symbol, onClose, onDone, onError }) {
  const [form, setForm] = useState({ paymentDate: new Date().toISOString().slice(0, 10), method: "cash", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));

  const submit = async () => {
    setBusy(true);
    onError("");
    try {
      await api.payReservation(r.id, {
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
    <Modal title={`Payer — ${r.reference}`} subtitle={`${r.guestName} · recette enregistrée en comptabilité (avant le check-out)`} icon={<Wallet size={20} />} className="domus-property-modal" onClose={onClose}>
      <div className="domus-property-form">
        <FormSection icon={<CalendarCheck size={14} />} title="Encaissement du séjour">
          <BookingTotal
            gross={roundMoney(toMoney(r.days) * toMoney(r.dailyRate))}
            discount={toMoney(r.discountAmount)}
            total={toMoney(r.totalAmount)}
            days={toMoney(r.days)}
            dailyRate={r.dailyRate}
            symbol={symbol}
          />
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
          <BookingTotal
            gross={roundMoney(toMoney(r.days) * toMoney(r.dailyRate))}
            discount={toMoney(r.discountAmount)}
            total={toMoney(r.totalAmount)}
            days={toMoney(r.days)}
            dailyRate={r.dailyRate}
            symbol={symbol}
          />
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
