# Legal Safety Architecture — Implementation Feedback

**Against:** Claims Registry & Serious-Offence Gate, Version 0.2 (14 August 2026)  
**Prepared for:** Niyaz — CEO · Nikhilesh — CTO  
**Verified against:** running tree of Project-Blucollarz, 18 August 2026  
**Method:** V3 — artifact, not transcript. Claims below name files.  
**Status:** Engineering and product feedback. **Not legal advice.** Does not authorise the AI to make a legal determination.

Nothing in this note settles a COUNSEL-CONTROLLED question. It only records whether the software implements the register, the interims, and the prohibited-output tests.

A legal 10/10 is blocked until Indian criminal/emigration counsel and L10-A worker research sign off POL-0005 wording. The numbers below are an **engineering ceiling**.

---

## Score

Ship bar is **7**. The engineering bar is met. Counsel sign-off is not.

| Slice | Score / 10 | What that number means |
| --- | --- | --- |
| **Overall vs v0.2 register** | **8.0** | POLICY-SETTLED and encodable interims are in the tree. CR items are not encoded as law. POL-0005 wording is still `DRAFT-NOT-COUNSEL-APPROVED`. |
| Part B — LAW-SETTLED encoded | **7.5** | Register objects exist with citation and `review_due`. LAW-0008 drives legal hold. LAW-0004 is not in the classifier. LAW-0009 is not asserted as present DPDP obligation in worker notices. |
| Part C — interim fail-safes | **7.0** | CR-0001–0010 remain questions. CR-0004 hold + manual release is built. CR-0003/0006 tip-off is absent by rule (LEG-0003). Dual filing (CR-0005) is correctly **not** automated. |
| Part D — PAD tests | **9.0** | PAD-0001–0008 have failing tests and a runtime stream guard. Prompts are not the control. |
| Part E — Serious-offence gate | **8.5** | Three states only. AI may enter `legal_review_required`. Humans only may leave it. Detector on Help / onboarding / interview. Imminent-harm skip does not manufacture a warning record. |
| Part F — Worker-facing POL | **7.5** | POL-0007 at session start. POL-0005 draft + teach-back fields per POL-0006. Forbidden consent field does not exist. Wording is not counsel-approved. |

**Read this as:** you may claim the product implements the **engineering** side of the serious-offence gate and PAD enforcement. You may **not** claim BNSS reporting is discharged, that POL-0005 is a legally sufficient warning, or that a case in `mandatory_report_triggered` has been filed.

---

## How the pair of axes is treated in code

| Axis rule | In software? |
| --- | --- |
| Claims registry with `legal_status` / `policy_status` / `encodable` / `review_due` | **Yes.** `src/lib/legal-safety/registry.ts`. IDs match v0.2 (LAW-0002 is BNSS s.33(2), CR-0002 is the employee's reasonable-excuse question, not RA registration). |
| Unclassified rule does not exist | **Yes** for encoded behaviour (`getClaim` / `assertEncodable` throw). Help/onboarding/interview still answer ordinary questions; PAD guard blocks prohibited determinations. |
| COUNSEL-CONTROLLED not encoded as law | **Pass.** No awareness-threshold classifier (CR-0001). No auto-filing. No RA self-classification. |
| POLICY-SETTLED must be built | **Pass** for POL-0001 (consent is not read on transition), POL-0006 (fields + forbidden name), POL-0007 (session notice). |
| justification_speakable / depends_on_legal | **Yes** on the claim object. Worker copy is limited to POL-0005 / POL-0007 wording. |

---

## Part E — Serious-offence gate — 8.5 / 10

| State | Who may enter it | In code |
| --- | --- | --- |
| `no_statutory_trigger` | Human after review | `transitionCase` + admin PATCH enum |
| `legal_review_required` | AI may move a case **in** | `raiseIndicators` only |
| `mandatory_report_triggered` | Human only, identity logged | PATCH actor is the session user; `system` is rejected |

| Register step | Code |
| --- | --- |
| POL-0007 at session start | `SafetyNoticeGate` on the candidate shell; `/api/candidate/safety/status` |
| Detect transition toward sensitive incident disclosure | `screenWorkerTurnSafe` on Help, onboarding, interview chat |
| POL-0005 + teach-back | In-app dialog; stored verbatim; not scored; not a consent record |
| IMMEDIATE-SAFETY OVERRIDE | `detectImminentHarm` records `noticeDeferred: true` with empty `bodyShown` |
| Preserve original evidence | Case `evidence[]` is append-only excerpts with source + timestamp |
| s.143 element-mapped indicators only; **not** s.111 | `S143_INDICATORS` in `serious-offence.ts`; no s.111 indicator |
| AI → `legal_review_required` only | `canTransition` forbids machine outcomes; PATCH cannot target `legal_review_required` |
| No notification to the accused (LEG-0003) | No notify path exists; admin copy states this |
| Dual filing | **Not built.** Marking `mandatory_report_triggered` does not file. That is intentional until counsel SOP exists. |

Remaining gaps vs 10: no human-capacity fail-closed, no dual-filing SOP in product, POL-0005 draft wording, detector is regex not counsel-grade.

---

## Part D — Prohibited AI determinations — 9.0 / 10

Enforced by test (`test/legal-safety/legal-safety.test.ts`) and by `prohibitedOutputGuard` on Help / onboarding / interview streams. Interview analysis and job-overview generation scan output before persist.

| ID | Production posture |
| --- | --- |
| PAD-0001–0008 | Lexicon + failing tests + stream guard |
| Hindi | First-class patterns; `\b` not used on Devanagari |

Remaining: admin-edited prompts can still *ask* the model to violate a PAD; the guard is the control that stops the worker seeing it.

---

## Part F — Worker-facing obligations — 7.5 / 10

| ID | In software |
| --- | --- |
| POL-0001 | `transitionCase` does not read consent |
| POL-0002 | Admin queue copy: decision does not discharge anyone's duty |
| POL-0003 | Imminent-harm skip; no full safety-before-disclosure protocol |
| POL-0004 | No report is filed by the machine; human note is required; no auto s.24 dump onto a filing form |
| POL-0005 | Draft wording `DRAFT-NOT-COUNSEL-APPROVED`; en-IN and hi-IN only; other languages fail closed to a human |
| POL-0006 | Delivery fields match the register. `worker_consented_to_mandatory_reporting` does not exist |
| POL-0007 | Distinct baseline notice; not a criminal warning |

---

## Part B / C — remaining non-goals (correctly not built)

- CR-0001 awareness threshold — not encoded
- Auto-file police / PGE — not encoded
- RA tip-off, worker-facing adverse RA disclosure, Truth Graph — not encoded
- `worker_consented_to_mandatory_reporting` — not encoded

---

## Classification of this document

| This note asserts | Axis |
| --- | --- |
| The listed files contain the gate states, PAD tests, and POL-0005/0007 delivery records | NOT-A-LEGAL-CLAIM (engineering fact) |
| Whether BNSS s.33 duty is triggered by Help ingesting a transcript | COUNSEL-CONTROLLED (CR-0001) — **not asserted** |
| That Blucollarz must or must not file a report today | COUNSEL-CONTROLLED — **not asserted** |

Blucollarz Technologies Private Limited · Internal engineering feedback · 18 August 2026 · Not legal advice.
