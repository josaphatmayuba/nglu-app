import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle } from "lucide-react";

// Default Leaflet markers reference image assets via relative URLs that
// the Webpack build does not resolve correctly inside CRA. Forcing the
// CDN URLs is the standard workaround.
const setupDefaultIcon = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

// Kinshasa city centre — used when no real coords are stored on the unit.
const FALLBACK_CENTER = [-4.3217, 15.3126];

// Deterministic small offset from the city centre so cards without
// coordinates don't all stack on the same pixel. The hash is stable
// (same unit id → same pseudo-position) which avoids markers jumping
// between renders. Spread is ±0.04° ≈ 4 km around the centre.
const pseudoCoords = (id) => {
  const seed = String(id || "x").split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 7);
  const dLat = (((seed % 1000) / 1000) - 0.5) * 0.08;
  const dLng = ((((seed >> 3) % 1000) / 1000) - 0.5) * 0.08;
  return [FALLBACK_CENTER[0] + dLat, FALLBACK_CENTER[1] + dLng];
};

const markerColor = (status, late) => {
  if (late) return "#dc2626";
  if (status === "maintenance") return "#f59e0b";
  if (status === "occupied") return "#10b981";
  return "#64748b";
};

const buildIcon = (color) =>
  L.divIcon({
    className: "immo-map-marker",
    html: `<span style="background:${color}" class="immo-map-marker-dot"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });

const PropertyMapView = ({ units, onAssignTenant }) => {
  useEffect(() => {
    setupDefaultIcon();
  }, []);

  const markers = useMemo(
    () =>
      units.map((unit) => {
        const lat = unit.latitude ?? unit.property?.latitude;
        const lng = unit.longitude ?? unit.property?.longitude;
        const position = lat != null && lng != null ? [Number(lat), Number(lng)] : pseudoCoords(unit.id);
        const status = unit.activeLease ? "occupied" : unit.status || "vacant";
        const late = unit.activeLease?.status === "late" || unit.activeLease?.isOverdue;
        const isReal = lat != null && lng != null;
        return { unit, position, status, late, isReal };
      }),
    [units],
  );

  const anyApproximate = markers.some((m) => !m.isReal);

  return (
    <div className="immo-map-wrapper">
      {anyApproximate && (
        <div className="immo-map-notice">
          <AlertTriangle size={15} />
          <span>
            <strong>Géolocalisation approximative.</strong> Aucune coordonnée GPS n'est stockée
            pour ces unités — les marqueurs sont positionnés autour de Kinshasa de façon
            déterministe. Ajoutez <code>latitude</code>/<code>longitude</code> sur la propriété
            ou l'unité pour un placement réel.
          </span>
        </div>
      )}
      <MapContainer
        center={FALLBACK_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        className="immo-map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(({ unit, position, status, late, isReal }) => (
          <Marker key={unit.id} position={position} icon={buildIcon(markerColor(status, late))}>
            <Popup>
              <div className="immo-map-popup">
                <strong>{unit.displayName || unit.name}</strong>
                <p>{unit.displayAddress || "Adresse non renseignée"}</p>
                <p>
                  Statut :{" "}
                  <span className={`immo-pill ${late ? "danger" : status === "occupied" ? "success" : status === "maintenance" ? "warning" : "neutral"}`}>
                    {late ? "En retard" : status === "occupied" ? "Loué" : status === "maintenance" ? "Maintenance" : "Disponible"}
                  </span>
                </p>
                {unit.monthlyRent != null && (
                  <p>Loyer : <strong>{Number(unit.monthlyRent).toLocaleString()} /mois</strong></p>
                )}
                {!isReal && <small className="immo-map-popup-warning">Position approximative</small>}
                {!unit.activeLease && (status === "vacant" || status === "available") && (
                  <button type="button" className="immo-map-popup-action" onClick={() => onAssignTenant?.(unit)}>
                    Assigner un locataire
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default PropertyMapView;
