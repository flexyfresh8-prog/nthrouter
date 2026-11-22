import { useMemo, useState } from "react";
import { MessageSquare, Plus, Search } from "lucide-react";
import { navigate } from "@/lib/router.js";
import { createChat, useApp } from "@/lib/store";
import { lookupModel } from "@/lib/models";
import { relativeTime } from "@/lib/format";
import { effortAt } from "@/lib/effort";

export default function ChatList() {
  const { chats, messages, settings, keys } = useApp();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return chats.filter((c) => !term || c.title.toLowerCase().includes(term));
  }, [chats, q]);

  function start() {
    const chat = createChat({ effortLevel: settings.defaultEffort, autoMode: true });
    navigate({ to: "/chat/$chatId", params: { chatId: chat.id } });
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-6 pt-12 md:px-10 md:pb-10 md:pt-14">
      <header className="flex items-center justify-between">
        <h1 className="text-[27px] leading-tight md:text-[32px]">Chat</h1>
        <button
          onClick={start}
          className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </header>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {keys.length ? "Auto picks the best model you can reach and rotates keys when one runs out." : "Add a key to start chatting."}
      </p>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 outline-none transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.25)]"
        />
      </div>

      <div className="anim-stagger mt-4 space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0">
        {filtered.map((chat) => {
          const count = messages.filter((m) => m.chatId === chat.id).length;
          const model = chat.selectedModelId ? lookupModel(chat.selectedModelId.split(":")[0], chat.selectedModelId.split(":")[1]) : null;
          return (
            <button
              key={chat.id}
              onClick={() => navigate({ to: "/chat/$chatId", params: { chatId: chat.id } })}
              className="block w-full rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-24px_rgba(40,30,20,0.4)] active:bg-accent/60"
            >
              <p className="truncate text-[14.5px]">{chat.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{count} messages</span>
                <span>·</span>
                <span>{effortAt(chat.effortLevel).label}</span>
                <span>·</span>
                <span>{chat.autoMode ? "Auto" : model?.displayName || chat.selectedModelId}</span>
                <span>·</span>
                <span>{relativeTime(chat.updatedAt)}</span>
              </p>
            </button>
          );
        })}

        {chats.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <p className="mt-4 font-heading text-lg">No conversations yet</p>
            <p className="mx-auto mt-1 max-w-[240px] text-[12.5px] leading-relaxed text-muted-foreground">
              Start a chat and NthRouter will pick a model, explain why, and track the tokens.
            </p>
            <button onClick={start} className="mt-4 text-[13px] font-medium text-primary">
              Start a chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
