"use client";

import type { UIMessage } from "ai";
import { CopyIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  MessageAction,
  MessageActions,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  AssistantAvatar,
  UserChatAvatar,
} from "@/components/candidate/chat-avatars";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { uiMessageText } from "@/lib/ai/ui-message-text";

export { uiMessageText };

function ChatTurn({
  message,
  user,
  isBusy,
  isLast,
  after,
}: {
  message: UIMessage;
  user: { name: string; image?: string };
  isBusy: boolean;
  isLast: boolean;
  after?: ReactNode;
}) {
  const isUser = message.role === "user";
  const text = uiMessageText(message);
  const align = isUser ? "end" : "start";

  return (
    <Message align={align}>
      <MessageAvatar>
        {isUser ? (
          <UserChatAvatar
            name={user.name}
            image={user.image}
            className="size-8 shrink-0"
          />
        ) : (
          <AssistantAvatar className="size-8 shrink-0" />
        )}
      </MessageAvatar>
      <MessageContent>
        <Bubble variant={isUser ? "muted" : "ghost"} align={align}>
          <BubbleContent>
            {isUser ? (
              text
            ) : text ? (
              <MessageResponse isAnimating={isBusy && isLast}>
                {text}
              </MessageResponse>
            ) : (
              <span className="text-muted-foreground animate-pulse">
                Thinking…
              </span>
            )}
          </BubbleContent>
        </Bubble>
        {after}
        {isUser || !text ? null : (
          <MessageFooter className="px-0">
            <MessageActions>
              <MessageAction
                tooltip="Copy"
                label="Copy"
                onClick={() => void navigator.clipboard.writeText(text)}
              >
                <CopyIcon className="size-3" />
              </MessageAction>
            </MessageActions>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

export function ChatTranscript({
  messages,
  empty,
  error,
  isBusy,
  user,
  afterAssistant,
}: {
  messages: UIMessage[];
  empty?: ReactNode;
  error?: Error | null;
  isBusy: boolean;
  user: { name: string; image?: string };
  afterAssistant?: (message: UIMessage) => ReactNode;
}) {
  const last = messages.at(-1);
  const waitingOnFirstToken =
    isBusy && (last === undefined || last.role === "user");

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="px-4">
          <MessageScrollerContent className="gap-4 py-4">
            {messages.length === 0 && empty ? (
              <MessageScrollerItem>{empty}</MessageScrollerItem>
            ) : null}

            {messages.map((message, index) => {
              const text = uiMessageText(message);
              if (message.role === "user" && !text) return null;
              const isLast = index === messages.length - 1;

              return (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.role === "user"}
                  className="[content-visibility:visible] [contain-intrinsic-size:none]"
                >
                  <ChatTurn
                    message={message}
                    user={user}
                    isBusy={isBusy}
                    isLast={isLast}
                    after={
                      message.role === "assistant"
                        ? afterAssistant?.(message)
                        : null
                    }
                  />
                </MessageScrollerItem>
              );
            })}

            {waitingOnFirstToken ? (
              <MessageScrollerItem>
                <Marker aria-live="polite">
                  <MarkerContent className="animate-pulse">
                    Thinking…
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}

            {error ? (
              <MessageScrollerItem>
                <Marker variant="border" aria-live="assertive">
                  <MarkerContent className="text-destructive">
                    {error.message || "Something went wrong. Please try again."}
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
