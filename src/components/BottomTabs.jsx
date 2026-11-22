import { KeyRound, LayoutDashboard, MessageSquare, Settings } from "lucide-react";
import { navigate, getCurrentPath } from "@/lib/router.js";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/keys", label: "Keys", Icon: KeyRound },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export default function BottomTabs() {
  const pathname = getCurrentPath();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[640px] -translate-x-1/2 border-t border-border bg-background/95 pb-safe pt-1 backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-4">
        {TABS.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <button
                onClick={() => navigate({ to })}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl py-2 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-[21px] w-[21px] transition-transform", active && "anim-pop")} strokeWidth={active ? 2.2 : 1.7} />
                <span className={cn("text-[10.5px] tracking-wide", active && "font-medium")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
