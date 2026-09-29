/**
 * Routing service.
 *
 * Primary: OSRM public demo server (free, no key) — car profile, good for
 * two-wheeler route baseline. We also annotate the route so the risk engine
 * can sample weather along the polyline.
 *
 * The OSRM demo has rate limits; we keep responses short-lived cached in
 * memory.
 */

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: RoutePoint[];
  source: string;
}

const memCache = new Map<string, { at: number; route: RouteResult }>();
const TTL_MS = 5 * 60 * 1000;

export async function getRoute(
  origin: RoutePoint,
  dest: RoutePoint,
): Promise<RouteResult | null> {
  const key = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}|${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`;
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.route;

  // OSRM demo: overview=full returns a encoded polyline; we request geojson.
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return fallbackRoute(origin, dest);
    const data = (await res.json()) as {
      routes: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }>;
    };
    const r = data.routes?.[0];
    if (!r) return fallbackRoute(origin, dest);
    const geometry: RoutePoint[] = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    const route: RouteResult = {
      distanceKm: r.distance / 1000,
      durationMin: Math.round(r.duration / 60),
      geometry,
      source: "osrm",
    };
    memCache.set(key, { at: Date.now(), route });
    return route;
  } catch {
    return fallbackRoute(origin, dest);
  }
}

/** Straight-line fallback when routing provider is unavailable. */
function fallbackRoute(origin: RoutePoint, dest: RoutePoint): RouteResult {
  const km = haversineKmLocal(origin, dest);
  // assume 25 km/h average urban delivery speed
  const min = Math.max(1, Math.round((km / 25) * 60));
  return {
    distanceKm: km,
    durationMin: min,
    geometry: [origin, dest],
    source: "straight-line",
  };
}

function haversineKmLocal(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = (toRadLocal(b.lat - a.lat));
  const dLng = (toRadLocal(b.lng - a.lng));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadLocal(a.lat)) * Math.cos(toRadLocal(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function toRadLocal(d: number): number {
  return (d * Math.PI) / 180;
}
