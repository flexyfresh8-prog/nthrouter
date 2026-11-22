import { KeyRound, LayoutDashboard, Lock, MessageSquare, Plus, Settings } from "lucide-react";
import { createChat, useApp } from "@/lib/store";
import { navigate, getCurrentPath } from "@/lib/router.js";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/keys", label: "Keys", Icon: KeyRound },
  { to: "/chat", label: "Chat", Icon: MessageSquare },
  { to: "/settings", label: "Settings", Icon: Settings },
];

/** iPad / desktop navigation rail. Hidden below tablet width. */
export default function SideNav() {
  const pathname = getCurrentPath();
  const { keys, settings, locked } = useApp();

  function startChat() {
    const chat = createChat({ effortLevel: settings.defaultEffort, autoMode: true });
    navigate({ to: "/chat/$chatId", params: { chatId: chat.id } });
  }

  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-muted/25 px-3 py-6 md:flex">
      <button onClick={() => navigate({ to: "/" })} className="anim-fade flex items-center gap-2 px-2 text-left">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12">
          <KeyRound className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
        <span className="font-heading text-[17px] tracking-tight">NthRouter</span>
      </button>

      <button
        onClick={startChat}
        className="anim-fade mt-6 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground shadow-[0_10px_30px_-18px_hsl(var(--primary)/0.7)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> New chat
      </button>

      <nav className="mt-6 flex-1 space-y-1">
        {NAV.map(({ to, label, Icon }, i) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <button
              key={to}
              onClick={() => navigate({ to })}
              style={{ animationDelay: `${i * 50}ms` }}
              className={cn(
                "anim-slide-left flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 px-2">
        {locked ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Vault locked
          </div>
        ) : (
          <div className="anim-fade flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600/80" />
            {keys.length} key{keys.length === 1 ? "" : "s"} · rotation {settings.autoRotate ? "on" : "off"}
          </div>
        )}
      </div>
    </aside>
  );
}
