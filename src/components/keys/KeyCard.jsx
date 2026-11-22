import { KeyRound, Moon, RefreshCw, Snowflake, TriangleAlert } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { providerById } from "@/lib/providers/catalog";
import { usedByKey, requestsByKey } from "@/lib/usage";
import { compact, relativeTime, maskKey } from "@/lib/format";
import { clearCooldown } from "@/lib/store";
import { cn } from "@/lib/utils";

const STATUS = {
  valid: { label: "Valid", cls: "border-emerald-700/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" },
  invalid: { label: "Invalid", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  rate_limited: { label: "Throttled", cls: "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-300" },
  unknown: { label: "Unchecked", cls: "border-border bg-muted text-muted-foreground" },
};

/**
 * Key card with live token accounting: shows tokens used on this key (exact,
 * locally recorded), the manual/provider limit bar, and rotation state
 * (cooldown / exhausted) with a one-click clear.
 */
export default function KeyCard({ apiKey, usage }) {
  const provider = providerById(apiKey.providerId);
  const status = STATUS[apiKey.status] || STATUS.unknown;
  const used = usedByKey(usage, apiKey.id);
  const requests = requestsByKey(usage, apiKey.id);
  const limit = apiKey.manualLimit ?? apiKey.account?.limitTokens ?? null;
  const cooldown = apiKey.cooldownUntil && new Date(apiKey.cooldownUntil).getTime() > Date.now();
  const exhausted = apiKey.exhaustedAt;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div
      className={cn(
        "anim-rise group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-24px_rgba(40,30,20,0.4)]",
        (cooldown || exhausted) && "opacity-80"
      )}
      onClick={() => navigate({ to: "/keys/$keyId", params: { keyId: apiKey.id } })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium">{provider?.name || apiKey.providerId}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
            {apiKey.label ? `${apiKey.label} · ` : ""}
            {maskKey(null)}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium", status.cls)}>{status.label}</span>
      </div>

      {/* live token accounting */}
      <div className="mt-3.5">
        <div className="flex items-baseline justify-between text-[10.5px]">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">Tokens on this key</span>
          <span className={cn("tabular-nums", limit && used >= limit ? "font-medium text-destructive" : "text-foreground/80")}>
            {compact(used)}
            {limit ? ` / ${compact(limit)}` : ""}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              limit && used >= limit ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${limit ? pct : used > 0 ? 100 : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {requests} request{requests === 1 ? "" : "s"} · {apiKey.planName || apiKey.account?.plan || "no plan set"}
          {apiKey.lastCheckedAt ? ` · checked ${relativeTime(apiKey.lastCheckedAt)}` : ""}
        </p>
      </div>

      {/* rotation state */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {cooldown && (
          <span className="anim-pop flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[10px] text-primary">
            <Snowflake className="h-3 w-3" /> cooling down · {relativeTime(apiKey.cooldownUntil).replace(" ago", " left")}
          </span>
        )}
        {exhausted && (
          <span className="anim-pop flex items-center gap-1 rounded-full border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-900 dark:text-amber-300">
            <TriangleAlert className="h-3 w-3" /> quota hit — rotating
          </span>
        )}
        {apiKey.rotationCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            <RefreshCw className="h-3 w-3" /> rotated {apiKey.rotationCount}×
          </span>
        )}
        {(cooldown || exhausted) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearCooldown(apiKey.id);
            }}
            className="ml-auto text-[10.5px] font-medium text-primary"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
