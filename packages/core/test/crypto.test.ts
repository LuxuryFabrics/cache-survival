import { describe, expect, it } from "vitest";
import { decryptText, encryptText, verifyPassword } from "../src/notes/crypto.js";

describe("AES-256-GCM notes", () => {
  it("round-trips plaintext", async () => {
    const enc = await encryptText("grid coords 34.1, -118.2", "correct horse battery");
    expect(enc.ciphertext).not.toContain("grid");
    const out = await decryptText(enc, "correct horse battery");
    expect(out).toBe("grid coords 34.1, -118.2");
  });

  it("rejects a wrong password", async () => {
    const enc = await encryptText("secret", "alpha");
    await expect(decryptText(enc, "beta")).rejects.toThrow(/Wrong password/);
    expect(await verifyPassword(enc, "alpha")).toBe(true);
    expect(await verifyPassword(enc, "beta")).toBe(false);
  });
});
