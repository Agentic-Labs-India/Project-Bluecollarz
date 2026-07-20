"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  MicIcon,
  UploadIcon,
  Volume2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import {
  AssistantAvatar,
  UserChatAvatar,
  useChatUserAvatar,
} from "@/components/candidate/chat-avatars";
import { APP_PAGE_MAX } from "@/components/layout/app-page";
import { speakText } from "@/lib/voice/speak";
import {
  fetchProfileVoiceLanguage,
  languageLabel,
  saveProfileVoiceLanguage,
  VOICE_LANGUAGE_OPTIONS,
  isTtsLanguageCode,
  type TtsLanguageCode,
} from "@/lib/voice/languages";
import { TTS_VOICE } from "@/lib/voice/style";
import { transcribeBlob } from "@/lib/voice/transcribe";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

const LANG_TOOL = "tool-selectVoiceLanguage" as const;

function langToolParts(message: UIMessage) {
  return message.parts.filter(
    (p) => isToolUIPart(p) && p.type === LANG_TOOL,
  ) as Array<{
    type: typeof LANG_TOOL;
    toolCallId: string;
    state: string;
    input?: { prompt?: string };
    output?: { language_code?: string; label?: string };
  }>;
}

function needsLanguagePick(message: UIMessage) {
  return langToolParts(message).some(
    (p) => p.state === "input-available" || p.state === "approval-requested",
  );
}

function LanguagePickerInChat({
  prompt,
  selectedCode,
  disabled,
  onSelect,
}: {
  prompt?: string;
  selectedCode?: string | null;
  disabled?: boolean;
  onSelect: (code: TtsLanguageCode) => void;
}) {
  const confirmed = Boolean(selectedCode);
  return (
    <div className="border-border bg-muted/30 mt-2 w-full max-w-sm space-y-2.5 border p-3">
      <p className="text-foreground text-sm leading-snug">
        {prompt?.trim() || "Which language should we use?"}
      </p>
      <div
        role="listbox"
        aria-label="Select language"
        className="grid grid-cols-2 gap-1.5"
      >
        {VOICE_LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = selectedCode === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled || confirmed}
              onClick={() => onSelect(opt.code)}
              className={cn(
                "border-border flex items-center gap-2 border px-2.5 py-2 text-left transition-colors",
                "hover:bg-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "bg-background/80 disabled:opacity-60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">
                  {opt.nativeLabel}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {opt.label}
                </span>
              </span>
              {isSelected ? (
                <CheckIcon className="text-primary size-3.5 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ActionCue = {
  label: string;
  hint: string;
  tone: "start" | "speak" | "listen" | "wait" | "done" | "error";
};

const CUE_STYLES: Record<ActionCue["tone"], string> = {
  start:
    "border-amber-400/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/50 dark:text-amber-300",
  speak:
    "border-emerald-400/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300",
  listen:
    "border-sky-400/70 bg-sky-500/10 text-sky-700 dark:border-sky-500/50 dark:text-sky-300",
  wait:
    "border-orange-400/70 bg-orange-500/10 text-orange-700 dark:border-orange-500/50 dark:text-orange-300",
  done:
    "border-emerald-400/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300",
  error: "border-destructive/60 bg-destructive/10 text-destructive",
};

export function OnboardingAgent() {
  const router = useRouter();
  const chatUser = useChatUserAvatar();
  const [status, setStatus] = useState("Allow the microphone to begin.");
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");
  const [done, setDone] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<TtsLanguageCode | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spokenTextByIdRef = useRef<Map<string, string>>(new Map());
  /** Text on the language-picker message at pick time — don't TTS that; wait for the real reply. */
  const langPickBaselineRef = useRef<{ id: string; text: string } | null>(
    null,
  );
  const startedRef = useRef(false);
  const pausedRef = useRef(true);
  const busyUtteranceRef = useRef(false);
  const streamingRef = useRef(false);
  const vadRef = useRef<VadController | null>(null);
  const doneRef = useRef(false);
  const languageLockedRef = useRef(false);
  const voiceLanguageRef = useRef(TTS_VOICE.languageCode);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/onboarding",
        body: () => ({
          language_code: languageLockedRef.current
            ? voiceLanguageRef.current
            : null,
        }),
      }),
    [],
  );

  const { messages, sendMessage, addToolOutput, status: chatStatus } =
    useChat({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    });

  const isStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";
  streamingRef.current = isStreaming;

  const awaitingLanguage = messages.some(
    (m) => m.role === "assistant" && needsLanguagePick(m),
  );

  const actionCue: ActionCue = (() => {
    if (done) {
      return { label: "DONE", hint: "All set", tone: "done" };
    }
    if (micError) {
      return { label: "FIX MIC", hint: "Allow access", tone: "error" };
    }
    if (!micReady) {
      return { label: "START", hint: "Enable mic", tone: "start" };
    }
    if (awaitingLanguage) {
      return { label: "LANGUAGE", hint: "Pick in chat", tone: "start" };
    }
    if (uploading) {
      return { label: "WAIT", hint: "Reading PDF", tone: "wait" };
    }
    if (listening) {
      return { label: "LISTENING", hint: "Keep talking", tone: "listen" };
    }
    if (
      isStreaming ||
      status.startsWith("Thinking") ||
      status.startsWith("Transcribing") ||
      status.startsWith("Speaking") ||
      status.startsWith("Starting") ||
      status.startsWith("Calibrating")
    ) {
      return { label: "WAIT", hint: "Hold — don’t speak", tone: "wait" };
    }
    return { label: "SPEAK NOW", hint: "Your turn", tone: "speak" };
  })();

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const lockLanguage = (code: TtsLanguageCode) => {
    languageLockedRef.current = true;
    voiceLanguageRef.current = code;
    setVoiceLanguage(code);
    setStatus(`${languageLabel(code)} selected — continuing…`);
  };

  const enableMic = async () => {
    setMicError("");
    setStatus("Loading your voice language…");
    try {
      const existingLanguage = await fetchProfileVoiceLanguage();
      if (existingLanguage) {
        lockLanguage(existingLanguage);
      }

      setStatus("Calibrating microphone…");
      pausedRef.current = true;
      vadRef.current?.stop();
      vadRef.current = await startVadLoop({
        isPaused: () =>
          pausedRef.current ||
          busyUtteranceRef.current ||
          streamingRef.current ||
          doneRef.current ||
          !languageLockedRef.current,
        onLevel: setLevel,
        onSpeechStart: () => {
          setListening(true);
          setStatus("Listening…");
        },
        onSpeechEnd: (blob) => {
          setListening(false);
          void (async () => {
            if (
              busyUtteranceRef.current ||
              streamingRef.current ||
              doneRef.current ||
              !languageLockedRef.current
            ) {
              return;
            }
            busyUtteranceRef.current = true;
            pausedRef.current = true;
            setStatus("Transcribing…");
            try {
              const data = await transcribeBlob(
                blob,
                voiceLanguageRef.current,
              );
              if (!data.ok || !data.transcript) {
                setStatus(data.error || "Didn't catch that — speak again.");
                pausedRef.current = false;
                return;
              }
              setStatus("Thinking…");
              await sendMessage({ text: data.transcript });
            } catch {
              setStatus("Voice failed. Speak again when ready.");
              pausedRef.current = false;
            } finally {
              busyUtteranceRef.current = false;
            }
          })();
        },
      });
      setMicReady(true);

      if (!startedRef.current) {
        startedRef.current = true;
        if (existingLanguage) {
          setStatus("Starting onboarding…");
          await sendMessage({
            text: "Hi — I just signed in as a candidate. My voice language is already on my profile, start onboarding in that language.",
          });
        } else {
          setStatus("Starting onboarding — pick your language in chat…");
          await sendMessage({
            text: "Hi — I just signed in as a candidate. Please ask me to select my language in the chat, then start onboarding in that language.",
          });
        }
      }
    } catch {
      setMicError("Microphone permission is required for voice onboarding.");
      setStatus("Allow the microphone to begin.");
    }
  };

  // Speak finished assistant text after language is locked.
  useEffect(() => {
    if (isStreaming || !micReady || doneRef.current) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;

    if (needsLanguagePick(last)) {
      pausedRef.current = true;
      setStatus("Pick a language in the chat to continue.");
      return;
    }

    for (const part of langToolParts(last)) {
      if (part.state === "output-available") {
        const raw = part.output?.language_code;
        if (raw && isTtsLanguageCode(raw)) lockLanguage(raw);
      }
    }

    if (!languageLockedRef.current) return;

    const text = last.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();

    const baseline = langPickBaselineRef.current;
    if (baseline && baseline.id === last.id) {
      // Still the picker message — wait until new greeting text appears.
      if (!text || text === baseline.text) {
        pausedRef.current = true;
        setStatus("Language selected — continuing…");
        return;
      }
      langPickBaselineRef.current = null;
    } else if (baseline && baseline.id !== last.id) {
      // Greeting arrived as a new message — clear picker baseline.
      langPickBaselineRef.current = null;
    }

    if (!text) return;
    if (spokenTextByIdRef.current.get(last.id) === text) return;
    spokenTextByIdRef.current.set(last.id, text);

    const finished = last.parts.some(
      (p) =>
        isToolUIPart(p) &&
        p.type === "tool-finishOnboarding" &&
        p.state === "output-available" &&
        typeof p.output === "object" &&
        p.output !== null &&
        (p.output as { ok?: boolean }).ok === true,
    );

    void (async () => {
      pausedRef.current = true;
      busyUtteranceRef.current = true;
      setStatus("Speaking…");
      await speakText(text, voiceLanguageRef.current);
      busyUtteranceRef.current = false;

      if (finished) {
        doneRef.current = true;
        setDone(true);
        pausedRef.current = true;
        vadRef.current?.stop();
        vadRef.current = null;
        setListening(false);
        setStatus("Profile complete — taking you to your dashboard…");
        setTimeout(() => router.replace("/candidate/home"), 1200);
        return;
      }

      pausedRef.current = false;
      setStatus("Speak when ready — I'm listening.");
    })();
  }, [messages, isStreaming, micReady, router]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  const onUploadResume = async (file: File | null) => {
    if (!file || !micReady || doneRef.current || !languageLockedRef.current) {
      return;
    }
    if (file.type !== "application/pdf") {
      setStatus("Please upload a PDF resume only.");
      return;
    }
    pausedRef.current = true;
    setUploading(true);
    setStatus("Reading your resume…");
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      await sendMessage({
        text: "I attached my resume PDF. Extract my profile from it and fast-forward onboarding — only ask for anything still missing.",
        files: dt.files,
      });
    } catch {
      setStatus("Could not read that PDF. Try again.");
      pausedRef.current = false;
    } finally {
      setUploading(false);
    }
  };

  const onPickLanguage = (
    toolCallId: string,
    code: TtsLanguageCode,
  ) => {
    const host = messages.find(
      (m) =>
        m.role === "assistant" &&
        langToolParts(m).some((p) => p.toolCallId === toolCallId),
    );
    if (host) {
      const existingText = host.parts
        .filter(isTextUIPart)
        .map((p) => p.text)
        .join(" ")
        .trim();
      langPickBaselineRef.current = { id: host.id, text: existingText };
    }

    pausedRef.current = true;
    lockLanguage(code);
    void saveProfileVoiceLanguage(code).catch(() => undefined);
    void addToolOutput({
      tool: "selectVoiceLanguage",
      toolCallId,
      output: {
        language_code: code,
        label: languageLabel(code),
      },
    });
  };

  return (
    <div
      className={cn(
        "bg-background fixed inset-x-0 top-14 bottom-0 z-30 mx-auto flex w-full min-w-0 flex-col overflow-hidden md:static md:inset-auto md:top-auto md:bottom-auto md:z-auto md:h-full md:min-h-0",
        APP_PAGE_MAX,
      )}
    >
      <header className="border-border flex w-full shrink-0 items-center border-b px-4 pt-3 pb-3">
        <Badge
          variant="outline"
          className="border-primary/40 bg-primary/10 text-primary h-auto w-full justify-center px-3 py-1 text-sm font-semibold"
        >
          Candidate onboarding
          {voiceLanguage ? ` · ${languageLabel(voiceLanguage)}` : ""}
        </Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-4 py-5">
          {messages.map((message) => {
            const text = message.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join("\n")
              .trim();
            const langParts = langToolParts(message);
            const otherTools = message.parts.filter(
              (p) => isToolUIPart(p) && p.type !== LANG_TOOL,
            );
            if (!text && message.role === "user") return null;
            if (
              !text &&
              message.role === "assistant" &&
              !langParts.length &&
              !otherTools.length
            ) {
              return null;
            }
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex max-w-[90%] items-start gap-2.5",
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                {isUser ? (
                  <UserChatAvatar name={chatUser.name} image={chatUser.image} />
                ) : (
                  <AssistantAvatar />
                )}
                <div
                  className={cn(
                    "min-w-0 text-sm leading-relaxed",
                    isUser
                      ? "bg-muted text-foreground w-fit rounded-3xl px-4 py-2"
                      : "text-foreground/90 pt-0.5",
                  )}
                >
                  {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
                  {!text && otherTools.length ? (
                    <span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                      <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                      Updating your profile…
                    </span>
                  ) : null}
                  {langParts
                    .filter(
                      (part) =>
                        part.state === "input-available" ||
                        part.state === "approval-requested",
                    )
                    .map((part) => (
                      <LanguagePickerInChat
                        key={part.toolCallId}
                        prompt={part.input?.prompt}
                        selectedCode={null}
                        disabled={isStreaming}
                        onSelect={(code) =>
                          onPickLanguage(part.toolCallId, code)
                        }
                      />
                    ))}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="border-border shrink-0 border-t bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!micReady ? (
          <div className="space-y-2">
            {micError ? (
              <p className="text-destructive text-sm">{micError}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                <Volume2Icon className="size-3.5 shrink-0" />
                <span className="truncate">{status}</span>
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "h-auto shrink-0 gap-1 px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
                  CUE_STYLES[actionCue.tone],
                )}
                aria-live="polite"
              >
                {actionCue.label}
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void enableMic()}
            >
              <MicIcon className="size-4" />
              Enable microphone &amp; start
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                  <Volume2Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{status}</span>
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-auto shrink-0 gap-1 px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
                    CUE_STYLES[actionCue.tone],
                  )}
                  aria-live="polite"
                >
                  {actionCue.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px]">
                  <MicIcon className="size-3" />
                  {listening ? "Listening" : "Idle"}
                </p>
                <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-none">
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={
                uploading || isStreaming || done || !voiceLanguage
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Skeleton className="size-3.5 shrink-0 rounded-sm" />
              ) : (
                <UploadIcon className="size-3.5" />
              )}
              {uploading ? "Uploading…" : "Upload PDF"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onUploadResume(file);
              }}
            />
          </div>
        )}
      </footer>
    </div>
  );
}
