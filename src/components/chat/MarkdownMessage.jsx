import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function CodeBlock({ children }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = ref.current?.innerText || "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  return (
    <div className="relative my-3 overflow-hidden rounded-xl border border-black/10 bg-[#221F1C] text-[#EDE7DF]">
      <button onClick={copy} className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] text-[#EDE7DF]">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        ref={ref}
        className="overflow-x-auto p-3.5 pr-16 text-[12.5px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      >
        {children}
      </pre>
    </div>
  );
}

const components = {
  p: ({ children }) => <p className="mb-3 leading-[1.65] last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 font-heading text-lg first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 font-heading text-[16px] first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-3 text-[14px] font-semibold first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-4 border-border" />,
  code: ({ className, children }) => {
    const isBlock = Boolean(className) || String(children).includes("\n");
    if (isBlock) return <code className={className}>{children}</code>;
    return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12.5px]">{children}</code>;
  },
  pre: CodeBlock,
};

export default function MarkdownMessage({ content }) {
  return (
    <div className="text-[14px] text-foreground">
      <ReactMarkdown components={components}>{content || ""}</ReactMarkdown>
    </div>
  );
}