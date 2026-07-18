"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isToolUIPart } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Loader2Icon,
  MicIcon,
  MonitorIcon,
  VideoIcon,
  SquareIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScreenRecorder } from "@/components/candidate/interviews/use-screen-recorder";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import { uploadBlob } from "@/lib/blob/upload";
import {
  interviewKickoffText,
  interviewStageLabel,
  interviewStageTitle,
} from "@/lib/interviews/labels";
import type { InterviewStageId } from "@/lib/interviews";
import {
  AssistantAvatar,
  UserChatAvatar,
  useChatUserAvatar,
} from "@/components/candidate/chat-avatars";
import { speakText } from "@/lib/voice/speak";
import { transcribeBlob } from "@/lib/voice/transcribe";
import { cn } from "@/lib/utils";

type LocalTurn = { role: "assistant" | "user"; text: string };

export function AiInterview({
  interviewId,
  jobTitle,
  stageId = "ai-communication",
  onClose,
  onCompleted,
}: {
  interviewId: string;
  jobTitle: string;
  stageId?: InterviewStageId;
  onClose: () => void;
  onCompleted: (result: {
    analysis?: unknown;
    videoUrl?: string | null;
  }) => void;
}) {
  const stageLabel = interviewStageLabel(stageId);
  const stageTitle = interviewStageTitle(stageId);
  const chatUser = useChatUserAvatar();

  const [phase, setPhase] = useState<
    "permissions" | "live" | "finalizing" | "done" | "error"
  >("permissions");
  const [status, setStatus] = useState(
    "Allow camera, microphone, and screen share to begin.",
  );
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const startedChatRef = useRef(false);
  const pausedRef = useRef(true);
  const vadRef = useRef<VadController | null>(null);
  const localTranscriptRef = useRef<LocalTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busyUtteranceRef = useRef(false);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);

  const {
    start: startScreen,
    stop: stopScreen,
    recording: screenRecording,
    error: screenError,
    cameraStream,
  } = useScreenRecorder();

  useEffect(() => {
    const el = cameraPreviewRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (cameraStream) {
      void el.play().catch(() => undefined);
    }
    return () => {
      el.srcObject = null;
    };
  }, [cameraStream]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/interviews/${interviewId}/chat`,
      }),
    [interviewId],
  );

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport,
  });

  const isStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming, status]);

  const beginSession = useCallback(async () => {
    setError("");
    setStatus("Turning on camera, then screen share…");
    try {
      await startScreen();
      setStatus("Calibrating microphone…");
      pausedRef.current = true;
      vadRef.current?.stop();
      vadRef.current = await startVadLoop({
        isPaused: () => pausedRef.current || busyUtteranceRef.current,
        onLevel: setLevel,
        onSpeechStart: () => {
          setListening(true);
          setStatus("Listening…");
        },
        onSpeechEnd: (blob) => {
          setListening(false);
          void (async () => {
            if (busyUtteranceRef.current || isStreaming) return;
            busyUtteranceRef.current = true;
            setStatus("Transcribing…");
            try {
              const data = await transcribeBlob(blob, "en-IN");
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
          text: interviewKickoffText(stageId, jobTitle),
        });
      }
    } catch (e) {
      setPhase("error");
      setError(
        e instanceof Error
          ? e.message
          : screenError ||
              "Camera, microphone, and screen share are required.",
      );
    }
  }, [startScreen, sendMessage, jobTitle, stageId, screenError, isStreaming]);

  // Speak assistant replies; detect finishInterview.
  useEffect(() => {
    if (isStreaming || phase !== "live") return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;

    const text = last.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();

    const finished = last.parts.some(
      (p) =>
        isToolUIPart(p) &&
        p.type === "tool-finishInterview" &&
        p.state === "output-available" &&
        typeof p.output === "object" &&
        p.output !== null &&
        (p.output as { ok?: boolean }).ok === true,
    );

    spokenIdsRef.current.add(last.id);

    void (async () => {
      pausedRef.current = true;
      busyUtteranceRef.current = true;
      if (text) {
        localTranscriptRef.current.push({ role: "assistant", text });
        setStatus("Speaking…");
        await speakText(text);
      }
      busyUtteranceRef.current = false;

      if (finished) {
        setPhase("finalizing");
        setStatus(`Uploading recording and scoring ${stageLabel}…`);
        pausedRef.current = true;
        vadRef.current?.stop();
        vadRef.current = null;

        let videoUrl: string | null = null;
        try {
          const blob = await stopScreen();
          if (!blob || blob.size === 0) {
            throw new Error(
              "Screen recording was empty. Please restart and keep screen share on until the end.",
            );
          }

          setStatus("Uploading recording to storage…");
          const uploaded = await uploadBlob({
            file: blob,
            pathname: `interviews/${interviewId}/${Date.now()}.webm`,
            contentType: "video/webm",
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
    stopScreen,
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

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {stageTitle}
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

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="border-border flex min-h-0 flex-1 flex-col border-b md:border-r md:border-b-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 px-4 py-5 md:px-6">
              {messages.map((message) => {
                const text = message.parts
                  .filter(isTextUIPart)
                  .map((p) => p.text)
                  .join("\n")
                  .trim();
                if (!text) return null;
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
                      <UserChatAvatar
                        name={chatUser.name}
                        image={chatUser.image}
                      />
                    ) : (
                      <AssistantAvatar />
                    )}
                    <div
                      className={cn(
                        "text-sm leading-relaxed",
                        isUser
                          ? "bg-muted text-foreground w-fit rounded-3xl px-4 py-2"
                          : "text-foreground/90 pt-0.5",
                      )}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </section>

        {/* Live camera PiP — also burned into the recorded screen share */}
        {cameraStream ? (
          <div className="border-border bg-card pointer-events-none absolute right-4 bottom-4 z-10 overflow-hidden border shadow-lg md:right-[22rem] md:bottom-6">
            <video
              ref={cameraPreviewRef}
              className="h-36 w-48 -scale-x-100 object-cover md:h-40 md:w-56"
              muted
              playsInline
              autoPlay
            />
            <span className="bg-background/80 text-foreground absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium">
              <VideoIcon className="size-3" />
              Camera
            </span>
          </div>
        ) : null}

        <aside className="flex w-full shrink-0 flex-col gap-4 p-4 md:w-80 md:p-6">
          <div className="border-border bg-card space-y-3 border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Volume2Icon className="size-3.5" />
              {status}
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all duration-100",
                  listening ? "bg-primary" : "bg-primary/40",
                )}
                style={{ width: `${Math.min(100, Math.round(level * 400))}%` }}
              />
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <MicIcon className="size-3.5" />
                {listening ? "Listening" : "Idle"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <VideoIcon className="size-3.5" />
                {cameraStream ? "Camera on" : "Camera off"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MonitorIcon className="size-3.5" />
                {screenRecording ? "Recording screen" : "Screen idle"}
              </span>
            </div>
          </div>

          {phase === "permissions" || phase === "error" ? (
            <div className="space-y-3">
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <Button className="w-full" size="lg" onClick={() => void beginSession()}>
                Start interview
              </Button>
              <p className="text-muted-foreground text-xs leading-relaxed">
                You&apos;ll turn on your camera, share your screen, and allow
                the microphone. Your face appears in the corner of the recording.
                Speak naturally — when your voice rises, listening starts; after
                a pause, your answer is sent.
              </p>
            </div>
          ) : null}

          {phase === "finalizing" ? (
            <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Finalizing…
            </div>
          ) : null}

          {phase === "done" ? (
            <Button className="w-full" size="lg" onClick={onClose}>
              Done
            </Button>
          ) : null}

          {phase === "live" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                pausedRef.current = true;
                vadRef.current?.stop();
                void stopScreen();
                onClose();
              }}
            >
              <SquareIcon className="size-4" />
              End early
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
