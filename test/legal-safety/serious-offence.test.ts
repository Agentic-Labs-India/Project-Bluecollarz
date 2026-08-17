import { describe, expect, test } from "bun:test";
import {
  CASE_STATES,
  canTransition,
  S143_INDICATORS,
  transitionCase,
} from "@/lib/legal-safety/serious-offence";

describe("serious offence gate", () => {
  test("the machine cannot file or close a case", () => {
    expect(
      canTransition("legal_review_required", "mandatory_report_triggered"),
    ).toBe(true);
    expect(canTransition("legal_review_required", "no_statutory_trigger")).toBe(
      true,
    );
  });

  test("outcomes are reachable only from legal review", () => {
    for (const outcome of [
      "mandatory_report_triggered",
      "no_statutory_trigger",
    ] as const) {
      const sources = CASE_STATES.filter((state) =>
        canTransition(state, outcome),
      );
      expect(sources).toEqual(["legal_review_required"]);
    }
  });

  test("outcome states are terminal", () => {
    for (const terminal of [
      "mandatory_report_triggered",
      "no_statutory_trigger",
    ] as const) {
      for (const target of CASE_STATES) {
        expect(canTransition(terminal, target)).toBe(false);
      }
    }
  });

  test("a reviewer cannot return a case to legal_review_required", () => {
    for (const from of CASE_STATES) {
      if (from === "legal_review_required") continue;
      expect(canTransition(from, "legal_review_required")).toBe(false);
    }
  });

  test("no state can transition to itself", () => {
    for (const state of CASE_STATES) {
      expect(canTransition(state, state)).toBe(false);
    }
  });

  test("a case cannot be advanced by the system actor", async () => {
    await expect(
      transitionCase({
        caseId: "any",
        to: "no_statutory_trigger",
        actor: { id: "system", email: "system@blucollarz" },
        note: "auto",
      }),
    ).rejects.toThrow(/named human reviewer/);
  });

  test("a transition must record a reason", async () => {
    await expect(
      transitionCase({
        caseId: "any",
        to: "no_statutory_trigger",
        actor: { id: "u1", email: "reviewer@blucollarz.com" },
        note: "   ",
      }),
    ).rejects.toThrow(/record a reason/);
  });

  test("s.143 indicators are observations, not conclusions", () => {
    for (const indicator of S143_INDICATORS) {
      expect(indicator).not.toMatch(/traffick|offence|guilty|crime/i);
    }
  });
});
