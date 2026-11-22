import { useMemo, useState } from "react";
import { KeyRound, Plus, Search } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { useApp } from "@/lib/store";
import { providerById } from "@/lib/providers/catalog";
import KeyCard from "@/components/keys/KeyCard";

export default function KeysList() {
  const { keys, usage } = useApp();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return keys;
    return keys.filter((k) => {
      const provider = providerById(k.providerId);
      return (k.label || "").toLowerCase().includes(term) || (provider?.name || "").toLowerCase().includes(term);
    });
  }, [keys, q]);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-6 pt-12 md:px-10 md:pb-10 md:pt-14">
      <header className="flex items-center justify-between">
        <h1 className="text-[27px] leading-tight md:text-[32px]">Keys</h1>
        <button
          onClick={() => navigate({ to: "/keys/new" })}
          className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </header>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{keys.length} stored on this device</p>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search keys"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 outline-none transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
        />
      </div>

      <div className="anim-stagger mt-4 space-y-2.5 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0">
        {filtered.map((k) => (
          <KeyCard key={k.id} apiKey={k} usage={usage} />
        ))}

        {keys.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <p className="mt-4 font-heading text-lg">Your vault is empty</p>
            <p className="mx-auto mt-1 max-w-[240px] text-[12.5px] leading-relaxed text-muted-foreground">
              Add a key from any provider in the catalog. Nothing is uploaded.
            </p>
            <button onClick={() => navigate({ to: "/keys/new" })} className="mt-4 text-[13px] font-medium text-primary">
              Add your first key
            </button>
          </div>
        )}

        {keys.length > 0 && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No key matches "{q}".</p>
        )}
      </div>
    </div>
  );
}
