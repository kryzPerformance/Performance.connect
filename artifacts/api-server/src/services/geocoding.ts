/**
 * Geocoding service — abstracted behind an interface so the provider
 * can be swapped to Google Maps, Mapbox, etc. without changing callers.
 *
 * Default provider: OpenStreetMap Nominatim (free, no API key required).
 */

export interface GeocodeRequest {
  address?: string;
  city?: string;
  province?: string;
  country?: string;
}

export interface GeocodeResponse {
  success: boolean;
  latitude: number | null;
  longitude: number | null;
  normalizedAddress: string | null;
  normalizedCity: string | null;
  normalizedProvince: string | null;
  normalizedCountry: string | null;
  displayName: string | null;
}

/** Contract all geocoding providers must implement */
export interface GeocodingProvider {
  geocode(req: GeocodeRequest): Promise<GeocodeResponse>;
}

// ---------------------------------------------------------------------------
// Nominatim provider (OpenStreetMap)
// ---------------------------------------------------------------------------

class NominatimProvider implements GeocodingProvider {
  private readonly baseUrl = "https://nominatim.openstreetmap.org";
  private readonly userAgent = "PerformanceConnect/1.0 (contact@performanceconnect.ca)";

  async geocode(req: GeocodeRequest): Promise<GeocodeResponse> {
    const empty: GeocodeResponse = {
      success: false,
      latitude: null,
      longitude: null,
      normalizedAddress: null,
      normalizedCity: null,
      normalizedProvince: null,
      normalizedCountry: null,
      displayName: null,
    };

    const parts = [req.address, req.city, req.province, req.country].filter(Boolean);
    if (parts.length === 0) return empty;

    const query = encodeURIComponent(parts.join(", "));
    const url = `${this.baseUrl}/search?q=${query}&format=json&addressdetails=1&limit=1`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept-Language": "en",
        },
      });

      if (!res.ok) return empty;

      const data = (await res.json()) as NominatimResult[];
      if (!data || data.length === 0) return empty;

      const result = data[0];
      const addr = result.address ?? {};

      return {
        success: true,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        normalizedAddress: [addr.house_number, addr.road].filter(Boolean).join(" ") || null,
        normalizedCity:
          addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? req.city ?? null,
        normalizedProvince: addr.state ?? req.province ?? null,
        normalizedCountry: addr.country ?? req.country ?? null,
        displayName: result.display_name ?? null,
      };
    } catch {
      return empty;
    }
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

// ---------------------------------------------------------------------------
// Singleton — swap provider here to change the implementation globally
// ---------------------------------------------------------------------------

export const geocodingService: GeocodingProvider = new NominatimProvider();
