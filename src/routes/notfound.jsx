import { Compass } from "lucide-react";
import { navigate } from "@/lib/router.js";

export default function NotFound() {
  return (
    <div className="anim-rise flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Compass className="h-6 w-6 text-primary" strokeWidth={1.8} />
      </div>
      <h1 className="mt-5 font-heading text-[28px]">Off the map</h1>
      <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
        That route doesn't exist. Nothing is lost — the vault is exactly where you left it.
      </p>
      <button
        onClick={() => navigate({ to: "/" })}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
      >
        Back to dashboard
      </button>
    </div>
  );
}
