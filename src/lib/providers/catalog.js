
/**
 * Provider catalog.
 *
 * Adding a provider is configuration, not a new screen: append an entry here and
 * pick one of the five adapter types. `baseUrl` is only a default — every key can
 * override it (Azure, Databricks, Cloudflare and local runtimes need to).
 *
 * adapterType:
 *   "openai"     any OpenAI-compatible /chat/completions endpoint
 *   "anthropic"  Anthropic Messages API
 *   "gemini"     Google Generative Language API
 *   "openrouter" OpenRouter (OpenAI-compatible + real credit/limit endpoint)
 *   "local"      Ollama / LM Studio / llama.cpp / vLLM on your own machine
 */
export const PROVIDERS = [
  // Frontier labs
  { id: "openai", name: "OpenAI", category: "frontier", adapterType: "openai", baseUrl: "https://api.openai.com/v1", docsUrl: "https://platform.openai.com/docs" },
  { id: "anthropic", name: "Anthropic", category: "frontier", adapterType: "anthropic", baseUrl: "https://api.anthropic.com", docsUrl: "https://docs.anthropic.com" },
  { id: "google", name: "Google Gemini", category: "frontier", adapterType: "gemini", baseUrl: "https://generativelanguage.googleapis.com", docsUrl: "https://ai.google.dev/gemini-api/docs" },
  { id: "xai", name: "xAI", category: "frontier", adapterType: "openai", baseUrl: "https://api.x.ai/v1", docsUrl: "https://docs.x.ai" },
  { id: "mistral", name: "Mistral AI", category: "frontier", adapterType: "openai", baseUrl: "https://api.mistral.ai/v1", docsUrl: "https://docs.mistral.ai" },
  { id: "cohere", name: "Cohere", category: "frontier", adapterType: "openai", baseUrl: "https://api.cohere.ai/compatibility/v1", docsUrl: "https://docs.cohere.com" },
  { id: "deepseek", name: "DeepSeek", category: "frontier", adapterType: "openai", baseUrl: "https://api.deepseek.com/v1", docsUrl: "https://api-docs.deepseek.com" },
  { id: "ai21", name: "AI21 Labs", category: "frontier", adapterType: "openai", baseUrl: "https://api.ai21.com/studio/v1", docsUrl: "https://docs.ai21.com" },
  { id: "alephalpha", name: "Aleph Alpha", category: "frontier", adapterType: "openai", baseUrl: "https://api.aleph-alpha.com/v1", docsUrl: "https://docs.aleph-alpha.com" },
  { id: "reka", name: "Reka AI", category: "frontier", adapterType: "openai", baseUrl: "https://api.reka.ai/v1", docsUrl: "https://docs.reka.ai" },
  { id: "nvidia", name: "NVIDIA NIM", category: "frontier", adapterType: "openai", baseUrl: "https://integrate.api.nvidia.com/v1", docsUrl: "https://docs.nvidia.com/nim" },
  { id: "inclusion", name: "InclusionAI", category: "frontier", adapterType: "openai", baseUrl: "https://api.inclusion.ai/v1", docsUrl: "https://inclusion.ai" },

  // Regional providers
  { id: "zhipu", name: "Zhipu GLM", category: "regional", adapterType: "openai", baseUrl: "https://open.bigmodel.cn/api/paas/v4", docsUrl: "https://open.bigmodel.cn" },
  { id: "alibaba", name: "Alibaba Qwen", category: "regional", adapterType: "openai", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", docsUrl: "https://www.alibabacloud.com/help/en/model-studio" },
  { id: "moonshot", name: "Moonshot Kimi", category: "regional", adapterType: "openai", baseUrl: "https://api.moonshot.ai/v1", docsUrl: "https://platform.moonshot.ai/docs" },
  { id: "minimax", name: "MiniMax", category: "regional", adapterType: "openai", baseUrl: "https://api.minimax.io/v1", docsUrl: "https://www.minimax.io/platform" },
  { id: "bytedance", name: "ByteDance Doubao", category: "regional", adapterType: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", docsUrl: "https://www.volcengine.com/docs/82379" },
  { id: "baidu", name: "Baidu Qianfan", category: "regional", adapterType: "openai", baseUrl: "https://qianfan.baidubce.com/v2", docsUrl: "https://cloud.baidu.com/doc/WENXINWORKSHOP" },
  { id: "tencent", name: "Tencent Hunyuan", category: "regional", adapterType: "openai", baseUrl: "https://api.hunyuan.cloud.tencent.com/v1", docsUrl: "https://cloud.tencent.com/document/product/1729" },
  { id: "iflytek", name: "iFlytek Spark", category: "regional", adapterType: "openai", baseUrl: "https://spark-api-open.xf-yun.com/v1", docsUrl: "https://www.xfyun.cn/doc/spark" },
  { id: "stepfun", name: "StepFun", category: "regional", adapterType: "openai", baseUrl: "https://api.stepfun.com/v1", docsUrl: "https://platform.stepfun.com/docs" },
  { id: "baichuan", name: "Baichuan AI", category: "regional", adapterType: "openai", baseUrl: "https://api.baichuan-ai.com/v1", docsUrl: "https://platform.baichuan-ai.com/docs" },
  { id: "yi", name: "01.AI Yi", category: "regional", adapterType: "openai", baseUrl: "https://api.lingyiwanwu.com/v1", docsUrl: "https://platform.lingyiwanwu.com/docs" },
  { id: "upstage", name: "Upstage Solar", category: "regional", adapterType: "openai", baseUrl: "https://api.upstage.ai/v1", docsUrl: "https://developers.upstage.ai" },
  { id: "naver", name: "Naver HyperCLOVA X", category: "regional", adapterType: "openai", baseUrl: "https://clovastudio.stream.ntruss.com/v1/openai", docsUrl: "https://www.ncloud.com/product/aiService/clovaStudio" },
  { id: "sarvam", name: "Sarvam AI", category: "regional", adapterType: "openai", baseUrl: "https://api.sarvam.ai/v1", docsUrl: "https://docs.sarvam.ai" },
  { id: "krutrim", name: "Krutrim", category: "regional", adapterType: "openai", baseUrl: "https://cloud.olakrutrim.com/v1", docsUrl: "https://docs.olakrutrim.com" },
  { id: "g42", name: "G42 Jais", category: "regional", adapterType: "openai", baseUrl: "https://api.llama-api.com", docsUrl: "https://docs.g42.ai" },
  { id: "yandex", name: "Yandex GPT", category: "regional", adapterType: "openai", baseUrl: "https://llm.api.cloud.yandex.net/v1", docsUrl: "https://yandex.cloud/ru/docs/foundation-models" },
  { id: "gigachat", name: "GigaChat", category: "regional", adapterType: "openai", baseUrl: "https://gigachat.devices.sberbank.ru/api/v1", docsUrl: "https://developers.sber.ru/docs/ru/gigachat" },
  { id: "sakana", name: "Sakana AI", category: "regional", adapterType: "openai", baseUrl: "https://api.sakana.ai/v1", docsUrl: "https://sakana.ai" },
  { id: "pfn", name: "Preferred Networks", category: "regional", adapterType: "openai", baseUrl: "https://api.preferredai.jp/v1", docsUrl: "https://www.preferredai.jp" },
  { id: "senseNova", name: "SenseTime SenseNova", category: "regional", adapterType: "openai", baseUrl: "https://api.sensenova.cn/compatible-mode/v1", docsUrl: "https://platform.sensenova.cn" },
  { id: "huawei", name: "Huawei Pangu", category: "regional", adapterType: "openai", baseUrl: "https://api.modelarts-maas.com/v1", docsUrl: "https://www.huaweicloud.com/product/pangu" },

  // Inference hosts
  { id: "together", name: "Together AI", category: "inference", adapterType: "openai", baseUrl: "https://api.together.xyz/v1", docsUrl: "https://docs.together.ai" },
  { id: "fireworks", name: "Fireworks AI", category: "inference", adapterType: "openai", baseUrl: "https://api.fireworks.ai/inference/v1", docsUrl: "https://docs.fireworks.ai" },
  { id: "groq", name: "Groq", category: "inference", adapterType: "openai", baseUrl: "https://api.groq.com/openai/v1", docsUrl: "https://console.groq.com/docs" },
  { id: "cerebras", name: "Cerebras", category: "inference", adapterType: "openai", baseUrl: "https://api.cerebras.ai/v1", docsUrl: "https://inference-docs.cerebras.ai" },
  { id: "sambanova", name: "SambaNova", category: "inference", adapterType: "openai", baseUrl: "https://api.sambanova.ai/v1", docsUrl: "https://docs.sambanova.ai" },
  { id: "deepinfra", name: "DeepInfra", category: "inference", adapterType: "openai", baseUrl: "https://api.deepinfra.com/v1/openai", docsUrl: "https://deepinfra.com/docs" },
  { id: "hyperbolic", name: "Hyperbolic", category: "inference", adapterType: "openai", baseUrl: "https://api.hyperbolic.xyz/v1", docsUrl: "https://docs.hyperbolic.xyz" },
  { id: "nebius", name: "Nebius AI Studio", category: "inference", adapterType: "openai", baseUrl: "https://api.studio.nebius.com/v1", docsUrl: "https://docs.nebius.com" },
  { id: "novita", name: "Novita AI", category: "inference", adapterType: "openai", baseUrl: "https://api.novita.ai/v3/openai", docsUrl: "https://novita.ai/docs" },
  { id: "lambda", name: "Lambda", category: "inference", adapterType: "openai", baseUrl: "https://api.lambdalabs.com/v1", docsUrl: "https://docs.lambdalabs.com" },
  { id: "perplexity", name: "Perplexity", category: "inference", adapterType: "openai", baseUrl: "https://api.perplexity.ai", docsUrl: "https://docs.perplexity.ai" },
  { id: "friendli", name: "FriendliAI", category: "inference", adapterType: "openai", baseUrl: "https://api.friendli.ai/serverless/v1", docsUrl: "https://docs.friendli.ai" },
  { id: "kluster", name: "Kluster.ai", category: "inference", adapterType: "openai", baseUrl: "https://api.kluster.ai/v1", docsUrl: "https://docs.kluster.ai" },
  { id: "featherless", name: "Featherless AI", category: "inference", adapterType: "openai", baseUrl: "https://api.featherless.ai/v1", docsUrl: "https://featherless.ai/docs" },
  { id: "chutes", name: "Chutes", category: "inference", adapterType: "openai", baseUrl: "https://llm.chutes.ai/v1", docsUrl: "https://chutes.ai" },
  { id: "redpill", name: "RedPill", category: "inference", adapterType: "openai", baseUrl: "https://api.redpill.ai/v1", docsUrl: "https://redpill.ai" },
  { id: "venice", name: "Venice AI", category: "inference", adapterType: "openai", baseUrl: "https://api.venice.ai/api/v1", docsUrl: "https://docs.venice.ai" },
  { id: "anyscale", name: "Anyscale", category: "inference", adapterType: "openai", baseUrl: "https://api.endpoints.anyscale.com/v1", docsUrl: "https://docs.anyscale.com" },
  { id: "lepton", name: "Lepton AI", category: "inference", adapterType: "openai", baseUrl: "https://api.lepton.ai/v1", docsUrl: "https://www.lepton.ai" },
  { id: "azure", name: "Azure OpenAI", category: "inference", adapterType: "openai", baseUrl: "https://YOUR-RESOURCE.openai.azure.com/openai/v1", docsUrl: "https://learn.microsoft.com/azure/ai-services/openai" },
  { id: "databricks", name: "Databricks", category: "inference", adapterType: "openai", baseUrl: "https://YOUR-WORKSPACE.cloud.databricks.com/serving-endpoints", docsUrl: "https://docs.databricks.com/machine-learning/foundation-models" },
  { id: "cloudflare", name: "Cloudflare Workers AI", category: "inference", adapterType: "openai", baseUrl: "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/ai/v1", docsUrl: "https://developers.cloudflare.com/workers-ai" },

  // Gateways
  { id: "openrouter", name: "OpenRouter", category: "gateway", adapterType: "openrouter", baseUrl: "https://openrouter.ai/api/v1", docsUrl: "https://openrouter.ai/docs" },
  { id: "requesty", name: "Requesty", category: "gateway", adapterType: "openai", baseUrl: "https://router.requesty.ai/v1", docsUrl: "https://docs.requesty.ai" },
  { id: "unify", name: "Unify", category: "gateway", adapterType: "openai", baseUrl: "https://api.unify.ai/v1", docsUrl: "https://docs.unify.ai" },
  { id: "portkey", name: "Portkey", category: "gateway", adapterType: "openai", baseUrl: "https://api.portkey.ai/v1", docsUrl: "https://portkey.ai/docs" },
  { id: "aimlapi", name: "AI/ML API", category: "gateway", adapterType: "openai", baseUrl: "https://api.aimlapi.com/v1", docsUrl: "https://docs.aimlapi.com" },
  { id: "nanogpt", name: "NanoGPT", category: "gateway", adapterType: "openai", baseUrl: "https://nano-gpt.com/api/v1", docsUrl: "https://docs.nano-gpt.com" },
  { id: "edenai", name: "Eden AI", category: "gateway", adapterType: "openai", baseUrl: "https://api.edenai.run/v2", docsUrl: "https://docs.edenai.co" },

  // Local runtimes
  { id: "ollama", name: "Ollama", category: "local", adapterType: "local", baseUrl: "http://localhost:11434/v1", docsUrl: "https://docs.ollama.com" },
  { id: "lmstudio", name: "LM Studio", category: "local", adapterType: "local", baseUrl: "http://localhost:1234/v1", docsUrl: "https://lmstudio.ai/docs" },
  { id: "llamacpp", name: "llama.cpp server", category: "local", adapterType: "local", baseUrl: "http://localhost:8080/v1", docsUrl: "https://github.com/ggml-org/llama.cpp" },
  { id: "vllm", name: "vLLM", category: "local", adapterType: "local", baseUrl: "http://localhost:8000/v1", docsUrl: "https://docs.vllm.ai" },
  { id: "localai", name: "LocalAI", category: "local", adapterType: "local", baseUrl: "http://localhost:8080/v1", docsUrl: "https://localai.io" },
  { id: "jan", name: "Jan", category: "local", adapterType: "local", baseUrl: "http://localhost:1337/v1", docsUrl: "https://jan.ai/docs" },
  { id: "gpt4all", name: "GPT4All", category: "local", adapterType: "local", baseUrl: "http://localhost:4891/v1", docsUrl: "https://docs.gpt4all.io" },
  { id: "koboldcpp", name: "KoboldCpp", category: "local", adapterType: "local", baseUrl: "http://localhost:5001/v1", docsUrl: "https://github.com/LostRuins/koboldcpp" },
  { id: "litellm", name: "LiteLLM proxy", category: "local", adapterType: "local", baseUrl: "http://localhost:4000/v1", docsUrl: "https://docs.litellm.ai" },
  { id: "openwebui", name: "Open WebUI", category: "local", adapterType: "local", baseUrl: "http://localhost:3000/api", docsUrl: "https://docs.openwebui.com" },
];

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));

export const providerById = (id) => PROVIDER_MAP[id];

export const CATEGORIES = [
  { id: "frontier", label: "Frontier labs" },
  { id: "regional", label: "Regional" },
  { id: "inference", label: "Inference hosts" },
  { id: "gateway", label: "Gateways" },
  { id: "local", label: "Local runtimes" },
];

export const ADAPTER_LABELS = {
  openai: "OpenAI-compatible",
  anthropic: "Anthropic Messages",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  local: "Local runtime",
};