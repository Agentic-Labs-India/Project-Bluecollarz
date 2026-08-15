# Record of Processing Activities (RoPA)

Internal register — keep current. Feeds Schedule 5 of the RA Partnership Agreement.
Owner: Grievance Officer. Review cadence: quarterly (provisional).

| Activity | Data used | Purpose | Basis | Shared with | Retention |
| --- | --- | --- | --- | --- | --- |
| Onboarding & profile | Name, email, mobile, profile fields | Create account | Consent / contract | — | Account life |
| Identity verification | PAN, Aadhaar (masked), DigiLocker attrs, DOB | Verify identity; confirm age ≥ 18 | Consent | RA (for placement) | Per law / account |
| Qualification check | Educational certs | Verify qualification | Consent | Employer (conclusion) | Per law |
| Background check | PCC (Passport Seva) | Background conclusion | Consent | Employer (conclusion) | Per law |
| Consent management | ConsentEvents (notice v1.1; voice_tap grant) | Prove lawful basis | Legal obligation | — | Long / immutable until erasure policy |
| Employer matching | Assurance conclusions + allowlisted resume fields (no contact/IDs) | Match to jobs | Consent (identity+contact for assurance) | Employer | Per law / application life |
| AI interviews | Transcript, scores, optional recording, custom answers | Evaluate candidates | Consent (`evaluation`) | Hirer for role **only if evaluation granted** | Until account delete / policy |
| Job publish / RA bind | Job id, `raRcNumber`, publish event | Placement audit trail | Legal obligation / contract | RA (when bound) | Per policy |
| Fraud detection | Journey events, signals | Protect workers | Legitimate use / legal | — | Per policy |
| Support | Ticket content, email | Support | Consent / contract | Support staff | Ticket life + policy |
| Analytics (optional) | Usage via GA | Improve product | Consent (opt-in) | Google | Per GA / withdraw |
| Rights requests | Request type, details, nominee | Honour DPDP rights | Legal obligation | Admin (notes internal) | Per policy / until erasure |

Collections: `ConsentEvents`, `RightsRequests`, `PlacementAuditEvents`, `Users.kyc` (fiduciary-only), hire APIs use Attribute Release Matrix (`src/lib/compliance/arm.ts`).
