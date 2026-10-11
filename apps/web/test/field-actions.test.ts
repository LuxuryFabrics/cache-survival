import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LibraryDocument } from "@cache/core";
import { DESK_STARTERS, FIELD_ACTIONS, FIRST_HOUR_DOCS, formatAgo, locationExtras } from "../src/lib/field-actions";

describe("field actions", () => {
  const docs = JSON.parse(readFileSync("public/data/library-seed.json", "utf8")) as LibraryDocument[];

  it("ships a starter for every desk and situation", () => {
    expect(FIELD_ACTIONS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(FIELD_ACTIONS.map((a) => a.id)).size).toBe(FIELD_ACTIONS.length);
    expect(FIELD_ACTIONS.every((a) => a.prompt.length > 40)).toBe(true);
    expect(Object.keys(DESK_STARTERS)).toHaveLength(8);
  });

  it("points first-hour cards at real bundled manuals", () => {
    for (const card of FIRST_HOUR_DOCS) {
      expect(docs.some((d) => d.id === card.id)).toBe(true);
    }
  });

  it("formats location extras and relative time", () => {
    expect(locationExtras(null)).toBeUndefined();
    expect(locationExtras({ lat: 39.74, lon: -104.99 })?.location?.lat).toBe(39.74);
    expect(formatAgo(Date.now(), Date.now())).toBe("just now");
    expect(formatAgo(Date.now() - 10 * 60_000, Date.now())).toBe("10 min ago");
  });
});
