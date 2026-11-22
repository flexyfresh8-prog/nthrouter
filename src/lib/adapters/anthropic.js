import { errorFromResponse, ProviderError } from "./request";
import { sseLines } from "./stream";

const base = (cfg) => (cfg.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");

/**
 * The browser needs an explicit opt-in header for direct Anthropic calls; without
 * it the request is blocked before it leaves the page.
 */
const headers = (cfg) => ({
  "content-type": "application/json",
  "x-api-key": cfg.apiKey,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
});

export const anthropicAdapter = {
  type: "anthropic",
  label: "Anthropic Messages",

  async validateKey(cfg) {
    const started = Date.now();
    try {
      const res = await fetch(`${base(cfg)}/v1/models?limit=1`, { headers: headers(cfg) });
      const latencyMs = Date.now() - started;
      if (res.ok) return { status: "valid", latencyMs };
      if (res.status === 401 || res.status === 403) return { status: "invalid", latencyMs };
      if (res.status === 429) return { status: "rate_limited", latencyMs };
      return { status: "unknown", latencyMs, message: `Provider answered ${res.status}` };
    } catch {
      return { status: "unknown", latencyMs: null, message: "Network or CORS blocked the test request." };
    }
  },

  // Anthropic has no public per-key usage endpoint: Console only. Shown as Unavailable.
  async getAccountInfo() {
    return { available: false, reason: "Anthropic reports usage in the Console, not to API keys." };
  },

  async getUsage() {
    return { available: false, reason: "Anthropic does not expose usage to API keys." };
  },

  async listModels(cfg) {
    const res = await fetch(`${base(cfg)}/v1/models?limit=100`, { headers: headers(cfg) });
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);
    const json = await res.json();
    return (json.data || []).map((x) => x.id);
  },

  async chat(cfg, req, handlers = {}) {
    const { model, messages, params = {}, signal } = req;

    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const body = {
      model,
      max_tokens: params.maxTokens || 2048,
      temperature: params.temperature ?? 0.6,
      messages: turns,
      stream: true,
    };
    if (system) body.system = system;

    const res = await fetch(`${base(cfg)}/v1/messages`, {
      method: "POST",
      headers: headers(cfg),
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);

    let text = "";
    let input = 0;
    let output = 0;

    for await (const data of sseLines(res)) {
      let json;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      if (json.type === "error") throw new ProviderError("request_failed", json.error?.message || "Anthropic reported an error.");
      if (json.type === "message_start") input = json.message?.usage?.input_tokens ?? 0;
      if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
        text += json.delta.text;
        handlers.onDelta?.(json.delta.text);
      }
      if (json.type === "message_delta") output = json.usage?.output_tokens ?? output;
    }

    return { text, usage: input || output ? { input, output } : null };
  },
};