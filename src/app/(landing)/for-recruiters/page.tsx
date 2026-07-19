import { LoginButton } from "@/components/auth/login-button";
import {
  DocCallout,
  DocCta,
  DocCtaRow,
  DocFeatureGrid,
  DocList,
  DocPage,
  DocSection,
  DocSteps,
  DocTable,
} from "@/components/landing/marketing-doc";

export const metadata = {
  title: "For Recruiters · BlueCollarz",
  description:
    "Hire blue-collar talent on BlueCollarz — scored AI interviews, applicant sheets, and verified KYC. Invite access for hiring teams.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "who-you-hire", label: "Who you hire" },
  { id: "what-you-get", label: "What you get" },
  { id: "access", label: "How access works" },
  { id: "login", label: "Recruiter login" },
  { id: "workspace", label: "Hiring workspace" },
  { id: "applicant-file", label: "Applicant file" },
  { id: "kyc", label: "KYC for hirers" },
  { id: "operating-notes", label: "Operating notes" },
  { id: "request-access", label: "Request access" },
];

export default function ForRecruitersPage() {
  return (
    <DocPage
      eyebrow="Programs document"
      title="For Recruiters"
      description="Post roles, review AI interview scores and recordings, shortlist with clearer signal, and see verified KYC only after candidates pass identity checks. Hiring access is shared by our team."
      updated="July 19, 2026"
      toc={TOC}
    >
      <DocSection id="overview" number="01" title="Overview">
        <p>
          BlueCollarz helps hiring teams evaluate blue-collar and skilled
          operational candidates with structured evidence — not inbox noise.
          Workers complete profiles and AI interviews before or alongside
          apply; you review decision-ready applicant files and move people to
          selected or rejected.
        </p>
        <DocCallout title="Invite-only hire access">
          <p>
            Recruiter accounts are not open for public self-serve signup. If you
            already have access, use Recruiter login below. If you do not,
            contact us and we will share a private link for your company.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="who-you-hire" number="02" title="Who you hire here">
        <p>
          The candidate base is oriented around trades and operational roles —
          electricians, welders, drivers, technicians, facilities, construction,
          hospitality, and similar crafts — often seeking Gulf and other
          cross-border placements.
        </p>
        <DocList
          items={[
            "Candidates who finished AI onboarding and structured profiles",
            "Applicants with communication and domain interview history on the role",
            "Selected workers who can complete AI KYC for verified document sharing",
          ]}
        />
      </DocSection>

      <DocSection id="what-you-get" number="03" title="What you get">
        <DocFeatureGrid
          items={[
            {
              title: "Role publishing",
              body: "Create jobs with pay, location, overview, and interview stages your domain agent can ground in.",
            },
            {
              title: "Applicant table",
              body: "See status, interview progress, and AI KYC Done badges when identity is verified.",
            },
            {
              title: "Applicant sheet",
              body: "Resume context, scores, summaries, strengths, recordings, transcripts, and KYC previews.",
            },
            {
              title: "Select / reject",
              body: "Explicit status updates so workers know where they stand.",
            },
          ]}
        />
        <DocTable
          headers={["Interview stage", "What you learn"]}
          rows={[
            [
              "AI Communication",
              "Clarity, fluency, confidence, professionalism + summary",
            ],
            [
              "AI Domain",
              "Role-aware judgment against your job overview + summary",
            ],
          ]}
        />
      </DocSection>

      <DocSection id="access" number="04" title="How access works">
        <DocSteps
          steps={[
            {
              title: "Contact BlueCollarz",
              body: "Email sales or use Contact. Tell us company, locations, and hiring volume.",
            },
            {
              title: "Receive a private access path",
              body: "We share onboarding steps for hire-profile Google sign-in — not a public “become a hirer” form.",
            },
            {
              title: "Complete company profile",
              body: "Required before publishing roles so candidates see a real employer context.",
            },
            {
              title: "Post roles and review",
              body: "Publish openings, watch applications, and shortlist from the hire workspace.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="login" number="05" title="Recruiter login">
        <p>
          Already provisioned? Sign in with Google using your hire profile to
          open the roles workspace.
        </p>
        <div className="pt-1">
          <LoginButton
            profileType="hire"
            className="bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Recruiter login
          </LoginButton>
        </div>
        <p className="text-mute pt-2 text-xs">
          If Google sign-in fails or lands you on a candidate surface, your
          account may not have hire access yet — request it below.
        </p>
      </DocSection>

      <DocSection id="workspace" number="06" title="Hiring workspace">
        <p>Once inside hire, your day-to-day loop looks like this:</p>
        <DocSteps
          steps={[
            {
              title: "Company profile",
              body: "Maintain company name, industry, size, location, and about text.",
            },
            {
              title: "Roles list",
              body: "See your published and draft roles; create new openings from the workspace.",
            },
            {
              title: "Applicants for a role",
              body: "Open a role to review the applicant table with interview and KYC indicators.",
            },
            {
              title: "Applicant detail sheet",
              body: "Dive into one candidate: resume fields, interviews, recording, KYC when verified.",
            },
            {
              title: "Decision",
              body: "Select or reject. Selected candidates are prompted toward KYC when required.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="applicant-file" number="07" title="What’s in an applicant file">
        <DocList
          items={[
            "Profile and resume-structured fields collected during onboarding",
            "Application status and applied timestamp",
            "Communication interview analysis and optional recording/transcript",
            "Domain interview analysis grounded in your role overview",
            "AI KYC summary and document previews only when kycStatus is verified",
            "Notes when PAN/Passport were deferred under submit-later undertaking",
          ]}
        />
        <DocCallout title="Why interviews require screen share">
          <p>
            Candidates interview on laptop/tablet/PC with entire-screen share
            and camera on. That produces a recording you can review and raises
            the bar against trivial proxying.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="kyc" number="08" title="KYC for hirers">
        <p>
          Identity documents are not a free-for-all upload. The product order
          is: AI authenticity check first, Blob storage only on pass, then
          recruiter visibility.
        </p>
        <DocTable
          headers={["Document", "Notes"]}
          rows={[
            ["Aadhaar front + back", "Required for verification"],
            ["PAN", "May be deferred with undertaking"],
            ["Passport", "May be deferred with undertaking"],
          ]}
        />
        <p>
          When verified, you see an <strong className="text-foreground">AI KYC Done</strong>{" "}
          badge in the table and sheet, plus previews or links and the AI
          summary. Until then, documents stay hidden.
        </p>
      </DocSection>

      <DocSection id="operating-notes" number="09" title="Operating notes">
        <DocFeatureGrid
          items={[
            {
              title: "Published roles are cached",
              body: "Landing and explore lists refresh on a daily cache; publishing or editing updates the tag.",
            },
            {
              title: "Lean APIs",
              body: "Applicant and job endpoints are built for table + sheet workflows without heavy payloads.",
            },
            {
              title: "Google auth only",
              body: "Hire users sign in with Google under the hire profile type.",
            },
            {
              title: "Support path",
              body: "Product issues go to support; access and commercial questions go to sales.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="request-access" number="10" title="Request access">
        <p>
          Ready to hire with BlueCollarz? Tell us about your company and roles.
          We reply with the private link and onboarding steps.
        </p>
        <DocCallout title="What to include in your email">
          <DocList
            items={[
              "Company legal name and website",
              "Hiring locations and role types (e.g. electricians, drivers)",
              "Approximate monthly hiring volume",
              "Primary contact name and work email",
            ]}
          />
        </DocCallout>
        <DocCtaRow>
          <DocCta href="mailto:gtm@BlueCollarz.ai?subject=Recruiter%20access%20request">
            Email sales
          </DocCta>
          <DocCta href="/contact" variant="secondary">
            Contact page
          </DocCta>
          <DocCta href="/about" variant="secondary">
            About BlueCollarz
          </DocCta>
        </DocCtaRow>
      </DocSection>
    </DocPage>
  );
}
