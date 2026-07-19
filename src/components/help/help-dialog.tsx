"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  type UIMessage,
} from "ai";
import {
  CircleHelpIcon,
  KeyboardIcon,
  MicIcon,
  SendIcon,
  SparklesIcon,
  Volume2Icon,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AssistantAvatar,
  UserChatAvatar,
  useChatUserAvatar,
} from "@/components/candidate/chat-avatars";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Markdown } from "@/components/ui/markdown";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  HELP_SUGGESTIONS,
  type HelpInputMode,
} from "@/lib/help/prompt";
import { speakText } from "@/lib/voice/speak";
import { transcribeBlob } from "@/lib/voice/transcribe";
import { cn } from "@/lib/utils";

function messageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("\n")
    .trim();
}

export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const chatUser = useChatUserAvatar();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<HelpInputMode>("text");
  const [voiceStatus, setVoiceStatus] = useState("Tap Enable mic to talk.");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");

  const vadRef = useRef<VadController | null>(null);
  const pausedRef = useRef(true);
  const busyRef = useRef(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const modeRef = useRef<HelpInputMode>("text");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/help/chat" }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const stopVoice = useEffectEvent(() => {
    pausedRef.current = true;
    vadRef.current?.stop();
    vadRef.current = null;
    setMicReady(false);
    setListening(false);
    setLevel(0);
    setVoiceStatus("Voice paused.");
  });

  const submit = useEffectEvent((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy || busyRef.current) return;
    setInput("");
    void sendMessage({ text: trimmed });
  });

  const enableMic = async () => {
    setMicError("");
    setVoiceStatus("Starting microphone…");
    try {
      vadRef.current?.stop();
      pausedRef.current = true;
      vadRef.current = await startVadLoop({
        isPaused: () =>
          pausedRef.current ||
          busyRef.current ||
          modeRef.current !== "voice",
        onLevel: setLevel,
        onSpeechStart: () => {
          setListening(true);
          setVoiceStatus("Listening…");
        },
        onSpeechEnd: (blob) => {
          setListening(false);
          void (async () => {
            if (busyRef.current || modeRef.current !== "voice") return;
            busyRef.current = true;
            pausedRef.current = true;
            setVoiceStatus("Transcribing…");
            try {
              const data = await transcribeBlob(blob, "en-IN");
              if (!data.ok || !data.transcript) {
                setVoiceStatus(data.error || "Didn't catch that — try again.");
                return;
              }
              setVoiceStatus("Thinking…");
              await sendMessage({ text: data.transcript });
            } catch {
              setVoiceStatus("Voice failed. Speak again when ready.");
            } finally {
              busyRef.current = false;
            }
          })();
        },
      });
      setMicReady(true);
      pausedRef.current = false;
      setVoiceStatus("Speak when ready — I'm listening.");
    } catch {
      setMicError("Microphone permission is required for voice help.");
      setVoiceStatus("Microphone blocked.");
      setMicReady(false);
    }
  };

  // Speak assistant replies in voice mode.
  useEffect(() => {
    if (!open || mode !== "voice" || isBusy) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;
    const text = messageText(last);
    if (!text) return;

    spokenIdsRef.current.add(last.id);
    void (async () => {
      busyRef.current = true;
      pausedRef.current = true;
      setVoiceStatus("Speaking…");
      await speakText(text);
      busyRef.current = false;
      if (modeRef.current === "voice" && micReady) {
        pausedRef.current = false;
        setVoiceStatus("Speak when ready — I'm listening.");
      }
    })();
  }, [messages, isBusy, mode, open, micReady]);

  // Tear down mic when leaving voice mode or closing the dialog.
  useEffect(() => {
    if (!open || mode === "text") {
      stopVoice();
    }
  }, [open, mode, stopVoice]);

  useEffect(() => {
    if (!open) {
      spokenIdsRef.current.clear();
      setInput("");
      setMode("text");
      setMicError("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(36rem,85dvh)] max-h-[min(36rem,85dvh)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4 pe-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base">
                <CircleHelpIcon className="size-4" />
                Help
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Ask anything about BlueCollarz — jobs, interviews, KYC, or
                hiring.
              </DialogDescription>
            </div>
            <div className="border-border flex shrink-0 overflow-hidden border">
              <Button
                type="button"
                size="sm"
                variant={mode === "text" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => setMode("text")}
              >
                <KeyboardIcon className="size-3.5" />
                Text
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "voice" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => setMode("voice")}
              >
                <MicIcon className="size-3.5" />
                Voice
              </Button>
            </div>
          </div>
        </DialogHeader>

        <MessageScrollerProvider>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport className="px-4">
              <MessageScrollerContent className="gap-4 py-4">
                {messages.length === 0 ? (
                  <MessageScrollerItem>
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {mode === "voice"
                          ? "Enable the mic, then ask out loud — or tap a prompt."
                          : "Try one of these, or type your own question below."}
                      </p>
                      <div className="flex flex-col gap-2">
                        {HELP_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={isBusy}
                            onClick={() => submit(suggestion)}
                            className="border-border hover:bg-muted/50 text-foreground rounded-none border px-3 py-2 text-start text-sm transition-colors disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </MessageScrollerItem>
                ) : null}

                {messages.map((message, index) => {
                  const text = messageText(message);
                  if (!text && message.role === "user") return null;
                  const isUser = message.role === "user";
                  const isLast = index === messages.length - 1;

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      scrollAnchor={isLast}
                      // Avoid content-visibility recycling that drops avatars mid-stream.
                      className="[content-visibility:visible] [contain-intrinsic-size:none]"
                    >
                      <MessageGroup>
                        <Message align={isUser ? "end" : "start"}>
                          <MessageAvatar>
                            {isUser ? (
                              <UserChatAvatar
                                name={chatUser.name}
                                image={chatUser.image}
                                className="size-8 shrink-0"
                              />
                            ) : (
                              <AssistantAvatar className="size-8 shrink-0" />
                            )}
                          </MessageAvatar>
                          <MessageContent>
                            {isUser ? (
                              <div className="bg-muted text-foreground w-fit max-w-[min(100%,22rem)] rounded-3xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                                {text}
                              </div>
                            ) : (
                              <div className="bg-card text-foreground border-border w-fit max-w-[min(100%,22rem)] border px-3.5 py-2">
                                <Markdown>
                                  {text || "_Thinking…_"}
                                </Markdown>
                              </div>
                            )}
                          </MessageContent>
                        </Message>
                      </MessageGroup>
                    </MessageScrollerItem>
                  );
                })}

                {error ? (
                  <MessageScrollerItem>
                    <Marker variant="border">
                      <MarkerContent className="text-destructive">
                        {error.message ||
                          "Something went wrong. Please try again."}
                      </MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="border-border shrink-0 border-t p-3">
          {mode === "text" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <InputGroup className="h-auto">
                <InputGroupInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about BlueCollarz…"
                  disabled={isBusy}
                  aria-label="Help message"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="submit"
                    size="icon-sm"
                    variant="default"
                    disabled={isBusy || !input.trim()}
                    aria-label="Send"
                  >
                    <SendIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          ) : (
            <div className="space-y-2">
              {micError ? (
                <p className="text-destructive text-sm">{micError}</p>
              ) : null}
              {!micReady ? (
                <Button
                  type="button"
                  className="w-full"
                  size="sm"
                  onClick={() => void enableMic()}
                >
                  <MicIcon className="size-4" />
                  Enable microphone
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Volume2Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{voiceStatus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px]">
                      <MicIcon className="size-3" />
                      {listening ? "Listening" : "Idle"}
                    </p>
                    <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-100",
                          listening ? "bg-primary" : "bg-primary/40",
                        )}
                        style={{
                          width: `${Math.min(100, Math.round(level * 400))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
            Answers are about this platform only — not legal or career advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
