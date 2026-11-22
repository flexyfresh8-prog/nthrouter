import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PROVIDERS } from "@/lib/providers/catalog";
import { cn } from "@/lib/utils";

const CATS = [
  { id: "frontier", label: "Frontier labs" },
  { id: "regional", label: "Regional" },
  { id: "inference", label: "Inference hosts" },
  { id: "gateway", label: "Gateways" },
  { id: "local", label: "Local runtimes" },
];

export default function ProviderPicker({ onPick }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PROVIDERS;
    return PROVIDERS.filter((p) => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term));
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 78 providers…"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 outline-none transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
        />
      </div>

      <div className="mt-4 max-h-[52vh] space-y-5 overflow-y-auto pr-1">
        {CATS.map((cat) => {
          const list = filtered.filter((p) => p.category === cat.id);
          if (!list.length) return null;
          return (
            <section key={cat.id}>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{cat.label}</p>
              <div className="anim-stagger grid gap-2 sm:grid-cols-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPick(p)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all duration-200",
                      "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_28px_-20px_rgba(40,30,20,0.4)]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{p.name}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{p.baseUrl}</p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{p.adapterType}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-[12.5px] text-muted-foreground">No provider matches "{q}".</p>}
      </div>
    </div>
  );
}
