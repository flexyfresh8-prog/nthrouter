import { openaiAdapter } from "./openai";

const base = (cfg) => (cfg.baseUrl || "http://localhost:11434/v1").replace(/\/+$/, "");

/**
 * Ollama, LM Studio, llama.cpp, vLLM and LocalAI all speak the OpenAI wire format on
 * /v1, so chat is delegated. Validation also tries Ollama's native /api/tags so a
 * bare host URL still works.
 */
export const localAdapter = {
  type: "local",
  label: "Local runtime",

  async validateKey(cfg) {
    const started = Date.now();
    try {
      let res = await fetch(`${base(cfg)}/models`, { headers: { Authorization: `Bearer ${cfg.apiKey || "local"}` } });
      if (res.status === 404) {
        const host = base(cfg).replace(/\/v1$/, "");
        res = await fetch(`${host}/api/tags`);
      }
      const latencyMs = Date.now() - started;
      if (res.ok) return { status: "valid", latencyMs };
      return { status: "unknown", latencyMs, message: `Local server answered ${res.status}. Is it running?` };
    } catch {
      return { status: "unknown", latencyMs: null, message: "Could not reach the local server. Check the URL and CORS settings." };
    }
  },

  // Local runtimes have no plan or quota — this is real information, not a guess.
  async getAccountInfo() {
    return { available: true, plan: "Local", limit: null, used: null, note: "Runs on your own hardware. No provider quota." };
  },

  async getUsage() {
    return { available: false, reason: "Local runtimes do not report usage." };
  },

  listModels(cfg) {
    return openaiAdapter.listModels(cfg);
  },

  chat(cfg, req, handlers) {
    return openaiAdapter.chat({ ...cfg, apiKey: cfg.apiKey || "local" }, req, handlers);
  },
};