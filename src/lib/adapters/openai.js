import { errorFromResponse, ProviderError } from "./request";
import { sseLines } from "./stream";

const base = (cfg) => (cfg.baseUrl || "").replace(/\/+$/, "");

function headers(cfg) {
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` };
  if (cfg.orgId) h["OpenAI-Organization"] = cfg.orgId;
  return { ...h, ...(cfg.extraHeaders || {}) };
}

/**
 * Generic OpenAI-compatible adapter. This covers most of the catalog: change the
 * base URL and the same code talks to Groq, Together, DeepSeek, vLLM and friends.
 */
export const openaiAdapter = {
  type: "openai",
  label: "OpenAI-compatible",

  async validateKey(cfg) {
    const started = Date.now();
    try {
      const res = await fetch(`${base(cfg)}/models`, { headers: headers(cfg) });
      const latencyMs = Date.now() - started;
      if (res.ok) return { status: "valid", latencyMs };
      if (res.status === 401 || res.status === 403) return { status: "invalid", latencyMs };
      if (res.status === 429) return { status: "rate_limited", latencyMs };
      return { status: "unknown", latencyMs, message: `Provider answered ${res.status}` };
    } catch {
      return { status: "unknown", latencyMs: null, message: "Network or CORS blocked the test request." };
    }
  },

  // Plan/usage endpoints are provider-specific. OpenAI-compatible hosts that
  // expose /dashboard/billing/* get real numbers; everyone else reports
  // "unavailable" so the UI falls back to the locally tracked token totals
  // (which are exact for this browser's own requests).
  async getAccountInfo(cfg) {
    const b = base(cfg);
    try {
      const [usageRes, subRes] = await Promise.allSettled([
        fetch(`${b}/dashboard/billing/usage?start_date=2026-01-01&end_date=2027-01-01`, { headers: headers(cfg) }),
        fetch(`${b}/dashboard/billing/subscription`, { headers: headers(cfg) }),
      ]);
      if (usageRes.status === "fulfilled" && usageRes.value?.ok && subRes.status === "fulfilled" && subRes.value?.ok) {
        const usage = await usageRes.value.json().catch(() => null);
        const sub = await subRes.value.json().catch(() => null);
        if (usage?.total_usage != null || sub?.hard_limit_usd != null) {
          return {
            available: true,
            plan: "API credits",
            limit: sub?.hard_limit_usd != null ? `US$${sub.hard_limit_usd}` : null,
            used: usage?.total_usage != null ? `US$${(usage.total_usage / 100).toFixed(2)}` : null,
            resetAt: null,
            note: "Reported by the provider's billing endpoints.",
          };
        }
      }
    } catch {
      /* fall through */
    }
    return { available: false, reason: "This provider does not expose plan or usage data to API keys." };
  },

  async getUsage() {
    return { available: false, reason: "No usage endpoint is available for this provider." };
  },

  async listModels(cfg) {
    const res = await fetch(`${base(cfg)}/models`, { headers: headers(cfg) });
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);
    const json = await res.json();
    return (json.data || []).map((x) => x.id).filter(Boolean);
  },

  async chat(cfg, req, handlers = {}) {
    const { model, messages, params = {}, signal } = req;
    const body = {
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    };
    if (params.reasoningEffort) body.reasoning_effort = params.reasoningEffort;

    const res = await fetch(`${base(cfg)}/chat/completions`, {
      method: "POST",
      headers: headers(cfg),
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);
    if (!res.body) throw new ProviderError("no_stream", "The provider did not return a stream.");

    let text = "";
    let usage = null;

    for await (const data of sseLines(res)) {
      if (data === "[DONE]") break;
      let json;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      if (json.usage) usage = { input: json.usage.prompt_tokens ?? 0, output: json.usage.completion_tokens ?? 0 };
      if (json.error) throw new ProviderError("request_failed", json.error.message || "The provider reported an error.");
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        handlers.onDelta?.(delta);
      }
    }

    return { text, usage };
  },
};