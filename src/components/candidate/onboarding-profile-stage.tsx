"use client";

import type { UIMessage } from "ai";
import { CheckIcon } from "lucide-react";
import { motion, type TargetAndTransition } from "motion/react";
import {
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ONBOARDING_STAGE_FIELDS,
  ONBOARDING_STAGE_LABELS,
  type OnboardingStageField,
  readOnboardingStage,
} from "@/lib/candidate/onboarding-stage";
import { cn } from "@/lib/utils";

const STAGE_CARDS = ONBOARDING_STAGE_FIELDS.filter(
  (key): key is Exclude<OnboardingStageField, "voiceLanguage"> =>
    key !== "voiceLanguage",
);
type StageCard = (typeof STAGE_CARDS)[number];
const FIELD_GAP = 14;
const STACK_EASE = [0.22, 1, 0.36, 1] as const;

function Caret({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="bg-primary ml-0.5 inline-block h-[1.05em] w-px translate-y-px align-text-bottom"
      animate={reducedMotion ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              times: [0, 0.49, 0.5, 1],
              ease: "linear",
            }
      }
    />
  );
}

function delayForChar(ch: string) {
  if (ch === "." || ch === "!" || ch === "?") return 170;
  if (ch === "," || ch === ";" || ch === ":") return 110;
  if (ch === "\n") return 90;
  return 46;
}

function TypedBody({
  target,
  active,
  showCaret,
  reducedMotion,
  onProgress,
}: {
  target: string;
  active: boolean;
  showCaret: boolean;
  reducedMotion: boolean;
  onProgress?: (shown: string) => void;
}) {
  const [shown, setShown] = useState("");
  const shownRef = useRef(shown);
  const onProgressRef = useRef(onProgress);
  shownRef.current = shown;
  onProgressRef.current = onProgress;

  useEffect(() => {
    const publish = (next: string) => {
      shownRef.current = next;
      setShown((current) => (current === next ? current : next));
      onProgressRef.current?.(next);
    };

    if (reducedMotion || !active) {
      if (shownRef.current !== target) publish(target);
      return;
    }
    if (target === shownRef.current) return;

    const start = target.startsWith(shownRef.current)
      ? shownRef.current.length
      : 0;
    if (start === 0 && shownRef.current) publish("");

    let i = start;
    let timer = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      i = Math.min(target.length, i + 1);
      const justTyped = target[i - 1] ?? "";
      publish(target.slice(0, i));
      if (i < target.length) {
        timer = window.setTimeout(tick, delayForChar(justTyped));
      }
    };
    timer = window.setTimeout(tick, 48);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, reducedMotion, target]);

  if (!shown) {
    return <span className="text-muted-foreground">Waiting…</span>;
  }

  return (
    <>
      <span className="whitespace-pre-wrap">{shown}</span>
      {showCaret && Boolean(target) ? (
        <Caret reducedMotion={reducedMotion} />
      ) : null}
    </>
  );
}

function FieldCard({
  field,
  target,
  isFocus,
  isWriting,
  done,
  reducedMotion,
  className,
  cardRef,
  initial,
  animate,
  onAnimationComplete,
  onProgress,
}: {
  field: OnboardingStageField;
  target: string;
  isFocus: boolean;
  isWriting: boolean;
  done: boolean;
  reducedMotion: boolean;
  className?: string;
  cardRef?: Ref<HTMLDivElement>;
  initial?: boolean | TargetAndTransition;
  animate: TargetAndTransition;
  onAnimationComplete?: () => void;
  onProgress?: (shown: string) => void;
}) {
  return (
    <motion.div
      ref={cardRef}
      data-field={field}
      initial={initial}
      animate={animate}
      onAnimationComplete={onAnimationComplete}
      className={cn(
        "bg-card absolute right-0 left-0 space-y-1.5 border px-4 py-3.5",
        isFocus ? "border-primary" : "border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {ONBOARDING_STAGE_LABELS[field]}
        </p>
        {done ? <CheckIcon className="text-primary size-3.5 shrink-0" /> : null}
      </div>
      <p
        className={cn(
          "text-foreground min-h-7 text-base leading-snug font-medium tracking-tight md:text-lg",
          field === "summary" &&
            "text-sm leading-relaxed font-normal md:text-base",
        )}
        aria-live={isWriting ? "polite" : "off"}
      >
        {isWriting || isFocus ? (
          <TypedBody
            target={target}
            active={Boolean(target)}
            showCaret={isWriting}
            reducedMotion={reducedMotion}
            onProgress={onProgress}
          />
        ) : done && target ? (
          <span className="whitespace-pre-wrap">{target}</span>
        ) : (
          <span className="text-muted-foreground">Waiting…</span>
        )}
      </p>
    </motion.div>
  );
}

function slotAnimate(
  slot: number,
  currentHeight: number,
  reducedMotion: boolean,
): TargetAndTransition {
  const y = slot * (currentHeight + FIELD_GAP);
  const blur =
    slot <= 0 ? 0 : slot === 1 ? 2.5 : slot === 2 ? 5 : Math.min(8, slot * 2.8);
  const opacity = slot === 0 ? 1 : slot === 1 ? 0.58 : slot === 2 ? 0.34 : 0.14;
  return {
    top: "50%",
    y: `calc(-50% + ${y}px)`,
    scale: slot === 0 ? 1 : 0.97,
    opacity,
    filter: blur ? `blur(${blur}px)` : "blur(0px)",
    zIndex: 20 - slot,
    pointerEvents: slot === 0 ? "auto" : "none",
    transition: reducedMotion
      ? { duration: 0 }
      : { duration: 0.5, ease: STACK_EASE },
  };
}

export function OnboardingProfileStage({
  messages,
  reducedMotion: reducedMotionProp,
}: {
  messages: UIMessage[];
  reducedMotion?: boolean;
}) {
  const stage = useMemo(() => readOnboardingStage(messages), [messages]);
  const [reducedMotion, setReducedMotion] = useState(
    reducedMotionProp ?? false,
  );
  const [leaving, setLeaving] = useState<OnboardingStageField[]>([]);
  const [typed, setTyped] = useState<
    Partial<Record<OnboardingStageField, string>>
  >({});
  const [settled, setSettled] = useState<Set<StageCard>>(() => new Set());
  const [currentHeight, setCurrentHeight] = useState(96);
  const currentRef = useRef<HTMLDivElement>(null);
  const seenDoneRef = useRef<Set<OnboardingStageField> | null>(null);
  const seenWritingRef = useRef(new Set<StageCard>());

  useEffect(() => {
    if (reducedMotionProp != null) {
      setReducedMotion((current) =>
        current === reducedMotionProp ? current : reducedMotionProp,
      );
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      setReducedMotion((current) =>
        current === media.matches ? current : media.matches,
      );
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [reducedMotionProp]);

  const markTyped = useCallback(
    (field: StageCard, shown: string, target: string) => {
      setTyped((current) =>
        current[field] === shown ? current : { ...current, [field]: shown },
      );
      if (target && shown === target) {
        setSettled((current) => {
          if (current.has(field)) return current;
          const next = new Set(current);
          next.add(field);
          return next;
        });
      }
    },
    [],
  );

  const toolWriting =
    stage.writing.find((key): key is StageCard => key !== "voiceLanguage") ??
    null;
  const catchingUp = STAGE_CARDS.find(
    (key) =>
      !settled.has(key) &&
      Boolean(stage.values[key]) &&
      (typed[key] ?? "") !== stage.values[key],
  );
  const writingNow: StageCard | null = catchingUp ?? toolWriting;
  const asking: StageCard | null =
    stage.asking && stage.asking !== "voiceLanguage" ? stage.asking : null;

  for (const key of stage.writing) {
    if (key !== "voiceLanguage") seenWritingRef.current.add(key);
  }

  useEffect(() => {
    const extra = STAGE_CARDS.filter((key) => {
      if (settled.has(key)) return false;
      if (!stage.values[key]) return false;
      if (stage.writing.includes(key)) return false;
      if (seenWritingRef.current.has(key)) return false;
      return true;
    });
    if (extra.length === 0) return;
    setSettled((current) => {
      const next = new Set(current);
      let changed = false;
      for (const key of extra) {
        if (next.has(key)) continue;
        next.add(key);
        changed = true;
      }
      return changed ? next : current;
    });
    const seen = seenDoneRef.current ?? new Set<OnboardingStageField>();
    for (const key of extra) seen.add(key);
    seenDoneRef.current = seen;
  }, [settled, stage.values, stage.writing]);

  const queue = STAGE_CARDS.filter((key) => {
    if (settled.has(key)) return false;
    if (key === "summary") {
      return (
        Boolean(stage.values.summary) ||
        writingNow === "summary" ||
        stage.asking === "summary"
      );
    }
    return true;
  });

  const focus: StageCard | null =
    (writingNow && queue.includes(writingNow) ? writingNow : null) ??
    (asking && queue.includes(asking) ? asking : null) ??
    queue[0] ??
    null;

  const focusIndex = focus ? STAGE_CARDS.indexOf(focus) : 0;
  const stack = queue.filter((key) => STAGE_CARDS.indexOf(key) >= focusIndex);

  useEffect(() => {
    const doneNow = new Set(settled);
    if (seenDoneRef.current === null) {
      seenDoneRef.current = doneNow;
      return;
    }
    const newly = STAGE_CARDS.filter(
      (key) => doneNow.has(key) && !seenDoneRef.current?.has(key),
    );
    seenDoneRef.current = doneNow;
    if (newly.length === 0 || reducedMotion) return;
    setLeaving((current) => [
      ...current,
      ...newly.filter((key) => !current.includes(key)),
    ]);
  }, [reducedMotion, settled]);

  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = window.setTimeout(() => {
      setLeaving((current) => (current.length === 0 ? current : []));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useLayoutEffect(() => {
    if (!focus) return;
    const el = currentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const next = Math.round(el.getBoundingClientRect().height);
      setCurrentHeight((current) => (current === next ? current : next));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [focus]);

  return (
    <section
      aria-label="Profile being filled"
      className="relative min-h-0 w-full flex-1 overflow-hidden px-5 md:px-8"
    >
      <div className="relative mx-auto h-full w-full max-w-xl">
        {leaving.map((key) => (
          <FieldCard
            key={`leave-${key}`}
            field={key}
            target={stage.values[key]}
            isFocus={false}
            isWriting={false}
            done
            reducedMotion={reducedMotion}
            className="pointer-events-none z-30"
            initial={{
              top: "50%",
              y: "-50%",
              scale: 1,
              opacity: 1,
              filter: "blur(0px)",
            }}
            animate={{
              top: "50%",
              y: "calc(-50% - 5.75rem)",
              scale: 0.94,
              opacity: 0,
              filter: "blur(5px)",
              transition: { duration: 0.52, ease: STACK_EASE },
            }}
            onAnimationComplete={() => {
              setLeaving((current) => current.filter((item) => item !== key));
            }}
          />
        ))}

        {stack.map((key, slot) => {
          const isFocus = key === focus;
          const isWriting = writingNow === key;
          return (
            <FieldCard
              key={key}
              field={key}
              target={stage.values[key]}
              isFocus={isFocus}
              isWriting={isWriting}
              done={false}
              reducedMotion={reducedMotion}
              cardRef={isFocus ? currentRef : undefined}
              initial={false}
              animate={slotAnimate(slot, currentHeight, reducedMotion)}
              onProgress={(shown) => markTyped(key, shown, stage.values[key])}
            />
          );
        })}
      </div>
    </section>
  );
}
