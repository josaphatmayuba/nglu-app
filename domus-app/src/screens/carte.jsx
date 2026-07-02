import { Building, Building2, MapPin, Navigation, Layers, DoorOpen } from "lucide-react";
import { t } from "../i18n.js";

const PROPERTIES = [
  { id: 1, name: "Belvedere", address: "Av. Mobutu", type: "Residence", units: 48, occupancy: 94, x: 28, y: 36, tone: "iris" },
  { id: 2, name: "Kiwele", address: "Quartier Golf", type: "Residence", units: 32, occupancy: 100, x: 68, y: 29, tone: "emerald" },
  { id: 3, name: "Tour Horizon", address: "Centre-ville", type: "Bureaux", units: 21, occupancy: 88, x: 52, y: 58, tone: "ink" },
  { id: 4, name: "Les Cedres", address: "Route Kasumbalesa", type: "Mixte", units: 19, occupancy: 62, x: 78, y: 72, tone: "amber" },
];

export function CarteBiens() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">{t("Patrimoine geolocalise")}</div>
          <h2 className="title">{t("Carte des proprietes")}</h2>
        </div>
        <div className="toolbar">
          <button className="btn"><Layers size={16} /> {t("Calques")}</button>
          <button className="btn btn-primary"><Navigation size={16} /> {t("Itineraire")}</button>
        </div>
      </div>

      <div className="map-layout">
        <section className="card map-card">
          <div className="map-grid" />
          {PROPERTIES.map((p) => (
            <button key={p.id} className={`map-pin ${p.tone}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <MapPin size={18} />
              <span>{p.name}</span>
            </button>
          ))}
          <div className="map-legend">
            <span><i className="legend-dot iris" /> {t("Residence")}</span>
            <span><i className="legend-dot ink" /> {t("Bureaux")}</span>
            <span><i className="legend-dot amber" /> {t("Mixte")}</span>
          </div>
        </section>

        <aside className="card map-side">
          <div className="panel-title">{t("Proprietes geolocalisees")}</div>
          {PROPERTIES.map((p) => (
            <div key={p.id} className="property-row">
              <span className={`property-icon ${p.tone}`}>
                {p.type === "Bureaux" ? <Building2 size={15} /> : <Building size={15} />}
              </span>
              <span className="record-main">
                <span className="record-title">{p.name}</span>
                <span className="record-sub">{p.address}</span>
              </span>
              <span className={p.occupancy < 75 ? "occ warn" : "occ"}>{p.occupancy}%</span>
            </div>
          ))}

          <div className="map-summary">
            <div><DoorOpen size={16} /><b>120 / 151</b><span>{t("unites occupees")}</span></div>
            <div><MapPin size={16} /><b>4</b><span>{t("zones suivies")}</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}
