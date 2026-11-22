import { getAdapter } from "./adapters";
import { providerById } from "./providers/catalog";
import * as vault from "./vault";
import { updateKey, getState } from "./store";
import { usedByKey, requestsByKey } from "./usage";

/** Builds the adapter config for a stored key. The secret is read from memory only. */
export function configFor(apiKey) {
  const provider = providerById(apiKey.providerId);
  const secret = vault.getSecret(apiKey.id);
  return {
    provider,
    secret,
    cfg: {
      apiKey: secret,
      baseUrl: apiKey.baseUrl || provider?.baseUrl || "",
      orgId: apiKey.orgId || undefined,
      providerId: provider?.id,
    },
  };
}

/**
 * Runs validation + account lookup and stores the result on the key record.
 *
 * FIX (plan reporting): a key whose provider exposes no account endpoint now
 * still gets a locally accurate "account" — the tokens this browser actually
 * spent on it and the manual limit the user set — instead of a bare
 * "Unavailable" card. When the provider does report data (OpenRouter, billing
 * endpoints), those numbers win and the local totals are shown alongside.
 */
export async function checkKey(apiKey, { usage = [] } = {}) {
  const { provider, secret, cfg } = configFor(apiKey);
  if (!provider) return { status: "unknown", message: "Unknown provider." };
  if (!secret) return { status: "unknown", message: "Unlock the vault to test this key." };

  const adapter = getAdapter(provider.adapterType);
  const [validation, account] = await Promise.all([
    adapter.validateKey(cfg),
    adapter.getAccountInfo(cfg).catch(() => ({ available: false, reason: "Account info unavailable." })),
  ]);

  const localTokens = usedByKey(usage, apiKey.id);
  const localRequests = requestsByKey(usage, apiKey.id);

  // Merge: provider-reported account data (when available) + always-present
  // local usage. The key detail page prefers provider numbers for plan/limit,
  // and always shows the local token totals (they are exact for this browser).
  const merged = {
    ...account,
    localTokens,
    localRequests,
    localSince: usage.find((u) => u.apiKeyId === apiKey.id)?.createdAt || null,
  };
  if (!account.available) {
    merged.plan = apiKey.planName || null;
    merged.limit = apiKey.manualLimit ?? null;
    merged.limitSource = apiKey.manualLimit ? "manual" : null;
    merged.used = localTokens;
    merged.note = "Locally tracked: tokens spent by this browser on this key.";
  }

  updateKey(apiKey.id, {
    status: validation.status,
    lastCheckedAt: new Date().toISOString(),
    account: merged,
  });

  return { ...validation, account: merged };
}

/** After a successful turn: clear stale rotation state on the winning key. */
export function noteSuccess(apiKeyId) {
  const k = getState().keys.find((x) => x.id === apiKeyId) || null;
  if (!k) return;
  const patch = {};
  if (k.cooldownUntil) patch.cooldownUntil = null;
  if (k.exhaustedAt) patch.exhaustedAt = null;
  if (Object.keys(patch).length) updateKey(apiKeyId, patch);
}
