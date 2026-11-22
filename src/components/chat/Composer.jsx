import { ArrowUp, Square } from "lucide-react";

export default function Composer({ value, onChange, onSend, onStop, busy, disabled }) {
  function keyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy) onSend();
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-2.5 shadow-[0_10px_30px_-18px_rgba(40,30,20,0.35)] transition-shadow duration-300 focus-within:shadow-[0_14px_40px_-20px_hsl(var(--primary)/0.35)]">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={keyDown}
        rows={1}
        placeholder={disabled ? "Add an API key to start chatting" : "Message NthRouter…"}
        disabled={disabled}
        className="max-h-32 min-h-[46px] w-full resize-none border-0 bg-transparent px-2 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>
        <button
          onClick={busy ? onStop : onSend}
          disabled={!busy && (!value.trim() || disabled)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-200 disabled:opacity-35 enabled:hover:scale-105 enabled:active:scale-95"
          aria-label={busy ? "Stop" : "Send"}
        >
          {busy ? <Square className="h-3.5 w-3.5" fill="currentColor" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
        </button>
      </div>
    </div>
  );
}
