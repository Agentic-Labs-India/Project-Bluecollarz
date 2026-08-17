"use client";

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  MicIcon,
  MonitorIcon,
  SparklesIcon,
  VideoIcon,
  WifiIcon,
  XCircleIcon,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { PrimaryDither } from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";

type CheckId = "internet" | "camera" | "voice" | "ai";
type CheckStatus = "pending" | "running" | "pass" | "fail";

type CheckState = {
  status: CheckStatus;
  detail: string;
};

export type InterviewReadyPanelHandle = {
  releaseDevices: () => void;
};

const INITIAL: Record<CheckId, CheckState> = {
  internet: { status: "pending", detail: "Waiting…" },
  camera: { status: "pending", detail: "Waiting…" },
  voice: { status: "pending", detail: "Waiting…" },
  ai: { status: "pending", detail: "Waiting…" },
};

const CHECK_META: {
  id: CheckId;
  label: string;
  icon: typeof WifiIcon;
}[] = [
  { id: "internet", label: "Internet", icon: WifiIcon },
  { id: "camera", label: "Camera", icon: VideoIcon },
  { id: "voice", label: "Microphone", icon: MicIcon },
  { id: "ai", label: "AI engine", icon: SparklesIcon },
];

const ENVIRONMENT = [
  "Quiet, well-lit room with a plain background",
  "Stable Wi‑Fi or ethernet — avoid hotspot switching",
  "Laptop, tablet, or PC with camera and mic",
  "Allow camera, mic, and entire-screen share in the browser",
];

const GUIDELINES = [
  "Sit alone in a quiet room. No one else should be present — the AI may reject your application if another person is detected.",
  "Keep your face clearly visible on camera for the entire session.",
  "Share your entire screen (not a window or tab) for the full interview. Ending share early can invalidate the session.",
  "Speak clearly in your own words. Do not read notes or get help from others.",
  "Do not switch tabs, mute yourself, or leave this screen until finished.",
  "Close other apps using your camera or microphone before you start.",
];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function CheckCard({
  id,
  label,
  icon: Icon,
  state,
  micLevel,
}: {
  id: CheckId;
  label: string;
  icon: typeof WifiIcon;
  state: CheckState;
  micLevel: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state.status === "pass") {
      setProgress(100);
      return;
    }
    if (state.status === "pending" || state.status === "fail") {
      setProgress(0);
      return;
    }
    setProgress(8);
    const timer = setInterval(() => {
      setProgress((value) => Math.min(92, value + 4));
    }, 160);
    return () => clearInterval(timer);
  }, [state.status]);

  const value =
    id === "voice" && state.status === "running"
      ? Math.max(progress, Math.min(92, Math.round(micLevel * 500)))
      : progress;

  return (
    <li className="bg-primary relative flex min-h-0 flex-1 items-center gap-2.5 overflow-hidden border border-white/15 px-3 py-2">
      <PrimaryDither seed={`check-${id}`} opacity={0.85} />
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center bg-white/15 text-white">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-white">{label}</p>
          {state.status === "pass" ? (
            <CheckCircle2Icon className="size-3.5 shrink-0 text-white" />
          ) : state.status === "fail" ? (
            <XCircleIcon className="size-3.5 shrink-0 text-white" />
          ) : (
            <span className="text-[11px] font-medium tabular-nums text-white/80">
              {value}%
            </span>
          )}
        </div>
        <p className="truncate text-xs text-white/75">{state.detail}</p>
      </div>
    </li>
  );
}

export function InterviewReadyPanel({
  onReadyChange,
  onCameraPreviewChange,
  ref,
}: {
  onReadyChange: (ready: boolean) => void;
  onCameraPreviewChange?: (stream: MediaStream | null) => void;
  ref?: React.Ref<InterviewReadyPanelHandle>;
}) {
  const [checks, setChecks] = useState(INITIAL);
  const [micLevel, setMicLevel] = useState(0);
  const streamsRef = useRef<MediaStream[]>([]);
  const cancelledRef = useRef(false);

  const setCheck = (id: CheckId, next: CheckState) => {
    setChecks((prev) => ({ ...prev, [id]: next }));
  };

  const publishCamera = (stream: MediaStream | null) => {
    onCameraPreviewChange?.(stream);
  };

  const stopOwnedStreams = () => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamsRef.current = [];
    publishCamera(null);
  };

  useImperativeHandle(ref, () => ({
    releaseDevices: stopOwnedStreams,
  }));

  const runChecks = useEffectEvent(async () => {
    cancelledRef.current = false;
    setChecks(INITIAL);
    setMicLevel(0);
    stopOwnedStreams();
    onReadyChange(false);

    setCheck("internet", { status: "running", detail: "Checking…" });
    try {
      if (!navigator.onLine) throw new Error("You appear offline");
      const res = await withTimeout(fetch("/api/auth/get-session"), 8000);
      if (!res.ok) throw new Error("Could not reach servers");
      if (cancelledRef.current) return;
      setCheck("internet", { status: "pass", detail: "Connection OK" });
    } catch (e) {
      if (cancelledRef.current) return;
      setCheck("internet", {
        status: "fail",
        detail: e instanceof Error ? e.message : "Internet check failed",
      });
    }

    setCheck("camera", { status: "running", detail: "Requesting camera…" });
    try {
      const camera = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        }),
        12000,
      );
      if (cancelledRef.current) {
        for (const track of camera.getTracks()) track.stop();
        return;
      }
      streamsRef.current.push(camera);
      publishCamera(camera);
      const track = camera.getVideoTracks()[0];
      if (!track || track.readyState !== "live") {
        throw new Error("Camera track is not live");
      }
      setCheck("camera", { status: "pass", detail: "Camera ready" });
    } catch (e) {
      if (cancelledRef.current) return;
      setCheck("camera", {
        status: "fail",
        detail: e instanceof Error ? e.message : "Camera access required",
      });
    }

    setCheck("voice", { status: "running", detail: "Speak briefly…" });
    try {
      const mic = await withTimeout(
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        }),
        12000,
      );
      if (cancelledRef.current) {
        for (const track of mic.getTracks()) track.stop();
        return;
      }
      streamsRef.current.push(mic);

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(mic);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let peak = 0;
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (cancelledRef.current) {
            resolve();
            return;
          }
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          peak = Math.max(peak, rms);
          setMicLevel(rms);
          setCheck("voice", {
            status: "running",
            detail: peak > 0.02 ? "Voice detected…" : "Speak a few words…",
          });
          if (peak > 0.02 || performance.now() - started > 5000) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      await ctx.close().catch(() => undefined);
      for (const track of mic.getTracks()) track.stop();
      streamsRef.current = streamsRef.current.filter((s) => s !== mic);

      if (cancelledRef.current) return;

      setCheck("voice", {
        status: "pass",
        detail:
          peak > 0.02 ? "Microphone working" : "Mic available — speak clearly",
      });
      setMicLevel(0);
    } catch (e) {
      if (cancelledRef.current) return;
      setCheck("voice", {
        status: "fail",
        detail: e instanceof Error ? e.message : "Microphone access required",
      });
    }

    setCheck("ai", { status: "running", detail: "Contacting AI…" });
    try {
      const res = await withTimeout(
        fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Ready." }),
        }),
        15000,
      );
      if (cancelledRef.current) return;
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `AI engine returned ${res.status}`);
      }
      await res.arrayBuffer();
      if (cancelledRef.current) return;
      setCheck("ai", { status: "pass", detail: "AI engine reachable" });
    } catch (e) {
      if (cancelledRef.current) return;
      setCheck("ai", {
        status: "fail",
        detail: e instanceof Error ? e.message : "Could not reach AI engine",
      });
    }
  });

  useEffect(() => {
    void runChecks();
    return () => {
      cancelledRef.current = true;
      stopOwnedStreams();
    };
  }, []);

  const allPassed = CHECK_META.every((c) => checks[c.id].status === "pass");
  const anyFailed = CHECK_META.some((c) => checks[c.id].status === "fail");
  const running = CHECK_META.some((c) => checks[c.id].status === "running");

  useEffect(() => {
    onReadyChange(allPassed);
  }, [allPassed, onReadyChange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-4 md:gap-4 md:p-5">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(16rem,22rem)_1fr] md:gap-4">
        {/* Far left: 4 system test blocks */}
        <div className="border-border flex min-h-0 flex-col gap-3 border p-3 md:p-4">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-foreground text-sm font-semibold">
              System tests
            </h3>
            {allPassed ? (
              <span className="text-primary inline-flex items-center gap-1 text-xs">
                <CheckCircle2Icon className="size-3.5" />
                Ready
              </span>
            ) : anyFailed ? (
              <span className="text-destructive inline-flex items-center gap-1 text-xs">
                <CircleAlertIcon className="size-3.5" />
                Fix & retry
              </span>
            ) : null}
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-2">
            {CHECK_META.map((meta) => (
              <CheckCard
                key={meta.id}
                id={meta.id}
                label={meta.label}
                icon={meta.icon}
                state={checks[meta.id]}
                micLevel={micLevel}
              />
            ))}
          </ul>

          {anyFailed || (!running && !allPassed) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0"
              disabled={running}
              onClick={() => void runChecks()}
            >
              Retry checks
            </Button>
          ) : null}
        </div>

        {/* Right of tests: environment + guidelines */}
        <div className="border-border flex min-h-0 flex-col gap-3 border p-3 md:p-4">
          <div className="shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MonitorIcon className="text-muted-foreground size-3.5" />
              Recommended environment
            </div>
            <ul className="text-muted-foreground space-y-1.5 text-xs leading-snug md:text-sm">
              {ENVIRONMENT.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-foreground/40 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-border flex min-h-0 flex-1 flex-col gap-2 border-t pt-3">
            <h3 className="text-foreground shrink-0 text-sm font-semibold">
              Interview guidelines
            </h3>
            <p className="text-muted-foreground shrink-0 text-[11px] leading-snug md:text-xs">
              Violating these rules can cause the AI to end or reject your
              interview.
            </p>
            <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto text-xs leading-snug md:text-sm">
              {GUIDELINES.map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="text-muted-foreground w-4 shrink-0 font-medium tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
