"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { BookIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useChatUserAvatar } from "@/components/candidate/chat-avatars";
import { ChatTranscript } from "@/components/chat/chat-transcript";
import { KNOWLEDGE_SUGGESTIONS } from "@/lib/knowledge/prompt";
import type {
  KnowledgeCitation,
  KnowledgeDocType,
} from "@/lib/knowledge/types";

function citationsFromMessage(message: UIMessage): KnowledgeCitation[] {
  const seen = new Set<string>();
  const out: KnowledgeCitation[] = [];
  for (const part of message.parts) {
    if (!isToolUIPart(part) || part.type !== "tool-searchDocuments") continue;
    if (part.state !== "output-available") continue;
    const output = part.output as {
      hits?: Array<{ source?: string; page?: number }>;
    } | null;
    for (const hit of output?.hits ?? []) {
      if (!hit.source || typeof hit.page !== "number") continue;
      const key = `${hit.source}:${hit.page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ source: hit.source, page: hit.page });
    }
  }
  return out;
}

function KnowledgeSources({ message }: { message: UIMessage }) {
  const citations = citationsFromMessage(message);
  if (!citations.length) return null;

  return (
    <Sources className="mt-2 mb-0">
      <SourcesTrigger count={citations.length} />
      <SourcesContent>
        {citations.map((cite) => (
          <span
            key={`${cite.source}:${cite.page}`}
            className="text-foreground flex items-center gap-2"
          >
            <BookIcon className="size-4 shrink-0" />
            <span className="font-medium">
              {cite.source} · p.{cite.page}
            </span>
          </span>
        ))}
      </SourcesContent>
    </Sources>
  );
}

export function AdminKnowledgeChat() {
  const chatUser = useChatUserAvatar();
  const [text, setText] = useState("");
  const [docType, setDocType] = useState<"all" | KnowledgeDocType>("all");
  const docTypeRef = useRef(docType);
  docTypeRef.current = docType;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/admin/knowledge/chat",
        body: () => ({
          docType:
            docTypeRef.current === "all" ? undefined : docTypeRef.current,
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isBusy = status === "submitted" || status === "streaming";

  function submit(next: string) {
    const trimmed = next.trim();
    if (!trimmed || isBusy) return;
    setText("");
    void sendMessage({ text: trimmed });
  }

  function onPromptSubmit(message: PromptInputMessage) {
    submit(message.text);
  }

  return (
    <div className="border-border flex min-h-[32rem] flex-col border">
      <ChatTranscript
        messages={messages}
        isBusy={isBusy}
        error={error}
        user={chatUser}
        afterAssistant={(message) => <KnowledgeSources message={message} />}
        empty={
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ask about the PDFs you uploaded. Answers cite filename and page,
              and are not legal advice.
            </p>
            <Suggestions>
              {KNOWLEDGE_SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  suggestion={suggestion}
                  onClick={submit}
                  disabled={isBusy}
                />
              ))}
            </Suggestions>
          </div>
        }
      />

      <div className="border-border space-y-2 border-t p-4">
        <PromptInput onSubmit={onPromptSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={text}
              onChange={(event) => setText(event.currentTarget.value)}
              placeholder="Ask the knowledge base…"
              disabled={isBusy}
              aria-label="Knowledge question"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSelect
                value={docType}
                onValueChange={(value) =>
                  setDocType(value as "all" | KnowledgeDocType)
                }
              >
                <PromptInputSelectTrigger aria-label="Document type filter">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  <PromptInputSelectItem value="all">
                    All types
                  </PromptInputSelectItem>
                  <PromptInputSelectItem value="legal">
                    Legal only
                  </PromptInputSelectItem>
                  <PromptInputSelectItem value="general">
                    General only
                  </PromptInputSelectItem>
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit
              status={status}
              disabled={isBusy || !text.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Grounded in uploaded PDFs only. Output is not legal advice.
        </p>
      </div>
    </div>
  );
}
