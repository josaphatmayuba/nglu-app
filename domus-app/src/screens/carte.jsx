import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Building, Building2, MapPin, MapPinOff, DoorOpen } from "lucide-react";
import { t } from "../i18n.js";
import { api } from "../api.js";
import { useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { Loading, ApiError } from "./dashboard.jsx";

// Lubumbashi (RDC) : centre par defaut si aucun bien n'est geolocalise.
const DEFAULT_CENTER = [-11.6609, 27.4794];

const TONE_BY_TYPE = {
  building: "iris",
  apartment: "iris",
  residential: "iris",
  house: "emerald",
  villa: "emerald",
  office: "ink",
  commercial: "ink",
  mixed: "amber",
};

function toneFor(propertyType) {
  return TONE_BY_TYPE[propertyType] || "iris";
}

function pinIcon(tone) {
  const colors = { iris: "#6366f1", emerald: "#10b981", ink: "#1e293b", amber: "#f59e0b" };
  const color = colors[tone] || colors.iris;
  return L.divIcon({
    className: "map-leaflet-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

async function loadCarteModule() {
  const [properties, units] = await Promise.all([api.properties(), api.units()]);
  return { properties, units };
}

export function CarteBiens() {
  const { data, loading, error, reload } = useApi(loadCarteModule, []);
  useRealtimeReload(reload, ["properties", "units"]);

  const properties = data?.properties || [];
  const units = data?.units || [];

  const rows = useMemo(() => {
    return properties.map((p) => {
      const propUnits = units.filter((u) => Number(u.propertyId) === Number(p.id));
      const occupiedCount = propUnits.filter((u) => u.status === "occupied").length;
      const occupancy = propUnits.length ? Math.round((occupiedCount / propUnits.length) * 100) : 0;
      const lat = p.latitude != null ? Number(p.latitude) : null;
      const lng = p.longitude != null ? Number(p.longitude) : null;
      const hasPosition = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
      return {
        id: p.id,
        name: p.name,
        address: [p.address, p.city].filter(Boolean).join(", ") || t("Adresse non renseignee"),
        type: p.propertyType,
        tone: toneFor(p.propertyType),
        unitsCount: propUnits.length,
        occupancy,
        lat,
        lng,
        hasPosition,
      };
    });
  }, [properties, units]);

  const located = rows.filter((r) => r.hasPosition);
  const unlocated = rows.filter((r) => !r.hasPosition);

  const mapCenter = located.length
    ? [located.reduce((s, r) => s + r.lat, 0) / located.length, located.reduce((s, r) => s + r.lng, 0) / located.length]
    : DEFAULT_CENTER;

  const totalUnits = rows.reduce((s, r) => s + r.unitsCount, 0);
  const occupiedUnits = rows.reduce((s, r) => s + Math.round((r.occupancy / 100) * r.unitsCount), 0);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{t("Patrimoine geolocalise")}</div>
          <h2 className="title">{t("Carte des proprietes")}</h2>
        </div>
      </div>

      <div className="map-layout">
        <section className="card map-card" style={{ padding: 0 }}>
          <MapContainer center={mapCenter} zoom={located.length ? 12 : 6} style={{ height: "100%", minHeight: 520, width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {located.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.tone)}>
                <Popup>
                  <b>{p.name}</b>
                  <br />
                  {p.address}
                  <br />
                  {t("Occupation")} : {p.occupancy}%
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="map-legend">
            <span><i className="legend-dot iris" /> {t("Residence")}</span>
            <span><i className="legend-dot ink" /> {t("Bureaux")}</span>
            <span><i className="legend-dot amber" /> {t("Mixte")}</span>
          </div>
        </section>

        <aside className="card map-side">
          <div className="panel-title">{t("Proprietes geolocalisees")}</div>
          {rows.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>{t("Aucun bien enregistre.")}</p>
          )}
          {rows.map((p) => (
            <div key={p.id} className="property-row">
              <span className={`property-icon ${p.tone}`}>
                {p.type === "office" || p.type === "commercial" ? <Building2 size={15} /> : <Building size={15} />}
              </span>
              <span className="record-main">
                <span className="record-title">{p.name}</span>
                <span className="record-sub">
                  {p.hasPosition ? p.address : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-500)" }}>
                      <MapPinOff size={12} /> {t("position inconnue")}
                    </span>
                  )}
                </span>
              </span>
              <span className={p.occupancy < 75 ? "occ warn" : "occ"}>{p.occupancy}%</span>
            </div>
          ))}

          <div className="map-summary">
            <div><DoorOpen size={16} /><b>{occupiedUnits} / {totalUnits}</b><span>{t("unites occupees")}</span></div>
            <div><MapPin size={16} /><b>{located.length}</b><span>{t("biens geolocalises")}</span></div>
          </div>
          {unlocated.length > 0 && (
            <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
              {unlocated.length} {t("bien(s) sans position connue, exclus de la carte.")}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
