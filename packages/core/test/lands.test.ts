import { describe, expect, it } from "vitest";
import { describeLand, landFromProperties } from "../src/places/lands.js";

describe("land tenure", () => {
  it("labels federal hits as public", () => {
    const hit = landFromProperties({
      tenure: "public",
      name: "San Juan National Forest",
      agency: "Forest Service",
      kind: "usfs",
      access: "check",
    });
    expect(hit?.tenure).toBe("public");
    expect(describeLand(hit)).toMatch(/Public/);
    expect(describeLand(hit)).toMatch(/San Juan/);
  });

  it("treats missing polygons as private or unmapped", () => {
    expect(describeLand(null)).toMatch(/Private or unmapped/);
    expect(landFromProperties({ tenure: "nope" })).toBeNull();
  });
});
