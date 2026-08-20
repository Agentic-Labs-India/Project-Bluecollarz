"use client";

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  MicIcon,
  SparklesIcon,
  VideoIcon,
  WifiIcon,
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  "A device with a working camera and microphone",
  "Allow camera and microphone in the browser",
];

const GUIDELINES = [
  "Sit alone in a quiet room. No one else should be present — the AI may reject your application if another person is detected.",
  "Keep your face clearly visible on camera for the entire session.",
  "Camera video is recorded. Keep this tab open until you finish.",
  "Speak clearly in your own words. Do not read notes or get help from others.",
  "Do not mute yourself or leave this screen until finished.",
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

function CheckOrb({
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
  const failed = state.status === "fail";
  const pending = state.status === "pending";

  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <div
        className={cn(
          "relative flex size-16 items-center justify-center overflow-hidden rounded-full md:size-18",
          failed ? "bg-destructive" : "bg-primary",
          state.status === "running" &&
            "ring-primary/35 ring-2 ring-offset-2 ring-offset-background",
        )}
        aria-hidden
      >
        {failed ? null : (
          <PrimaryDither
            seed={`check-orb-${id}`}
            opacity={pending ? 0.45 : 0.92}
            wash={false}
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          />
        )}
        {failed || pending ? null : (
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_30%_24%,rgb(255_255_255_/_0.35),transparent_44%)] mix-blend-soft-light dark:hidden" />
        )}
        <Icon
          className="relative z-10 size-5 text-white"
          strokeWidth={1.75}
        />
      </div>
      <div className="min-w-0">
        <p className="text-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
          {state.status === "running" ? `${value}%` : state.detail}
        </p>
      </div>
    </li>
  );
}

export function InterviewReadyPanel({
  onReadyChange,
  ref,
}: {
  onReadyChange: (ready: boolean) => void;
  ref?: React.Ref<InterviewReadyPanelHandle>;
}) {
  const [checks, setChecks] = useState(INITIAL);
  const [micLevel, setMicLevel] = useState(0);
  const streamsRef = useRef<MediaStream[]>([]);
  const cancelledRef = useRef(false);

  const setCheck = (id: CheckId, next: CheckState) => {
    setChecks((prev) => ({ ...prev, [id]: next }));
  };

  const stopOwnedStreams = () => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamsRef.current = [];
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
      const track = camera.getVideoTracks()[0];
      if (!track || track.readyState !== "live") {
        for (const cameraTrack of camera.getTracks()) cameraTrack.stop();
        throw new Error("Camera track is not live");
      }
      for (const cameraTrack of camera.getTracks()) cameraTrack.stop();
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
    <div className="h-full min-h-0 w-full overflow-y-auto px-5 py-6 md:px-8">
      <div className="mx-auto flex min-h-full max-w-xl flex-col">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            System tests
          </p>
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

        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
          {CHECK_META.map((meta) => (
            <CheckOrb
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
            className="mt-5 w-full"
            disabled={running}
            onClick={() => void runChecks()}
          >
            Retry checks
          </Button>
        ) : null}

        <Separator className="my-6" />

        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Recommended environment
        </p>
        <ul className="mt-3 space-y-0">
          {ENVIRONMENT.map((item) => (
            <li key={item}>
              <p className="text-foreground/90 py-2.5 text-sm leading-snug">
                {item}
              </p>
              <Separator />
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mt-6 text-[11px] font-medium tracking-wide uppercase">
          Interview guidelines
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
          Violating these rules can cause the AI to end or reject your
          interview.
        </p>
        <ol className="mt-3 space-y-0">
          {GUIDELINES.map((item, index) => (
            <li key={item}>
              <p className="text-foreground/90 flex gap-2 py-2.5 text-sm leading-snug">
                <span className="text-muted-foreground w-4 shrink-0 font-medium tabular-nums">
                  {index + 1}.
                </span>
                <span>{item}</span>
              </p>
              <Separator />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
