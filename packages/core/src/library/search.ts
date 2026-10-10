import type { LibraryCategory, LibraryDocument } from "../types.js";

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is", "it",
  "this", "that", "be", "as", "at", "by", "from", "are", "was", "you", "your", "how",
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export function searchDocuments(
  docs: LibraryDocument[],
  query: string,
  category?: LibraryCategory | "all",
): LibraryDocument[] {
  const filtered = category && category !== "all" ? docs.filter((d) => d.category === category) : docs;
  const tokens = tokenize(query);
  if (tokens.length === 0) return filtered;

  return filtered
    .map((doc) => {
      const hay = `${doc.title} ${doc.tags.join(" ")} ${doc.body}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (doc.title.toLowerCase().includes(t)) score += 5;
        if (doc.tags.some((tag) => tag.toLowerCase().includes(t))) score += 3;
        if (hay.includes(t)) score += 1;
      }
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.doc);
}

export const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  medical: "Medical",
  "off-grid": "Off-grid",
  "food-water": "Food / Water",
  shelter: "Shelter",
  fire: "Fire",
  navigation: "Navigation",
  disaster: "Disaster",
  "plants-animals": "Plants / Animals",
  legal: "Legal",
  signaling: "Signaling",
  hygiene: "Hygiene",
  tools: "Tools",
  climate: "Climate",
  general: "General",
};
