import { describe, expect, it } from "vitest";
import { AirgapGuard, isLocalUrl } from "../src/airgap/guard.js";

describe("airgap", () => {
  it("treats app and blob URLs as local", () => {
    expect(isLocalUrl("app://bundled/x")).toBe(true);
    expect(isLocalUrl("blob:http://localhost/1")).toBe(true);
    expect(isLocalUrl("/tiles/1.pbf")).toBe(true);
    expect(isLocalUrl("https://example.com/x")).toBe(false);
  });

  it("blocks remote URLs when locked", () => {
    const g = new AirgapGuard();
    g.lock();
    expect(g.record("GET", "https://huggingface.co/x", "test")).toBe(true);
    expect(g.record("GET", "/models/a.gguf", "test")).toBe(false);
    expect(g.getState().locked).toBe(true);
    expect(g.getState().attempts.some((a) => a.blocked)).toBe(true);
  });
});
