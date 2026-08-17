import {
  DocCallout,
  DocFeatureGrid,
  DocList,
  DocPage,
  DocSection,
  DocSteps,
  DocTable,
} from "@/components/landing/marketing-doc";
import { RecruiterAccessForm } from "@/components/landing/recruiter-access-form";

export const metadata = {
  title: "For Recruiters · Blucollarz",
  description:
    "Join Blucollarz for the best AI hiring stack — resume generation, communication & domain interviews, custom questions, JD writing, and verified KYC. Request access for your hiring team.",
};

const TOC = [
  { id: "request-access", label: "Join Blucollarz" },
  { id: "overview", label: "Why Blucollarz" },
  { id: "ai-ecosystem", label: "AI ecosystem" },
  { id: "autopilot", label: "Runs on autopilot" },
  { id: "who-you-hire", label: "Who you hire" },
  { id: "what-you-get", label: "What you get" },
  { id: "access", label: "How access works" },
  { id: "workspace", label: "Hiring workspace" },
  { id: "kyc", label: "KYC for hirers" },
];

export default function ForRecruitersPage() {
  return (
    <DocPage
      eyebrow="For hiring teams"
      title="For Recruiters"
      description="Join for getting the best out of best — AI hiring on autopilot, from resume to shortlist. Request access below, then see why Blucollarz is built for how you hire."
      updated="August 10, 2026"
      toc={TOC}
    >
      <DocSection
        id="request-access"
        number="01"
        title="Join for the best out of best"
      >
        <p>
          Ready to run hiring on autopilot? Tell us about your company. We
          review every request and provision recruiter access when approved —
          then your team gets the full Blucollarz stack.
        </p>
        <RecruiterAccessForm />
      </DocSection>

      <DocSection id="overview" number="02" title="Why Blucollarz">
        <p>
          Hiring blue-collar and skilled operational talent usually burns hours
          on resumes, phone screens, and inconsistent interview notes.
          Blucollarz replaces that grind with a single AI stack: candidates
          build profiles, sit structured interviews, and answer your custom
          questions before you ever open a file. You shortlist from scored
          evidence. Identity is already verified with DigiLocker before they
          apply.
        </p>
        <DocCallout title="Provisioned hire access" variant="default">
          <p>
            Recruiter accounts are provisioned by Blucollarz — there is no
            public self-serve signup. Submit the form above; we enable hire
            access when approved.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="ai-ecosystem" number="03" title="The AI ecosystem">
        <p>
          One platform. Multiple agents. The same model fabric powers every step
          of the pipeline so quality stays consistent from first profile field
          to final shortlist.
        </p>
        <DocFeatureGrid
          items={[
            {
              title: "AI resume & profile",
              body: "Voice onboarding and resume extraction fill structured candidate profiles — skills, experience, education — without a recruiter chasing missing fields.",
            },
            {
              title: "AI Communication interview",
              body: "Scored live interviews for clarity, fluency, confidence, and professionalism — with summary, strengths, and a recording when the session completes.",
            },
            {
              title: "AI Domain interview",
              body: "Role-grounded questioning against your job overview so domain judgment is scored on the work you actually need, not generic trivia.",
            },
            {
              title: "Custom questions",
              body: "Your screening form — text, selects, yes/no, multi-select — frozen per interview so every applicant answers the same bank you designed.",
            },
            {
              title: "AI job description",
              body: "Generate industry-standard role overviews from a short brief. Publish-ready JD copy without a writing committee.",
            },
            {
              title: "DigiLocker KYC",
              body: "Candidates verify identity after onboarding, before they apply. Recruiters review applications as Submitted, Selected, or Rejected.",
            },
          ]}
        />
        <DocTable
          headers={["AI layer", "What it replaces"]}
          rows={[
            ["Resume / profile agent", "Manual data entry and incomplete CVs"],
            ["Communication interview", "First-round phone screens"],
            ["Domain interview", "Ad-hoc technical chats with uneven notes"],
            ["Custom questions", "Scattered Google Forms and email threads"],
            ["JD generator", "Blank-page writing and template hunting"],
            ["KYC vision checks", "Blind document dumps into shared drives"],
          ]}
        />
      </DocSection>

      <DocSection id="autopilot" number="04" title="Runs on autopilot">
        <p>
          The point of the stack is not “AI assists a human at every click.” It
          is that the pipeline moves without babysitting. Candidates advance
          through stages; scores land; your team opens decision-ready files.
        </p>
        <DocSteps
          steps={[
            {
              title: "You publish the role",
              body: "Title, pay, location, stages, and optional custom questions. AI can draft the overview so the JD is live in minutes.",
            },
            {
              title: "Candidates run the gauntlet",
              body: "Profile completion, communication, domain, and custom questions — in the order you configured — without a recruiter coordinating calendars.",
            },
            {
              title: "Evidence compounds",
              body: "Scores, summaries, transcripts, and recordings attach to the applicant automatically.",
            },
            {
              title: "You decide",
              body: "Select or reject from the sheet. Status is Submitted, Selected, or Rejected.",
            },
          ]}
        />
        <DocCallout title="Humans stay where judgment matters">
          <p>
            Autopilot handles collection, scoring, and verification. Your team
            still owns the hire call — with denser signal and far less ops
            overhead.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="who-you-hire" number="05" title="Who you hire here">
        <p>
          The candidate base is oriented around trades and operational roles —
          electricians, welders, drivers, technicians, facilities, construction,
          hospitality, and similar crafts — often seeking Gulf and other
          cross-border placements.
        </p>
        <DocList
          items={[
            "Workers who finished AI onboarding with structured profiles",
            "Applicants with communication, domain, and custom-question history on the role",
            "Candidates who finished onboarding and DigiLocker identity verification",
          ]}
        />
      </DocSection>

      <DocSection
        id="what-you-get"
        number="06"
        title="What you get in the workspace"
      >
        <DocFeatureGrid
          items={[
            {
              title: "Role publishing",
              body: "Create jobs with pay, location, AI-assisted overview, and interview stages your domain agent grounds in.",
            },
            {
              title: "Applicant table",
              body: "Status, interview progress, and scores. Application status is Submitted, Selected, or Rejected.",
            },
            {
              title: "Applicant sheet",
              body: "Resume context, scores, summaries, strengths, recordings, transcripts, and custom answers.",
            },
            {
              title: "Select / reject",
              body: "Explicit status updates so workers know where they stand — no silent inbox limbo.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="access" number="07" title="How access works">
        <DocSteps
          steps={[
            {
              title: "Request access",
              body: "Submit the form at the top with your company details.",
            },
            {
              title: "We review and provision",
              body: "When approved, hire access is enabled for your email — company profile is set from your request.",
            },
            {
              title: "Sign in and hire",
              body: "Sign in with Google using that email, then post roles and review scored applicants.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="workspace" number="08" title="Hiring workspace">
        <p>Once inside hire, your day-to-day loop looks like this:</p>
        <DocSteps
          steps={[
            {
              title: "Company profile",
              body: "Your approved request details — company, industry, size, country, and about — shown read-only.",
            },
            {
              title: "Roles list",
              body: "Draft and publish openings; generate JD copy with AI when you need speed.",
            },
            {
              title: "Applicants for a role",
              body: "Open a role to review the applicant table with interview scores.",
            },
            {
              title: "Applicant detail sheet",
              body: "Dive into one candidate: profile, interviews, recording, and custom answers.",
            },
            {
              title: "Decision",
              body: "Select or reject. Status is Submitted, Selected, or Rejected.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="kyc" number="09" title="Identity">
        <p>
          Candidates complete DigiLocker KYC after onboarding, before they
          browse roles. Identity is not a per-job step. Applicant status is
          Submitted, Selected, or Rejected.
        </p>
      </DocSection>
    </DocPage>
  );
}
