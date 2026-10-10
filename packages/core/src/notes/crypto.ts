/**
 * AES-256-GCM notes. The password never leaves the device.
 * Key derivation: PBKDF2-SHA-256, 210_000 iterations, 256-bit key.
 */

const ITERATIONS = 210_000;
const KEY_BITS = 256;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface CipherPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

function requireSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto is required for AES-256 notes");
  return subtle;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

function b64(bytes: Uint8Array): string {
  const buf = (globalThis as { Buffer?: { from: (b: Uint8Array | string, enc?: string) => { toString: (e: string) => string } } }).Buffer;
  if (buf) return buf.from(bytes).toString("base64");
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const buf = (globalThis as { Buffer?: { from: (b: string, enc: string) => Uint8Array } }).Buffer;
  if (buf) return new Uint8Array(buf.from(value, "base64"));
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = requireSubtle();
  const material = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(plaintext: string, password: string): Promise<CipherPayload> {
  if (!password) throw new Error("Password required");
  const subtle = requireSubtle();
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(password, salt);
  const cipher = await subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, encoder.encode(plaintext));
  return { ciphertext: b64(new Uint8Array(cipher)), iv: b64(iv), salt: b64(salt) };
}

export async function decryptText(payload: CipherPayload, password: string): Promise<string> {
  if (!password) throw new Error("Password required");
  const subtle = requireSubtle();
  const salt = fromB64(payload.salt);
  const iv = fromB64(payload.iv);
  const data = fromB64(payload.ciphertext);
  const key = await deriveKey(password, salt);
  try {
    const plain = await subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
    return decoder.decode(plain);
  } catch {
    throw new Error("Wrong password or corrupted note");
  }
}

export async function verifyPassword(payload: CipherPayload, password: string): Promise<boolean> {
  try {
    await decryptText(payload, password);
    return true;
  } catch {
    return false;
  }
}
