import { errorFromResponse } from "./request";
import { openaiAdapter } from "./openai";

const base = (cfg) => (cfg.baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");

/**
 * OpenRouter is the one provider here that really does expose credit and rate-limit
 * data to an API key, so its plan card shows live numbers instead of "Unavailable".
 */
export const openrouterAdapter = {
  type: "openrouter",
  label: "OpenRouter",

  async validateKey(cfg) {
    const started = Date.now();
    try {
      const res = await fetch(`${base(cfg)}/key`, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
      const latencyMs = Date.now() - started;
      if (res.ok) return { status: "valid", latencyMs };
      if (res.status === 401 || res.status === 403) return { status: "invalid", latencyMs };
      if (res.status === 429) return { status: "rate_limited", latencyMs };
      return { status: "unknown", latencyMs, message: `Provider answered ${res.status}` };
    } catch {
      return { status: "unknown", latencyMs: null, message: "Network or CORS blocked the test request." };
    }
  },

  async getAccountInfo(cfg) {
    try {
      const res = await fetch(`${base(cfg)}/key`, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
      if (!res.ok) return { available: false, reason: "OpenRouter did not return key details." };
      const json = await res.json();
      const d = json.data || {};
      return {
        available: true,
        plan: d.is_free_tier ? "Free tier" : "Credits",
        limit: d.limit ?? null,
        used: d.usage ?? 0,
        limitRemaining: d.limit_remaining ?? null,
        rateLimit: d.rate_limit ?? null,
        resetAt: null,
        note: "Reported live by OpenRouter's /key endpoint.",
      };
    } catch {
      return { available: false, reason: "Could not reach OpenRouter." };
    }
  },

  async getUsage(cfg) {
    try {
      const res = await fetch(`${base(cfg)}/credits`, { headers: { Authorization: `Bearer ${cfg.apiKey}` } });
      if (!res.ok) return { available: false, reason: "No credit endpoint for this key." };
      const json = await res.json();
      return { available: true, credits: json.data?.total_credits ?? null, used: json.data?.total_usage ?? null };
    } catch {
      return { available: false, reason: "Could not reach OpenRouter." };
    }
  },

  listModels(cfg) {
    return openaiAdapter.listModels(cfg);
  },

  chat(cfg, req, handlers) {
    return openaiAdapter.chat(
      { ...cfg, extraHeaders: { "HTTP-Referer": "https://keychat.app", "X-Title": "KeyChat" } },
      req,
      handlers
    );
  },
};

export { errorFromResponse };