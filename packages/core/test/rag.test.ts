import { describe, expect, it } from "vitest";
import { chunkDocument } from "../src/rag/chunk.js";
import { retrieve } from "../src/rag/retrieve.js";
import { searchDocuments } from "../src/library/search.js";
import { fallbackAnswer, generateAnswer } from "../src/inference/engine.js";
import type { LibraryDocument } from "../src/types.js";

const doc: LibraryDocument = {
  id: "water-1",
  title: "Disinfecting water in the field",
  category: "food-water",
  source: "CACHE field notes / CDC boiling guidance",
  license: "US Gov public domain + CC0",
  tags: ["boil", "purify", "water"],
  body: `A rolling boil of one minute (three minutes above 2,000 m) inactivates bacteria, viruses, and protozoa.

If you cannot boil, use a 0.1–0.4 micron filter for protozoa and bacteria, then add chlorine or chlorine dioxide for viruses.

Cloudy water should settle or be filtered through cloth first. Chemical disinfectants work poorly on silt.`,
  updatedAt: "2026-01-01",
};

describe("library + rag", () => {
  it("finds documents by keyword", () => {
    const hits = searchDocuments([doc], "boil water");
    expect(hits[0]?.id).toBe("water-1");
  });

  it("chunks and retrieves citations", () => {
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(0);
    const cites = retrieve({ query: "how do I purify creek water", expertMode: "food-water", chunks });
    expect(cites[0]?.documentId).toBe("water-1");
    expect(cites[0]?.excerpt.toLowerCase()).toMatch(/boil|filter/);
  });

  it("falls back without a model", async () => {
    const chunks = chunkDocument(doc);
    const result = await generateAnswer("purify water", { expertMode: "food-water" }, { llm: null, chunks: () => chunks });
    expect(result.fallback).toBe(true);
    expect(result.usedModel).toBeNull();
    expect(result.text).toMatch(/Disinfecting water/);
    expect(fallbackAnswer("x", [], "general")).toMatch(/No local model/);
  });
});
