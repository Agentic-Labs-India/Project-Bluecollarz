"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isFileUIPart,
  isTextUIPart,
  isToolUIPart,
} from "ai";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { DocAssistantUIMessage } from "@/app/api/(software)/ai-agent/route";
import { AgentMarkdown } from "@/components/work/agent-markdown";
import { PromptBox } from "@/components/ui/agent-chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const CHAT_SHELL = cn(
  "mx-auto flex w-full max-w-5xl flex-col overflow-hidden",
  "h-[calc(100svh-3rem)] max-h-[calc(100svh-3rem)] min-h-[20rem]",
  "md:h-svh md:max-h-svh",
  "[-webkit-overflow-scrolling:touch]",
);

const MessageParts = memo(function MessageParts({
  message,
  markdown,
}: {
  message: DocAssistantUIMessage;
  markdown: boolean;
}) {
  return (
    <div className="space-y-2">
      {message.parts.map((part, index) => {
        if (isTextUIPart(part)) {
          const key = `${message.id}-t-${index}`;
          return markdown ? (
            <AgentMarkdown key={key} source={part.text} />
          ) : (
            <div
              key={key}
              className="whitespace-pre-wrap text-[15px] leading-[1.65] text-foreground"
            >
              {part.text}
            </div>
          );
        }
        if (isFileUIPart(part)) {
          const key = `${message.id}-f-${index}`;
          const alt = part.filename ?? "Attachment";
          if (part.mediaType.startsWith("image/")) {
            return (
              // biome-ignore lint/performance/noImgElement: chat attachment data URLs / hosted file URLs
              <img
                key={key}
                src={part.url}
                alt={alt}
                className="mt-1 max-h-48 max-w-full rounded-none object-contain"
              />
            );
          }
          return (
            <p key={key} className="text-[15px] text-foreground">
              <a
                href={part.url}
                download={part.filename}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {part.filename ?? "Attached file"} ({part.mediaType})
              </a>
            </p>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <div
              key={`${message.id}-tool-${index}`}
              className="rounded-none bg-muted/60 p-3 font-mono text-xs dark:bg-muted/40"
            >
              <div className="font-sans text-sm font-medium text-foreground">
                {part.type.replace(/^tool-/, "")}
              </div>
              <div className="text-muted-foreground">{part.state}</div>
              {"output" in part && part.output !== undefined ? (
                <pre className="mt-2 max-h-40 overflow-auto text-[11px]">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              ) : null}
            </div>
          );
        }
        if (part.type === "reasoning") {
          return (
            <div
              key={`${message.id}-r-${index}`}
              className="text-muted-foreground text-xs italic"
            >
              {part.text}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});

export default function HireAiAgentPage() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, stop } =
    useChat<DocAssistantUIMessage>({
      transport: new DefaultChatTransport({
        api: "/api/ai-agent",
      }),
    });

  const busy = status === "submitted" || status === "streaming";

  const threadScrollKey = useMemo(
    () =>
      messages
        .map((m) => {
          const textLen = m.parts.reduce((n, p) => {
            if (isTextUIPart(p)) return n + p.text.length;
            if (isFileUIPart(p)) {
              return n + p.url.length + (p.filename?.length ?? 0);
            }
            return n;
          }, 0);
          return `${m.id}:${m.parts.length}:${textLen}`;
        })
        .join("|"),
    [messages],
  );

  const stickBottom = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: must run when thread content / status changes; stickBottom alone is stable.
  useLayoutEffect(() => {
    stickBottom();
  }, [threadScrollKey, status, stickBottom]);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(stickBottom, 100);
    return () => window.clearInterval(id);
  }, [busy, stickBottom]);

  const handleMessageSubmit = useCallback(
    async ({ text, files }: { text: string; files?: FileList }) => {
      const trimmed = text.trim();
      if (files?.length) {
        await sendMessage(trimmed ? { text: trimmed, files } : { files });
      } else if (trimmed) {
        await sendMessage({ text: trimmed });
      }
    },
    [sendMessage],
  );

  return (
    <div className={CHAT_SHELL}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea
          viewportRef={viewportRef}
          className="min-h-0 w-full flex-1 basis-0"
        >
          <div className="mx-auto w-full max-w-5xl px-2 pb-8 pt-2 md:px-4">
            {messages.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-lg font-medium text-foreground">
                  How can I help you hire today?
                </p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Draft roles, review requirements, or get hiring help. Attach
                  images or PDFs when useful.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end py-3 md:py-4">
                      <div className="ml-auto w-fit max-w-[min(100%,34rem)] min-w-0 rounded-3xl bg-muted px-4 py-2.5 text-foreground dark:bg-muted/80">
                        <MessageParts message={m} markdown={false} />
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-start py-3 md:py-4">
                      <div className="w-full min-w-0 max-w-[min(100%,48rem)]">
                        <MessageParts message={m} markdown />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
            {error ? (
              <p className="text-destructive mt-4 text-center text-sm">
                {error.message}
              </p>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      <footer className="shrink-0 bg-background py-2">
        <div className="mx-auto w-full max-w-5xl space-y-2 px-2 md:px-4">
          {busy ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void stop()}
                className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
              >
                Stop generating
              </button>
            </div>
          ) : null}
          <PromptBox
            className="shadow-sm dark:shadow-none"
            onMessageSubmit={handleMessageSubmit}
            disabled={busy}
          />
        </div>
      </footer>
    </div>
  );
}
