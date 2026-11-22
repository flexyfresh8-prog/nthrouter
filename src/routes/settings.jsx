import { useState } from "react";
import { ChevronRight, Lock, Moon, RefreshCw, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { deleteAllData, lockVault, setSettings, useApp } from "@/lib/store";
import { EFFORT_LEVELS, effortAt } from "@/lib/effort";
import { PROVIDERS } from "@/lib/providers/catalog";
import { MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[13.5px]">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, hasVault, locked, keys, chats, usage } = useApp();
  const [confirm, setConfirm] = useState(false);
  const dark = settings.theme === "dark";

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-6 md:px-10 md:pt-14">
      <h1 className="text-[27px] leading-tight md:text-[32px]">Settings</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">Private by default. Nothing syncs.</p>

      <section className="anim-rise mt-6">
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Appearance</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Row label="Theme" hint="Warm light or charcoal dark.">
            <div className="flex gap-1 rounded-full border border-border p-0.5">
              <button
                onClick={() => setSettings({ theme: "light" })}
                className={cn("flex h-7 w-8 items-center justify-center rounded-full transition-colors", !dark && "bg-primary/15 text-primary")}
                aria-label="Light theme"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSettings({ theme: "dark" })}
                className={cn("flex h-7 w-8 items-center justify-center rounded-full transition-colors", dark && "bg-primary/15 text-primary")}
                aria-label="Dark theme"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </Row>
        </div>
      </section>

      <section className="anim-rise mt-6" style={{ animationDelay: "60ms" }}>
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Routing</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Row label="Default effort" hint="Where new chats start on the 1-5 effort slider.">
            <select
              value={settings.defaultEffort}
              onChange={(e) => setSettings({ defaultEffort: Number(e.target.value) })}
              className="h-9 rounded-xl border border-input bg-background px-3 text-[12.5px] outline-none"
            >
              {EFFORT_LEVELS.map((e) => (
                <option key={e.level} value={e.level}>
                  {e.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Auto key rotation" hint="When a key runs out mid-turn, retry on your next key automatically.">
            <button
              onClick={() => setSettings({ autoRotate: !settings.autoRotate })}
              role="switch"
              aria-checked={settings.autoRotate}
              className={cn(
                "flex h-7 w-12 items-center rounded-full border transition-colors",
                settings.autoRotate ? "border-primary/40 bg-primary/25" : "border-border bg-muted"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full bg-card shadow transition-transform duration-200",
                  settings.autoRotate ? "translate-x-[22px]" : "translate-x-[3px]"
                )}
              />
            </button>
          </Row>
          <Row label="Cooldown after rate limit" hint={`A throttled key waits ${settings.cooldownSeconds}s before reuse.`}>
            <input
              type="number"
              min="15"
              step="15"
              value={settings.cooldownSeconds}
              onChange={(e) => setSettings({ cooldownSeconds: Math.max(15, Number(e.target.value) || 60) })}
              className="h-9 w-20 rounded-xl border border-input bg-background px-3 text-[12.5px] outline-none"
            />
          </Row>
        </div>
      </section>

      <section className="anim-rise mt-6" style={{ animationDelay: "120ms" }}>
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Vault</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Row label="Lock vault now" hint="Drops the decryption key from memory.">
            <button
              onClick={() => lockVault()}
              disabled={locked || !hasVault}
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[12px] disabled:opacity-40"
            >
              <Lock className="h-3.5 w-3.5" /> Lock
            </button>
          </Row>
          <Row label="About this device" hint={`${keys.length} keys · ${chats.length} chats · ${usage.length} usage records · ${PROVIDERS.length} providers · ${MODELS.length} seed models`}>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </Row>
        </div>
      </section>

      <section className="anim-rise mt-6" style={{ animationDelay: "180ms" }}>
        <button onClick={() => navigate({ to: "/docs" })} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent/40">
          <span className="text-[13.5px]">How NthRouter works</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </section>

      <section className="anim-rise mt-6" style={{ animationDelay: "240ms" }}>
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Danger zone</p>
        <div className="overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5">
          <Row label="Delete everything" hint="Vault, chats, usage history — gone from this browser.">
            <button
              onClick={() => setConfirm(true)}
              className="flex items-center gap-1.5 rounded-full border border-destructive/40 px-3.5 py-2 text-[12px] text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete all
            </button>
          </Row>
        </div>

        {confirm && (
          <div className="anim-pop mt-3 rounded-2xl border border-destructive/40 bg-destructive/8 p-4">
            <p className="text-[13px] font-medium">Really delete everything?</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Keys cannot be recovered — the vault is destroyed before your eyes. Type nothing, just be sure.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  deleteAllData();
                  setConfirm(false);
                  navigate({ to: "/" });
                }}
                className="rounded-full bg-destructive px-4 py-2 text-[12px] font-medium text-destructive-foreground"
              >
                Yes, delete
              </button>
              <button onClick={() => setConfirm(false)} className="rounded-full border border-border px-4 py-2 text-[12px]">
                Keep my data
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
