import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, PanelLeft, Plus, RotateCcw, Sparkles, Trash2, RefreshCw } from "lucide-react";
import { navigate } from "@/lib/router.js";
import {
  addMessage, createChat, deleteChat, deleteMessages, recordUsage, updateChat, updateKey,
  markCooldown, markExhausted, markInvalid, noteRotation, toast, useApp,
} from "@/lib/store";
import { MODELS, lookupModel } from "@/lib/models";
import { providerById } from "@/lib/providers/catalog";
import { sendTurn } from "@/lib/chatEngine";
import { costOf, estimateMessages, estimateTokens } from "@/lib/tokens";
import { effortAt } from "@/lib/effort";
import { explainPick } from "@/lib/scorer";
import { compact, relativeTime } from "@/lib/format";
import MessageBubble from "@/components/chat/MessageBubble";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import EffortBar from "@/components/chat/EffortBar";
import Composer from "@/components/chat/Composer";
import ModelPicker from "@/components/chat/ModelPicker";
import HistoryDrawer from "@/components/chat/HistoryDrawer";
import { cn } from "@/lib/utils";

function describeError(err) {
  switch (err?.code) {
    case "no_keys":
      return { title: "No keys yet", body: "Add an API key before sending a message.", action: "keys" };
    case "no_free":
      return { title: "No free model available", body: "None of your connected providers expose a free model. Pick a model manually.", action: "model" };
    case "all_keys_unavailable":
      return {
        title: "Every key is cooling down",
        body: "All your keys hit their limit or are throttled. Wait for a cooldown to pass or add another key.",
        action: "keys",
      };
    case "context":
      return { title: "No model fits", body: "This conversation is longer than the context of every model you can reach.", action: "model" };
    case "no_key":
      return { title: "Missing key", body: `No key stored for ${providerById(err.providerId)?.name || "that provider"}.`, action: "keys" };
    case "locked":
      return { title: "Vault locked", body: "Unlock the vault to send messages." };
    case "no_model":
      return { title: "Pick a model", body: "Choose a model for this chat first.", action: "model" };
    case "invalid_key":
      return { title: "Every key rejected", body: "The provider rejected each key that was tried. Check them under Keys." };
    case "rate_limited":
      return { title: "Rate limited", body: "The provider is throttling this key. Wait a moment and retry." };
    case "quota_exceeded":
      return { title: "Quota used up", body: "This key's quota or balance is exhausted. Add another key to keep going." };
    case "context_overflow":
      return { title: "Context overflow", body: "The conversation is longer than this model accepts. Start a new chat." };
    case "provider_outage":
      return { title: "Provider outage", body: "The provider returned a server error. Try again shortly." };
    default:
      return {
        title: "Request failed",
        body: err?.tried?.length
          ? `Tried ${err.tried.length} key${err.tried.length === 1 ? "" : "s"} — last error: ${err.message || "unknown"}`
          : err?.message || "Something went wrong. Try again.",
      };
  }
}

export default function ChatScreen({ chatId }) {
  const { chats, messages: allMessages, keys, usage } = useApp();

  const chat = chats.find((c) => c.id === chatId);
  const messages = useMemo(() => allMessages.filter((m) => m.chatId === chatId), [allMessages, chatId]);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(null);
  const [error, setError] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [picker, setPicker] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streaming?.text]);

  if (!chat) {
    return (
      <div className="px-5 pt-12">
        <button onClick={() => navigate({ to: "/chat" })} className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Chat
        </button>
        <p className="mt-6 text-[14px] text-muted-foreground">This conversation no longer exists.</p>
      </div>
    );
  }

  const busy = Boolean(streaming);
  const activeModel = chat.autoMode ? streaming?.model || null : lookupModel(chat.selectedModelId.split(":")[0], chat.selectedModelId.split(":")[1]);

  async function run(history) {
    setError(null);
    setStreaming({ text: "", model: null, reasons: [], rotation: null });
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";

    const actions = { markCooldown, markExhausted, markInvalid };

    try {
      const res = await sendTurn({
        chat,
        history,
        models: MODELS,
        keys,
        usage,
        signal: controller.signal,
        actions,
        onModelPicked: ({ model, reasons }) => setStreaming((s) => ({ ...(s || {}), model, reasons })),
        onRotate: ({ from, to, reason }) => {
          setStreaming((s) => ({ ...(s || {}), rotation: { from, to, reason } }));
          noteRotation(to.id);
          toast(`Rotated to ${providerById(to.providerId)?.name || "next key"}`, {
            tone: "rotate",
            detail: `${to.label || "key"} took over after ${reason?.replace(/_/g, " ")}`,
          });
        },
        onDelta: (delta) => {
          acc += delta;
          setStreaming((s) => ({ ...(s || {}), text: acc }));
        },
      });

      if (res.error) {
        setError(describeError(res.error));
        return;
      }

      const inputTokens = res.usage?.input || estimateMessages(history);
      const outputTokens = res.usage?.output || estimateTokens(res.text);
      const exact = Boolean(res.usage?.input);

      addMessage({
        chatId,
        role: "assistant",
        content: res.text,
        modelId: res.model.modelId,
        providerId: res.model.providerId,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        usageSource: exact ? "exact" : "approx",
        cost: costOf(res.model, inputTokens, outputTokens),
        rotated: res.rotated || false,
      });
      recordUsage({
        apiKeyId: res.apiKey.id,
        providerId: res.model.providerId,
        modelId: res.model.modelId,
        chatId,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        exact,
      });
      updateChat(chatId, { selectedModelId: res.model.id });
      // A success clears stale rotation state on the winning key.
      const patch = {};
      const winner = keys.find((k) => k.id === res.apiKey.id);
      if (winner?.cooldownUntil) patch.cooldownUntil = null;
      if (winner?.exhaustedAt) patch.exhaustedAt = null;
      if (Object.keys(patch).length) updateKey(res.apiKey.id, patch);

      if (res.rotated) {
        toast(`Replied via ${providerById(res.model.providerId)?.name}`, {
          tone: "rotate",
          detail: `Rotated after ${res.attempts - 1} failed attempt${res.attempts - 1 === 1 ? "" : "s"} — turn retried automatically.`,
        });
      }
    } catch (e) {
      if (e?.name === "AbortError") {
        if (acc.trim()) {
          const tokens = estimateTokens(acc);
          addMessage({
            chatId,
            role: "assistant",
            content: acc,
            modelId: streaming?.model?.modelId || null,
            providerId: streaming?.model?.providerId || null,
            inputTokens: 0,
            outputTokens: tokens,
            totalTokens: tokens,
            usageSource: "approx",
            cost: 0,
          });
        }
      } else {
        setError(describeError(e));
      }
    } finally {
      setStreaming(null);
      abortRef.current = null;
    }
  }

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    addMessage({ chatId, role: "user", content: text, modelId: null, inputTokens: 0, outputTokens: 0, totalTokens: 0, usageSource: "none" });
    if (messages.length === 0) updateChat(chatId, { title: text.slice(0, 46) });
    const history = [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }];
    run(history);
  }

  function regenerate() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) deleteMessages([lastAssistant.id]);
    const history = messages.filter((m) => m.id !== lastAssistant?.id).map((m) => ({ role: m.role, content: m.content }));
    if (history.length) run(history);
  }

  function editLast() {
    const reversedIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (reversedIndex === -1) return;
    const index = messages.length - 1 - reversedIndex;
    setInput(messages[index].content);
    deleteMessages(messages.slice(index).map((m) => m.id));
  }

  function newChat() {
    const next = createChat({ effortLevel: chat.effortLevel, autoMode: chat.autoMode, selectedModelId: chat.selectedModelId });
    setDrawer(false);
    navigate({ to: "/chat/$chatId", params: { chatId: next.id } });
  }

  const chatTokens = messages.reduce((n, m) => n + (m.totalTokens || 0), 0);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex h-[calc(100dvh-96px)] flex-col md:h-[100dvh] md:flex-row">
      {/* iPad: persistent conversation list */}
      <aside className="hidden w-[268px] shrink-0 flex-col border-r border-border bg-muted/20 md:flex">
        <div className="flex items-center justify-between px-4 pt-5">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Chats</span>
          <button onClick={newChat} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform hover:scale-105" aria-label="New chat">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {chats.map((c) => (
            <div key={c.id} className={cn("group flex items-center rounded-xl", c.id === chatId ? "bg-accent" : "hover:bg-accent/50")}>
              <button onClick={() => navigate({ to: "/chat/$chatId", params: { chatId: c.id } })} className="min-w-0 flex-1 py-2.5 pl-3 text-left">
                <p className="truncate text-[12.5px]">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">{relativeTime(c.updatedAt)}</p>
              </button>
              <button
                onClick={() => {
                  deleteChat(c.id);
                  if (c.id === chatId) navigate({ to: "/chat" });
                }}
                className="shrink-0 p-1.5 text-muted-foreground/50 hover:text-destructive"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {chats.length === 0 && <p className="px-3 py-6 text-[12px] text-muted-foreground">No chats yet</p>}
        </div>
      </aside>

      {/* Conversation column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-background/92 px-3 py-3 backdrop-blur-xl md:px-6">
          <button onClick={() => setDrawer(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground md:hidden" aria-label="History">
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium md:text-[15px]">{chat.title}</p>
            <p className="truncate text-[10.5px] text-muted-foreground">
              {compact(chatTokens)} tokens · {effortAt(chat.effortLevel).label}
            </p>
          </div>
          <button
            onClick={() => setPicker(true)}
            className="flex max-w-[130px] items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[10.5px] transition-colors hover:border-primary/40 md:max-w-[200px]"
          >
            {chat.autoMode ? (
              <>
                <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate">{activeModel?.displayName || "Auto"}</span>
              </>
            ) : (
              <span className="truncate">{activeModel?.displayName || chat.selectedModelId || "Pick model"}</span>
            )}
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">
          <div className="mx-auto w-full max-w-[720px] space-y-6">
            {messages.map((m, i) => (
              <MessageBubble key={m.id} message={m} fresh={i >= messages.length - 1 && m.role === "assistant"} />
            ))}

            {streaming && (
              <div className="anim-rise">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {streaming.model ? providerById(streaming.model.providerId)?.name : "Thinking"}
                  </span>
                </div>
                {streaming.model && chat.autoMode && (
                  <p className="anim-fade mb-2 text-[10.5px] text-muted-foreground">
                    Picked because: {explainPick(streaming.reasons) || "best free fit"}
                  </p>
                )}

                {/* rotation banner */}
                {streaming.rotation && (
                  <div className="anim-pop mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2 text-[11.5px]">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>
                      Key ran out ({streaming.rotation.reason?.replace(/_/g, " ")}) — switching to{" "}
                      {providerById(streaming.rotation.to.providerId)?.name || "next key"}
                      {streaming.rotation.to.label ? ` · ${streaming.rotation.to.label}` : ""}
                    </span>
                  </div>
                )}

                {streaming.text ? (
                  <MarkdownMessage content={streaming.text} />
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <div className="relative flex h-5 w-5 items-center justify-center" aria-hidden>
                      <span className="absolute h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span className="anim-orbit absolute h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="anim-orbit absolute h-1 w-1 rounded-full bg-primary/60" style={{ animationDelay: "-0.9s" }} />
                    </div>
                    <div className="anim-eq flex h-4 items-end gap-1" aria-hidden>
                      <span className="h-4 w-1 rounded-full bg-primary/70" />
                      <span className="h-4 w-1 rounded-full bg-primary/70" />
                      <span className="h-4 w-1 rounded-full bg-primary/70" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="anim-pop rounded-2xl border border-amber-600/25 bg-amber-500/8 p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> {error.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{error.body}</p>
                <div className="mt-3 flex gap-2">
                  {error.action === "keys" && (
                    <button
                      onClick={() => navigate({ to: "/keys/new" })}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium"
                    >
                      Add a key
                    </button>
                  )}
                  {error.action === "model" && (
                    <button onClick={() => setPicker(true)} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium">
                      Choose a model
                    </button>
                  )}
                  <button onClick={regenerate} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </button>
                </div>
              </div>
            )}

            {messages.length === 0 && !streaming && !error && (
              <div className="anim-rise pt-10 text-center md:pt-20">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.8} />
                </div>
                <h2 className="mt-4 text-xl md:text-2xl">What are we working on?</h2>
                <p className="mx-auto mt-1.5 max-w-[280px] text-[12.5px] leading-relaxed text-muted-foreground">
                  {keys.length
                    ? "Auto scores your models for this effort level, explains the pick, and rotates keys if one runs out."
                    : "Add an API key first — then Auto picks the best model you can reach."}
                </p>
              </div>
            )}

            {lastAssistant && !busy && (
              <div className="anim-fade flex items-center gap-3 pt-1">
                <button onClick={regenerate} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3 w-3" /> Regenerate
                </button>
                <button onClick={editLast} className="text-[11px] text-muted-foreground hover:text-foreground">
                  Edit last message
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background px-3 pb-2 pt-3 md:px-8 md:pb-4">
          <div className="mx-auto w-full max-w-[720px] space-y-2">
            <EffortBar level={chat.effortLevel} onChange={(level) => updateChat(chatId, { effortLevel: level })} />
            <Composer
              value={input}
              onChange={setInput}
              onSend={send}
              onStop={() => abortRef.current?.abort()}
              busy={busy}
              disabled={keys.length === 0}
            />
          </div>
        </div>
      </div>

      <ModelPicker
        open={picker}
        onClose={() => setPicker(false)}
        keys={keys}
        autoMode={chat.autoMode}
        selectedModelId={chat.selectedModelId}
        onSelect={({ auto, model }) => {
          if (auto) updateChat(chatId, { autoMode: true });
          else updateChat(chatId, { autoMode: false, selectedModelId: model.id });
          setPicker(false);
        }}
      />

      <HistoryDrawer open={drawer} onClose={() => setDrawer(false)} onNew={newChat} currentChatId={chatId} />
    </div>
  );
}
