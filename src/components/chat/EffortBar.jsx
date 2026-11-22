import { EFFORT_LEVELS, effortAt } from "@/lib/effort";
import { cn } from "@/lib/utils";

/** The five-level effort slider that sits above the composer. */
export default function EffortBar({ level, onChange }) {
  const effort = effortAt(level);

  return (
    <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Effort</span>
        <span className="text-[11px] font-medium text-primary">{effort.label}</span>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Effort level"
        className="mt-2 w-full cursor-pointer accent-primary"
      />

      <div className="mt-1.5 flex justify-between">
        {EFFORT_LEVELS.map((e) => (
          <button
            key={e.level}
            onClick={() => onChange(e.level)}
            className={cn(
              "text-[9.5px] uppercase tracking-wide transition-colors",
              e.level === level ? "font-semibold text-foreground" : "text-muted-foreground/70"
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">{effort.hint}</p>
    </div>
  );
}
