import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Home,
  ImageOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { publicApi } from "../api.js";
import { cleanCurrencySymbol, money, normalizeCurrencyModule } from "../data.js";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { t, tf } from "../i18n.js";

const PUBLIC_BASE = `${import.meta.env.BASE_URL}public`;

function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function daysBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = Math.round((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000);
  return Math.max(1, diff);
}

function publicPathFor(key = "") {
  return key ? `${PUBLIC_BASE}/${encodeURIComponent(key)}` : PUBLIC_BASE;
}

function stayPhoto(stay, index = 0) {
  const photos = Array.isArray(stay?.photos) ? stay.photos : [];
  return photos[index] || stay?.cover || null;
}

export function PublicReservationsPage({ routeKey = "" }) {
  const [catalog, setCatalog] = useState(null);
  const [selectedKey, setSelectedKey] = useState(routeKey || "");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setSelectedKey(routeKey || ""), [routeKey]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    publicApi.stays()
      .then((data) => { if (alive) setCatalog(data || {}); })
      .catch((err) => { if (alive) setError(err.message || String(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const currency = useMemo(() => normalizeCurrencyModule(catalog?.currencies || [], catalog?.settings || {}), [catalog]);
  const stays = useMemo(() => Array.isArray(catalog?.stays) ? catalog.stays : [], [catalog]);
  const selected = useMemo(() => stays.find((stay) => stay.key === selectedKey) || null, [stays, selectedKey]);
  const cities = useMemo(() => [...new Set(stays.map((stay) => stay.city).filter(Boolean))].sort(), [stays]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stays.filter((stay) => {
      if (city && stay.city !== city) return false;
      if (!q) return true;
      return [stay.title, stay.propertyName, stay.type, stay.city, stay.address]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [stays, query, city]);

  const openStay = (key) => {
    setSelectedKey(key);
    window.history.pushState({}, "", publicPathFor(key));
    window.scrollTo(0, 0);
  };
  const backToList = () => {
    setSelectedKey("");
    window.history.pushState({}, "", publicPathFor());
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <main className="public-stays-page">
        <div className="public-state"><Loader2 className="domus-spin" size={24} /><span>{t("Chargement des biens...")}</span></div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="public-stays-page">
        <div className="public-state">
          <h1>{t("Catalogue indisponible")}</h1>
          <p>{error}</p>
          <button className="public-btn primary" onClick={() => window.location.reload()}>{t("Reessayer")}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="public-stays-page">
      <PublicHeader settings={catalog?.settings} />
      {selected ? (
        <PublicStayDetail stay={selected} settings={catalog?.settings} currency={currency} onBack={backToList} />
      ) : (
        <>
          <section className="public-hero">
            <div>
              <span className="public-eyebrow"><Sparkles size={14} /> {t("Sejours et baux")}</span>
              <h1>{t("Trouvez un bien et reservez en ligne")}</h1>
              <p>{catalog?.settings?.tagLine || t("Selectionnez un logement, consultez ses photos et envoyez votre demande en quelques minutes.")}</p>
            </div>
            <div className="public-hero-search">
              <label>
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Ville, quartier, type...")} />
              </label>
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">{t("Toutes les villes")}</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </section>
          <section className="public-stay-grid">
            {filtered.map((stay) => (
              <PublicStayCard key={stay.key} stay={stay} currency={currency} onOpen={() => openStay(stay.key)} />
            ))}
            {!filtered.length && <div className="public-empty">{t("Aucun bien ne correspond a votre recherche.")}</div>}
          </section>
        </>
      )}
    </main>
  );
}

function PublicHeader({ settings }) {
  return (
    <header className="public-topbar">
      <a className="public-brand" href={PUBLIC_BASE} onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", PUBLIC_BASE); window.location.reload(); }}>
        <span><Building2 size={18} /></span>
        <strong>{settings?.companyName || "Domus"}</strong>
      </a>
      <div className="public-contact">
        {settings?.phone && <a href={`tel:${settings.phone}`}><Phone size={15} /> {settings.phone}</a>}
        {settings?.email && <a href={`mailto:${settings.email}`}><Mail size={15} /> {settings.email}</a>}
      </div>
    </header>
  );
}

function PublicStayCard({ stay, currency, onOpen }) {
  const photo = stayPhoto(stay);
  const symbol = symbolFor(currency, stay.currencyId);
  return (
    <article className="public-stay-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      <div className="public-stay-media">
        {photo ? <img src={photo.url} alt={stay.title} loading="lazy" /> : <div><ImageOff size={28} /></div>}
        <span>{stay.unitId ? t("Unite") : t("Bien entier")}</span>
      </div>
      <div className="public-stay-body">
        <div className="public-stay-title">
          <h2>{stay.title}</h2>
          <div className="public-stay-prices">
            <b>{money(stay.dailyRate, symbol)} / {t("jour")}</b>
            {stay.monthlyRent > 0 && <span>{money(stay.monthlyRent, symbol)} / {t("mois")}</span>}
          </div>
        </div>
        <p className="public-stay-location">{stay.unitId ? <><strong>{stay.propertyName}</strong> &middot; {stay.title}</> : stay.propertyName}</p>
        <div className="public-stay-specs">
          {stay.bedrooms > 0 && <span><BedDouble size={15} /> {tf("{n} ch.", {n: stay.bedrooms})}</span>}
          {stay.bathrooms > 0 && <span><Bath size={15} /> {tf("{n} sdb", {n: stay.bathrooms})}</span>}
          {stay.area > 0 && <span>{Math.round(stay.area)} m2</span>}
        </div>
      </div>
    </article>
  );
}

function PublicStayDetail({ stay, settings, currency, onBack }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const photos = Array.isArray(stay.photos) && stay.photos.length ? stay.photos : (stay.cover ? [stay.cover] : []);
  const photo = photos[activePhoto] || null;
  const symbol = symbolFor(currency, stay.currencyId);

  function lightboxPrev() { setActivePhoto(i => (i - 1 + photos.length) % photos.length); }
  function lightboxNext() { setActivePhoto(i => (i + 1) % photos.length); }

  return (
    <>
      <button className="public-back" onClick={onBack}><ArrowLeft size={17} /> {t("Tous les biens")}</button>
      <section className="public-detail-head">
        <div>
          <h1>{stay.title}</h1>
          <p className="public-stay-location">{stay.unitId ? <><strong>{stay.propertyName}</strong> &middot; {stay.title}</> : stay.propertyName}</p>
        </div>
        <div className="public-detail-price">
          <b>{money(stay.dailyRate, symbol)}</b>
          <span>{t("par jour")}</span>
          {stay.monthlyRent > 0 && (
            <span className="public-detail-price-monthly">{money(stay.monthlyRent, symbol)} / {t("mois")}</span>
          )}
        </div>
      </section>
      <section className="public-detail-layout">
        <div className="public-detail-main">
          <div className="public-detail-gallery">
            {photo
              ? <img src={photo.url} alt={stay.title} onClick={() => setLightbox(true)} style={{cursor:"zoom-in"}} />
              : <div><ImageOff size={34} /> {t("Pas de photo")}</div>}
          </div>
          {photos.length > 1 && (
            <div className="public-thumbs">
              {photos.map((item, index) => (
                <button key={item.id || index} className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)}>
                  <img src={item.url} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="public-detail-section">
            <h2>{t("Details du bien")}</h2>
            <div className="public-feature-grid">
              <span><Home size={16} /> {stay.type || t("Logement")}</span>
              {stay.bedrooms > 0 && <span><BedDouble size={16} /> {tf("{n} chambre{s}", {n: stay.bedrooms, s: stay.bedrooms > 1 ? "s" : ""})}</span>}
              {stay.bathrooms > 0 && <span><Bath size={16} /> {tf("{n} salle{s} de bain", {n: stay.bathrooms, s: stay.bathrooms > 1 ? "s" : ""})}</span>}
              {stay.area > 0 && <span>{Math.round(stay.area)} m2</span>}
              {stay.unitId && <span><KeyRound size={16} /> {stay.propertyName}</span>}
            </div>
            {stay.description && <p>{stay.description}</p>}
            {stay.amenities && <p><strong>{t("Equipements :")}</strong> {stay.amenities}</p>}
          </div>
        </div>
        <aside className="public-action-panel">
          <PublicBookingForm stay={stay} symbol={symbol} />
          <PublicLeaseForm stay={stay} settings={settings} />
        </aside>
      </section>
      {lightbox && photo && (
        <div className="lightbox-overlay" onClick={() => setLightbox(false)}>
          <button className="lightbox-close" onClick={() => setLightbox(false)}><X size={28} /></button>
          {photos.length > 1 && (
            <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}><ChevronLeft size={36} /></button>
          )}
          <img src={photo.url} alt={stay.title} onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && (
            <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); lightboxNext(); }}><ChevronRight size={36} /></button>
          )}
          {photos.length > 1 && (
            <div className="lightbox-counter">{activePhoto + 1} / {photos.length}</div>
          )}
        </div>
      )}
    </>
  );
}

function PublicBookingForm({ stay, symbol }) {
  const [form, setForm] = useState({ checkIn: "", checkOut: "", guestName: "", guestPhone: "", guestEmail: "", couponCode: "", notes: "" });
  const [coupon, setCoupon] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const set = (patch) => {
    if ("couponCode" in patch) setCoupon(null);
    if ("checkIn" in patch || "checkOut" in patch) setAvailability(null);
    setForm((current) => ({ ...current, ...patch }));
  };
  const days = daysBetween(form.checkIn, form.checkOut);
  const gross = roundMoney(days * toMoney(stay.dailyRate));
  const discount = toMoney(coupon?.discountAmount);
  const total = Math.max(0, roundMoney(gross - discount));
  const datesInvalid = form.checkIn && form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn);

  const checkAvailability = async () => {
    if (!form.checkIn || !form.checkOut || datesInvalid) return;
    setError("");
    try {
      const res = await publicApi.publicAvailability({ propertyId: stay.propertyId, unitId: stay.unitId, checkIn: form.checkIn, checkOut: form.checkOut });
      setAvailability(res);
      return res;
    } catch (err) {
      setError(err.message || String(err));
      return null;
    }
  };

  const applyCoupon = async () => {
    if (!form.couponCode.trim() || gross <= 0) return;
    setError("");
    try {
      const preview = await publicApi.validatePublicCoupon({ code: form.couponCode.trim(), amount: gross, currencyId: stay.currencyId });
      setCoupon(preview);
      setForm((current) => ({ ...current, couponCode: preview.code || current.couponCode.toUpperCase() }));
    } catch (err) {
      setCoupon(null);
      setError(err.message || String(err));
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const ok = availability?.available ? availability : await checkAvailability();
      if (!ok?.available) throw new Error(ok?.reason || "Ce bien n'est pas disponible sur ces dates.");
      if (!form.guestName.trim()) throw new Error("Votre nom est obligatoire.");
      const reservation = await publicApi.createPublicReservation({
        propertyId: stay.propertyId,
        unitId: stay.unitId,
        guestName: form.guestName.trim(),
        guestPhone: form.guestPhone.trim() || null,
        guestEmail: form.guestEmail.trim() || null,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        couponCode: form.couponCode.trim() || null,
        notes: form.notes.trim() || null,
      });
      setDone({ type: "reservation", reference: reservation?.reference });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="public-panel-card success">
        <CheckCircle2 size={24} />
        <h2>Reservation envoyee</h2>
        <p>Reference {done.reference || "en attente"}. Notre equipe vous contactera pour confirmer les details.</p>
      </div>
    );
  }

  return (
    <div className="public-panel-card">
      <h2><CalendarCheck size={18} /> {t("Reserver ce bien")}</h2>
      <div className="public-form-grid two">
        <Field label={t("Arrivee")} type="date" value={form.checkIn} onChange={(checkIn) => set({ checkIn })} />
        <Field label={t("Depart")} type="date" value={form.checkOut} onChange={(checkOut) => set({ checkOut })} />
      </div>
      {datesInvalid && <div className="public-form-error">{t("Le depart doit etre apres l'arrivee.")}</div>}
      {days > 0 && !datesInvalid && (
        <div className="public-total">
          <div><span>{tf("{days} jour{s} x {price}", {days, s: days > 1 ? "s" : "", price: money(stay.dailyRate, symbol)})}</span><b>{money(gross, symbol)}</b></div>
          {discount > 0 && <div><span>{t("Remise coupon")}</span><b>-{money(discount, symbol)}</b></div>}
          <div><span>{t("Total net")}</span><b>{money(total, symbol)}</b></div>
        </div>
      )}
      <button className="public-btn" disabled={!form.checkIn || !form.checkOut || datesInvalid} onClick={checkAvailability}>
        {t("Verifier disponibilite")}
      </button>
      {availability && <div className={`public-availability ${availability.available ? "ok" : "ko"}`}>{availability.available ? t("Disponible sur ces dates") : availability.reason || t("Indisponible")}</div>}
      <Field label={t("Nom complet")} value={form.guestName} onChange={(guestName) => set({ guestName })} placeholder={t("Votre nom")} />
      <DomusPhoneField label={t("Telephone")} value={form.guestPhone} onChange={(guestPhone) => set({ guestPhone })} />
      <Field label={t("Email")} type="email" value={form.guestEmail} onChange={(guestEmail) => set({ guestEmail })} placeholder="vous@email.com" />
      <div className="public-coupon-row">
        <Field label={t("Coupon")} value={form.couponCode} onChange={(couponCode) => set({ couponCode: couponCode.toUpperCase() })} placeholder="ETE2026" />
        <button className="public-btn" disabled={!form.couponCode.trim() || gross <= 0} onClick={applyCoupon}>{t("Appliquer")}</button>
      </div>
      {coupon && <div className="public-availability ok">{tf("Coupon {code} : -{amount}", {code: coupon.code, amount: money(coupon.discountAmount, symbol)})}</div>}
      <label className="public-field">
        <span>{t("Message")}</span>
        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t("Besoin particulier, heure d'arrivee...")} />
      </label>
      {error && <div className="public-form-error">{error}</div>}
      <button className="public-btn primary wide" disabled={busy || !form.guestName.trim() || !form.checkIn || !form.checkOut || datesInvalid} onClick={submit}>
        {busy ? t("Envoi...") : t("Envoyer la reservation")}
      </button>
      <p className="public-secure"><ShieldCheck size={14} /> {t("Aucun paiement en ligne requis pour envoyer la demande.")}</p>
    </div>
  );
}

function PublicLeaseForm({ stay, settings }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", desiredMoveIn: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
        throw new Error("Prenom, nom et telephone sont obligatoires.");
      }
      await publicApi.createPublicLeaseRequest({
        propertyId: stay.propertyId,
        unitId: stay.unitId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        desiredMoveIn: form.desiredMoveIn || null,
        message: form.message.trim() || null,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };
  if (done) {
    return (
      <div className="public-panel-card success">
        <CheckCircle2 size={24} />
        <h2>{t("Demande de bail envoyee")}</h2>
        <p>{settings?.companyName || t("Notre equipe")} {t("vous contactera pour la suite du dossier.")}</p>
      </div>
    );
  }
  return (
    <div className="public-panel-card secondary">
      <h2><User size={18} /> {t("Demander un bail")}</h2>
      <div className="public-form-grid two">
        <Field label={t("Prenom")} value={form.firstName} onChange={(firstName) => set({ firstName })} />
        <Field label={t("Nom")} value={form.lastName} onChange={(lastName) => set({ lastName })} />
      </div>
      <DomusPhoneField label={t("Telephone")} value={form.phone} onChange={(phone) => set({ phone })} />
      <Field label={t("Email")} type="email" value={form.email} onChange={(email) => set({ email })} />
      <Field label={t("Date d'entree souhaitee")} type="date" value={form.desiredMoveIn} onChange={(desiredMoveIn) => set({ desiredMoveIn })} />
      <label className="public-field">
        <span>{t("Message")}</span>
        <textarea value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder={t("Situation, duree souhaitee, questions...")} />
      </label>
      {error && <div className="public-form-error">{error}</div>}
      <button className="public-btn wide" disabled={busy} onClick={submit}>{busy ? t("Envoi...") : t("Envoyer la demande de bail")}</button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="public-field">
      <span>{label}</span>
      <input type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function symbolFor(currency, currencyId) {
  const byId = currencyId ? currency.currencyById?.get(Number(currencyId)) : null;
  return (byId ? cleanCurrencySymbol(byId) : "") || currency.defaultCurrencySymbol || "CDF";
}
