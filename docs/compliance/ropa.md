# Record of Processing Activities (RoPA)

Internal register — keep current. Feeds Schedule 5 of the RA Partnership Agreement.
Owner: Grievance Officer. Review cadence: quarterly (provisional).

| Activity | Data used | Purpose | Basis | Shared with | Retention |
| --- | --- | --- | --- | --- | --- |
| Onboarding & profile | Name, email, mobile, profile fields | Create account | Consent / contract | — | Account life |
| Identity verification | PAN, Aadhaar (masked), DigiLocker attrs | Verify identity | Consent | RA (for placement) | Per law / account |
| Qualification check | Educational certs | Verify qualification | Consent | Employer (conclusion) | Per law |
| Background check | PCC (Passport Seva) | Background conclusion | Consent | Employer (conclusion) | Per law |
| Consent management | ConsentEvents | Prove lawful basis | Legal obligation | — | Long / immutable until erasure policy |
| Employer matching | Assurance conclusions only | Match to jobs | Consent | Employer | Per law / application life |
| AI interviews | Transcript, scores, optional recording | Evaluate candidates | Consent | Hirer for role | Until account delete / policy |
| Fraud detection | Journey events, signals | Protect workers | Legitimate use / legal | — | Per policy |
| Support | Ticket content, email | Support | Consent / contract | Support staff | Ticket life + policy |
| Analytics (optional) | Usage via GA | Improve product | Consent (opt-in) | Google | Per GA / withdraw |

Collections: `ConsentEvents`, `RightsRequests`, `Users.kyc` (fiduciary-only), hire APIs use Attribute Release Matrix (`src/lib/compliance/arm.ts`).
