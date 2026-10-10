export type Hazard = "safe" | "caution" | "dangerous" | "unknown";

export interface FieldIdEntry {
  id: string;
  name: string;
  kind: "plant" | "mushroom" | "animal" | "gear" | "wound" | "other";
  hazard: Hazard;
  edible: boolean;
  toxic: boolean;
  summary: string;
  lookalikes?: string[];
  keywords: string[];
}

export interface VisionResult {
  label: string;
  hazard: Hazard;
  edible: boolean;
  toxic: boolean;
  confidence: number;
  summary: string;
  lookalikes: string[];
  safetyLine: string;
  ocrText?: string;
}

const SAFETY: Record<Hazard, string> = {
  safe: "Catalog match is low-risk, but never eat a wild species from an app ID alone.",
  caution: "Treat as caution — confirm with a second source or avoid contact.",
  dangerous: "Treat as dangerous. Do not eat, touch, or approach. Seek distance / medical care as needed.",
  unknown: "Unknown. Assume toxic / dangerous until proven otherwise by a human expert.",
};

export function matchFieldId(query: string, catalog: FieldIdEntry[]): FieldIdEntry | undefined {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return undefined;
  let best: { e: FieldIdEntry; score: number } | undefined;
  for (const e of catalog) {
    const hay = `${e.name} ${e.keywords.join(" ")} ${e.summary}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (e.name.toLowerCase().includes(t)) score += 4;
      if (e.keywords.some((k) => k.includes(t))) score += 2;
      if (hay.includes(t)) score += 0.5;
    }
    if (!best || score > best.score) best = { e, score };
  }
  return best && best.score >= 3 ? best.e : undefined;
}

export function describeMatch(entry: FieldIdEntry | undefined, caption?: string): VisionResult {
  if (!entry) {
    return {
      label: caption ? `Unlisted — “${caption}”` : "Unidentified",
      hazard: "unknown",
      edible: false,
      toxic: true,
      confidence: caption ? 0.25 : 0.05,
      summary: caption
        ? `Local caption: ${caption}. No trusted catalog match. Do not eat or handle as if safe.`
        : "No catalog match. Photograph more angles, note habitat, and keep the specimen unused.",
      lookalikes: [],
      safetyLine: SAFETY.unknown,
    };
  }
  return {
    label: entry.name,
    hazard: entry.hazard,
    edible: entry.edible,
    toxic: entry.toxic,
    confidence: 0.55,
    summary: entry.summary,
    lookalikes: entry.lookalikes ?? [],
    safetyLine: SAFETY[entry.hazard],
  };
}

export function translateHeuristic(text: string): string {
  /** Placeholder: real translation is done by the local LLM when loaded. */
  return text.trim();
}
