import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, Snowflake, Trash2 } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { useApp, deleteKey, updateKey, clearCooldown, toast } from "@/lib/store";
import { providerById } from "@/lib/providers/catalog";
import { checkKey } from "@/lib/keyActions";
import { usedByKey, requestsByKey } from "@/lib/usage";
import { compact, exactNumber, money, relativeTime, dateLabel, maskKey } from "@/lib/format";
import * as vault from "@/lib/vault";
import UsageBar from "@/components/dashboard/UsageBar";
import { cn } from "@/lib/utils";

const STATUS = {
  valid: { label: "Valid", cls: "border-emerald-700/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" },
  invalid: { label: "Invalid", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  rate_limited: { label: "Throttled", cls: "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-300" },
  unknown: { label: "Unchecked", cls: "border-border bg-muted text-muted-foreground" },
};

export default function KeyDetail({ keyId }) {
  const { keys, usage } = useApp();
  const [revealed, setRevealed] = useState(null);
  const [checking, setChecking] = useState(false);
  const [plan, setPlan] = useState(null);

  const apiKey = keys.find((k) => k.id === keyId);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(null), 15000);
    return () => clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (apiKey)
      setPlan({
        planName: apiKey.planName || "",
        manualLimit: apiKey.manualLimit ? String(apiKey.manualLimit) : "",
        resetAt: apiKey.resetAt ? apiKey.resetAt.slice(0, 10) : "",
      });
  }, [apiKey?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!apiKey) {
    return (
      <div className="px-5 pt-12">
        <button onClick={() => navigate({ to: "/keys" })} className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Keys
        </button>
        <p className="mt-6 text-[14px] text-muted-foreground">This key no longer exists.</p>
      </div>
    );
  }

  const provider = providerById(apiKey.providerId);
  const status = STATUS[apiKey.status] || STATUS.unknown;
  const used = usedByKey(usage, apiKey.id);
  const requests = requestsByKey(usage, apiKey.id);
  const limit = apiKey.manualLimit ?? null;
  const account = apiKey.account;
  const cooldown = apiKey.cooldownUntil && new Date(apiKey.cooldownUntil).getTime() > Date.now();

  async function refresh() {
    setChecking(true);
    await checkKey(apiKey, { usage });
    setChecking(false);
    toast("Key re-checked", { tone: "success", detail: `${provider?.name || "Provider"} responded.` });
  }

  async function savePlan(e) {
    e.preventDefault();
    updateKey(apiKey.id, {
      planName: plan.planName.trim(),
      planSource: plan.planName.trim() ? "manual" : "unknown",
      manualLimit: plan.manualLimit ? Number(plan.manualLimit) : null,
      resetAt: plan.resetAt ? new Date(plan.resetAt).toISOString() : null,
    });
    toast("Plan saved", { tone: "success" });
  }

  async function remove() {
    if (!confirm("Delete this key and its usage history?")) return;
    await deleteKey(apiKey.id);
    navigate({ to: "/keys" });
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pt-12 pb-6 md:px-10 md:pt-14">
      <button onClick={() => navigate({ to: "/keys" })} className="flex items-center gap-1 text-[13px] text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Keys
      </button>

      <div className="anim-rise mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] leading-tight">{provider?.name || apiKey.providerId}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{apiKey.label || "Unlabelled key"} · {provider?.adapterType || "Adapter"}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium", status.cls)}>{status.label}</span>
      </div>

      {/* Secret card */}
      <div className="anim-rise mt-5 rounded-2xl border border-border bg-card p-4" style={{ animationDelay: "60ms" }}>
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">API key</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <code className="truncate font-mono text-[13px]">
            {revealed ? revealed : `•••• •••• •••• ${vault.tailOf(vault.getSecret(apiKey.id)) || "••••"}`}
          </code>
          <button
            onClick={() => setRevealed(revealed ? null : vault.getSecret(apiKey.id))}
            className="flex shrink-0 items-center gap-1 text-[11.5px] text-primary"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? "Hide" : "Reveal"}
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Hidden again in 15s · stored encrypted on this device
        </p>
        <p className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">{apiKey.baseUrl || provider?.baseUrl}</p>
      </div>

      {/* Plan & limits — the fixed reporting */}
      <section className="anim-rise mt-6" style={{ animationDelay: "120ms" }}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium">Plan &amp; limits</h2>
          <button onClick={refresh} disabled={checking} className="flex items-center gap-1 text-[12px] text-primary disabled:opacity-50">
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px]">{account?.plan || apiKey.planName || "Unknown plan"}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                {account?.available ? "Detected from the provider" : account?.reason || apiKey.planName ? "Set manually" : "Plan data not available for this provider"}
              </p>
            </div>
          </div>

          {/* always-shown local token accounting */}
          <div className="mt-4">
            <UsageBar
              used={used}
              limit={limit}
              label="Tokens spent (this browser)"
              sub={`${exactNumber(used)} tokens across ${requests} request${requests === 1 ? "" : "s"} · resets ${apiKey.resetAt ? dateLabel(apiKey.resetAt) : "—"}`}
            />
          </div>

          {account?.limit && account.limit !== limit && (
            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Provider reports limit <span className="font-medium text-foreground/80">{String(account.limit)}</span>
              {account.used != null && (
                <>
                  {" "}· used <span className="font-medium text-foreground/80">{String(account.used)}</span>
                </>
              )}
              {account.note && <> — {account.note}</>}
            </div>
          )}

          <form onSubmit={savePlan} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium">Plan name</label>
              <input
                value={plan?.planName || ""}
                onChange={(e) => setPlan((p) => ({ ...p, planName: e.target.value }))}
                placeholder="e.g. Team"
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-[12.5px] outline-none focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium">Token limit</label>
              <input
                type="number"
                min="1"
                value={plan?.manualLimit || ""}
                onChange={(e) => setPlan((p) => ({ ...p, manualLimit: e.target.value }))}
                placeholder="500000"
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-[12.5px] outline-none focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium">Resets</label>
              <input
                type="date"
                value={plan?.resetAt || ""}
                onChange={(e) => setPlan((p) => ({ ...p, resetAt: e.target.value }))}
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-[12.5px] outline-none focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
              />
            </div>
            <button
              type="submit"
              className="mt-1 rounded-xl bg-primary px-4 py-2.5 text-[12.5px] font-medium text-primary-foreground sm:col-span-3 sm:w-max"
            >
              Save plan
            </button>
          </form>
        </div>
      </section>

      {/* Rotation state */}
      <section className="anim-rise mt-6" style={{ animationDelay: "180ms" }}>
        <h2 className="text-[15px] font-medium">Rotation</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          {cooldown ? (
            <span className="anim-pop flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-[11.5px] text-primary">
              <Snowflake className="h-3.5 w-3.5" /> Cooling down until {relativeTime(apiKey.cooldownUntil).replace(" ago", " left")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-700/25 bg-emerald-500/10 px-3 py-1 text-[11.5px] text-emerald-900 dark:text-emerald-300">
              Active — used first when routing
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {apiKey.rotationCount || 0} rotations · checked {relativeTime(apiKey.lastCheckedAt)}
          </span>
          {(cooldown || apiKey.exhaustedAt) && (
            <button onClick={() => clearCooldown(apiKey.id)} className="ml-auto text-[12px] font-medium text-primary">
              Clear state
            </button>
          )}
        </div>
      </section>

      <button
        onClick={remove}
        className="anim-fade mt-8 flex items-center gap-1.5 text-[12.5px] text-destructive/90 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete this key
      </button>
    </div>
  );
}
