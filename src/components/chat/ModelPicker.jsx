import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import { MODELS } from "@/lib/models";
import { providerById } from "@/lib/providers/catalog";
import { cn } from "@/lib/utils";
import { compact } from "@/lib/format";

/**
 * Model picker sheet. Auto stays the recommended default; manual lists every
 * model on a provider you hold a key for, free ones badged.
 */
export default function ModelPicker({ open, onClose, keys, autoMode, selectedModelId, onSelect }) {
  const [tab, setTab] = useState(autoMode ? "auto" : "manual");
  if (!open) return null;

  const connected = new Set(keys.map((k) => k.providerId));
  const usable = MODELS.filter((m) => connected.has(m.providerId));

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="anim-fade absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-slide-up absolute inset-x-0 bottom-0 mx-auto max-h-[76vh] w-full max-w-[560px] overflow-hidden rounded-t-3xl border border-border bg-background md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex rounded-full border border-border p-0.5">
            <button
              onClick={() => setTab("auto")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors",
                tab === "auto" ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto
            </button>
            <button
              onClick={() => setTab("manual")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors",
                tab === "manual" ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5" /> Pick a model
            </button>
          </div>
          <button onClick={onClose} className="text-[12px] text-muted-foreground">
            Close
          </button>
        </div>

        {tab === "auto" ? (
          <div className="anim-fade space-y-3 px-5 py-5">
            <p className="text-[13px] leading-relaxed">
              Auto scores every model you can reach — free first — for this effort level, explains the pick, and
              <strong className="font-semibold"> rotates to your next key</strong> if one runs out mid-conversation.
            </p>
            <button
              onClick={() => onSelect({ auto: true })}
              className="w-full rounded-2xl bg-primary py-3 text-[13.5px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Use Auto
            </button>
          </div>
        ) : (
          <div className="anim-fade max-h-[52vh] overflow-y-auto px-3 py-3">
            {usable.length === 0 && (
              <p className="px-3 py-8 text-center text-[12.5px] text-muted-foreground">
                No models reachable yet — add a key first.
              </p>
            )}
            {usable.map((m, i) => {
              const active = selectedModelId === m.id || selectedModelId === m.modelId;
              const provider = providerById(m.providerId);
              return (
                <button
                  key={m.id}
                  onClick={() => onSelect({ auto: false, model: m })}
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  className={cn(
                    "anim-rise flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent/60",
                    active && "bg-accent"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{m.displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {provider?.name} · {compact(m.contextWindow)} context
                      {m.isFree ? " · free" : m.inputPrice ? ` · $${m.inputPrice}/M in` : ""}
                    </p>
                  </div>
                  {m.isFree && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">free</span>
                  )}
                  {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
