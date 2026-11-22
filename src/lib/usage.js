/** Token aggregation helpers. All figures come from locally stored usage events. */

export function sumTokens(events) {
  return events.reduce((n, e) => n + (e.totalTokens || 0), 0);
}

export function sinceStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sinceStartOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function filterSince(events, ms) {
  return events.filter((e) => new Date(e.createdAt).getTime() >= ms);
}

/** Share of tokens that came from provider-reported usage rather than an estimate. */
export function exactShare(events) {
  const total = sumTokens(events);
  if (!total) return 0;
  const exact = events.filter((e) => e.exact).reduce((n, e) => n + (e.totalTokens || 0), 0);
  return Math.round((exact / total) * 100);
}

function group(events, keyOf) {
  const map = new Map();
  for (const e of events) {
    const k = keyOf(e) || "unknown";
    map.set(k, (map.get(k) || 0) + (e.totalTokens || 0));
  }
  return [...map.entries()]
    .map(([key, tokens]) => ({ key, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
}

export const byProvider = (events) => group(events, (e) => e.providerId);
export const byModel = (events) => group(events, (e) => e.modelId);
export const byChat = (events) => group(events, (e) => e.chatId);

export function usedByKey(events, apiKeyId) {
  return events.filter((e) => e.apiKeyId === apiKeyId).reduce((n, e) => n + (e.totalTokens || 0), 0);
}

export function requestsByKey(events, apiKeyId) {
  return events.filter((e) => e.apiKeyId === apiKeyId).length;
}