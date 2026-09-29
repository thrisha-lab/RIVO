/**
 * Geocoding via Nominatim (OpenStreetMap) — free, no API key.
 * Used for destination search & reverse-geocoding a tapped map pin.
 */

export interface GeoResult {
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

export async function searchPlaces(query: string, limit = 6): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=0`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RiderGuard/1.0 (delivery rider safety co-pilot)",
        "Accept-Language": "en",
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      importance?: number;
    }>;
    return data.map((d) => ({
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      type: d.type,
      importance: d.importance,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RiderGuard/1.0 (delivery rider safety co-pilot)",
        "Accept-Language": "en",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
