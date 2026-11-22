import { navigate } from "@/lib/router.js";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { deleteChat, useApp } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HistoryDrawer({ open, onClose, onNew, currentChatId }) {
  const { chats } = useApp();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="anim-fade absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className="anim-slide-left absolute inset-y-0 left-0 flex w-[80%] max-w-[320px] flex-col border-r border-border bg-background">
        <div className="flex items-center justify-between px-4 pt-5">
          <span className="font-heading text-[16px]">NthRouter</span>
          <button onClick={onClose} className="text-muted-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={onNew}
          className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] transition-colors hover:bg-accent/60"
        >
          <Plus className="h-4 w-4 text-primary" /> New chat
        </button>

        <p className="px-4 pb-2 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Recent</p>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-6">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-1 rounded-xl px-2",
                chat.id === currentChatId ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <button
                onClick={() => {
                  navigate({ to: "/chat/$chatId", params: { chatId: chat.id } });
                  onClose();
                }}
                className="min-w-0 flex-1 py-2.5 pl-1 text-left"
              >
                <p className="truncate text-[12.5px]">{chat.title}</p>
                <p className="text-[10px] text-muted-foreground">{relativeTime(chat.updatedAt)}</p>
              </button>
              <button
                onClick={() => {
                  deleteChat(chat.id);
                  if (chat.id === currentChatId) navigate({ to: "/chat" });
                }}
                className="shrink-0 p-1.5 text-muted-foreground/50 hover:text-destructive"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="flex flex-col items-center px-3 py-10 text-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
              <p className="mt-2 text-[12px] text-muted-foreground">No chats yet</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
