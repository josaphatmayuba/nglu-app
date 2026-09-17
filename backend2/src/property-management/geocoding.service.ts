import { Injectable, Logger } from "@nestjs/common";

/**
 * Geocodage best-effort d'adresses de biens immobiliers (Domus) via
 * Nominatim (OpenStreetMap), gratuit et sans cle API.
 *
 * - Usage non intensif (declenche seulement a la creation/modification
 *   d'un bien quand l'adresse change), donc pas de rate-limiter dedie,
 *   mais on respecte quand meme la policy Nominatim: User-Agent
 *   identifiable + timeout court + echec silencieux (jamais d'exception
 *   qui ferait echouer la creation/mise a jour du bien).
 * - En cas d'echec (reseau, adresse introuvable, timeout), retourne null:
 *   l'appelant doit laisser latitude/longitude a null.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly endpoint = "https://nominatim.openstreetmap.org/search";
  private readonly userAgent = "nglu-app-domus/1.0 (contact: josaphatmayuba@gmail.com)";

  /** Construit une adresse geocodable a partir des champs du bien. */
  buildQuery(address?: string | null, city?: string | null, country?: string | null): string | null {
    const parts = [address, city, country].map((p) => p?.trim()).filter((p): p is string => !!p);
    if (!parts.length) return null;
    return parts.join(", ");
  }

  /** Geocode une adresse texte. Retourne null en best-effort si echec. */
  async geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!query.trim()) return null;
    try {
      const url = `${this.endpoint}?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        this.logger.warn(`geocode: Nominatim HTTP ${res.status} pour "${query}"`);
        return null;
      }
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      const first = results?.[0];
      if (!first) return null;
      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude };
    } catch (err) {
      this.logger.warn(`geocode: echec best-effort pour "${query}": ${(err as Error).message}`);
      return null;
    }
  }
}
