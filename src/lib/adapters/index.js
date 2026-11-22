import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openrouterAdapter } from "./openrouter";
import { localAdapter } from "./local";

/**
 * Adapter registry. Every provider in the catalog points at one of these five.
 *
 * Contract (all methods async unless noted):
 *   validateKey(cfg)                  -> { status: valid|invalid|rate_limited|unknown, latencyMs, message? }
 *   getAccountInfo(cfg)               -> { available: boolean, plan?, limit?, used?, resetAt?, reason? }
 *   getUsage(cfg)                     -> { available: boolean, ... }
 *   listModels(cfg)                   -> string[]
 *   chat(cfg, { model, messages, params, signal }, handlers)
 *                                     -> { text, usage: { input, output } | null }
 *
 * cfg = { apiKey, baseUrl, orgId, providerId }
 * handlers = { onDelta(text) }
 *
 * To add a provider: add a catalog entry (and a model or two). Only write a new
 * adapter when the wire format differs from these five.
 */
const ADAPTERS = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  openrouter: openrouterAdapter,
  local: localAdapter,
};

export function getAdapter(adapterType) {
  return ADAPTERS[adapterType] || ADAPTERS.openai;
}

export { ADAPTERS };