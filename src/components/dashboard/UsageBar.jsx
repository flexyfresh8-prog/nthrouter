import { compact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Horizontal usage bar with a limit marker.
 * `used`/`limit` are token counts; when limit is null the bar just fills
 * proportionally against the biggest provider (dashboard layout) or stays flat.
 */
export default function UsageBar({ used, limit, label, tone = "primary", sub }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : Math.min(100, Math.round((used / Math.max(used, 1)) * 100));
  const over = limit != null && used >= limit;

  return (
    <div>
      <div className="flex items-baseline justify-between text-[10.5px]">
        <span className="font-medium text-foreground/90">{label}</span>
        <span className={cn("text-muted-foreground", over && "font-medium text-destructive")}>
          {compact(used)}
          {limit ? ` / ${compact(limit)}` : ""} tokens
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            over ? "bg-destructive" : `bg-${tone}`,
            tone === "primary" && "bg-primary",
            tone === "chart" && "bg-chart-1",
            tone === "muted" && "bg-muted-foreground/50"
          )}
          style={{ width: `${limit ? pct : Math.min(100, used > 0 ? 100 : 0)}%` }}
        />
      </div>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
