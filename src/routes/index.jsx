import { useMemo } from "react";
import { ArrowRight, KeyRound, Moon, Plus, Sun } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { setSettings, useApp } from "@/lib/store";
import { providerById } from "@/lib/providers/catalog";
import { compact } from "@/lib/format";
import { byProvider, exactShare, filterSince, sinceStartOfDay, sinceStartOfMonth, sumTokens } from "@/lib/usage";
import StatStrip from "@/components/dashboard/StatStrip";
import UsageBar from "@/components/dashboard/UsageBar";
import KeyCard from "@/components/keys/KeyCard";

export default function Dashboard() {
  const { keys, usage, settings } = useApp();

  const stats = useMemo(
    () => ({
      today: sumTokens(filterSince(usage, sinceStartOfDay())),
      month: sumTokens(filterSince(usage, sinceStartOfMonth())),
      all: sumTokens(usage),
      exact: exactShare(usage),
      providers: byProvider(usage).slice(0, 5),
    }),
    [usage]
  );

  const dark = settings.theme === "dark";

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pt-12 md:px-10 md:pt-14">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12">
            <KeyRound className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <span className="font-heading text-[17px] tracking-tight">NthRouter</span>
        </div>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground md:block">Overview</span>
        <button
          onClick={() => setSettings({ theme: dark ? "light" : "dark" })}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform duration-200 hover:scale-105"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <div className="anim-rise mt-7 md:mt-4">
        <h1 className="text-[27px] leading-tight md:text-[34px]">Your keys, at a glance</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground md:text-[14px]">
          Plans, limits and token spend — all read on this device.
        </p>
      </div>

      <div className="mt-6 md:mt-8 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-8">
        <div className="min-w-0">
          <StatStrip today={stats.today} month={stats.month} all={stats.all} exactPct={stats.exact} />

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-medium">Keys</h2>
              <button onClick={() => navigate({ to: "/keys" })} className="flex items-center gap-1 text-[12px] text-primary">
                All keys <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="anim-stagger mt-3 space-y-2.5">
              {keys.slice(0, 3).map((k) => (
                <KeyCard key={k.id} apiKey={k} usage={usage} />
              ))}
              {keys.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                  <p className="text-[13px]">No keys stored yet.</p>
                  <button
                    onClick={() => navigate({ to: "/keys/new" })}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add a key
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="mt-8 min-w-0 md:mt-0">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-[15px] font-medium">Top providers</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">tokens this month</p>
            <div className="mt-4 space-y-4">
              {stats.providers.length === 0 && <p className="text-[12px] text-muted-foreground">No usage recorded yet.</p>}
              {stats.providers.map((p) => (
                <UsageBar
                  key={p.key}
                  label={providerById(p.key)?.name || p.key}
                  used={p.tokens}
                  tone="chart"
                  sub={`${compact(p.tokens)} tokens`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate({ to: "/chat" })}
            className="anim-rise mt-4 flex w-full items-center justify-between rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5"
          >
            <div>
              <p className="text-[13.5px] font-medium">Start a chat</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Auto-picks a free model, rotates keys when one runs out.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
        </aside>
      </div>
    </div>
  );
}
