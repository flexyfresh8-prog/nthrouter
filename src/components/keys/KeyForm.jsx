import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { addKey, createVault, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const field = "h-11 rounded-xl";

const inputCls = cn(
  field,
  "w-full border border-input bg-card px-3 outline-none transition-shadow",
  "focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
);

export default function KeyForm({ provider, onDone }) {
  const { hasVault } = useApp();
  const [form, setForm] = useState({
    label: "",
    secret: "",
    baseUrl: provider.baseUrl,
    orgId: "",
    planName: "",
    manualLimit: "",
    resetAt: "",
  });
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    if (!form.secret.trim()) return setError("Paste the API key first.");
    if (!hasVault) {
      if (pin.length < 4) return setError("Choose a vault PIN of at least 4 digits.");
      if (pin !== pin2) return setError("The two PINs don't match.");
    }
    setBusy(true);
    setError("");
    try {
      if (!hasVault) await createVault(pin);
      const key = await addKey({
        providerId: provider.id,
        label: form.label.trim(),
        secret: form.secret.trim(),
        baseUrl: form.baseUrl.trim(),
        orgId: form.orgId.trim(),
        planName: form.planName.trim(),
        manualLimit: form.manualLimit ? Number(form.manualLimit) : null,
        resetAt: form.resetAt ? new Date(form.resetAt).toISOString() : null,
      });
      onDone?.(key);
    } catch (err) {
      setError(err?.message || "Could not save the key.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="label" className="text-[12px] font-medium">
          Label
        </label>
        <input
          id="label"
          value={form.label}
          onChange={(e) => set({ label: e.target.value })}
          placeholder="Personal, work, project…"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="secret" className="text-[12px] font-medium">
          API key
        </label>
        <input
          id="secret"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={form.secret}
          onChange={(e) => set({ secret: e.target.value })}
          placeholder="Paste the key"
          className={cn(inputCls, "font-mono text-[13px]")}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Encrypted with your PIN and kept in this browser. It is only ever sent to {provider.name}.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="baseUrl" className="text-[12px] font-medium">
          Base URL
        </label>
        <input
          id="baseUrl"
          value={form.baseUrl}
          onChange={(e) => set({ baseUrl: e.target.value })}
          placeholder={provider.baseUrl}
          className={cn(inputCls, "font-mono text-[12px]")}
        />
        <p className="text-[11px] text-muted-foreground">Change this only for a proxy, gateway or local runtime.</p>
      </div>

      {provider.adapterType === "openai" && (
        <div className="space-y-1.5">
          <label htmlFor="orgId" className="text-[12px] font-medium">
            Organization ID <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="orgId"
            value={form.orgId}
            onChange={(e) => set({ orgId: e.target.value })}
            placeholder="org-…"
            className={cn(inputCls, "font-mono text-[12px]")}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="planName" className="text-[12px] font-medium">
            Plan name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="planName"
            value={form.planName}
            onChange={(e) => set({ planName: e.target.value })}
            placeholder="e.g. Team, credits"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="manualLimit" className="text-[12px] font-medium">
            Monthly token limit <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="manualLimit"
            type="number"
            min="1"
            value={form.manualLimit}
            onChange={(e) => set({ manualLimit: e.target.value })}
            placeholder="e.g. 500000"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="resetAt" className="text-[12px] font-medium">
          Limit resets <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input id="resetAt" type="date" value={form.resetAt} onChange={(e) => set({ resetAt: e.target.value })} className={inputCls} />
      </div>

      {!hasVault && (
        <div className="anim-rise space-y-3 rounded-2xl border border-primary/25 bg-primary/6 p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-medium">
            <Lock className="h-3.5 w-3.5 text-primary" /> Create your vault
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            The PIN encrypts all keys on this device. NthRouter cannot recover it — 6+ digits recommended.
          </p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN (min 4 digits)"
            className={cn(inputCls, "text-center tracking-[0.3em]")}
          />
          <input
            type="password"
            inputMode="numeric"
            value={pin2}
            onChange={(e) => setPin2(e.target.value)}
            placeholder="Repeat PIN"
            className={cn(inputCls, "text-center tracking-[0.3em]")}
          />
        </div>
      )}

      {error && <p className="anim-pop text-[12px] text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Saving…" : "Save key"}
      </button>
    </form>
  );
}
