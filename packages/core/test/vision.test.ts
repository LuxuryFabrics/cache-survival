import { describe, expect, it } from "vitest";
import { FIELD_ID_CATALOG } from "../src/vision/field-id.js";
import { describeMatch, matchFieldId } from "../src/vision/pipeline.js";

describe("field ID", () => {
  it("flags death cap as dangerous / not edible", () => {
    const hit = matchFieldId("green mushroom white gills death cap", FIELD_ID_CATALOG);
    expect(hit?.id).toBe("amanita-phalloides");
    const result = describeMatch(hit);
    expect(result.hazard).toBe("dangerous");
    expect(result.edible).toBe(false);
    expect(result.toxic).toBe(true);
  });

  it("unknown stays unsafe", () => {
    const result = describeMatch(undefined, "glossy leaf");
    expect(result.hazard).toBe("unknown");
    expect(result.edible).toBe(false);
  });
});
