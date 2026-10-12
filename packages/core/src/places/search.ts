import type { Place } from "../types.js";

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function rad(d: number): number {
  return (d * Math.PI) / 180;
}

export function formatDistance(km: number, unit: "km" | "mi"): string {
  if (unit === "mi") {
    const mi = km * 0.621371;
    return mi < 10 ? `${mi.toFixed(2)} mi` : `${mi.toFixed(1)} mi`;
  }
  return km < 10 ? `${km.toFixed(2)} km` : `${km.toFixed(1)} km`;
}

export function searchPlaces(
  places: Place[],
  query: string,
  limit = 20,
  near?: { lat: number; lon: number },
): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const ranked: { p: Place; score: number }[] = [];
  for (const p of places) {
    const name = p.name.toLowerCase();
    const hay = `${name} ${p.admin.toLowerCase()} ${p.country.toLowerCase()}`;
    let match = 0;
    if (name === q) match = 3;
    else if (name.startsWith(q)) match = 2;
    else if (name.includes(q)) match = 1;
    else if (hay.includes(q)) match = 0.35;
    else continue;
    let score = match + Math.log10(p.population + 10);
    if (near) score += nearBoost(p, near);
    ranked.push({ p, score });
  }
  ranked.sort((a, b) => b.score - a.score || b.p.population - a.p.population);
  return ranked.slice(0, limit).map((r) => r.p);
}

/** Prefer towns near the map without letting a hamlet beat a major city. */
function nearBoost(p: Place, near: { lat: number; lon: number }): number {
  const latKm = (p.lat - near.lat) * 111;
  const lonKm = (p.lon - near.lon) * 111 * Math.cos((near.lat * Math.PI) / 180);
  const km = Math.hypot(latKm, lonKm);
  return Math.max(0, 2.2 - km / 900);
}

export function bearingDegrees(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const y = Math.sin(rad(to.lon - from.lon)) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lon - from.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function compassLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
