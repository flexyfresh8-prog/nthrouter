/**
 * Auto model picker.
 *
 * FIX (this was the "no reply even with a saved key" bug): the old picker
 * considered ONLY free models and bailed with `no_free` otherwise. Now the
 * candidate pool is every model on a provider you hold a key for; free models
 * get a big head start in the score, so they still win whenever they exist.
 * Keys that are cooling down or over their limit are filtered out here so
 * rotation starts from the healthiest usable key.
 */

const EFFORT_PROFILE = {
  1: { reasoning: 0.15, speed: 1 },
  2: { reasoning: 0.4, speed: 0.8 },
  3: { reasoning: 0.65, speed: 0.6 },
  4: { reasoning: 0.9, speed: 0.35 },
  5: { reasoning: 1, speed: 0.2 },
};

export function scoreModel(model, { effort = 2, promptTokens = 0, need = {} } = {}) {
  const profile = EFFORT_PROFILE[effort] || EFFORT_PROFILE[2];
  const caps = model.capabilities || [];
  const reasons = [];
  let score = 0;

  if (model.isFree) {
    score += 40;
    reasons.push("Free");
  }

  const ctx = model.contextWindow || 0;
  if (promptTokens > 0 && ctx > 0) {
    const headroom = ctx / Math.max(promptTokens * 3, 1);
    if (headroom >= 1) {
      score += Math.min(15, 8 + 7 * Math.min(1, headroom / 8));
      reasons.push(`${Math.round(ctx / 1000)}k context`);
    } else {
      score -= 30;
    }
  } else if (ctx) {
    score += 8;
    reasons.push(`${Math.round(ctx / 1000)}k context`);
  }

  if (caps.includes("reasoning")) {
    score += 22 * profile.reasoning;
    if (effort >= 3) reasons.push("reasoning");
  }

  score += 12 * profile.speed * (model.latencyScore ?? 0.5);
  score += 16 * (model.reliabilityScore ?? 0.5);
  score -= 8 * (model.rateLimitRisk ?? 0);

  for (const cap of ["vision", "tools", "coding"]) {
    if (!need[cap]) continue;
    if (caps.includes(cap)) score += 8;
    else score -= 25;
  }

  if ((model.reliabilityScore ?? 0) >= 0.85) reasons.push("reliable");
  if ((model.latencyScore ?? 0) >= 0.8 && effort <= 2) reasons.push("fast");

  return { score, reasons };
}

/** Keys usable right now: not invalid, not cooling down, not over their limit. */
export function usableKeys(keys, { usage, now = Date.now() } = {}) {
  return keys.filter((k) => {
    if (k.status === "invalid") return false;
    if (k.cooldownUntil && new Date(k.cooldownUntil).getTime() > now) return false;
    const limit = k.manualLimit ?? k.account?.limit ?? null;
    if (limit) {
      const used = (usage || []).filter((u) => u.apiKeyId === k.id).reduce((n, u) => n + (u.totalTokens || 0), 0);
      if (used >= limit) {
        // Over the limit and no reset date (or reset hasn't arrived) -> unusable.
        if (!k.resetAt || new Date(k.resetAt).getTime() > now) return false;
      }
    }
    return true;
  });
}

export function pickModel({ models, keys, effort = 2, promptTokens = 0, need = {}, usage = [] }) {
  const usable = usableKeys(keys, { usage });
  const connected = new Set(usable.map((k) => k.providerId));
  const pool = models.filter((m) => connected.has(m.providerId));
  if (!pool.length) {
    // Distinguish "no keys at all" from "keys exist but all are cooling down / over limit".
    const anyConnected = new Set(keys.map((k) => k.providerId));
    const anyPool = models.filter((m) => anyConnected.has(m.providerId));
    if (anyPool.length) return { model: null, reason: "all_keys_unavailable", alternatives: anyPool.slice(0, 4) };
    return { model: null, reason: "no_keys" };
  }

  const fitting = promptTokens > 0 ? pool.filter((m) => (m.contextWindow || 0) > promptTokens * 1.2) : pool;
  if (!fitting.length) return { model: null, reason: "context", alternatives: pool.slice(0, 4) };

  const ranked = fitting
    .map((model) => ({ model, ...scoreModel(model, { effort, promptTokens, need }) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return { model: best.model, score: best.score, reasons: best.reasons, ranked };
}

export function explainPick(reasons) {
  return (reasons || []).slice(0, 4).join(" • ");
}
