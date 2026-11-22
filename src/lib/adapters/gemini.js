import { errorFromResponse, ProviderError } from "./request";
import { sseLines } from "./stream";

const base = (cfg) => (cfg.baseUrl || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");

export const geminiAdapter = {
  type: "gemini",
  label: "Google Gemini",

  async validateKey(cfg) {
    const started = Date.now();
    try {
      const res = await fetch(`${base(cfg)}/v1beta/models?key=${encodeURIComponent(cfg.apiKey)}`);
      const latencyMs = Date.now() - started;
      if (res.ok) return { status: "valid", latencyMs };
      if (res.status === 400 || res.status === 401 || res.status === 403) return { status: "invalid", latencyMs };
      if (res.status === 429) return { status: "rate_limited", latencyMs };
      return { status: "unknown", latencyMs, message: `Provider answered ${res.status}` };
    } catch {
      return { status: "unknown", latencyMs: null, message: "Network or CORS blocked the test request." };
    }
  },

  // Quota lives in Google AI Studio, not behind the API key.
  async getAccountInfo() {
    return { available: false, reason: "Google reports quota in AI Studio, not to API keys." };
  },

  async getUsage() {
    return { available: false, reason: "Google does not expose usage to API keys." };
  },

  async listModels(cfg) {
    const res = await fetch(`${base(cfg)}/v1beta/models?key=${encodeURIComponent(cfg.apiKey)}`);
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);
    const json = await res.json();
    return (json.models || []).map((x) => x.name?.replace("models/", "")).filter(Boolean);
  },

  async chat(cfg, req, handlers = {}) {
    const { model, messages, params = {}, signal } = req;

    const systemText = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    const body = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.6,
        maxOutputTokens: params.maxTokens || 2048,
      },
    };
    if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };

    const url = `${base(cfg)}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    if (!res.ok) throw await errorFromResponse(res, cfg.apiKey);

    let text = "";
    let usage = null;

    for await (const data of sseLines(res)) {
      let json;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      if (json.error) throw new ProviderError("request_failed", json.error.message || "Gemini reported an error.");
      const parts = json.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          text += part.text;
          handlers.onDelta?.(part.text);
        }
      }
      if (json.usageMetadata) {
        usage = {
          input: json.usageMetadata.promptTokenCount ?? 0,
          output: json.usageMetadata.candidatesTokenCount ?? 0,
        };
      }
    }

    return { text, usage };
  },
};