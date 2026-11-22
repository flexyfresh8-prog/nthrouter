import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Boot screen: plays once per hard load while the store and vault settle.
 * Claude-look preserved — warm background, serif display wordmark, one soft
 * terracotta accent — with a deliberately theatrical sequence:
 *
 *   1. the sigil breathes in,
 *   2. the wordmark "inks" itself letter by letter (a writing gesture, not a spinner),
 *   3. three routing dots orbit while the interface assembles,
 *   4. the whole panel lifts and fades out.
 *
 * prefers-reduced-motion collapses everything to a 10ms fade (see index.css).
 */
const STEPS = ["reading local keys", "opening vault", "routing ready"];

export default function BootScreen({ done }) {
  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background", done && "anim-fade")}>
      {/* soft warm halo behind the sigil */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_50%_42%,hsl(var(--primary)/0.07),transparent)]" />

      <div className="anim-breathe flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/12 shadow-[0_24px_60px_-30px_hsl(var(--primary)/0.55)]">
        <KeyRound className="h-7 w-7 text-primary" strokeWidth={1.7} />
      </div>

      <h1 className="anim-ink mt-7 font-heading text-[34px] leading-none tracking-tight">NthRouter</h1>
      <p className="anim-fade mt-2 text-[12px] text-muted-foreground" style={{ animationDelay: "0.35s" }}>
        Private keys · many models · one router
      </p>

      {/* orbiting dots — "routing" */}
      <div className="relative mt-10 flex h-10 w-10 items-center justify-center" aria-hidden>
        <span className="absolute h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        <span className="anim-orbit absolute h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="anim-orbit absolute h-1 w-1 rounded-full bg-primary/60" style={{ animationDelay: "-0.6s" }} />
      </div>

      {/* assembly steps, one line at a time */}
      <ul className="mt-6 space-y-1.5 text-center">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className="anim-rise text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/80"
            style={{ animationDelay: `${0.45 + i * 0.18}s` }}
          >
            {s}
          </li>
        ))}
      </ul>

      {/* equalizer bar: the app "warming up" */}
      <div className="anim-eq mt-8 flex h-4 items-end gap-1" aria-hidden>
        <span className="h-4 w-1 rounded-full bg-primary/70" />
        <span className="h-4 w-1 rounded-full bg-primary/70" />
        <span className="h-4 w-1 rounded-full bg-primary/70" />
        <span className="h-4 w-1 rounded-full bg-primary/70" />
      </div>
    </div>
  );
}
