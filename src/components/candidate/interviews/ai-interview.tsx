"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { SquareIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InterviewReadyPanel,
  type InterviewReadyPanelHandle,
} from "@/components/candidate/interviews/interview-ready-panel";
import { useCameraRecorder } from "@/components/candidate/interviews/use-camera-recorder";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import {
  VoiceSessionDock,
  type VoiceSessionMode,
} from "@/components/candidate/voice-orb";
import { DitherButton } from "@/components/shared/dither-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { uiMessageText } from "@/lib/ai/ui-message-text";
import { languageLabel, type TtsLanguageCode } from "@/lib/ai/voice/languages";
import { speakText } from "@/lib/ai/voice/speak";
import { transcribeBlob } from "@/lib/ai/voice/transcribe";
import { uploadBlob } from "@/lib/blob/upload";
import type { AiInterviewStageId } from "@/lib/interviews";
import {
  interviewKickoffText,
  interviewStageLabel,
  interviewStageTitle,
} from "@/lib/interviews/labels";
import { blobUploadMeta } from "@/lib/native/media-permissions";

type LocalTurn = { role: "assistant" | "user"; text: string };

function toVoiceMode({
  phase,
  listening,
  isStreaming,
  status,
}: {
  phase: string;
  listening: boolean;
  isStreaming: boolean;
  status: string;
}): VoiceSessionMode {
  if (phase === "done") return "done";
  if (listening) return "listen";
  if (status.startsWith("Speaking")) return "speak";
  if (
    phase === "finalizing" ||
    isStreaming ||
    status.startsWith("Thinking") ||
    status.startsWith("Transcribing") ||
    status.startsWith("Uploading") ||
    status.startsWith("Interview starting") ||
    status.startsWith("Calibrating")
  ) {
    return "think";
  }
  return "idle";
}

export function AiInterview({
  interviewId,
  jobTitle,
  stageId = "ai-communication",
  voiceLanguage: sessionLanguage,
  onClose,
  onCompleted,
}: {
  interviewId: string;
  jobTitle: string;
  stageId?: AiInterviewStageId;
  voiceLanguage: TtsLanguageCode;
  onClose: () => void;
  onCompleted: (result: {
    analysis?: unknown;
    videoUrl?: string | null;
  }) => void;
}) {
  const stageLabel = interviewStageLabel(stageId);
  const stageTitle = interviewStageTitle(stageId);

  const [phase, setPhase] = useState<
    "permissions" | "live" | "finalizing" | "done" | "error"
  >("permissions");
  const [status, setStatus] = useState(
    "Complete the system checks, then start the interview.",
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [checksReady, setChecksReady] = useState(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const startedChatRef = useRef(false);
  const pausedRef = useRef(true);
  const vadRef = useRef<VadController | null>(null);
  const localTranscriptRef = useRef<LocalTurn[]>([]);
  const busyUtteranceRef = useRef(false);
  const streamingRef = useRef(false);
  const closingRef = useRef(false);
  const readyPanelRef = useRef<InterviewReadyPanelHandle>(null);
  const voiceLanguageRef = useRef(sessionLanguage);
  voiceLanguageRef.current = sessionLanguage;

  const {
    start: startCamera,
    stop: stopCamera,
    recording: cameraRecording,
    error: cameraError,
    cameraStream,
  } = useCameraRecorder();

  useEffect(() => {
    if (closingRef.current || phase !== "live") return;
    if (cameraRecording || cameraStream) return;
    pausedRef.current = true;
    vadRef.current?.stop();
    vadRef.current = null;
    setPhase("error");
    setError("Camera turned off. Please restart the interview.");
  }, [phase, cameraRecording, cameraStream]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/interviews/${interviewId}/chat`,
      }),
    [interviewId],
  );

  const {
    messages,
    sendMessage,
    status: chatStatus,
  } = useChat({
    transport,
  });

  const isStreaming = chatStatus === "submitted" || chatStatus === "streaming";
  streamingRef.current = isStreaming;

  const currentQuestion = useMemo(() => {
    const last = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    return last ? uiMessageText(last) : "";
  }, [messages]);

  const voiceMode = toVoiceMode({
    phase,
    listening,
    isStreaming,
    status,
  });

  const beginSession = useCallback(async () => {
    setError("");
    try {
      setStatus("Turning on camera…");
      readyPanelRef.current?.releaseDevices();
      const { mic } = await startCamera();
      setStatus("Calibrating microphone…");
      pausedRef.current = true;
      vadRef.current?.stop();
      vadRef.current = await startVadLoop({
        stream: mic,
        isPaused: () =>
          pausedRef.current || busyUtteranceRef.current || streamingRef.current,
        onSpeechStart: () => {
          setListening(true);
          setStatus("Listening…");
        },
        onSpeechEnd: (blob) => {
          setListening(false);
          void (async () => {
            if (busyUtteranceRef.current || streamingRef.current) {
              return;
            }
            busyUtteranceRef.current = true;
            setStatus("Transcribing…");
            try {
              const data = await transcribeBlob(blob, voiceLanguageRef.current);
              if (!data.ok || !data.transcript) {
                setStatus(data.error || "Didn't catch that — try again.");
                return;
              }
              const text = data.transcript;
              localTranscriptRef.current.push({ role: "user", text });
              pausedRef.current = true;
              setStatus("Thinking…");
              await sendMessage({ text });
            } catch {
              setStatus("Voice failed. Speak again when ready.");
            } finally {
              busyUtteranceRef.current = false;
            }
          })();
        },
      });
      setPhase("live");
      setStatus("Interview starting…");
      if (!startedChatRef.current) {
        startedChatRef.current = true;
        await sendMessage({
          text: interviewKickoffText(
            stageId,
            jobTitle,
            voiceLanguageRef.current,
          ),
        });
      }
    } catch (e) {
      setPhase("error");
      setError(
        e instanceof Error
          ? e.message
          : cameraError || "Camera and microphone are required.",
      );
    }
  }, [startCamera, sendMessage, jobTitle, stageId, cameraError]);

  useEffect(() => {
    if (isStreaming || phase !== "live") return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;

    const text = uiMessageText(last);
    if (!text) return;

    spokenIdsRef.current.add(last.id);

    const finished = last.parts.some(
      (p) =>
        isToolUIPart(p) &&
        p.type === "tool-finishInterview" &&
        p.state === "output-available" &&
        typeof p.output === "object" &&
        p.output !== null &&
        (p.output as { ok?: boolean }).ok === true,
    );

    void (async () => {
      pausedRef.current = true;
      busyUtteranceRef.current = true;
      localTranscriptRef.current.push({ role: "assistant", text });
      setStatus("Speaking…");
      await speakText(text, voiceLanguageRef.current);
      busyUtteranceRef.current = false;

      if (finished) {
        closingRef.current = true;
        setPhase("finalizing");
        setStatus(`Uploading recording and scoring ${stageLabel}…`);
        pausedRef.current = true;
        vadRef.current?.stop();
        vadRef.current = null;

        let videoUrl: string | null = null;
        try {
          const blob = await stopCamera();
          if (!blob || blob.size === 0) {
            throw new Error(
              "Camera recording was empty. Please restart and keep the camera on until the end.",
            );
          }

          setStatus("Uploading recording to storage…");
          const { ext, contentType } = blobUploadMeta(blob);
          const uploaded = await uploadBlob({
            file: blob,
            pathname: `interviews/${interviewId}/${Date.now()}.${ext}`,
            contentType,
            clientPayload: {
              kind: "interview-video",
              interviewId,
            },
            onProgress: (percent) => {
              setStatus(`Uploading recording… ${Math.round(percent)}%`);
            },
          });
          videoUrl = uploaded.url;
          setStatus(`Video saved — scoring ${stageLabel}…`);
        } catch (e) {
          setPhase("error");
          setError(
            e instanceof Error
              ? e.message
              : "Could not upload the interview recording.",
          );
          return;
        }

        try {
          const res = await fetch(`/api/interviews/${interviewId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoUrl,
              transcript: localTranscriptRef.current,
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            analysis?: unknown;
            videoUrl?: string | null;
            error?: string;
          };
          if (!res.ok) throw new Error(data.error || "Could not finalize");
          setPhase("done");
          setStatus(`${stageTitle} complete.`);
          onCompleted({
            analysis: data.analysis,
            videoUrl: data.videoUrl ?? videoUrl,
          });
        } catch (e) {
          setPhase("error");
          setError(e instanceof Error ? e.message : "Finalize failed");
        }
        return;
      }

      pausedRef.current = false;
      setStatus("Speak when ready — I'm listening for your voice.");
    })();
  }, [
    messages,
    isStreaming,
    phase,
    stopCamera,
    interviewId,
    onCompleted,
    stageLabel,
    stageTitle,
  ]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  const endEarly = () => {
    closingRef.current = true;
    pausedRef.current = true;
    vadRef.current?.stop();
    vadRef.current = null;
    void stopCamera();
    onClose();
  };

  const checking = phase === "permissions" || phase === "error";

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {stageTitle}
            {` · ${languageLabel(sessionLanguage)}`}
          </p>
          <h1 className="text-foreground truncate text-base font-semibold md:text-lg">
            {jobTitle}
          </h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close interview"
          disabled={phase === "finalizing"}
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      {checking ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <InterviewReadyPanel
              ref={readyPanelRef}
              onReadyChange={setChecksReady}
            />
          </div>
          <div className="border-border shrink-0 space-y-3 border-t px-4 py-4 md:px-8">
            <div className="mx-auto w-full max-w-5xl space-y-3">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <DitherButton
                className="w-full"
                size="lg"
                seed="interview-start"
                disabled={!checksReady}
                onClick={() => void beginSession()}
              >
                Start interview
              </DitherButton>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {checksReady
                  ? "Starting records camera and microphone in the background. You will not see your camera. Your profile voice language will be used."
                  : "Complete every system check before you can start."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <section className="min-h-0 w-full flex-1 overflow-y-auto px-5 md:px-8">
            <div className="mx-auto flex h-full max-w-xl items-center">
              <p
                className="text-foreground w-full text-center text-xl leading-snug font-medium tracking-tight md:text-2xl"
                aria-live="polite"
              >
                {currentQuestion || status}
              </p>
            </div>
          </section>

          <VoiceSessionDock live mode={voiceMode} status={status}>
            {phase === "finalizing" ? (
              <div className="mt-3 w-full max-w-xs space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : null}
            {phase === "done" ? (
              <Button
                className="mt-3 w-full max-w-xs"
                size="lg"
                onClick={onClose}
              >
                Done
              </Button>
            ) : null}
            {phase === "live" ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full max-w-xs"
                onClick={endEarly}
              >
                <SquareIcon className="size-4" />
                End early
              </Button>
            ) : null}
          </VoiceSessionDock>
        </div>
      )}
    </div>
  );
}
