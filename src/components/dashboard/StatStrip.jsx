import { compact, exactNumber } from "@/lib/format";

function Stat({ label, value, exact, delay }) {
  return (
    <div className="anim-rise rounded-2xl border border-border bg-card p-4" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-[26px] leading-none">{compact(value)}</p>
      <p className="mt-1 text-[10.5px] text-muted-foreground">
        {exact != null ? (exact ? "exact" : "approx.") : "tokens"}
      </p>
    </div>
  );
}

export default function StatStrip({ today, month, all, exactPct }) {
  return (
    <div className="anim-stagger grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Today" value={today} />
      <Stat label="This month" value={month} />
      <Stat label="All time" value={all} />
      <div className="anim-rise rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Exact share</p>
        <p className="mt-1.5 font-heading text-[26px] leading-none">{exactPct}%</p>
        <p className="mt-1 text-[10.5px] text-muted-foreground">provider-reported</p>
      </div>
    </div>
  );
}

export { Stat };
