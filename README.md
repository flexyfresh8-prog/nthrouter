# NthRouter

A private, on-device control center for AI API keys — with a chat playground that **auto-rotates your keys when one runs out**.

NthRouter keeps every key encrypted in your browser (AES-GCM, PIN-derived key, 210k PBKDF2 iterations), talks directly to 78 providers through five wire-format adapters, scores models per turn, and records exact token usage per key. No backend, no sync, no telemetry.

## What it does

| Area | Behavior |
| --- | --- |
| **Chat** | Auto mode scores every model on a keyed provider (free models win ties), streams the reply, explains the pick. Manual mode picks any specific model. |
| **Key rotation** | When a key hits quota/balance/rate limits mid-turn, it gets a cooldown and the turn transparently retries on the next key — same provider first, then any other keyed provider. The chat shows a rotation banner; each key card shows its rotation state and count. |
| **Plan & token reporting** | Providers that expose account data (OpenRouter `/key`, OpenAI-style `/dashboard/billing/*`) show live numbers. Everyone else gets locally exact accounting: tokens, requests and cost recorded from this browser's own turns, against a manual plan limit and reset date. |
| **Vault** | One AES-GCM blob in localStorage. Secrets never leave the device except to the explicitly chosen provider. 15-second reveal, auto-lock on reload, wipe-everything in Settings. |

## The look

Warm, calm, Claude-flavoured: off-white background, serif display wordmark, one terracotta accent, charcoal dark mode. The boot sequence plays once per hard load — a breathing sigil, the wordmark inking itself in, orbiting routing dots, assembly steps — and every surface animates in (see `src/index.css`, the `anim-*` library, all `prefers-reduced-motion` safe).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ — plain static SPA, host anywhere
npm run lint
```

### End-to-end test (mock provider)

The repo ships a mock OpenAI-compatible provider that simulates a quota-exhausted key, plus a full browser test that proves the pipeline: chat replies with saved keys, a 429 on the first key rotates to the second, usage is recorded, and the UI reflects cooldown state.

```bash
node scripts/mock-provider.cjs &   # :8787 — 429s quota keys, streams valid keys
npm run dev &                      # :5173
node scripts/e2e.cjs               # 11 checks, incl. "rotation happened (429 then 200)"
```

## Architecture

```
src/
  lib/
    vault.js          AES-GCM secret storage (WebCrypto, PIN-derived key)
    store.js           local state (useSyncExternalStore + localStorage), toasts
    chatEngine.js     one turn: pick model → rotate keys → stream
    rotation.js       the retry ladder + cooldown/exhaustion marking
    scorer.js         auto model scoring (free-first, effort-weighted)
    adapters/         openai · anthropic · gemini · openrouter · local
    providers/catalog.js  78 providers, pure configuration
    models.js         29-model seed registry
    tokens.js usage.js effort.js format.js
  routes/             dashboard · keys · key detail · chat list · chat · settings · docs
  components/         BootScreen · Toasts · LockScreen · chat/* · keys/* · dashboard/*
```

Adding a provider is a catalog entry, not a new screen: `id`, `name`, `category`, `adapterType`, `baseUrl`, `docsUrl`. A new adapter is only needed when the wire format differs from the five shipped ones (`validateKey`, `getAccountInfo`, `getUsage`, `listModels`, `chat`).

## Notes

- Browser-direct calls depend on provider CORS policies; the Anthropic adapter already sends the direct-browser-access header. Validation degrades gracefully when CORS blocks a test.
- The model registry is a dated seed (see `SEED_DATE` in `models.js`); prices and free variants drift.
- The vault PIN is the only lock — there is no recovery, so use 6+ digits.

## Credits

Forked in spirit from the KeyChat Base44 export; rebuilt as a dependency-light Vite + React 19 SPA (~5 runtime deps) with the silent-chat bug fixed, plan reporting made locally exact, and rotation added.
