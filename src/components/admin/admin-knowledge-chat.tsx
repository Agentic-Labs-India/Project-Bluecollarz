"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { BookIcon, KeyboardIcon, MicIcon, Volume2Icon } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useChatUserAvatar } from "@/components/candidate/chat-avatars";
import {
  startVadLoop,
  type VadController,
} from "@/components/candidate/interviews/vad";
import { ChatTranscript } from "@/components/chat/chat-transcript";
import { Button } from "@/components/ui/button";
import { uiMessageText } from "@/lib/ai/ui-message-text";
import {
  languageLabel,
  type TtsLanguageCode,
  VOICE_LANGUAGE_OPTIONS,
} from "@/lib/ai/voice/languages";
import { speakText } from "@/lib/ai/voice/speak";
import { TTS_VOICE } from "@/lib/ai/voice/style";
import { transcribeBlob } from "@/lib/ai/voice/transcribe";
import { KNOWLEDGE_SUGGESTIONS } from "@/lib/knowledge/prompt";
import {
  KNOWLEDGE_DOC_TYPE_LABELS,
  KNOWLEDGE_DOC_TYPES,
  type KnowledgeCitation,
  type KnowledgeDocType,
} from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

type InputMode = "text" | "voice";

function citationsFromMessage(message: UIMessage): KnowledgeCitation[] {
  const seen = new Set<string>();
  const out: KnowledgeCitation[] = [];
  for (const part of message.parts) {
    if (!isToolUIPart(part) || part.type !== "tool-searchDocuments") continue;
    if (part.state !== "output-available") continue;
    const output = part.output as {
      hits?: Array<{ source?: string; page?: number }>;
    } | null;
    for (const hit of output?.hits ?? []) {
      if (!hit.source || typeof hit.page !== "number") continue;
      const key = `${hit.source}:${hit.page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ source: hit.source, page: hit.page });
    }
  }
  return out;
}

function KnowledgeSources({ message }: { message: UIMessage }) {
  const citations = citationsFromMessage(message);
  if (!citations.length) return null;

  return (
    <Sources className="mt-2 mb-0">
      <SourcesTrigger count={citations.length} />
      <SourcesContent>
        {citations.map((cite) => (
          <span
            key={`${cite.source}:${cite.page}`}
            className="text-foreground flex items-center gap-2"
          >
            <BookIcon className="size-4 shrink-0" />
            <span className="font-medium">
              {cite.source} · p.{cite.page}
            </span>
          </span>
        ))}
      </SourcesContent>
    </Sources>
  );
}

export function AdminKnowledgeChat({ active = true }: { active?: boolean }) {
  const chatUser = useChatUserAvatar();
  const [text, setText] = useState("");
  const [docType, setDocType] = useState<"all" | KnowledgeDocType>("all");
  const [mode, setMode] = useState<InputMode>("text");
  const [language, setLanguage] = useState<TtsLanguageCode>(
    TTS_VOICE.languageCode,
  );
  const [voiceStatus, setVoiceStatus] = useState("Tap Enable mic to talk.");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");

  const docTypeRef = useRef(docType);
  docTypeRef.current = docType;
  const languageRef = useRef(language);
  languageRef.current = language;
  const modeRef = useRef<InputMode>(mode);
  const vadRef = useRef<VadController | null>(null);
  const pausedRef = useRef(true);
  const busyRef = useRef(false);
  const streamingRef = useRef(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/admin/knowledge/chat",
        body: () => ({
          docType:
            docTypeRef.current === "all" ? undefined : docTypeRef.current,
          language_code: languageRef.current,
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
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
    setVoiceStatus("Starting microphone…");
    try {
      vadRef.current?.stop();
      pausedRef.current = true;
      vadRef.current = await startVadLoop({
        isPaused: () =>
          pausedRef.current ||
          busyRef.current ||
          streamingRef.current ||
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
              const data = await transcribeBlob(blob, languageRef.current);
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
      setMicError("Microphone permission is required for voice test.");
      setVoiceStatus("Microphone blocked.");
      setMicReady(false);
    }
  };

  useEffect(() => {
    if (!active || mode !== "voice" || isBusy) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenIdsRef.current.has(last.id)) return;

    const spoken = uiMessageText(last);
    if (!spoken) return;

    spokenIdsRef.current.add(last.id);

    void (async () => {
      busyRef.current = true;
      pausedRef.current = true;
      setVoiceStatus("Speaking…");
      await speakText(spoken, languageRef.current);
      busyRef.current = false;
      if (modeRef.current === "voice" && micReady && active) {
        pausedRef.current = false;
        setVoiceStatus("Speak when ready — I'm listening.");
      }
    })();
  }, [messages, isBusy, mode, micReady, active]);

  useEffect(() => {
    if (mode === "text" || !active) stopVoice();
  }, [mode, active, stopVoice]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
    };
  }, []);

  function onPromptSubmit(message: PromptInputMessage) {
    submit(message.text);
  }

  const docTypeSelect = (
    <PromptInputSelect
      value={docType}
      onValueChange={(value) => setDocType(value as "all" | KnowledgeDocType)}
    >
      <PromptInputSelectTrigger aria-label="Document type filter">
        <PromptInputSelectValue />
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        <PromptInputSelectItem value="all">All types</PromptInputSelectItem>
        {KNOWLEDGE_DOC_TYPES.map((type) => (
          <PromptInputSelectItem key={type} value={type}>
            {KNOWLEDGE_DOC_TYPE_LABELS[type]}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );

  return (
    <div className="border-border flex min-h-128 flex-col border">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <p className="text-muted-foreground text-sm">
          {mode === "voice"
            ? `Voice · ${languageLabel(language)} · Sarvam STT/TTS`
            : "Text · answers from uploaded PDFs"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <PromptInputSelect
            value={language}
            onValueChange={(value) => setLanguage(value as TtsLanguageCode)}
          >
            <PromptInputSelectTrigger aria-label="Test language">
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {VOICE_LANGUAGE_OPTIONS.map((option) => (
                <PromptInputSelectItem key={option.code} value={option.code}>
                  {option.label}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
          <div className="border-border flex overflow-hidden border">
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
      </div>

      <ChatTranscript
        messages={messages}
        isBusy={isBusy}
        error={error}
        user={chatUser}
        afterAssistant={(message) => <KnowledgeSources message={message} />}
        empty={
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {mode === "voice"
                ? "Enable the mic and ask out loud. Speech uses the Voice (Sarvam) settings; answers use the Language Model and uploaded PDFs."
                : "Ask about the PDFs you uploaded. Answers cite filename and page, and are not legal advice."}
            </p>
            <Suggestions>
              {KNOWLEDGE_SUGGESTIONS.map((suggestion) => (
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

      <div className="border-border space-y-2 border-t p-4">
        {mode === "text" ? (
          <PromptInput onSubmit={onPromptSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                value={text}
                onChange={(event) => setText(event.currentTarget.value)}
                placeholder="Ask the knowledge base…"
                disabled={isBusy}
                aria-label="Knowledge question"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>{docTypeSelect}</PromptInputTools>
              <PromptInputSubmit
                status={status}
                disabled={isBusy || !text.trim()}
              />
            </PromptInputFooter>
          </PromptInput>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {docTypeSelect}
            </div>
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
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Grounded in uploaded PDFs. Voice uses Sarvam. Output is not legal
          advice.
        </p>
      </div>
    </div>
  );
}
