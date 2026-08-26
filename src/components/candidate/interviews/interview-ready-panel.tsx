"use client";

import { MicIcon, SparklesIcon, VideoIcon, WifiIcon } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  PrimaryDither,
  PrimaryDitherBand,
} from "@/components/landing/primary-dither";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
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
  description: string;
  icon: typeof WifiIcon;
}[] = [
  {
    id: "internet",
    label: "Internet",
    description: "Stable connection to our servers for the whole session.",
    icon: WifiIcon,
  },
  {
    id: "camera",
    label: "Camera",
    description: "Front camera stays on. There is no preview on your screen.",
    icon: VideoIcon,
  },
  {
    id: "voice",
    label: "Microphone",
    description: "Speak clearly in your own words when the AI asks.",
    icon: MicIcon,
  },
  {
    id: "ai",
    label: "AI engine",
    description: "Voice interview engine must be reachable before you start.",
    icon: SparklesIcon,
  },
];

const ENVIRONMENT_MD = `Set this up before you tap start:

- Quiet, well-lit room with a plain background
- Stable Wi‑Fi or ethernet — avoid hotspot switching
- A device with a working camera and microphone
- Allow camera and microphone in the browser`;

const GUIDELINES_MD = `Breaking these can cause the AI to **end or reject** your interview.

- Sit alone. Nobody else should be in the room
- Keep your face clearly visible on camera the entire time
- Camera video is recorded — keep this tab open until you finish
- Speak in your own words. Do not read notes or get help
- Do not mute yourself or leave this screen until finished
- Close other apps using your camera or microphone`;

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
  description,
  icon: Icon,
  state,
  micLevel,
}: {
  id: CheckId;
  label: string;
  description: string;
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
  const running = state.status === "running";

  return (
    <article
      className={cn(
        "relative flex h-full min-h-42 min-w-0 flex-col overflow-hidden border p-4 sm:p-5 md:min-h-0",
        failed
          ? "bg-destructive border-white/15"
          : "bg-primary border-white/15",
      )}
    >
      {failed ? null : (
        <PrimaryDither
          seed={`check-card-${id}`}
          opacity={pending ? 0.45 : 0.85}
        />
      )}
      {failed || pending ? null : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_24%,rgb(255_255_255/0.28),transparent_44%)] mix-blend-soft-light dark:hidden" />
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col text-white">
        <Icon className="mb-3 size-5 text-white/90" strokeWidth={1.75} />
        <p className="text-sm font-semibold tracking-tight">{label}</p>
        <p className="mt-1 text-xs leading-snug text-white/75">{description}</p>
        <p className="mt-auto pt-3 text-xs font-medium text-white/90">
          {running ? `${value}%` : state.detail}
        </p>
      </div>
    </article>
  );
}

function InfoCard({
  seed,
  label,
  markdown,
}: {
  seed: string;
  label: string;
  markdown: string;
}) {
  return (
    <article className="border-border bg-card flex h-full min-w-0 flex-col overflow-hidden border">
      <PrimaryDitherBand seed={seed} label={label} />
      <div className="p-4 sm:p-5">
        <Markdown className="text-foreground/90">{markdown}</Markdown>
      </div>
    </article>
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
      const res = await withTimeout(fetch("/api/voice/tts"), 8000);
      if (cancelledRef.current) return;
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `AI engine returned ${res.status}`);
      }
      setCheck("ai", { status: "pass", detail: "AI engine reachable" });
    } catch (e) {
      if (cancelledRef.current) return;
      setCheck("ai", {
        status: "fail",
        detail: e instanceof Error ? e.message : "Could not reach AI engine",
      });
    }
  });

  // runChecks is an effect event — include it in deps and the checks restart every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only device checks
  useEffect(() => {
    void runChecks();
    return () => {
      cancelledRef.current = true;
      for (const stream of streamsRef.current) {
        for (const track of stream.getTracks()) track.stop();
      }
      streamsRef.current = [];
    };
  }, []);

  const allPassed = CHECK_META.every((c) => checks[c.id].status === "pass");
  const anyFailed = CHECK_META.some((c) => checks[c.id].status === "fail");
  const running = CHECK_META.some((c) => checks[c.id].status === "running");

  useEffect(() => {
    onReadyChange(allPassed);
  }, [allPassed, onReadyChange]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 py-5 md:px-8 md:py-6">
      <div className="mx-auto grid w-full max-w-5xl grow grid-cols-1 gap-5 md:grid-cols-[20rem_minmax(0,1fr)] md:gap-6">
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <ul className="grid min-h-0 flex-1 grid-cols-2 gap-3 md:grid-cols-1 md:grid-rows-4">
            {CHECK_META.map((meta) => (
              <li key={meta.id} className="min-h-0 min-w-0">
                <CheckCard
                  id={meta.id}
                  label={meta.label}
                  description={meta.description}
                  icon={meta.icon}
                  state={checks[meta.id]}
                  micLevel={micLevel}
                />
              </li>
            ))}
          </ul>

          {anyFailed || (!running && !allPassed) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={running}
              onClick={() => void runChecks()}
            >
              Retry checks
            </Button>
          ) : null}
        </section>

        <section className="grid min-h-0 min-w-0 grid-cols-1 gap-3 md:grid-rows-2">
          <InfoCard
            seed="interview-environment"
            label="Environment"
            markdown={ENVIRONMENT_MD}
          />
          <InfoCard
            seed="interview-guidelines"
            label="Guidelines"
            markdown={GUIDELINES_MD}
          />
        </section>
      </div>
    </div>
  );
}
