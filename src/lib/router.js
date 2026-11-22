/**
 * Tiny history-based router. TanStack Router was overkill for a local-only app:
 * routes are flat, there is no loader data, and every page reads the same store.
 */

const listeners = new Set();

export function getCurrentPath() {
  return window.location.pathname || "/";
}

export function navigate({ to, params = {}, replace = false }) {
  let path = to;
  for (const [k, v] of Object.entries(params)) path = path.replace(`$${k}`, encodeURIComponent(v));
  if (path === getCurrentPath()) return;
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  listeners.forEach((l) => l(getCurrentPath()));
  window.scrollTo(0, 0);
}

export function onRouteChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
