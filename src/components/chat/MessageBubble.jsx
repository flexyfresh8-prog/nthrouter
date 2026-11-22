import MarkdownMessage from "./MarkdownMessage";
import { compact, money } from "@/lib/format";
import { lookupModel } from "@/lib/models";
import { providerById } from "@/lib/providers/catalog";

export default function MessageBubble({ message, fresh }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-secondary px-3.5 py-2.5 text-[14px] leading-relaxed ${
            fresh ? "anim-pop" : ""
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const model = message.modelId ? lookupModel(message.providerId, message.modelId) : null;
  const provider = message.providerId ? providerById(message.providerId) : null;

  return (
    <div className={fresh ? "anim-rise" : ""}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {provider?.name || "NthRouter"}
        </span>
        {message.rotated && (
          <span className="rounded-full border border-primary/30 px-1.5 text-[9.5px] text-primary">rotated key</span>
        )}
      </div>
      <MarkdownMessage content={message.content} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <span>{model?.displayName || message.modelId}</span>
        <span>·</span>
        <span>
          {compact(message.totalTokens)} tokens {message.usageSource === "exact" ? "" : "(approx.)"}
        </span>
        {message.cost > 0 && (
          <>
            <span>·</span>
            <span>{money(message.cost)}</span>
          </>
        )}
      </div>
    </div>
  );
}
