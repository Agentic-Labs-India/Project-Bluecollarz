"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isToolUIPart } from "ai";
import {
  useCallback,
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
  SquareIcon,
  UploadIcon,
  Volume2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { speakText } from "@/lib/voice/speak";
import { cn } from "@/lib/utils";

export function OnboardingAgent() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Tap the mic and answer by voice.");
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const startedRef = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/onboarding" }),
    [],
  );

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport,
  });

  const isStreaming =
    chatStatus === "submitted" || chatStatus === "streaming";

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // Kick off the conversation once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void sendMessage({
      text: "Hi — I just signed in as a candidate. Please start onboarding.",
    });
  }, [sendMessage]);

  // Speak each finished assistant message once.
  useEffect(() => {
    if (isStreaming) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;

    const text = last.parts
      .filter(isTextUIPart)
      .map((p) => p.text)
      .join(" ")
      .trim();
    if (!text) return;

    spokenIdsRef.current.add(last.id);
    void speakText(text);

    const finished = last.parts.some(
      (p) =>
        isToolUIPart(p) &&
        p.type === "tool-finishOnboarding" &&
        p.state === "output-available" &&
        typeof p.output === "object" &&
        p.output !== null &&
        (p.output as { ok?: boolean }).ok === true,
    );
    if (finished) {
      setStatus("Profile complete — taking you to your dashboard…");
      setTimeout(() => router.replace("/candidate/home"), 1200);
    }
  }, [messages, isStreaming, router]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (busy || isStreaming || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = (recorder.mimeType || "audio/webm").split(";")[0].trim();
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
        if (blob.size < 500) {
          setStatus("Didn't catch that — hold the mic a bit longer.");
          return;
        }
        setBusy(true);
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
          if (!res.ok || !data.transcript) {
            setStatus(data.error || "Could not hear you. Try again.");
            return;
          }
          setStatus("Thinking…");
          await sendMessage({ text: data.transcript });
          setStatus("Tap the mic and answer by voice.");
        } catch {
          setStatus("Voice failed. Try again.");
        } finally {
          setBusy(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Listening… tap again to send.");
    } catch {
      setStatus("Microphone permission is required for voice onboarding.");
    }
  }, [busy, isStreaming, recording, sendMessage]);

  const toggleMic = () => {
    if (recording) stopRecording();
    else void startRecording();
  };

  const onUploadResume = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setStatus("Please upload a PDF resume only.");
      return;
    }
    setUploading(true);
    setStatus("Reading your resume…");
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      await sendMessage({
        text: "I attached my resume PDF. Extract my profile from it and fast-forward onboarding — only ask for anything still missing.",
        files: dt.files,
      });
      setStatus("Tap the mic and answer by voice.");
    } catch {
      setStatus("Could not read that PDF. Try again.");
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
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Volume2Icon className="size-3.5 shrink-0" />
          {status}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={recording ? "destructive" : "default"}
            size="lg"
            className="flex-1"
            disabled={busy || isStreaming || uploading}
            onClick={toggleMic}
          >
            {recording ? (
              <>
                <SquareIcon className="size-4" />
                Stop &amp; send
              </>
            ) : (
              <>
                <MicIcon className="size-4" />
                Hold to answer
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy || isStreaming || uploading || recording}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            PDF
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
      </footer>
    </div>
  );
}
