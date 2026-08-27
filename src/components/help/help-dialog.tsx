"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  CircleHelpIcon,
  KeyboardIcon,
  MicIcon,
  Volume2Icon,
} from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useChatUserAvatar } from "@/components/candidate/chat-avatars";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import { ChatTranscript } from "@/components/chat/chat-transcript";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uiMessageText } from "@/lib/ai/ui-message-text";
import { getCandidateVoiceLanguageAction } from "@/lib/candidate/actions";
import {
  languageLabel,
  type TtsLanguageCode,
} from "@/lib/ai/voice/languages";
import { speakText } from "@/lib/ai/voice/speak";
import { TTS_VOICE } from "@/lib/ai/voice/style";
import { transcribeBlob } from "@/lib/ai/voice/transcribe";
import { authClient } from "@/lib/auth/auth-client";
import { parseProfileType } from "@/lib/user/profile-types";
import { HELP_SUGGESTIONS, type HelpInputMode } from "@/lib/support/prompt";
import { cn } from "@/lib/utils";

export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const chatUser = useChatUserAvatar();
  const { data: session } = authClient.useSession();
  const profileType = parseProfileType(session?.user?.profileType);

  const [text, setText] = useState("");
  const [mode, setMode] = useState<HelpInputMode>("text");
  const [voiceStatus, setVoiceStatus] = useState("Tap Enable mic to talk.");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState<TtsLanguageCode | null>(
    null,
  );

  const vadRef = useRef<VadController | null>(null);
  const pausedRef = useRef(true);
  const busyRef = useRef(false);
  const streamingRef = useRef(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const modeRef = useRef<HelpInputMode>("text");
  const languageReadyRef = useRef(false);
  const voiceLanguageRef = useRef(TTS_VOICE.languageCode);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/help/chat",
        body: () => ({
          language_code: languageReadyRef.current
            ? voiceLanguageRef.current
            : null,
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });
  const isBusy = status === "submitted" || status === "streaming";
  streamingRef.current = isBusy;

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

  const submit = useEffectEvent((next: string) => {
    const trimmed = next.trim();
    if (!trimmed || isBusy || busyRef.current) return;
    setText("");
    void sendMessage({ text: trimmed });
  });

  const enableMic = async () => {
    setMicError("");
    setVoiceStatus("Loading voice language…");
    try {
      const code =
        profileType === "hire" || profileType === "admin"
          ? TTS_VOICE.languageCode
          : await (async () => {
              const result = await getCandidateVoiceLanguageAction();
              if (!result.ok) throw new Error(result.error);
              return result.language ?? TTS_VOICE.languageCode;
            })();
      voiceLanguageRef.current = code;
      languageReadyRef.current = true;
      setVoiceLanguage(code);

      setVoiceStatus("Starting microphone…");
      vadRef.current?.stop();
      pausedRef.current = true;
      vadRef.current = await startVadLoop({
        isPaused: () =>
          pausedRef.current ||
          busyRef.current ||
          streamingRef.current ||
          modeRef.current !== "voice" ||
          !languageReadyRef.current,
        onLevel: setLevel,
        onSpeechStart: () => {
          setListening(true);
          setVoiceStatus("Listening…");
        },
        onSpeechEnd: (blob) => {
          setListening(false);
          void (async () => {
            if (
              busyRef.current ||
              modeRef.current !== "voice" ||
              !languageReadyRef.current
            ) {
              return;
            }
            busyRef.current = true;
            pausedRef.current = true;
            setVoiceStatus("Transcribing…");
            try {
              const data = await transcribeBlob(blob, voiceLanguageRef.current);
              if (!data.ok || !data.transcript) {
                setVoiceStatus(data.error || "Didn't catch that — try again.");
                pausedRef.current = false;
                return;
              }
              setVoiceStatus("Thinking…");
              await sendMessage({ text: data.transcript });
            } catch {
              setVoiceStatus("Voice failed. Speak again when ready.");
              pausedRef.current = false;
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

  useEffect(() => {
    if (!open || mode !== "voice" || isBusy) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;

    const spoken = uiMessageText(last);
    if (!spoken) return;

    spokenIdsRef.current.add(last.id);

    void (async () => {
      busyRef.current = true;
      pausedRef.current = true;
      setVoiceStatus("Speaking…");
      await speakText(spoken, voiceLanguageRef.current);
      busyRef.current = false;
      if (modeRef.current === "voice" && micReady) {
        pausedRef.current = false;
        setVoiceStatus("Speak when ready — I'm listening.");
      }
    })();
  }, [messages, isBusy, mode, open, micReady]);

  useEffect(() => {
    if (!open || mode === "text") {
      stopVoice();
    }
  }, [open, mode, stopVoice]);

  useEffect(() => {
    if (!open) {
      spokenIdsRef.current.clear();
      languageReadyRef.current = false;
      setVoiceLanguage(null);
      voiceLanguageRef.current = TTS_VOICE.languageCode;
      setText("");
      setMode("text");
      setMicError("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  function onPromptSubmit(message: PromptInputMessage) {
    submit(message.text);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(36rem,85dvh)] max-h-[min(36rem,85dvh)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4 pe-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base">
                <CircleHelpIcon className="size-4" />
                Help
                {voiceLanguage && mode === "voice"
                  ? ` · ${languageLabel(voiceLanguage)}`
                  : ""}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Ask anything about Blucollarz — jobs, interviews, KYC, or
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

        <ChatTranscript
          messages={messages}
          isBusy={isBusy}
          error={error}
          user={chatUser}
          empty={
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {mode === "voice"
                  ? "Enable the mic and ask out loud — or tap a prompt."
                  : "Try one of these, or type your own question below."}
              </p>
              <Suggestions>
                {HELP_SUGGESTIONS.map((suggestion) => (
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

        <div className="border-border shrink-0 border-t p-3">
          {mode === "text" ? (
            <PromptInput onSubmit={onPromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  value={text}
                  onChange={(event) => setText(event.currentTarget.value)}
                  placeholder="Ask about Blucollarz…"
                  disabled={isBusy}
                  aria-label="Help message"
                  className="min-h-12"
                />
              </PromptInputBody>
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit
                  status={status}
                  disabled={isBusy || !text.trim()}
                />
              </PromptInputFooter>
            </PromptInput>
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
