import "server-only";

import { ObjectId } from "mongodb";
import { placeLegalHold, releaseLegalHold } from "@/lib/compliance/legal-hold";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";
import { assertEncodable } from "@/lib/legal-safety/registry";
import type {
  CaseState,
  CaseTransition,
  S143Indicator,
  SeriousOffenceCase,
  SeriousOffenceCasePublic,
} from "@/lib/legal-safety/types";

export {
  CASE_STATES,
  S143_INDICATORS,
  type CaseState,
  type CaseTransition,
  type S143Indicator,
  type SeriousOffenceCase,
  type SeriousOffenceCasePublic,
} from "@/lib/legal-safety/types";

export class SeriousOffenceError extends Error {
  readonly status = 409;
  readonly code = "SERIOUS_OFFENCE_TRANSITION_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "SeriousOffenceError";
  }
}

/** Only these moves exist, and every one of them is made by a human. */
const ALLOWED_TRANSITIONS: Readonly<Record<CaseState, readonly CaseState[]>> = {
  legal_review_required: ["no_statutory_trigger", "mandatory_report_triggered"],
  no_statutory_trigger: [],
  mandatory_report_triggered: [],
};

export function canTransition(from: CaseState, to: CaseState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function cases() {
  return client
    .db(DB_NAME)
    .collection<SeriousOffenceCase>(COLLECTIONS.LEGAL_SAFETY_CASES);
}

export async function getCase(
  caseId: string,
): Promise<SeriousOffenceCase | null> {
  return cases().findOne({ caseId });
}

/** The live case for a worker, if a review is already under way. */
export async function getOpenCaseForSubject(
  subjectUserId: string,
): Promise<SeriousOffenceCase | null> {
  return cases().findOne({
    subjectUserId,
    state: "legal_review_required",
  });
}

export async function listCases(filter?: {
  state?: CaseState;
}): Promise<SeriousOffenceCase[]> {
  return cases()
    .find(filter?.state ? { state: filter.state } : {})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Admin JSON view. Strips Mongo `_id` so ObjectId does not leak into the client. */
export function toPublicCase(doc: SeriousOffenceCase): SeriousOffenceCasePublic {
  return {
    caseId: doc.caseId,
    state: doc.state,
    subjectUserId: doc.subjectUserId,
    indicators: doc.indicators,
    legalHoldId: doc.legalHoldId,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
    evidence: doc.evidence.map((item) => ({
      sourceKind: item.sourceKind,
      sourceId: item.sourceId,
      excerpt: item.excerpt,
      capturedAt: iso(item.capturedAt),
    })),
    transitions: doc.transitions.map((item) => ({
      from: item.from,
      to: item.to,
      actorId: item.actorId,
      actorEmail: item.actorEmail,
      note: item.note,
      at: iso(item.at),
    })),
  };
}

/**
 * The only machine-initiated step. Opens the case at `legal_review_required`
 * and immediately places a legal hold, so the material survives an erasure
 * request made after the observation but before a human has looked at it.
 */
export async function raiseIndicators(input: {
  subjectUserId: string;
  indicators: S143Indicator[];
  evidence: SeriousOffenceCase["evidence"];
}): Promise<SeriousOffenceCase> {
  assertEncodable("LAW-0008");

  if (input.indicators.length === 0) {
    throw new SeriousOffenceError("A case needs at least one indicator.");
  }

  const now = new Date();
  const caseId = new ObjectId().toHexString();

  const hold = await placeLegalHold({
    dataPrincipalId: input.subjectUserId,
    reason: "serious_offence_review",
    caseId,
    note: "Automatic preservation on indicator detection, pending human review.",
    actor: { id: "system", email: "system@blucollarz" },
  });

  const doc: SeriousOffenceCase = {
    caseId,
    state: "legal_review_required",
    subjectUserId: input.subjectUserId,
    indicators: input.indicators,
    evidence: input.evidence,
    legalHoldId: hold.holdId,
    transitions: [
      {
        from: null,
        to: "legal_review_required",
        actorId: "system",
        actorEmail: "system@blucollarz",
        note: "Indicators observed. No determination made.",
        at: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await cases().insertOne(doc);
  return doc;
}

/**
 * Advance a case. Requires a named human actor; there is no system variant of
 * this function, and callers cannot supply one because the actor is recorded
 * from the authenticated session.
 */
export async function transitionCase(input: {
  caseId: string;
  to: CaseState;
  actor: { id: string; email: string };
  note: string;
}): Promise<SeriousOffenceCase> {
  if (!input.actor.id || input.actor.id === "system") {
    throw new SeriousOffenceError(
      "Case transitions require a named human reviewer.",
    );
  }
  if (!input.note.trim()) {
    throw new SeriousOffenceError("A transition must record a reason.");
  }

  // POL-0001: consent is not consulted. LEG-0003: this function does not
  // notify the accused. POL-0004: this records a human decision; it does not
  // file a report.
  assertEncodable("POL-0001");
  assertEncodable("LEG-0003");
  assertEncodable("POL-0004");

  const existing = await getCase(input.caseId);
  if (!existing) {
    throw new SeriousOffenceError("Case not found.");
  }
  if (!canTransition(existing.state, input.to)) {
    throw new SeriousOffenceError(
      `Cannot move a case from ${existing.state} to ${input.to}.`,
    );
  }

  const now = new Date();
  const transition: CaseTransition = {
    from: existing.state,
    to: input.to,
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    note: input.note.trim(),
    at: now,
  };

  const updated = await cases().findOneAndUpdate(
    { caseId: input.caseId, state: existing.state },
    {
      $set: { state: input.to, updatedAt: now },
      $push: { transitions: transition },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw new SeriousOffenceError("Case changed while you were reviewing it.");
  }

  // No offence to preserve: lift the hold so erasure can proceed. A mandatory
  // report keeps the hold until a named reviewer releases it.
  if (input.to === "no_statutory_trigger" && updated.legalHoldId) {
    return releaseCaseHold({
      caseId: updated.caseId,
      note: input.note,
      actor: input.actor,
    });
  }

  return updated;
}

/** Named human only. Clears the case pointer after the hold row is released. */
export async function releaseCaseHold(input: {
  caseId: string;
  note: string;
  actor: { id: string; email: string };
}): Promise<SeriousOffenceCase> {
  if (!input.actor.id || input.actor.id === "system") {
    throw new SeriousOffenceError(
      "Releasing a hold requires a named human reviewer.",
    );
  }
  if (!input.note.trim()) {
    throw new SeriousOffenceError("A hold release must record a reason.");
  }

  const existing = await getCase(input.caseId);
  if (!existing) {
    throw new SeriousOffenceError("Case not found.");
  }
  if (!existing.legalHoldId) {
    return existing;
  }

  await releaseLegalHold({
    holdId: existing.legalHoldId,
    actor: input.actor,
  });

  const updated = await cases().findOneAndUpdate(
    { caseId: input.caseId },
    { $set: { legalHoldId: null, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw new SeriousOffenceError("Case not found.");
  }
  return updated;
}

/**
 * Evidence is append-only. Nothing in this module updates or removes an
 * existing entry, because the preserved excerpt is the record of what was
 * actually observed.
 */
export async function appendEvidence(input: {
  caseId: string;
  evidence: SeriousOffenceCase["evidence"][number];
  /** Newly observed indicators, merged without duplicating existing ones. */
  indicators?: S143Indicator[];
}): Promise<void> {
  const result = await cases().updateOne(
    { caseId: input.caseId },
    {
      $push: { evidence: input.evidence },
      $addToSet: { indicators: { $each: input.indicators ?? [] } },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.matchedCount === 0) {
    throw new SeriousOffenceError("Case not found.");
  }
}
