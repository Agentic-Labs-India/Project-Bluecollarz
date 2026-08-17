# Record of Processing Activities (RoPA)

Internal register — keep current. Feeds Schedule 5 of the RA Partnership Agreement.
Owner: Grievance desk. Review cadence: quarterly.

| Activity | Data used | Purpose | Basis | Shared with | Retention |
| --- | --- | --- | --- | --- | --- |
| Onboarding & profile | Name, email, mobile, profile fields | Create account | Consent / contract | — | Account life |
| Identity verification | PAN, Aadhaar (masked), DigiLocker attrs, DOB | Verify identity; confirm age ≥ 18 | Consent | RA (for placement) | Per law / account |
| Qualification check | Educational certs | Verify qualification | Consent | Employer (conclusion) | Per law |
| Background check | PCC (Passport Seva) | Background conclusion | Consent | Employer (conclusion) | Per law |
| Consent management | ConsentEvents (notice v1.2; voice_tap grant) | Prove lawful basis | Legal obligation | — | Long / immutable until erasure policy |
| Employer matching | Assurance conclusions + allowlisted resume fields (no contact/IDs) | Match to jobs | Consent (identity+contact for assurance) | Employer | Per law / application life |
| AI interviews | Transcript, scores, optional recording, custom answers | Evaluate candidates | Consent (`evaluation`) | Hirer for role **only if evaluation granted** | Until account delete / policy |
| Medical fitness | Appointment (center, time), fitness report files | Pre-placement fitness test | Consent (`medical`) | Admin medical desk only — **never the employer** | Until account delete / policy |
| Job publish / RA bind | Job id, `raRcNumber`, publish event | Placement audit trail | Legal obligation / contract | RA (when bound) | Per policy |
| Legal holds | Principal id, reason, case ref, placing admin | Preserve material under review | Legal obligation | — | Until released by a named admin |
| Support | Ticket content, email | Support | Consent / contract | Support staff | Ticket life + policy |
| Analytics (optional) | Usage via GA | Improve product | Consent (opt-in) | Google | Per GA / withdraw |
| Rights requests | Request type, details, nominee | Honour DPDP rights | Legal obligation | Admin (notes internal) | Per policy / until erasure |

Collections: `ConsentEvents`, `RightsRequests`, `PlacementAuditEvents`, `MedicalAppointments`, `LegalHolds`, `LegalSafetyCases`, `Users.kyc` (fiduciary-only), hire APIs use Attribute Release Matrix (`src/lib/compliance/arm.ts`).

Storage: interview recordings, medical reports, and company documents are private Vercel Blob objects with no shareable URL. They are readable only through `/api/blob/file`, which re-checks entitlement per request (`src/app/api/blob/file/route.ts`).

**Only list an activity here once it exists in code.** A register that claims processing the platform does not perform invites a regulator to ask for evidence that cannot be produced. Fraud/journey-signal detection was listed previously and has been removed because no such processing is implemented.
