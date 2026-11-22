/**
 * Key rotation.
 *
 * When a turn fails because a key ran out (quota / rate limit) the engine picks
 * the NEXT key and retries the turn, transparently:
 *
 *   1. same provider, next key in list order (round-robin, starting after the
 *      one that just failed),
 *   2. if that provider has no keys left, any other provider that can serve
 *      the same model family, preferring free models,
 *   3. if nothing is left, the failure surfaces to the UI with everything that
 *      was tried, so the user knows exactly why.
 *
 * A key that hit its limit gets a cooldown (default 60s for rate limits, reset
 * date for quota), and once EVERY key is on cooldown the user sees a toast.
 * Rotation is reported through onRotate so the chat can show a subtle banner:
 * "Switched to <provider> — <label> · reason".
 */

const COOLDOWN_MS = 60_000;

function providerKeys(providerId, keys) {
  return keys.filter((k) => k.providerId === providerId);
}

/** Keys for providers OTHER than the current one that can serve `model`. */
function fallbackKeys(model, keys, { excludeProviderIds, usable }) {
  const usableIds = new Set(usable.map((k) => k.id));
  return keys.filter((k) => {
    if (excludeProviderIds.has(k.providerId)) return false;
    if (!usableIds.has(k.id)) return false;
    return true;
  });
}

/**
 * Runs one chat turn with automatic key rotation.
 *
 * @param {object} p
 * @param {object} p.runOnce  (apiKey, model) -> result of one attempt
 * @param {object} p.model    the model chosen for this turn
 * @param {Array}  p.keys     all stored keys
 * @param {object} p.actions  { markCooldown, markExhausted, markInvalid }
 * @param {Function} p.onRotate ({ from, to, reason }) => void
 */
export async function withRotation({ model, keys, usage, attempt, actions = {}, onRotate }) {
  const markCooldown = actions.markCooldown || (() => {});
  const markExhausted = actions.markExhausted || (() => {});
  const markInvalid = actions.markInvalid || (() => {});

  const usable = keys.filter(
    (k) => k.status !== "invalid" && !(k.cooldownUntil && new Date(k.cooldownUntil).getTime() > Date.now())
  );

  // Attempt order: current provider's keys (round robin from the first usable),
  // then every other usable key, free providers first.
  const sameProvider = usable.filter((k) => k.providerId === model.providerId);
  const others = usable
    .filter((k) => k.providerId !== model.providerId)
    .sort((a, b) => {
      const af = a.isFree ? 0 : 1;
      const bf = b.isFree ? 0 : 1;
      return af - bf;
    });

  const order = [...sameProvider, ...others];
  const tried = [];
  let lastError = null;

  for (let i = 0; i < order.length; i++) {
    const apiKey = order[i];
    try {
      const result = await attempt(apiKey, i > 0);
      return { ...result, apiKey, rotated: i > 0, attempts: tried.length + 1 };
    } catch (err) {
      tried.push({ apiKeyId: apiKey.id, label: apiKey.label || apiKey.providerId, error: err });
      lastError = err;

      // Classify the failure and punish only the key that caused it.
      switch (err?.code) {
        case "rate_limited":
          markCooldown(apiKey.id, new Date(Date.now() + COOLDOWN_MS).toISOString());
          break;
        case "invalid_key":
          markInvalid(apiKey.id);
          break;
        case "quota_exceeded":
          markExhausted(apiKey.id);
          markCooldown(apiKey.id, apiKey.resetAt || new Date(Date.now() + COOLDOWN_MS).toISOString());
          break;
        case "context_overflow":
        case "not_found":
        case "provider_outage":
        case "no_stream":
        case "request_failed":
          // Provider-wide or conversation-wide: rotating rarely helps, but
          // trying the next key once is cheap and sometimes rescues the turn.
          break;
        default:
          break;
      }

      if (i < order.length - 1) {
        onRotate?.({
          from: apiKey,
          to: order[i + 1],
          reason: err?.code,
        });
      }
    }
  }

  return {
    error: {
      code: lastError?.code || "request_failed",
      message: lastError?.message || "Every key failed.",
      tried,
    },
  };
}

export function rotationOrder(model, keys, usage = []) {
  const usable = keys.filter(
    (k) => k.status !== "invalid" && !(k.cooldownUntil && new Date(k.cooldownUntil).getTime() > Date.now())
  );
  const same = usable.filter((k) => k.providerId === model.providerId);
  const others = usable.filter((k) => k.providerId !== model.providerId);
  return { same, others, total: usable.length };
}
