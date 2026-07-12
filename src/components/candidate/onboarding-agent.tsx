"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isToolUIPart } from "ai";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  MicIcon,
  UploadIcon,
  Volume2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import { speakText } from "@/lib/voice/speak";
import { cn } from "@/lib/utils";

export function OnboardingAgent() {
  const router = useRouter();
  const [status, setStatus] = useState("Allow the microphone to begin.");
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");
  const [done, setDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const startedRef = useRef(false);
  const pausedRef = useRef(true);
  const busyUtteranceRef = useRef(false);
  const streamingRef = useRef(false);
  const vadRef = useRef<VadController | null>(null);
  const doneRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/onboarding" }),
    [],
  );

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport,
  });

  const isStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";
  streamingRef.current = isStreaming;

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const enableMic = async () => {
    setMicError("");
    setStatus("Calibrating microphone…");
    try {
      pausedRef.current = true;
      vadRef.current?.stop();
      vadRef.current = await startVadLoop({
        isPaused: () =>
          pausedRef.current ||
          busyUtteranceRef.current ||
          streamingRef.current ||
          doneRef.current,
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
              doneRef.current
            ) {
              return;
            }
            busyUtteranceRef.current = true;
            pausedRef.current = true;
            setStatus("Transcribing…");
            try {
              const form = new FormData();
              form.append("audio", blob, "speech.webm");
              form.append("language_code", "en-IN");
              const res = await fetch("/api/voice/stt", {
                method: "POST",
                body: form,
              });
              const data = (await res.json()) as {
                transcript?: string;
                error?: string;
              };
              if (!res.ok || !data.transcript?.trim()) {
                setStatus(data.error || "Didn't catch that — speak again.");
                pausedRef.current = false;
                return;
              }
              setStatus("Thinking…");
              await sendMessage({ text: data.transcript.trim() });
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
      setStatus("Starting onboarding…");

      if (!startedRef.current) {
        startedRef.current = true;
        await sendMessage({
          text: "Hi — I just signed in as a candidate. Please start onboarding.",
        });
      }
    } catch {
      setMicError("Microphone permission is required for voice onboarding.");
      setStatus("Allow the microphone to begin.");
    }
  };

  // Speak each finished assistant message once, then resume listening.
  useEffect(() => {
    if (isStreaming || !micReady || doneRef.current) return;
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
        p.type === "tool-finishOnboarding" &&
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
        setStatus("Speaking…");
        await speakText(text);
      }
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
    if (!file || !micReady || doneRef.current) return;
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

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col overflow-hidden md:h-dvh md:max-h-dvh">
      <header className="border-border shrink-0 border-b px-4 py-2">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Candidate onboarding
        </h1>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 py-5">
          {messages.map((message) => {
            const text = message.parts
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join("\n")
              .trim();
            if (!text && message.role === "user") return null;
            if (!text && message.role === "assistant") {
              const tools = message.parts.filter(isToolUIPart);
              if (!tools.length) return null;
            }
            return (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-none border px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "border-primary/30 bg-primary/5 ml-auto"
                    : "border-border bg-card mr-auto",
                )}
              >
                {text || (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                    <Loader2Icon className="size-3 animate-spin" />
                    Updating your profile…
                  </span>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <footer className="border-border shrink-0 space-y-3 border-t px-4 py-4">
        <div className="border-border bg-card space-y-3 border p-3">
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Volume2Icon className="size-3.5 shrink-0" />
            {status}
          </p>
          {micReady ? (
            <>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
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
              <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <MicIcon className="size-3.5" />
                {listening ? "Listening" : "Idle"}
              </p>
            </>
          ) : null}
        </div>

        {!micReady ? (
          <div className="space-y-2">
            {micError ? (
              <p className="text-destructive text-sm">{micError}</p>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void enableMic()}
            >
              <MicIcon className="size-4" />
              Enable microphone &amp; start
            </Button>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Speak naturally — when your voice rises, listening starts; after a
              pause, your answer is sent. No need to hold a button.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={uploading || isStreaming || done}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
              Upload PDF resume
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
