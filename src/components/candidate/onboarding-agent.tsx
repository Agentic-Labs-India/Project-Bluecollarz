"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import {
  LanguagePickDialog,
  ResumePickDialog,
} from "@/components/candidate/onboarding-pickers";
import { OnboardingProfileStage } from "@/components/candidate/onboarding-profile-stage";
import {
  OnboardingVoiceDock,
  type OnboardingVoiceMode,
} from "@/components/candidate/onboarding-voice-dock";
import {
  getCandidateGateAction,
  getCandidateVoiceLanguageAction,
  saveCandidateVoiceLanguageAction,
} from "@/lib/candidate/actions";
import { uiMessageText } from "@/lib/ai/ui-message-text";
import {
  isTtsLanguageCode,
  LANGUAGE_PICK_PROMPT,
  languageLabel,
  resumeVoicePrompt,
  type TtsLanguageCode,
} from "@/lib/ai/voice/languages";
import { speakText } from "@/lib/ai/voice/speak";
import { transcribeBlob } from "@/lib/ai/voice/transcribe";
import { readOnboardingStage } from "@/lib/candidate/onboarding-stage";

const LANG_TOOL = "tool-selectVoiceLanguage" as const;
const RESUME_TOOL = "tool-selectResume" as const;
const RESUME_PICK_STATUS = "Choose a resume option to continue.";

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

function firstOpenLangPart(messages: UIMessage[]) {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const part = langToolParts(message).find((p) => isPickerOpen(p.state));
    if (part) return part;
  }
  return null;
}

function firstOpenResumePart(messages: UIMessage[]) {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const part = resumeToolParts(message).find((p) => isPickerOpen(p.state));
    if (part) return part;
  }
  return null;
}

export function OnboardingAgent() {
  const router = useRouter();
  const [status, setStatus] = useState("Allow the microphone to begin.");
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
  const openLang = firstOpenLangPart(messages);
  const openResume = firstOpenResumePart(messages);
  const stage = useMemo(() => readOnboardingStage(messages), [messages]);

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

  const voiceMode: OnboardingVoiceMode = (() => {
    if (done) return "done";
    if (micError) return "error";
    if (!micReady) return "start";
    if (awaitingLanguage || pendingLanguagePick || awaitingResume)
      return "pick";
    if (stage.writing.length) return "write";
    if (listening) return "listen";
    if (status.startsWith("Speaking")) return "speak";
    if (
      isStreaming ||
      uploading ||
      status.startsWith("Thinking") ||
      status.startsWith("Transcribing") ||
      status.startsWith("Starting") ||
      status.startsWith("Calibrating")
    ) {
      return "think";
    }
    return "idle";
  })();

  const startOnboarding = useCallback(
    async (alreadyHasLanguage: boolean) => {
      if (startedRef.current) return;
      startedRef.current = true;
      setStatus(
        alreadyHasLanguage
          ? "Starting onboarding…"
          : "Starting onboarding — pick your language…",
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
    pickBaselineRef.current = { id: host.id, text: uiMessageText(host) };
  };

  const enableMic = async () => {
    setMicError("");
    setStatus("Loading your voice language…");
    try {
      const languageResult = await getCandidateVoiceLanguageAction();
      if (!languageResult.ok) throw new Error(languageResult.error);
      const existingLanguage = languageResult.language;
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
        setStatus("Pick a language to continue.");
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
      ? "Pick a language to continue."
      : awaitingResume
        ? RESUME_PICK_STATUS
        : null;
    if (pickerHint) pausedRef.current = true;

    for (const part of langToolParts(last)) {
      if (part.state === "output-available") {
        const raw = part.output?.language_code;
        if (raw && isTtsLanguageCode(raw)) lockLanguage(raw);
      }
    }

    if (!languageLockedRef.current && !awaitingLanguage) return;

    let text = uiMessageText(last);
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
        const status = await getCandidateGateAction();
        if (status.ok && status.complete) {
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
        const saved = await saveCandidateVoiceLanguageAction(code);
        if (!saved.ok) throw new Error(saved.error);
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
    <div className="bg-background fixed inset-x-0 top-14 bottom-0 z-30 mx-auto flex w-full min-w-0 max-w-3xl flex-col overflow-hidden md:static md:inset-auto md:top-auto md:bottom-auto md:z-auto md:h-full md:min-h-0">
      <OnboardingProfileStage messages={messages} />

      <OnboardingVoiceDock
        mode={voiceMode}
        status={status}
        micReady={micReady}
        micError={micError}
        onEnableMic={() => void enableMic()}
      />

      <LanguagePickDialog
        open={pendingLanguagePick || Boolean(openLang)}
        disabled={isStreaming}
        onSelect={(code) => onPickLanguage(openLang?.toolCallId ?? null, code)}
      />
      <ResumePickDialog
        open={Boolean(openResume)}
        languageCode={voiceLanguage}
        selected={resumeChoice}
        disabled={isStreaming}
        uploading={uploading}
        onUpload={() => {
          if (openResume) onUploadResumeClick(openResume.toolCallId);
        }}
        onSkip={() => {
          if (openResume) onSkipResume(openResume.toolCallId);
        }}
      />

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
