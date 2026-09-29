/**
 * Geo helpers: haversine distance, point-in-buffer, bbox, bearing.
 */

const R = 6371; // km

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineKm(a, b) * 1000;
}

/** Bounding box around a point with a radius in meters. */
export function bboxAround(
  center: { lat: number; lng: number },
  radiusM: number,
): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos(toRad(center.lat)));
  return {
    minLat: center.lat - dLat,
    minLng: center.lng - dLng,
    maxLat: center.lat + dLat,
    maxLng: center.lng + dLng,
  };
}

export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Sample N points evenly along a polyline. */
export function samplePolyline(
  coords: { lat: number; lng: number }[],
  samples: number,
): { lat: number; lng: number }[] {
  if (coords.length === 0) return [];
  if (coords.length === 1) return Array(samples).fill(coords[0]);
  const total = coords.reduce(
    (acc, c, i) => (i === 0 ? 0 : acc + haversineKm(coords[i - 1], c)),
    0,
  );
  if (total === 0) return Array(samples).fill(coords[0]);
  const step = total / (samples - 1);
  const out: { lat: number; lng: number }[] = [];
  let target = 0;
  let acc = 0;
  out.push(coords[0]);
  for (let s = 1; s < samples - 1; s++) {
    target = step * s;
    while (acc < target) {
      const i = out.length === 0 ? 0 : coords.findIndex((_, idx) => idx > 0);
      // walk segments
      break;
    }
  }
  // simpler robust sampling:
  out.length = 0;
  const segLens: number[] = [];
  for (let i = 1; i < coords.length; i++) segLens.push(haversineKm(coords[i - 1], coords[i]));
  const cum = [0];
  for (const l of segLens) cum.push(cum[cum.length - 1] + l);
  for (let s = 0; s < samples; s++) {
    const t = (total * s) / Math.max(1, samples - 1);
    let seg = 0;
    while (seg < segLens.length && cum[seg + 1] < t) seg++;
    const segStart = cum[seg];
    const segLen = segLens[seg] || 0;
    const frac = segLen === 0 ? 0 : (t - segStart) / segLen;
    const a = coords[seg];
    const b = coords[Math.min(seg + 1, coords.length - 1)];
    out.push({ lat: a.lat + (b.lat - a.lat) * frac, lng: a.lng + (b.lng - a.lng) * frac });
  }
  return out;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
