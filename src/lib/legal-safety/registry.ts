/**
 * Claims Registry — Legal Safety Architecture v0.2 (14 August 2026).
 *
 * Two independent axes. Conflating them is how an internal safety design
 * starts to look like settled law. An unclassified rule does not exist:
 * behaviour that depends on a claim must look it up, and `getClaim` throws
 * on anything not registered here.
 *
 * This file records classifications made by humans. It does not make legal
 * determinations. Adding an entry does not settle one.
 *
 * IDs and propositions are taken from the v0.2 register. Earlier drafts in
 * this repo that reused LAW/CR numbers for different propositions were wrong
 * and are not kept.
 */

export type LegalStatus =
  | "LAW-SETTLED"
  | "COUNSEL-CONTROLLED"
  | "NOT-A-LEGAL-CLAIM";

export type PolicyStatus =
  | "POLICY-SETTLED"
  | "POLICY-PROVISIONAL"
  | "PROHIBITED-AI-DETERMINATION";

export interface Claim {
  readonly id: string;
  readonly text: string;
  readonly legal_status: LegalStatus;
  readonly policy_status: PolicyStatus;
  /** May engineering encode this claim as production behaviour? */
  readonly encodable: boolean;
  /** May the reason for this rule be stated externally / to a worker? */
  readonly justification_speakable: boolean;
  readonly depends_on_legal: readonly string[];
  readonly citation: string | null;
  readonly review_due: string | null;
}

const CLAIM_LIST: readonly Claim[] = [
  // ---------------------------------------------------------------- Part B
  {
    id: "LAW-0001",
    text: "BNSS s.33(1) requires a person aware of the commission or intended commission of enumerated offences to give information forthwith to the nearest Magistrate or police officer, in the absence of any reasonable excuse, the burden of proving which lies on that person.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0001"],
    citation: "BNSS 2023 s.33(1)",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0002",
    text: "BNSS s.33(2): offence includes any act committed outside India that would constitute an offence if committed in India. The reporting duty therefore survives conduct occurring in the GCC.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "BNSS 2023 s.33(2)",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0003",
    text: "BNS s.143 (trafficking) requires recruitment/transport/harbouring/transfer/receipt for the purpose of exploitation, by one of the enumerated means. Victim consent is immaterial to the trafficker's liability. An illegal recruitment fee alone is not trafficking.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "BNS 2023 s.143",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0004",
    text: "BNS s.111 (organised crime) requires continuing unlawful activity whose predicate includes more than one charge sheet filed before a competent court in the preceding ten years with cognizance taken. The voice system cannot hold those facts.",
    legal_status: "LAW-SETTLED",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "BNS 2023 s.111",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0005",
    text: "BNSS s.173 permits information concerning a cognizable offence to be given to an officer in charge of a police station irrespective of the area where the offence was committed. Jurisdiction may never delay a qualifying report.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "BNSS 2023 s.173",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0006",
    text: "BNS ss.238 and 249 both require a specific intention to screen the offender from legal punishment. Mere knowledge, or a neutral notification, does not satisfy the element.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["CR-0006"],
    citation: "BNS 2023 ss.238, 249",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0007",
    text: "DPDP s.7(d) permits processing to fulfil an obligation under Indian law to disclose information to the State. DPDP s.17(1)(c) exempts processing in the interest of prevention, detection, investigation or prosecution of an offence. Text settled; application untested.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0004"],
    citation: "DPDP Act 2023 s.7(d), s.17(1)(c)",
    review_due: "2026-11-30",
  },
  {
    id: "LAW-0008",
    text: "DPDP s.12(3) and s.8(7) each preserve retention where necessary for compliance with any law for the time being in force. Basis for legal hold. Scope untested.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: true,
    depends_on_legal: ["CR-0004"],
    citation: "DPDP Act 2023 s.12(3), s.8(7)",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0009",
    text: "DPDP substantive provisions (ss.3–17) commence approximately 13 May 2027 under the phased notifications of 13 November 2025. Design now; obligations prospective.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "DPDP commencement notifications 13 Nov 2025",
    review_due: "2027-05-13",
  },
  {
    id: "LAW-0010",
    text: "Emigration Act 1983 s.24 can expose the worker himself — emigrating outside the Act, obtaining clearance by false information, altering documents.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0008"],
    citation: "Emigration Act 1983 s.24",
    review_due: "2026-11-30",
  },
  {
    id: "LAW-0011",
    text: "The RA registration obligation under the Emigration Act is activity-based. ECR/ECNR status governs only the worker's emigration clearance. They are separate regulatory axes. 'Non-ECR = no RA needed' remains permanently blocklisted.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "Emigration Act 1983",
    review_due: "2027-02-14",
  },
  {
    id: "LAW-0012",
    text: "The Overseas Mobility (Facilitation and Welfare) Bill 2025 is a draft, not enacted. It is not current law.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: "OMB 2025 (draft)",
    review_due: "2027-02-14",
  },

  // ---------------------------------------------------------------- Part C — questions. Interims that may be built are separate POL/LEG rows.
  {
    id: "CR-0001",
    text: "When an AI ingests a statement, a support agent reads it, and a compliance officer later reviews it — at what point is the company aware under BNSS s.33?",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0002",
    text: "Does an employee's immediate internal escalation to a compliance function that files forthwith constitute a reasonable excuse discharging that employee's own s.33 duty?",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0001"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0003",
    text: "May a right of reply ever be retained for an enumerated-offence matter, and at what stage? Blocks RA notification in gate-triggered cases. Interim: suspended entirely.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0004",
    text: "How far does the compliance-with-any-law carve-out in DPDP s.12(3)/s.8(7) extend where a record may be evidence of an enumerated offence but no report has yet been filed?",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0008"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0005",
    text: "Does a PGE/eMigrate complaint or an Indian Mission report discharge s.33, or must information go to a Magistrate or police officer? Interim: assume it does not — file both. Not a single-channel SOP in product.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0001"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0006",
    text: "Extraterritorial reach of ss.238–240 and s.249 versus BNS s.1 for an Indian RA acting in the GCC. Blocks any criminal-exposure justification for the no-tip-off rule.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0006"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0007",
    text: "Where the platform holds corroborated reports about a named RA, is there any obligation — or any liability — in warning, or in not warning, a subsequent worker? Interim: regulator channel only.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0008",
    text: "Can a s.33 report be scoped to the recruiter's conduct without withholding material information? Is there any protection for a worker whose own account reveals a s.24 offence?",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0010"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0009",
    text: "Evidentiary standard for holding, acting on, and disclosing structured contradictions about a named RA; defamation posture under BNS s.356. Interim: internal + regulator only.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "CR-0010",
    text: "Jurisdictional and data-protection analysis where the worker is physically in the GCC and destination law may apply concurrently. Interim: India-side processing assumed in DPDP scope.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },

  {
    id: "LEG-0003",
    text: "For a gate-triggered matter, no notification to the accused before reporting. Held on worker-safety and evidence-preservation grounds, not on a criminal-exposure theory (CR-0006).",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0006"],
    citation: null,
    review_due: "2026-11-30",
  },

  // ---------------------------------------------------------------- Part F
  {
    id: "POL-0001",
    text: "Worker consent is not a gate on mandatory reporting. Worker involvement, safety planning and minimum-necessary disclosure remain mandatory; a veto does not exist.",
    legal_status: "LAW-SETTLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["LAW-0001", "CR-0001"],
    citation: null,
    review_due: null,
  },
  {
    id: "POL-0002",
    text: "Staff are never told that internal escalation discharges their personal s.33 duty. The system builds evidence (detection time, escalation time, filing reference, holders) without promising discharge.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0002"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "POL-0003",
    text: "Safety-before-disclosure protocol runs before any report. We do not promise pre-notification — it can itself increase danger.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "POL-0004",
    text: "Reports are scoped to the recruiter's and employer's conduct. The worker's own potential Emigration Act s.24 or forgery exposure is not gratuitously documented. No report filed without legal review of scope.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: false,
    depends_on_legal: ["CR-0008", "LAW-0010"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "POL-0005",
    text: "Pre-Disclosure Serious-Safety Notice. Before collecting a potentially serious-offence narrative, the worker receives a short notice, spoken in a language he understands, explaining the limits of confidentiality. Product control, not an asserted legal duty. Wording is draft until counsel and L10-A.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-PROVISIONAL",
    encodable: true,
    justification_speakable: true,
    depends_on_legal: ["CR-0001", "LAW-0001"],
    citation: null,
    review_due: "2026-11-30",
  },
  {
    id: "POL-0006",
    text: "The worker's response to POL-0005 is not recorded as consent. Recorded fields are notice_version, language, delivered_at, delivery_mode, teach_back_result, worker_acknowledged, worker_continued, notice_deferred. A field named worker_consented_to_mandatory_reporting must never exist.",
    legal_status: "COUNSEL-CONTROLLED",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: true,
    depends_on_legal: ["POL-0001"],
    citation: null,
    review_due: null,
  },
  {
    id: "POL-0007",
    text: "A lightweight baseline privacy notice at session start, distinct from the POL-0005 criminal-reporting warning. Detector-failure fallback so ordinary onboarding is not opened with a criminal warning.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "POLICY-SETTLED",
    encodable: true,
    justification_speakable: true,
    depends_on_legal: [],
    citation: null,
    review_due: null,
  },

  // ---------------------------------------------------------------- Part D
  {
    id: "PAD-0001",
    text: "The machine must never output that trafficking has occurred, or that any person is a trafficker. Permitted alternative: SERIOUS_OFFENCE_INDICATORS_DETECTED with element-mapped facts, routed to human legal review.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0003"],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0002",
    text: "The machine must never output that conduct constitutes organised crime under BNS s.111. s.111 is removed from the classifier entirely.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0004"],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0003",
    text: "The machine must never output a verdict on an offer letter — genuine, verified, safe, approved, सुरक्षित, गारंटी, असली. Permitted: no_flags_found, needs_review, high_risk.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0004",
    text: "The machine must never output any legal classification of Blucollarz's own activity, or of whether a party requires RA registration.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0011"],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0005",
    text: "The machine must never output that a worker's information will not be reported, or any unconditional promise of confidentiality.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["POL-0001", "POL-0005"],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0006",
    text: "The machine must never state that a worker may or should pay a fee to Blucollarz, or that any Blucollarz service carries a charge. Workers pay ₹0.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0007",
    text: "The machine must never state that a Non-ECR/ECNR worker does not require a registered recruiting agent. Rejected at ingestion.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: ["LAW-0011"],
    citation: null,
    review_due: null,
  },
  {
    id: "PAD-0008",
    text: "The machine must never give an employment, visa, salary or placement guarantee. Banned lexicon. No exception for paraphrase.",
    legal_status: "NOT-A-LEGAL-CLAIM",
    policy_status: "PROHIBITED-AI-DETERMINATION",
    encodable: false,
    justification_speakable: false,
    depends_on_legal: [],
    citation: null,
    review_due: null,
  },
] as const;

const CLAIMS: ReadonlyMap<string, Claim> = new Map(
  CLAIM_LIST.map((claim) => [claim.id, claim]),
);

export function listClaims(): readonly Claim[] {
  return CLAIM_LIST;
}

/** An unclassified rule does not exist. */
export function getClaim(id: string): Claim {
  const claim = CLAIMS.get(id);
  if (!claim) {
    throw new Error(
      `Unknown claim "${id}". A rule that is not in the claims registry may not drive behaviour.`,
    );
  }
  return claim;
}

/**
 * Call before letting a claim drive production behaviour. Throws for anything
 * that is not encodable, so a counsel-controlled question cannot leak into
 * code by being referenced.
 */
export function assertEncodable(id: string): Claim {
  const claim = getClaim(id);
  if (!claim.encodable) {
    throw new Error(
      `Claim ${id} is not encodable (${claim.legal_status} / ${claim.policy_status}). It may not drive behaviour until counsel resolves it.`,
    );
  }
  return claim;
}
