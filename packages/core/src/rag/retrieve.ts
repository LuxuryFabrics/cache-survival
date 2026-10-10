import type { Citation, ExpertMode, LibraryChunk } from "../types.js";
import { tokenize } from "../library/search.js";

const MODE_HINTS: Record<ExpertMode, string[]> = {
  survival: ["priority", "shelter", "water", "signal", "rule of threes"],
  medic: ["bleed", "airway", "wound", "shock", "cpr", "fracture"],
  navigation: ["bearing", "declination", "pace", "terrain", "compass"],
  "food-water": ["purify", "boil", "filter", "forage", "ration"],
  shelter: ["insulation", "tarp", "debris", "fire", "ground"],
  repair: ["cordage", "tape", "tool", "fix", "knot"],
  general: [],
  creative: [],
};

export interface RetrieveOptions {
  query: string;
  expertMode?: ExpertMode;
  limit?: number;
  chunks: LibraryChunk[];
}

export function scoreChunk(queryTokens: string[], chunk: LibraryChunk, hints: string[]): number {
  const hay = `${chunk.title} ${chunk.text}`.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (!t) continue;
    if (hay.includes(t)) score += 2;
    const hits = hay.split(t).length - 1;
    score += Math.min(hits, 4) * 0.4;
  }
  for (const h of hints) {
    if (hay.includes(h)) score += 0.6;
  }
  if (queryTokens.some((t) => chunk.title.toLowerCase().includes(t))) score += 1.5;
  return score;
}

export function retrieve(options: RetrieveOptions): Citation[] {
  const limit = options.limit ?? 4;
  const tokens = tokenize(options.query);
  if (tokens.length === 0) return [];
  const hints = options.expertMode ? MODE_HINTS[options.expertMode] : [];

  const ranked = options.chunks
    .map((chunk) => ({ chunk, score: scoreChunk(tokens, chunk, hints) }))
    .filter((r) => r.score > 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ chunk, score }) => ({
    documentId: chunk.documentId,
    title: chunk.title,
    category: chunk.category,
    source: chunk.source,
    license: chunk.license,
    excerpt: excerptAround(chunk.text, tokens, 280),
    score: Math.round(score * 100) / 100,
  }));
}

export function excerptAround(text: string, tokens: string[], max = 280): string {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    idx = lower.indexOf(t);
    if (idx >= 0) break;
  }
  if (idx < 0) return text.slice(0, max).trim();
  const start = Math.max(0, idx - 80);
  const slice = text.slice(start, start + max).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + max < text.length ? "…" : ""}`;
}
