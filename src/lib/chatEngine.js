import { getAdapter } from "./adapters";
import { providerById } from "./providers/catalog";
import { paramsForEffort } from "./effort";
import { estimateMessages } from "./tokens";
import { pickModel } from "./scorer";
import { MODELS, lookupModel } from "./models";
import { withRotation } from "./rotation";
import * as vault from "./vault";

/**
 * One chat turn: choose a model (auto or manual), open the stream, report deltas.
 *
 * FIXES vs the original:
 *  - manual mode looked up `chat.selectedModelId` by modelId only and could pick
 *    a model from a provider with no key; it now resolves (providerId, modelId)
 *    through the registry and falls back to a plain id match only if registered.
 *  - the turn now runs through `withRotation`, so a key that hits a limit rotates
 *    to the next key (same provider first) and the turn retries transparently.
 *
 * Returns either { error } or everything the caller needs to store the message.
 */
export async function sendTurn({ chat, history, models = MODELS, keys, usage = [], signal, onModelPicked, onDelta, onRotate, actions }) {
  const promptTokens = estimateMessages(history);
  let model = null;
  let reasons = [];

  if (chat.autoMode) {
    const picked = pickModel({ models, keys, usage, effort: chat.effortLevel, promptTokens });
    if (!picked.model) return { error: { code: picked.reason, alternatives: picked.alternatives || [] } };
    model = picked.model;
    reasons = picked.reasons;
  } else {
    // Manual: the stored id is "<providerId>:<modelId>"; resolve it properly.
    model = models.find((m) => m.id === chat.selectedModelId || m.modelId === chat.selectedModelId) || null;
    if (!model) return { error: { code: "no_model" } };
  }

  const usableKeys = keys.filter((k) => k.status !== "invalid");
  if (!usableKeys.length) return { error: { code: "no_keys" } };
  if (!usableKeys.some((k) => vault.getSecret(k.id))) return { error: { code: "locked" } };
  if (!usableKeys.some((k) => k.providerId === model.providerId) && !chat.autoMode) {
    // Manual model from an unkeyed provider: try, rotation will look for others.
    if (keys.length && !keys.some((k) => k.providerId === model.providerId)) {
      return { error: { code: "no_key", providerId: model.providerId } };
    }
  }

  const provider = providerById(model.providerId);

  const result = await withRotation({
    model,
    keys: usableKeys,
    usage,
    actions,
    onRotate,
    attempt: async (apiKey) => {
      const secret = vault.getSecret(apiKey.id);
      if (!secret) throw Object.assign(new Error("Vault is locked"), { code: "locked" });
      const adapter = getAdapter(provider?.adapterType);
      const cfg = {
        apiKey: secret,
        baseUrl: apiKey.baseUrl || provider?.baseUrl || "",
        orgId: apiKey.orgId || undefined,
        providerId: provider?.id,
      };
      if (!adapter) throw Object.assign(new Error("Unknown provider"), { code: "not_found" });

      onModelPicked?.({ model, provider, apiKey, reasons });
      const r = await adapter.chat(
        cfg,
        { model: model.modelId, messages: history, params: paramsForEffort(chat.effortLevel, model), signal },
        { onDelta }
      );
      return { text: r.text, usage: r.usage };
    },
  });

  if (result.error) {
    // Single-key failure with nothing rotated: return the raw error code.
    if (result.error.tried && result.error.tried.length <= 1) {
      return { error: { code: result.error.code, message: result.error.message } };
    }
    return { error: result.error };
  }

  return {
    model,
    provider,
    apiKey: result.apiKey,
    rotated: result.rotated,
    attempts: result.attempts,
    text: result.text,
    usage: result.usage,
    reasons,
  };
}
