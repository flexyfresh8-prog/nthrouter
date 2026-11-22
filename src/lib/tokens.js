/**
 * Token accounting.
 *
 * Providers that report usage give exact numbers. When they don't (most streaming
 * endpoints, local runtimes), we estimate and the UI labels the figure "approx.".
 * The estimator is a word/punctuation split at ~4 characters per token — good to
 * within roughly 10-20%, never presented as exact.
 */

export function estimateTokens(text) {
  if (!text) return 0;
  const chunks = String(text).trim().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const chunk of chunks) total += Math.max(1, Math.ceil(chunk.length / 4));
  return total;
}

export function estimateMessages(messages) {
  // +4 tokens per message for role/formatting overhead.
  return messages.reduce((n, msg) => n + estimateTokens(msg.content) + 4, 0);
}

export function costOf(model, inputTokens, outputTokens) {
  if (!model) return 0;
  const inCost = ((model.inputPrice || 0) * (inputTokens || 0)) / 1_000_000;
  const outCost = ((model.outputPrice || 0) * (outputTokens || 0)) / 1_000_000;
  return inCost + outCost;
}