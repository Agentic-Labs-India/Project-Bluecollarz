import type { TextStreamPart, ToolSet } from "ai";
import { findProhibitedOutput } from "@/lib/legal-safety/lexicon";

/**
 * Runtime enforcement of PAD-0001..0008 on model output.
 *
 * The prompt cannot be this control. Prompts are admin-editable at runtime and
 * a model can be argued out of them, so the guard sits after generation where
 * neither applies.
 *
 * Text is released a clause at a time rather than token by token. A regex over
 * a half-written sentence cannot tell "this offer is genuine" from "this offer
 * is genuine, I cannot say", so anything finer would either miss violations or
 * ship them and try to retract text the worker has already read.
 */

const CLAUSE_END = /[।.!?\n]/;

/** Neutral, and deliberately not an apology for something the worker did. */
export const GUARD_FALLBACK =
  "I can't answer that part. Someone from our team will look at it and get back to you.";

export interface GuardOptions {
  /** Where the guard ran, for the server-side log. */
  surface: string;
  /** Shown in place of the blocked text. Pass a localized string when known. */
  fallback?: string;
}

function splitCompletedClause(buffer: string): [string, string] | null {
  const match = buffer.match(CLAUSE_END);
  if (match?.index === undefined) return null;
  const cut = match.index + 1;
  return [buffer.slice(0, cut), buffer.slice(cut)];
}

export function prohibitedOutputGuard<TOOLS extends ToolSet>(
  options: GuardOptions,
) {
  const fallback = options.fallback ?? GUARD_FALLBACK;

  return () => {
    const buffers = new Map<string, string>();
    const tripped = new Set<string>();

    const block = (claims: string[], reasons: string[]) => {
      console.error("[legal-safety] blocked model output", {
        surface: options.surface,
        claims,
        reasons,
      });
    };

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(part, controller) {
        if (part.type === "text-delta") {
          // Once a message has produced a prohibited determination, the rest of
          // it is not trustworthy either, so nothing further is released.
          if (tripped.has(part.id)) return;

          let buffer = (buffers.get(part.id) ?? "") + part.text;
          for (;;) {
            const split = splitCompletedClause(buffer);
            if (!split) break;
            const [clause, rest] = split;
            const violations = findProhibitedOutput(clause);
            if (violations.length > 0) {
              block(
                violations.map((violation) => violation.claim),
                violations.map((violation) => violation.reason),
              );
              controller.enqueue({ ...part, text: fallback });
              tripped.add(part.id);
              buffers.delete(part.id);
              return;
            }
            controller.enqueue({ ...part, text: clause });
            buffer = rest;
          }
          buffers.set(part.id, buffer);
          return;
        }

        // Flush whatever never reached a terminator before the message closes.
        if (part.type === "text-end") {
          const remainder = buffers.get(part.id);
          buffers.delete(part.id);
          if (remainder && !tripped.has(part.id)) {
            const violations = findProhibitedOutput(remainder);
            if (violations.length > 0) {
              block(
                violations.map((violation) => violation.claim),
                violations.map((violation) => violation.reason),
              );
              tripped.add(part.id);
              controller.enqueue({
                type: "text-delta",
                id: part.id,
                text: fallback,
              });
            } else {
              controller.enqueue({
                type: "text-delta",
                id: part.id,
                text: remainder,
              });
            }
          }
        }

        controller.enqueue(part);
      },
    });
  };
}

/** Non-streaming equivalent, for generated text that is stored or emailed. */
export function guardText(text: string, surface: string): string {
  const violations = findProhibitedOutput(text);
  if (violations.length === 0) return text;
  console.error("[legal-safety] blocked generated text", {
    surface,
    claims: violations.map((violation) => violation.claim),
  });
  return GUARD_FALLBACK;
}
