/** Shared error handling for every adapter. Keys are scrubbed from all messages. */

export class ProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}

export function redact(text, secret) {
  if (text == null) return "";
  let out = String(text);
  if (secret) out = out.split(secret).join("[redacted]");
  return out.replace(/\b(sk|rk|key|token)[-_ ]?[A-Za-z0-9_-]{10,}/gi, "[redacted]");
}

export function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function toProviderError(status, body, secret) {
  const raw = body?.error?.message || body?.message || body?.detail || (typeof body === "string" ? body : "");
  const detail = redact(raw, secret).slice(0, 220);
  const quota =
    /quota|billing|exceeded your current quota|insufficient|credit|balance|limit reached|usage limit/i.test(detail) ||
    (typeof body?.error?.code === "string" && /quota|insufficient|billing/i.test(body.error.code));

  if (status === 401 || status === 403) return new ProviderError("invalid_key", "The provider rejected this key.");
  if (status === 404) return new ProviderError("not_found", "The endpoint was not found. Check the base URL.");
  if (status === 429 && quota) return new ProviderError("quota_exceeded", "This key's quota or balance is used up.");
  if (status === 429) return new ProviderError("rate_limited", "Rate limited by the provider. Try again shortly.");
  if (quota) return new ProviderError("quota_exceeded", "This key's quota or balance is used up.");
  if (status === 400 && /context|token length|too long/i.test(detail))
    return new ProviderError("context_overflow", "This conversation is longer than the model's context window.");
  if (status >= 500) return new ProviderError("provider_outage", "The provider returned a server error.");
  return new ProviderError("request_failed", detail || `The provider answered ${status}.`);
}

export async function errorFromResponse(res, secret) {
  let body = null;
  try {
    const text = await res.text();
    body = safeJson(text) || text;
  } catch {
    body = null;
  }
  return toProviderError(res.status, body, secret);
}