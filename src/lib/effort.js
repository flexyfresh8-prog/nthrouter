/** The five effort levels, the copy that explains them, and how they map to provider params. */

export const EFFORT_LEVELS = [
  {
    level: 1,
    key: "fast",
    label: "Fast",
    hint: "Smallest, quickest models. Cheapest and shortest answers.",
    reasoning: "low",
    temperature: 0.7,
    maxTokens: 1024,
  },
  {
    level: 2,
    key: "balanced",
    label: "Balanced",
    hint: "Good everyday quality without long waits.",
    reasoning: "low",
    temperature: 0.6,
    maxTokens: 2048,
  },
  {
    level: 3,
    key: "deep",
    label: "Deep",
    hint: "More thinking and structure. Noticeably slower.",
    reasoning: "medium",
    temperature: 0.5,
    maxTokens: 4096,
  },
  {
    level: 4,
    key: "max",
    label: "Max",
    hint: "Reasoning-capable models first. Slower, stronger.",
    reasoning: "high",
    temperature: 0.4,
    maxTokens: 8192,
  },
  {
    level: 5,
    key: "ultra",
    label: "Ultra",
    hint: "Largest thinking budget available. Slowest, most thorough.",
    reasoning: "high",
    temperature: 0.3,
    maxTokens: 16000,
  },
];

export function effortAt(level) {
  return EFFORT_LEVELS.find((e) => e.level === level) || EFFORT_LEVELS[1];
}

/**
 * Provider-specific request parameters for an effort level.
 * Only parameters the provider actually documents are emitted, so a high effort
 * never breaks a model that has no reasoning control.
 */
export function paramsForEffort(level, model) {
  const e = effortAt(level);
  const caps = model?.capabilities || [];
  const params = { temperature: e.temperature, maxTokens: e.maxTokens, reasoningEffort: undefined, thinkingBudget: undefined };

  if (caps.includes("reasoning") && level >= 4) {
    params.reasoningEffort = e.reasoning;
    if (level >= 4) params.thinkingBudget = level === 5 ? 8000 : 4000;
  } else if (level >= 3) {
    params.reasoningEffort = e.reasoning;
  }
  return params;
}