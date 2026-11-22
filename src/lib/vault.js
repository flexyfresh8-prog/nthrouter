/**
 * Encrypted key vault.
 *
 * On the web there is no Keychain, so the equivalent guarantee is: secrets never
 * leave this device and are never stored in plaintext. The vault is one AES-GCM
 * blob in localStorage, encrypted with a key derived from the user's PIN through
 * PBKDF2 (210k iterations, SHA-256). Only the derived CryptoKey lives in memory
 * while unlocked; it is dropped on lock and never persisted.
 *
 * Nothing here ever writes a secret anywhere else: no fetch, no logging.
 */
const VKEY = "keychat.vault.v1";
const ITERATIONS = 210000;

const enc = new TextEncoder();
const dec = new TextDecoder();

/** @type {{ dk: CryptoKey, salt: Uint8Array, secrets: Record<string,string> } | null} */
let session = null;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function save() {
  if (!session) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    session.dk,
    enc.encode(JSON.stringify(session.secrets))
  );
  localStorage.setItem(VKEY, JSON.stringify({ salt: b64(session.salt), iv: b64(iv), ct: b64(ct) }));
}

export function exists() {
  try {
    return !!localStorage.getItem(VKEY);
  } catch {
    return false;
  }
}

export function isUnlocked() {
  return !!session;
}

export async function create(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  session = { dk: await derive(pin, salt), salt, secrets: {} };
  await save();
}

export async function unlock(pin) {
  const raw = JSON.parse(localStorage.getItem(VKEY) || "null");
  if (!raw) return false;
  const salt = unb64(raw.salt);
  const dk = await derive(pin, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(raw.iv) }, dk, unb64(raw.ct));
    session = { dk, salt, secrets: JSON.parse(dec.decode(plain)) };
    return true;
  } catch {
    return false;
  }
}

export async function changePin(oldPin, newPin) {
  if (!(await unlock(oldPin))) return false;
  session.salt = crypto.getRandomValues(new Uint8Array(16));
  session.dk = await derive(newPin, session.salt);
  await save();
  return true;
}

export function lock() {
  session = null;
}

export function destroy() {
  session = null;
  localStorage.removeItem(VKEY);
}

export function getSecret(id) {
  return session?.secrets?.[id] ?? null;
}

export async function setSecret(id, secret) {
  if (!session) throw new Error("Vault is locked");
  session.secrets[id] = secret;
  await save();
}

export async function deleteSecret(id) {
  if (!session) return;
  delete session.secrets[id];
  await save();
}

/** Last four characters, for the masked display. Never the full key. */
export function tailOf(secret) {
  if (!secret) return "";
  return secret.slice(-4);
}