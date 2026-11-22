/**
 * Local-only app state. Everything lives in this browser (localStorage) — there is
 * no backend and no sync. Secrets are kept separately in the encrypted vault.
 *
 * NthRouter additions: keys carry rotation state (cooldownUntil, exhaustedAt),
 * settings carry rotation preferences, and a tiny toast bus lives here so any
 * module can surface rotation events without a UI dependency.
 */
import { useSyncExternalStore } from "react";
import * as vault from "./vault";

const DB_KEY = "nthrouter.db.v1";

const initial = {
  ready: false,
  keys: [],
  chats: [],
  messages: [],
  usage: [],
  settings: {
    theme: "light",
    defaultEffort: 2,
    autoRotate: true, // rotate to the next key when one runs out
    cooldownSeconds: 60,
  },
  hasVault: false,
  locked: false,
  vaultUnlocked: false,
  toasts: [],
};

let state = { ...initial };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export const getState = () => state;
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useApp = () => useSyncExternalStore(subscribe, getState, getState);

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function set(patch) {
  state = { ...state, ...patch };
  emit();
}

function persist() {
  const { keys, chats, messages, usage, settings } = state;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({ keys, chats, messages, usage, settings }));
  } catch {
    /* storage full: keep the in-memory state usable */
  }
}

export function init() {
  if (state.ready) return;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(DB_KEY) || "{}") || {};
  } catch {
    saved = {};
  }
  const hasVault = vault.exists();
  set({
    ...initial,
    ...saved,
    settings: { ...initial.settings, ...(saved.settings || {}) },
    toasts: [],
    ready: true,
    hasVault,
    locked: hasVault,
    vaultUnlocked: vault.isUnlocked(),
  });
}

/* ---------------------------------------------------------------- toasts ---- */

let toastSeq = 0;
export function toast(message, { tone = "info", detail = "", ttl = 4200 } = {}) {
  const id = ++toastSeq;
  set({ toasts: [...state.toasts, { id, message, detail, tone }] });
  setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function dismissToast(id) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

/* ---------------------------------------------------------------- vault ---- */

export async function createVault(pin) {
  await vault.create(pin);
  set({ hasVault: true, locked: false, vaultUnlocked: true });
}

export async function unlockVault(pin) {
  const ok = await vault.unlock(pin);
  if (ok) set({ locked: false, vaultUnlocked: true });
  return ok;
}

export function lockVault() {
  vault.lock();
  set({ locked: true, vaultUnlocked: false });
}

/* ------------------------------------------------------------------ keys ---- */

export async function addKey({ secret, ...meta }) {
  const id = uid();
  await vault.setSecret(id, secret);
  const key = {
    id,
    providerId: meta.providerId,
    label: meta.label || "",
    baseUrl: meta.baseUrl || "",
    orgId: meta.orgId || "",
    planName: meta.planName || "",
    planSource: meta.planName ? "manual" : "unknown",
    manualLimit: meta.manualLimit ?? null,
    limitUnit: meta.manualLimit ? "tokens" : null,
    resetAt: meta.resetAt || null,
    status: "unknown",
    lastCheckedAt: null,
    account: null,
    // rotation state
    cooldownUntil: null,
    exhaustedAt: null,
    rotationCount: 0,
    createdAt: new Date().toISOString(),
  };
  set({ keys: [key, ...state.keys] });
  persist();
  return key;
}

export async function replaceSecret(id, secret) {
  await vault.setSecret(id, secret);
}

export function updateKey(id, patch) {
  set({ keys: state.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)) });
  persist();
}

/* Rotation actions: called by the rotation engine after a failed attempt. */
export function markCooldown(id, until) {
  const k = state.keys.find((x) => x.id === id);
  if (!k) return;
  updateKey(id, { cooldownUntil: until });
}

export function markExhausted(id) {
  updateKey(id, { exhaustedAt: new Date().toISOString() });
}

export function markInvalid(id) {
  updateKey(id, { status: "invalid" });
}

export function noteRotation(id) {
  const k = state.keys.find((x) => x.id === id);
  if (!k) return;
  updateKey(id, { rotationCount: (k.rotationCount || 0) + 1 });
}

export function clearCooldown(id) {
  updateKey(id, { cooldownUntil: null, exhaustedAt: null, status: "unknown" });
}

export async function deleteKey(id) {
  await vault.deleteSecret(id);
  set({
    keys: state.keys.filter((k) => k.id !== id),
    usage: state.usage.filter((u) => u.apiKeyId !== id),
  });
  persist();
}

/* ----------------------------------------------------------------- chats ---- */

export function createChat({ title = "New chat", effortLevel = 2, autoMode = true, selectedModelId = null }) {
  const now = new Date().toISOString();
  const chat = { id: uid(), title, effortLevel, autoMode, selectedModelId, createdAt: now, updatedAt: now };
  set({ chats: [chat, ...state.chats] });
  persist();
  return chat;
}

export function updateChat(id, patch) {
  set({ chats: state.chats.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)) });
  persist();
}

export function deleteChat(id) {
  set({
    chats: state.chats.filter((c) => c.id !== id),
    messages: state.messages.filter((m) => m.chatId !== id),
  });
  persist();
}

/* -------------------------------------------------------------- messages ---- */

export function addMessage(msg) {
  const message = { id: uid(), createdAt: new Date().toISOString(), ...msg };
  set({ messages: [...state.messages, message] });
  persist();
  return message;
}

export function updateMessage(id, patch) {
  set({ messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  persist();
}

export function deleteMessages(ids) {
  const drop = new Set(ids);
  set({ messages: state.messages.filter((m) => !drop.has(m.id)) });
  persist();
}

/* ----------------------------------------------------------------- usage ---- */

export function recordUsage(ev) {
  const event = { id: uid(), createdAt: new Date().toISOString(), ...ev };
  set({ usage: [...state.usage, event] });
  persist();
  return event;
}

/* -------------------------------------------------------------- settings ---- */

export function setSettings(patch) {
  set({ settings: { ...state.settings, ...patch } });
  persist();
}

export function deleteAllData() {
  vault.destroy();
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* ignore */
  }
  state = { ...initial, ready: true };
  emit();
}

/* --------------------------------------------------------------- selectors -- */

export function messagesFor(chatId) {
  return state.messages.filter((m) => m.chatId === chatId);
}

export function usageFor(apiKeyId) {
  return state.usage.filter((u) => u.apiKeyId === apiKeyId);
}
