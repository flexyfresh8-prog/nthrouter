import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";
import { dismissToast, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const TONES = {
  info: { Icon: Info, cls: "border-border bg-card text-foreground" },
  success: { Icon: CheckCircle2, cls: "border-emerald-700/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" },
  rotate: { Icon: RefreshCw, cls: "border-primary/30 bg-primary/8 text-foreground" },
  warn: { Icon: AlertTriangle, cls: "border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200" },
};

/** Bottom-right toast stack. Rotation events land here. */
export default function Toasts() {
  const { toasts } = useApp();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-[320px] flex-col gap-2">
      {toasts.map((t) => {
        const tone = TONES[t.tone] || TONES.info;
        const Icon = tone.Icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "anim-slide-left pointer-events-auto flex items-start gap-2.5 rounded-2xl border p-3.5 shadow-[0_18px_50px_-24px_rgba(40,30,20,0.45)] backdrop-blur",
              tone.cls
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.tone === "rotate" && "animate-spin")} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium leading-snug">{t.message}</p>
              {t.detail && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.detail}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-muted-foreground/60 hover:text-foreground" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
