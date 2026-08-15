"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  DefaultChatTransport,
  isTextUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { CheckIcon, MicIcon, UploadIcon, Volume2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { APP_PAGE_MAX } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchProfileVoiceLanguage,
  isTtsLanguageCode,
  LANGUAGE_PICK_PROMPT,
  languageLabel,
  resumeVoicePrompt,
  saveProfileVoiceLanguage,
  type TtsLanguageCode,
  VOICE_LANGUAGE_OPTIONS,
} from "@/lib/ai/voice/languages";
import { speakText } from "@/lib/ai/voice/speak";
import { transcribeBlob } from "@/lib/ai/voice/transcribe";
import { cn } from "@/lib/utils";

const LANG_TOOL = "tool-selectVoiceLanguage" as const;
const RESUME_TOOL = "tool-selectResume" as const;
const RESUME_PICK_STATUS = "Choose a resume option in the chat to continue.";

function isPickerOpen(state: string) {
  return state === "input-available" || state === "approval-requested";
}

type LangToolPart = {
  type: typeof LANG_TOOL;
  toolCallId: string;
  state: string;
  input?: { prompt?: string };
  output?: { language_code?: string; label?: string };
};

type ResumeToolPart = {
  type: typeof RESUME_TOOL;
  toolCallId: string;
  state: string;
  input?: { prompt?: string };
  output?: { has_resume?: boolean };
};

function langToolParts(message: UIMessage) {
  return message.parts.filter(
    (p) => isToolUIPart(p) && p.type === LANG_TOOL,
  ) as LangToolPart[];
}

function resumeToolParts(message: UIMessage) {
  return message.parts.filter(
    (p) => isToolUIPart(p) && p.type === RESUME_TOOL,
  ) as ResumeToolPart[];
}

function needsLanguagePick(message: UIMessage) {
  return langToolParts(message).some((p) => isPickerOpen(p.state));
}

function needsResumePick(message: UIMessage) {
  return resumeToolParts(message).some((p) => isPickerOpen(p.state));
}

function isClientPickerTool(type: string) {
  return type === LANG_TOOL || type === RESUME_TOOL;
}

function waitingPickerStatus(awaitingResume: boolean) {
  if (awaitingResume) return RESUME_PICK_STATUS;
  return null;
}

function openPickerPrompt(
  parts: Array<{ state: string; input?: { prompt?: string } }>,
) {
  return parts.find((p) => isPickerOpen(p.state))?.input?.prompt?.trim() || "";
}

/** Spoken line when the model opened a picker without chat text. */
function pickerFallbackText(
  message: UIMessage,
  voiceLanguage: TtsLanguageCode,
): string | null {
  if (needsLanguagePick(message)) {
    return openPickerPrompt(langToolParts(message)) || LANGUAGE_PICK_PROMPT;
  }
  if (needsResumePick(message)) {
    return resumeVoicePrompt(voiceLanguage);
  }
  return null;
}

/** Kickoff prompts are sent to the model but should not appear in the chat UI. */
function isHiddenInChat(message: UIMessage) {
  const meta = message.metadata;
  return (
    typeof meta === "object" &&
    meta !== null &&
    "hideInChat" in meta &&
    (meta as { hideInChat?: boolean }).hideInChat === true
  );
}

function LanguagePickerInChat({
  prompt,
  disabled,
  onSelect,
}: {
  prompt?: string;
  disabled?: boolean;
  onSelect: (code: TtsLanguageCode) => void;
}) {
  return (
    <div className="border-border bg-muted/30 mt-2 w-full max-w-sm space-y-2.5 border p-3">
      <p className="text-foreground text-sm leading-snug">
        {prompt?.trim() || LANGUAGE_PICK_PROMPT}
      </p>
      <div
        role="listbox"
        aria-label="Select language"
        className="grid grid-cols-2 gap-1.5"
      >
        {VOICE_LANGUAGE_OPTIONS.map((opt) => {
          return (
            <button
              key={opt.code}
              type="button"
              role="option"
              aria-selected={false}
              disabled={disabled}
              onClick={() => onSelect(opt.code)}
              className={cn(
                "border-border bg-background/80 flex items-center gap-2 border px-2.5 py-2 text-left transition-colors",
                "hover:bg-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-60",
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResumePickerInChat({
  languageCode,
  selected,
  disabled,
  uploading,
  onUpload,
  onSkip,
}: {
  languageCode?: TtsLanguageCode | null;
  selected?: "upload" | "skip" | null;
  disabled?: boolean;
  uploading?: boolean;
  onUpload: () => void;
  onSkip: () => void;
}) {
  const confirmed = Boolean(selected);
  return (
    <div className="border-border bg-muted/30 mt-2 w-full max-w-sm space-y-2.5 border p-3">
      <p className="text-foreground text-sm leading-snug">
        {resumeVoicePrompt(languageCode)}
      </p>
      <div
        role="listbox"
        aria-label="Resume options"
        className="grid grid-cols-1 gap-1.5"
      >
        <button
          type="button"
          role="option"
          aria-selected={selected === "upload"}
          disabled={disabled || confirmed || uploading}
          onClick={onUpload}
          className={cn(
            "border-border flex items-center gap-2 border px-2.5 py-2.5 text-left transition-colors",
            "hover:bg-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none",
            selected === "upload"
              ? "border-primary bg-primary/10"
              : "bg-background/80 disabled:opacity-60",
          )}
        >
          {uploading ? (
            <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          ) : (
            <UploadIcon className="text-primary size-3.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 text-sm font-medium leading-tight">
            {uploading ? "Uploading…" : "Upload"}
          </span>
          {selected === "upload" ? (
            <CheckIcon className="text-primary size-3.5 shrink-0" />
          ) : null}
        </button>
        <button
          type="button"
          role="option"
          aria-selected={selected === "skip"}
          disabled={disabled || confirmed || uploading}
          onClick={onSkip}
          className={cn(
            "border-border flex items-center gap-2 border px-2.5 py-2.5 text-left transition-colors",
            "hover:bg-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none",
            selected === "skip"
              ? "border-primary bg-primary/10"
              : "bg-background/80 disabled:opacity-60",
          )}
        >
          <span className="min-w-0 flex-1 text-sm font-medium leading-tight">
            I don't have it.
          </span>
          {selected === "skip" ? (
            <CheckIcon className="text-primary size-3.5 shrink-0" />
          ) : null}
        </button>
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
  wait: "border-orange-400/70 bg-orange-500/10 text-orange-700 dark:border-orange-500/50 dark:text-orange-300",
  done: "border-emerald-400/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300",
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
  const [resumeChoice, setResumeChoice] = useState<"upload" | "skip" | null>(
    null,
  );
  const [pendingLanguagePick, setPendingLanguagePick] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingResumeToolIdRef = useRef<string | null>(null);
  const skipAutoSendRef = useRef(false);
  const spokenTextByIdRef = useRef<Map<string, string>>(new Map());
  /** Text on a picker message at pick time — don't TTS that; wait for the real reply. */
  const pickBaselineRef = useRef<{ id: string; text: string } | null>(null);
  const startedRef = useRef(false);
  const pausedRef = useRef(true);
  const busyUtteranceRef = useRef(false);
  const streamingRef = useRef(false);
  const vadRef = useRef<VadController | null>(null);
  const doneRef = useRef(false);
  const languageLockedRef = useRef(false);
  const pickerGateRef = useRef(false);
  const voiceLanguageRef = useRef<TtsLanguageCode | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/onboarding",
        body: () =>
          languageLockedRef.current && voiceLanguageRef.current
            ? { language_code: voiceLanguageRef.current }
            : {},
      }),
    [],
  );

  const {
    messages,
    sendMessage,
    addToolOutput,
    status: chatStatus,
  } = useChat({
    transport,
    sendAutomaticallyWhen: (opts) => {
      if (skipAutoSendRef.current) return false;
      return lastAssistantMessageIsCompleteWithToolCalls(opts);
    },
  });

  const isStreaming = chatStatus === "submitted" || chatStatus === "streaming";
  streamingRef.current = isStreaming;

  const awaitingLanguage = messages.some(
    (m) => m.role === "assistant" && needsLanguagePick(m),
  );
  const awaitingResume = messages.some(
    (m) => m.role === "assistant" && needsResumePick(m),
  );
  pickerGateRef.current = awaitingResume || uploading;

  const haltMic = useCallback(() => {
    pausedRef.current = true;
    vadRef.current?.stop();
    vadRef.current = null;
    setListening(false);
  }, []);

  const markCompleteAndGoHome = useCallback(
    (delayMs: number) => {
      doneRef.current = true;
      setDone(true);
      haltMic();
      setStatus("Profile complete — taking you to KYC…");
      setTimeout(() => router.replace("/candidate/kyc"), delayMs);
    },
    [haltMic, router],
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
    if (awaitingLanguage || pendingLanguagePick) {
      return { label: "LANGUAGE", hint: "Pick in chat", tone: "start" };
    }
    if (awaitingResume || uploading) {
      return {
        label: uploading ? "WAIT" : "RESUME",
        hint: uploading ? "Reading PDF" : "Pick in chat",
        tone: uploading ? "wait" : "start",
      };
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
  }, []);

  const startOnboarding = useCallback(
    async (alreadyHasLanguage: boolean) => {
      if (startedRef.current) return;
      startedRef.current = true;
      setStatus(
        alreadyHasLanguage
          ? "Starting onboarding…"
          : "Starting onboarding — pick your language in chat…",
      );
      const kickoff = alreadyHasLanguage
        ? "Hi — I just signed in as a candidate. My voice language is already on my profile. Call getCandidateProfile first."
        : "Hi — I just signed in as a candidate. Please ask me to select my language in the chat, then call getCandidateProfile.";
      await sendMessage({
        text: `${kickoff} Interview currently working as (headline), years of experience, education, work experience, and languages. Never ask for identity (name, email, phone, location, gender, PAN, DOB, Aadhaar), skills, or professional summary. If interview fields are done, call finishOnboarding (it writes the summary).`,
        metadata: { hideInChat: true },
      });
    },
    [sendMessage],
  );

  const lockLanguage = useCallback((code: TtsLanguageCode) => {
    languageLockedRef.current = true;
    voiceLanguageRef.current = code;
    setVoiceLanguage(code);
    setStatus(`${languageLabel(code)} selected — continuing…`);
  }, []);

  const capturePickBaseline = (toolCallId: string) => {
    const host = messages.find(
      (m) =>
        m.role === "assistant" &&
        m.parts.some(
          (p) =>
            isToolUIPart(p) &&
            isClientPickerTool(p.type) &&
            p.toolCallId === toolCallId,
        ),
    );
    if (!host) return;
    const existingText = host.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();
    pickBaselineRef.current = { id: host.id, text: existingText };
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
          !languageLockedRef.current ||
          pickerGateRef.current,
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
              !languageLockedRef.current ||
              pickerGateRef.current
            ) {
              return;
            }
            busyUtteranceRef.current = true;
            pausedRef.current = true;
            setStatus("Transcribing…");
            try {
              const lang = voiceLanguageRef.current;
              if (!lang) {
                pausedRef.current = false;
                return;
              }
              const data = await transcribeBlob(blob, lang);
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

      if (existingLanguage) {
        await startOnboarding(true);
      } else {
        setPendingLanguagePick(true);
        setStatus("Pick a language in the chat to continue.");
        void speakText(LANGUAGE_PICK_PROMPT, "en-IN");
      }
    } catch {
      setMicError("Microphone permission is required for voice onboarding.");
      setStatus("Allow the microphone to begin.");
    }
  };

  // Speak finished assistant text. Language picker uses default English TTS;
  // resume picker always uses the selected voice language.
  useEffect(() => {
    if (isStreaming || !micReady || doneRef.current) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;

    const resumeHost = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && needsResumePick(m));
    const awaitingLanguage = needsLanguagePick(last);
    const awaitingResume = Boolean(resumeHost);
    const pickerHint = awaitingLanguage
      ? "Pick a language in the chat to continue."
      : waitingPickerStatus(awaitingResume);
    if (pickerHint) pausedRef.current = true;

    for (const part of langToolParts(last)) {
      if (part.state === "output-available") {
        const raw = part.output?.language_code;
        if (raw && isTtsLanguageCode(raw)) lockLanguage(raw);
      }
    }

    if (!languageLockedRef.current && !awaitingLanguage) return;

    let text = last.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();
    const speakId = resumeHost?.id ?? last.id;
    if (awaitingResume) {
      // After getCandidateProfile / updateCandidateProfile the model often
      // opens selectResume with no chat text, or with English. Speak the
      // localized question in the language they already picked.
      text = resumeVoicePrompt(voiceLanguageRef.current ?? "en-IN");
    } else if (!text) {
      text =
        pickerFallbackText(last, voiceLanguageRef.current ?? "en-IN") ?? "";
    }

    const baseline = pickBaselineRef.current;
    if (baseline && baseline.id === last.id && !awaitingResume) {
      if (!text || text === baseline.text) {
        pausedRef.current = true;
        setStatus(pickerHint ?? "Continuing…");
        return;
      }
      pickBaselineRef.current = null;
    } else if (baseline && (baseline.id !== last.id || awaitingResume)) {
      pickBaselineRef.current = null;
    }

    if (!text) {
      if (pickerHint) setStatus(pickerHint);
      return;
    }
    if (spokenTextByIdRef.current.get(speakId) === text) {
      if (pickerHint) setStatus(pickerHint);
      return;
    }
    spokenTextByIdRef.current.set(speakId, text);

    const finished = last.parts.some((p) => {
      if (!isToolUIPart(p) || p.state !== "output-available") return false;
      if (typeof p.output !== "object" || p.output === null) return false;
      const out = p.output as {
        ok?: boolean;
        finished?: boolean;
        complete?: boolean;
      };
      if (p.type === "tool-finishOnboarding" && out.ok === true) return true;
      if (
        p.type === "tool-updateCandidateProfile" &&
        (out.finished === true || out.complete === true)
      ) {
        return true;
      }
      return false;
    });

    void (async () => {
      pausedRef.current = true;
      busyUtteranceRef.current = true;
      setStatus("Speaking…");
      await speakText(text, voiceLanguageRef.current ?? "en-IN");
      busyUtteranceRef.current = false;

      if (finished) {
        markCompleteAndGoHome(1200);
        return;
      }

      if (pickerHint) {
        pausedRef.current = true;
        setStatus(pickerHint);
        return;
      }

      // Fallback: server may be complete even if the model skipped finishOnboarding.
      try {
        const res = await fetch("/api/candidate/onboarding-status");
        const json = (await res.json().catch(() => ({}))) as {
          complete?: boolean;
        };
        if (res.ok && json.complete === true) {
          markCompleteAndGoHome(800);
          return;
        }
      } catch {
        // ignore — keep listening
      }

      pausedRef.current = false;
      setStatus("Speak when ready — I'm listening.");
    })();
  }, [messages, isStreaming, micReady, lockLanguage, markCompleteAndGoHome]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  const onPickLanguage = (toolCallId: string | null, code: TtsLanguageCode) => {
    pausedRef.current = true;
    lockLanguage(code);
    setPendingLanguagePick(false);
    void (async () => {
      try {
        await saveProfileVoiceLanguage(code);
      } catch {
        // TTS already uses the locked language.
      }
      if (toolCallId) {
        capturePickBaseline(toolCallId);
        void addToolOutput({
          tool: "selectVoiceLanguage",
          toolCallId,
          output: {
            language_code: code,
            label: languageLabel(code),
          },
        });
        return;
      }
      await startOnboarding(true);
    })();
  };

  const onSkipResume = (toolCallId: string) => {
    capturePickBaseline(toolCallId);
    pausedRef.current = true;
    setResumeChoice("skip");
    setStatus("No resume — continuing with voice…");
    void addToolOutput({
      tool: "selectResume",
      toolCallId,
      output: { has_resume: false },
    });
  };

  const onUploadResumeClick = (toolCallId: string) => {
    pendingResumeToolIdRef.current = toolCallId;
    fileInputRef.current?.click();
  };

  const onResumeFileSelected = async (file: File | null) => {
    const toolCallId = pendingResumeToolIdRef.current;
    pendingResumeToolIdRef.current = null;
    if (!file || !toolCallId || !micReady || doneRef.current) return;
    if (file.type !== "application/pdf") {
      setStatus("Please upload a PDF resume only.");
      return;
    }

    capturePickBaseline(toolCallId);
    pausedRef.current = true;
    setResumeChoice("upload");
    setUploading(true);
    setStatus("Reading your resume…");

    try {
      skipAutoSendRef.current = true;
      await addToolOutput({
        tool: "selectResume",
        toolCallId,
        output: { has_resume: true },
      });
      const dt = new DataTransfer();
      dt.items.add(file);
      await sendMessage({
        text: "Resume PDF attached. Stay in my selected voice language. Extract the profile and only ask what is still missing.",
        files: dt.files,
        metadata: { hideInChat: true },
      });
    } catch {
      setStatus("Could not read that PDF. Try again.");
      setResumeChoice(null);
      pausedRef.current = false;
    } finally {
      skipAutoSendRef.current = false;
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-background fixed inset-x-0 top-14 bottom-0 z-30 mx-auto flex w-full min-w-0 flex-col overflow-hidden md:static md:inset-auto md:top-auto md:bottom-auto md:z-auto md:h-full md:min-h-0",
        APP_PAGE_MAX,
      )}
    >
      <header className="flex w-full shrink-0 items-center">
        <Banner
          variant="rainbow"
          changeLayout={false}
          className="relative w-full bg-background"
        >
          🚀 Welcome, Let&apos;s get you onboarded!
          {voiceLanguage ? ` · ${languageLabel(voiceLanguage)}` : ""}
        </Banner>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-6 px-4 py-5">
          {pendingLanguagePick ? (
            <div className="mr-auto flex max-w-[90%] items-start gap-2.5">
              <AssistantAvatar />
              <div className="text-foreground/90 min-w-0 pt-0.5">
                <LanguagePickerInChat
                  prompt={LANGUAGE_PICK_PROMPT}
                  onSelect={(code) => onPickLanguage(null, code)}
                />
              </div>
            </div>
          ) : null}
          {messages.map((message) => {
            if (isHiddenInChat(message)) return null;
            const text = message.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join("\n")
              .trim();
            const langParts = langToolParts(message);
            const resumeParts = resumeToolParts(message);
            const otherTools = message.parts.filter(
              (p) => isToolUIPart(p) && !isClientPickerTool(p.type),
            );
            if (!text && message.role === "user") return null;
            if (
              !text &&
              message.role === "assistant" &&
              !langParts.length &&
              !resumeParts.length &&
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
                    .filter((part) => isPickerOpen(part.state))
                    .map((part) => (
                      <LanguagePickerInChat
                        key={part.toolCallId}
                        prompt={part.input?.prompt}
                        disabled={isStreaming}
                        onSelect={(code) =>
                          onPickLanguage(part.toolCallId, code)
                        }
                      />
                    ))}
                  {resumeParts
                    .filter((part) => isPickerOpen(part.state))
                    .map((part) => (
                      <ResumePickerInChat
                        key={part.toolCallId}
                        languageCode={voiceLanguage}
                        selected={resumeChoice}
                        disabled={isStreaming}
                        uploading={uploading}
                        onUpload={() => onUploadResumeClick(part.toolCallId)}
                        onSkip={() => onSkipResume(part.toolCallId)}
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
          <div className="min-w-0 space-y-1.5">
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
        )}
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onResumeFileSelected(file);
        }}
      />
    </div>
  );
}
