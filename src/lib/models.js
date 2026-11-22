/**
 * Seed model registry.
 *
 * Prices are USD per 1M tokens and are only used for an "approx." cost label —
 * always check the provider's own pricing page. `isFree` is deliberately
 * conservative: only models the provider prices at zero (OpenRouter `:free`
 * variants and local runtimes) are marked free.
 *
 * SEED_DATE records when this list was last eyeballed; re-verify before trusting it.
 */
const SEED_DATE = "2026-09-01";

const m = (providerId, modelId, displayName, contextWindow, inputPrice, outputPrice, isFree, capabilities, extra = {}) => ({
  id: `${providerId}:${modelId}`,
  providerId,
  modelId,
  displayName,
  contextWindow,
  inputPrice,
  outputPrice,
  isFree,
  capabilities,
  rateLimitNotes: extra.rateLimitNotes || "",
  reliabilityScore: extra.reliabilityScore ?? 0.8,
  latencyScore: extra.latencyScore ?? 0.5,
  rateLimitRisk: extra.rateLimitRisk ?? 0.2,
  lastVerifiedAt: SEED_DATE,
});

export const MODELS = [
  // OpenAI
  m("openai", "gpt-4o-mini", "GPT-4o mini", 128000, 0.15, 0.6, false, ["chat", "vision", "tools"], { latencyScore: 0.8, reliabilityScore: 0.92 }),
  m("openai", "gpt-4.1-mini", "GPT-4.1 mini", 1047576, 0.4, 1.6, false, ["chat", "vision", "tools"], { latencyScore: 0.7, reliabilityScore: 0.9 }),
  m("openai", "o4-mini", "o4-mini", 200000, 1.1, 4.4, false, ["chat", "reasoning", "tools"], { latencyScore: 0.4, reliabilityScore: 0.9 }),

  // Anthropic
  m("anthropic", "claude-haiku-4-5", "Claude Haiku 4.5", 200000, 1, 5, false, ["chat", "vision", "tools"], { latencyScore: 0.85, reliabilityScore: 0.93 }),
  m("anthropic", "claude-sonnet-4-5", "Claude Sonnet 4.5", 200000, 3, 15, false, ["chat", "vision", "tools", "reasoning"], { latencyScore: 0.55, reliabilityScore: 0.95 }),

  // Google
  m("google", "gemini-2.5-flash", "Gemini 2.5 Flash", 1048576, 0.3, 2.5, false, ["chat", "vision", "tools", "reasoning"], { latencyScore: 0.85, reliabilityScore: 0.9 }),
  m("google", "gemini-2.5-pro", "Gemini 2.5 Pro", 1048576, 1.25, 10, false, ["chat", "vision", "tools", "reasoning"], { latencyScore: 0.5, reliabilityScore: 0.92 }),
  m("google", "gemini-2.0-flash", "Gemini 2.0 Flash", 1048576, 0.1, 0.4, false, ["chat", "vision", "tools"], { latencyScore: 0.9, reliabilityScore: 0.88 }),

  // DeepSeek
  m("deepseek", "deepseek-chat", "DeepSeek V3", 65536, 0.27, 1.1, false, ["chat", "tools"], { latencyScore: 0.6, reliabilityScore: 0.85 }),
  m("deepseek", "deepseek-reasoner", "DeepSeek R1", 65536, 0.55, 2.19, false, ["chat", "reasoning"], { latencyScore: 0.35, reliabilityScore: 0.84 }),

  // Groq
  m("groq", "llama-3.3-70b-versatile", "Llama 3.3 70B", 131072, 0.59, 0.79, false, ["chat", "tools"], { latencyScore: 0.95, reliabilityScore: 0.86, rateLimitRisk: 0.4, rateLimitNotes: "Free tier is request-per-minute limited." }),
  m("groq", "llama-3.1-8b-instant", "Llama 3.1 8B Instant", 131072, 0.05, 0.08, false, ["chat"], { latencyScore: 0.98, reliabilityScore: 0.82, rateLimitRisk: 0.4 }),

  // OpenRouter free variants — genuinely priced at zero
  m("openrouter", "deepseek/deepseek-r1:free", "DeepSeek R1 (free)", 163840, 0, 0, true, ["chat", "reasoning"], { latencyScore: 0.4, reliabilityScore: 0.78, rateLimitRisk: 0.6, rateLimitNotes: "Free tier: daily request cap." }),
  m("openrouter", "meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B (free)", 65536, 0, 0, true, ["chat"], { latencyScore: 0.65, reliabilityScore: 0.8, rateLimitRisk: 0.55 }),
  m("openrouter", "qwen/qwen-2.5-72b-instruct:free", "Qwen 2.5 72B (free)", 32768, 0, 0, true, ["chat"], { latencyScore: 0.6, reliabilityScore: 0.75, rateLimitRisk: 0.6 }),
  m("openrouter", "google/gemini-2.0-flash-exp:free", "Gemini 2.0 Flash (free)", 1048576, 0, 0, true, ["chat", "vision"], { latencyScore: 0.85, reliabilityScore: 0.8, rateLimitRisk: 0.55 }),

  // Inference hosts
  m("cerebras", "llama3.1-8b", "Llama 3.1 8B", 32768, 0.1, 0.1, false, ["chat"], { latencyScore: 0.97, reliabilityScore: 0.8 }),
  m("together", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo", 131072, 0.88, 0.88, false, ["chat", "tools"], { latencyScore: 0.75, reliabilityScore: 0.84 }),
  m("mistral", "mistral-small-latest", "Mistral Small", 131072, 0.2, 0.6, false, ["chat", "tools"], { latencyScore: 0.8, reliabilityScore: 0.85 }),
  m("xai", "grok-3-mini", "Grok 3 mini", 131072, 0.3, 0.5, false, ["chat", "reasoning"], { latencyScore: 0.65, reliabilityScore: 0.82 }),
  m("cohere", "command-r-plus-08-2024", "Command R+", 128000, 2.5, 10, false, ["chat", "tools"], { latencyScore: 0.55, reliabilityScore: 0.83 }),
  m("perplexity", "sonar", "Sonar", 127072, 1, 1, false, ["chat"], { latencyScore: 0.7, reliabilityScore: 0.82 }),
  m("moonshot", "kimi-k2-0905-preview", "Kimi K2", 262144, 0.6, 2.5, false, ["chat", "tools"], { latencyScore: 0.5, reliabilityScore: 0.8 }),
  m("zhipu", "glm-4-flash", "GLM-4 Flash", 131072, 0, 0, true, ["chat"], { latencyScore: 0.85, reliabilityScore: 0.82, rateLimitRisk: 0.2 }),

  // Local runtimes — free because they run on your own hardware
  m("ollama", "llama3.2", "Llama 3.2 (local)", 131072, 0, 0, true, ["chat"], { latencyScore: 0.5, reliabilityScore: 0.9, rateLimitRisk: 0 }),
  m("ollama", "qwen2.5:7b", "Qwen 2.5 7B (local)", 32768, 0, 0, true, ["chat"], { latencyScore: 0.55, reliabilityScore: 0.88, rateLimitRisk: 0 }),
  m("ollama", "phi4:14b", "Phi-4 14B (local)", 16384, 0, 0, true, ["chat", "reasoning"], { latencyScore: 0.45, reliabilityScore: 0.87, rateLimitRisk: 0 }),
  m("lmstudio", "local-model", "LM Studio model", 32768, 0, 0, true, ["chat"], { latencyScore: 0.5, reliabilityScore: 0.85, rateLimitRisk: 0 }),
  m("llamacpp", "local-model", "llama.cpp model", 16384, 0, 0, true, ["chat"], { latencyScore: 0.5, reliabilityScore: 0.8, rateLimitRisk: 0 }),
];

export const MODELS_BY_ID = Object.fromEntries(MODELS.map((x) => [x.id, x]));

export function lookupModel(providerId, modelId) {
  return MODELS.find((x) => x.providerId === providerId && x.modelId === modelId) || null;
}

export function modelsForProvider(providerId) {
  return MODELS.filter((x) => x.providerId === providerId);
}