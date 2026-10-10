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

export function searchPlaces(places: Place[], query: string, limit = 20): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return places
    .map((p) => {
      const name = p.name.toLowerCase();
      const hay = `${name} ${p.admin.toLowerCase()} ${p.country.toLowerCase()}`;
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 50;
      else if (hay.includes(q)) score = 20;
      if (score > 0) score += Math.min(15, Math.log10(p.population + 10));
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.p);
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
