# DPDP and eMigrate posture

**This is not a legal opinion, not a certificate, and not counsel approval.**
It maps what the **code actually does** (18 Aug 2026) against published Indian
law and government systems. Blucollarz is a hiring platform. It is **not**
the eMigrate portal and it is **not** a Protector General of Emigrants
Recruiting Agent.

Primary sources used for this write-up:

| Source | What it is |
| --- | --- |
| [Digital Personal Data Protection Act, 2023](https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf) | Statute: notice (s.5), consent (s.6), children (s.9), rights and grievance (s.11–13), fiduciary duties |
| [MeitY explanatory note on the DPDP Rules, 2025](https://www.meity.gov.in/writereaddata/files/Explanatory-Note-DPDP-Rules-2025.pdf) | Official explanation of notice, Consent Manager, security, breach |
| DPDP Rules, 2025 (G.S.R. 846(E), notified 13 Nov 2025) | Phased commencement: Board now; Consent Managers (Rule 4) from **13 Nov 2026**; remaining substantive duties (Rules 3, 5–16, 22–23) from **13 May 2027** |
| [MEA: Recruiting Agents](https://www.mea.gov.in/ras) | Emigration Act, 1983 s.10: recruiting Indian citizens for employment abroad requires PGE registration |
| [MEA: Emigration abroad for employment](https://www.mea.gov.in/emigration-abroad-for-emp) | ECR passport + employment to currently **17** ECR countries needs PoE clearance. ECNR is the absence of an ECR endorsement, not a licence to skip an RA |
| [eMigrate](https://emigrate.gov.in/) | Government system linking PoE/PGE, Indian Missions, Foreign Employers, Recruiting Agents, Passport Sewa, Bureau of Immigration, and insurance |

---

## Scores (engineering, not legal)

| Lens | Score / 10 | Meaning |
| --- | ---: | --- |
| Product (onboarding, auth, UX, security, DPDP *controls*, spec) | **7.9** | Mean of 7.7 / 8.0 / 7.8 / 8.0 / 8.2 / 7.5. One-sitting KYC consent. See the audit canvas. |
| DPDP *engineering readiness* | **7.0** | Controls exist for consent, purposes, rights, age gate, private storage. Access export is a JSON package, not every blob. Not a Board filing, not Rule 3-complete, not a 2027 attestation. |
| Emigration Act *safety rails* | **8.0** | The machine is forbidden from pretending Blucollarz is an RA, from charging workers, and from “ECNR = no agent”. |
| Licensed-RA operating model (this product’s actual scope) | **7.5** | KYC, verified companies, verified candidates, optional RA RC bind. eMigrate stays with the registered RA. Not scored as an eMigrate clone. |

**eMigrate as a substitute is not a product requirement.** Do not treat a missing eMigrate API as a failure of this repo.

---

## DPDP — what the statute and Rules require vs what we ship

Substantive notice, consent, rights, security, and breach duties in the Rules
are scheduled to apply **13 May 2027**. Building them now is preparation, not
a claim that the Board has assessed us.

### Notice and consent (Act s.5–s.6; Rules Rule 3)

**Required (plain reading):** a **standalone** notice in clear language;
itemised personal data; specific purpose and what that processing enables;
a link to withdraw consent (as easy as giving it), exercise rights, and
complain to the Data Protection Board; option to access the notice in English
**or any Eighth Schedule language**. If processing is challenged, the fiduciary
must **prove** notice was given and consent was given (s.6(10)).

**In code:**

- Public `/privacy` is written as a standalone DPDP notice (v1.4).
- In-app notice is one sitting before DigiLocker: identity, contact,
  evaluation, and medical as **separate switches**. Passport, PCC, and
  educational certificates are not collected.
- Grant requires a server-issued `playbackId` from
  `POST /api/candidate/consent/playback`. A client `voice_tap` flag is not
  enough. Ledger is append-only `ConsentEvents`.
- Withdrawal is a Settings button (easier than grant, which is what s.6(4)
  asks for). Withdrawing medical cancels a scheduled appointment.
- Rights queue: access, correction, erasure, nomination, grievance.
- Grievance contact is on `/grievance`. Env defaults: ack 72h, resolve 90 days
  (Rules grievance window).

**Gaps (do not paper over):**

- Spoken/on-screen consent copy is **English**. TTS has Indian locales; the
  notice itself is not an Eighth Schedule localisation of Rule 3 content.
- The short TTS notice is not a full **itemised** Rule 3 notice (data items,
  purposes, goods/services, Board complaint link). The long form is `/privacy`.
- Playback proves this device requested **our** official wording. It does **not**
  prove the worker heard it to the end. That is not s.6(10) courtroom proof.
- Breach admin UI drafts notices. It does **not** send a 72-hour report to the
  Board. Do not tell a regulator it does.

### Children (Act s.9; Rules Rule 10)

**Required:** verifiable parental consent before processing a child’s data,
or do not process children.

**In code:** the product refuses under-18 (DigiLocker DOB / profile age). We
do **not** offer parental-consent onboarding. That is the correct product
stance for overseas hiring.

**Gap:** Google sign-in can still create a session before DigiLocker DOB is
known. The first-paint banner requires Accept All Cookies or Cookies Settings
→ Accept (Terms, Privacy, 18+) before Log in / Get Started (Reject All blocks
OAuth). That is not verifiable parental consent and a minor can still click
Accept. Commitment APIs
(`requireCandidateAppReady`) still need KYC, which rejects minors.

### Storage, minimisation, erasure

**In code:** private Vercel Blob; `/api/blob/file` re-authorises every read;
hirers never see medical reports; `toHireSafeProfile` strips identity fields;
legal hold blocks delete while a serious-offence case is open; hold lifts on
“no statutory trigger”.

**Gap:** retention “48 hours before erasure” notice (Rules Rule 8) is not an
automated worker-facing countdown. RoPA is an internal register
(`docs/compliance/ropa.md`), not a Board filing.

### Honest DPDP line

The software is **built toward** DPDP 2023 / Rules 2025: purposes, unbundled
medical, rights, grievance, age refusal, private health/video storage. It is
**not** “DPDP certified”, **not** Rule 3 complete in every language, and
**not** a substitute for a DPO/counsel programme before 13 May 2027.

---

## eMigrate / Emigration Act — what the government system is vs what we are

**eMigrate** (`https://emigrate.gov.in`) is the MEA computerised system for
emigration clearance. It connects Protectors of Emigrants, the PGE, Indian
Missions, Foreign Employers, Recruiting Agents, Passport Sewa, and Bureau of
Immigration. ECR passport holders going to the currently notified ECR countries
**for employment** need PoE clearance through that system. MEA currently
lists **17** such countries. Airport immigration checks it. ECNR is not
printed as a stamp; passports without an ECR endorsement are ECNR.

**Emigration Act, 1983 s.10:** a person who wishes to recruit Indian citizens
for employment abroad must register with the PGE and hold an RC.

**Intended operating model:** Blucollarz is the KYC / verified-company /
verified-candidate layer. PGE-registered Recruiting Agents work **with** the
platform and file on eMigrate themselves. This app is not required to clone
eMigrate, raise demands, or grant PoE clearance.

**This repo therefore does not (and need not):**

- Be the eMigrate portal or call an eMigrate API
- Register anyone as a Recruiting Agent (the RA already holds the RC)
- Accredit a Foreign Employer with an Indian Mission
- File emigration clearance or PBBY

**This repo does:**

- Store an optional `raRcNumber` on a job so a licensed RA can be bound
  (Model 2). The field is **optional text**, not a live PGE lookup.
- Run DigiLocker KYC and a pre-employment medical desk. That is not eMigrate
  medical / PBBY.
- Block the model from saying Blucollarz is an RA, from charging workers, and
  from “ECNR = no agent” (PAD-0004, PAD-0006, PAD-0007).

**Remaining ops/engineering gaps for this model (not “build eMigrate”):**

- Publishing a role does not require an RA RC. If the commercial rule is
  “every overseas job has a registered RA”, that is not enforced in code yet.
- `raRcNumber` is not checked against the PGE list. A typo or a fake RC still
  saves.
- Counsel still has to confirm, per placement, that Blucollarz’s own activity
  is “platform / KYC” and not “recruitment” under the Emigration Act. That
  analysis is **not encoded as law** in the product.

### Honest eMigrate line

The software is **not** an eMigrate substitute and **does not need to be**.
The registered RA uses eMigrate. Blucollarz’s job is identity, company
verification, candidate verification, and not lying to workers about agents
or fees. Calling the product “eMigrate compliant” is still the wrong phrase.
The correct claim is: **clearance stays with the licensed RA; this app does
not impersonate that RA.**

---

## What “best suitable” actually means

Suitable as:

- A candidate → KYC → interview → apply → medical → hire-review product
- A Data Fiduciary **engineering** stack to prepare for DPDP Rules (May 2027)
- A platform that **will not** tell a worker the wrong thing about RA / fees /
  offer letters

Not suitable as:

- A PGE licence or an eMigrate client (those stay with the registered RA)
- A legal opinion that the platform can skip licensed agents
- A 10/10 DPDP attestation

---

## Code map (for auditors)

| Topic | Where |
| --- | --- |
| Consent purposes, medical unbundled | `src/lib/compliance/consent.ts` |
| Official notice text | `src/lib/compliance/consent-notices.ts` |
| Playback ticket | `src/lib/compliance/consent-playback.ts` |
| Hire minimisation | `src/lib/compliance/arm.ts` |
| Rights export | `src/lib/compliance/rights.ts` |
| RoPA | `docs/compliance/ropa.md` |
| Age refusal | `src/lib/candidate/profile.ts`, DigiLocker KYC |
| Private files | `src/app/api/blob/file/route.ts` |
| KYC on apply/interview/medical | `src/lib/auth/candidate-guard.ts` |
| PAD / RA / ECNR blocks | `src/lib/legal-safety/lexicon.ts`, `registry.ts` |
| Tests | `test/legal-safety/`, `test/compliance/` |
| RA RC field | `src/components/hire/job-form.tsx` (`raRcNumber`) |

Review this file when the notice version, Blob access model, or emigration
product scope changes.
