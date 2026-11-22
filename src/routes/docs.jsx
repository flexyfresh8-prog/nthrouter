import { ArrowLeft, RefreshCw } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { PROVIDERS } from "@/lib/providers/catalog";
import { MODELS } from "@/lib/models";

function Section({ title, children }) {
  return (
    <section className="anim-rise mt-7">
      <h2 className="text-[16px]">{title}</h2>
      <div className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Docs() {
  return (
    <div className="mx-auto w-full max-w-[780px] px-5 pt-12 pb-8 md:px-10 md:pt-14">
      <button onClick={() => navigate({ to: "/settings" })} className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Settings
      </button>

      <h1 className="anim-rise mt-4 text-[26px] leading-tight">How NthRouter works</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {PROVIDERS.length} providers, {MODELS.length} seed models, five adapters, one encrypted vault.
      </p>

      <Section title="Auto model selection">
        <p>
          Auto scores every model you hold a key for — free models get a large head start, then context headroom, reasoning
          capability, reliability and latency decide. The pick is shown with its reasons, so nothing is magic. If a free
          model exists on a keyed provider it wins; otherwise your paid key still works (the original app refused here —
          that was the bug that made chat silent).
        </p>
      </Section>

      <Section title="Key rotation">
        <p>
          When a turn fails because a key ran out — quota, balance, or rate limit — the router marks that key with a
          cooldown and immediately retries the whole turn on your next key: same provider first, then any other provider
          that can serve the model. The chat shows a small banner when a rotation happens, and each key card shows its
          rotation history.
        </p>
        <p>
          Cooldowns expire by themselves; over-limit keys also clear when their reset date passes. Everything stays
          local — no server ever learns which key failed.
        </p>
      </Section>

      <Section title="Adding a provider">
        <p>
          A new OpenAI-compatible provider needs no code: add an entry to the provider catalog with its name, category,
          base URL and <span className="font-mono">adapterType: "openai"</span>. It appears in the picker immediately,
          and each key can override the base URL (Azure, Databricks, Cloudflare and local runtimes all need that).
        </p>
        <p>Write a new adapter only when the wire format differs. The contract is five methods:</p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">
{`validateKey(cfg)      -> { status, latencyMs, message? }
getAccountInfo(cfg)   -> { available, plan?, limit?, used?, reason? }
getUsage(cfg)         -> { available, ... }
listModels(cfg)       -> string[]
chat(cfg, request, handlers) -> { text, usage }`}
        </pre>
      </Section>

      <Section title="How plan and usage reporting works">
        <p>
          NthRouter never invents plan data. Each adapter's <span className="font-mono">getAccountInfo</span> returns
          either real numbers or <span className="font-mono">{"{ available: false, reason }"}</span>. When the provider
          reports nothing (OpenAI, Anthropic, Google and most hosts keep quota behind a web console), the key card
          switches to locally tracked accounting: tokens and request counts recorded from this browser's own turns —
          which are exact — plus whatever plan name, monthly token limit and reset date you set manually.
        </p>
        <p>
          <strong className="text-foreground">Available:</strong> OpenRouter exposes key credit, limit and rate-limit
          data to an API key; OpenAI-compatible hosts with <span className="font-mono">/dashboard/billing/*</span> get
          real dollar figures. Local runtimes report no provider quota, which is itself accurate.
        </p>
      </Section>

      <Section title="Token accounting">
        <p>
          When the provider returns usage in the stream (OpenAI-compatible with <span className="font-mono">include_usage</span>,
          Anthropic message deltas, Gemini usage metadata) the figure is exact. Otherwise NthRouter estimates from the
          text and the UI labels it "approx.". Every request is stored locally with input, output and total tokens, so
          the dashboard totals are sums of real records — and each key's bar is those events filtered by key.
        </p>
      </Section>

      <Section title="The vault">
        <p>
          Keys are encrypted with AES-GCM using a key derived from your PIN (PBKDF2, 210,000 iterations, SHA-256) and
          stored as one blob in localStorage. The derived key lives only in memory while unlocked. NthRouter has no
          backend, so nobody can recover the PIN — 6+ digits recommended.
        </p>
      </Section>
    </div>
  );
}
