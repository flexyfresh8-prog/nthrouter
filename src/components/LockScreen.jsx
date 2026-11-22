import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { unlockVault } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function LockScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    setError("");
    const ok = await unlockVault(pin);
    if (!ok) setError("That PIN doesn't unlock the vault.");
    setPin("");
    setBusy(false);
  }

  return (
    <div className="anim-fade absolute inset-0 z-50 flex flex-col items-center justify-center bg-background px-8">
      <div className="anim-breathe flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <KeyRound className="h-6 w-6 text-primary" strokeWidth={1.8} />
      </div>
      <h1 className="anim-rise mt-6 text-2xl">Vault locked</h1>
      <p className="anim-rise mt-2 max-w-[260px] text-center text-sm leading-relaxed text-muted-foreground">
        Your keys are encrypted on this device. Enter your PIN to unlock them.
      </p>

      <form onSubmit={submit} className="anim-rise mt-7 w-full max-w-[260px] space-y-3">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className={cn(
            "h-12 w-full rounded-xl border bg-card text-center text-lg tracking-[0.4em] outline-none transition-shadow",
            "focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]",
            error ? "border-destructive/60" : "border-input"
          )}
        />
        {error && <p className="anim-pop text-center text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy || !pin}
          className="h-12 w-full rounded-xl bg-primary text-[14px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>

      <p className="anim-fade mt-8 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Nothing leaves this device
      </p>
    </div>
  );
}
