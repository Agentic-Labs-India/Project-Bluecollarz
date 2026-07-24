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
    "Hire on autopilot with BlueCollarz AI — resume generation, communication & domain interviews, custom questions, JD writing, and verified KYC. Provisioned access for hiring teams.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "ai-ecosystem", label: "AI ecosystem" },
  { id: "autopilot", label: "Runs on autopilot" },
  { id: "who-you-hire", label: "Who you hire" },
  { id: "what-you-get", label: "What you get" },
  { id: "access", label: "How access works" },
  { id: "workspace", label: "Hiring workspace" },
  { id: "kyc", label: "KYC for hirers" },
  { id: "request-access", label: "Request access" },
];

export default function ForRecruitersPage() {
  return (
    <DocPage
      eyebrow="Programs document"
      title="For Recruiters"
      description="BlueCollarz is an AI hiring ecosystem — not a job board with chatbots bolted on. Resume generation, communication interviews, domain interviews, custom questions, and job descriptions run end-to-end on autopilot so your team reviews signal, not paperwork."
      updated="July 24, 2026"
      toc={TOC}
    >
      <DocSection id="overview" number="01" title="Overview">
        <p>
          Hiring blue-collar and skilled operational talent usually burns hours
          on resumes, phone screens, and inconsistent interview notes. BlueCollarz
          replaces that grind with a single AI stack: candidates build profiles,
          sit structured interviews, and answer your custom questions before you
          ever open a file. You shortlist from scored evidence — then AI KYC
          verifies identity when you select someone.
        </p>
        <DocCallout title="Provisioned hire access">
          <p>
            Recruiter accounts are provisioned by BlueCollarz — there is no public
            self-serve signup. Contact sales and we enable hire access for your
            company in the database.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="ai-ecosystem" number="02" title="The AI ecosystem">
        <p>
          One platform. Multiple agents. The same model fabric powers every step
          of the pipeline so quality stays consistent from first profile field to
          final shortlist.
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
              title: "AI KYC",
              body: "Document authenticity checks before storage. Hirers only see verified identity packs — not raw unverified uploads.",
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

      <DocSection id="autopilot" number="03" title="Runs on autopilot">
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
              body: "Select or reject from the sheet. Selected workers complete AI KYC; verified docs surface only after pass.",
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

      <DocSection id="who-you-hire" number="04" title="Who you hire here">
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
            "Selected candidates who can complete AI KYC for verified document sharing",
          ]}
        />
      </DocSection>

      <DocSection id="what-you-get" number="05" title="What you get in the workspace">
        <DocFeatureGrid
          items={[
            {
              title: "Role publishing",
              body: "Create jobs with pay, location, AI-assisted overview, and interview stages your domain agent grounds in.",
            },
            {
              title: "Applicant table",
              body: "Status, interview progress, and AI KYC Done badges when identity is verified.",
            },
            {
              title: "Applicant sheet",
              body: "Resume context, scores, summaries, strengths, recordings, transcripts, custom answers, and KYC previews.",
            },
            {
              title: "Select / reject",
              body: "Explicit status updates so workers know where they stand — no silent inbox limbo.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="access" number="06" title="How access works">
        <DocSteps
          steps={[
            {
              title: "Contact BlueCollarz",
              body: "Email sales or use Contact. Tell us company, locations, and hiring volume.",
            },
            {
              title: "We provision your account",
              body: "Hire access is granted by our team — not via a public signup button.",
            },
            {
              title: "Complete company profile",
              body: "Required before publishing roles so candidates see a real employer context.",
            },
            {
              title: "Post roles and review",
              body: "Publish openings, let the AI pipeline run, and shortlist from scored applicant files.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="workspace" number="07" title="Hiring workspace">
        <p>Once inside hire, your day-to-day loop looks like this:</p>
        <DocSteps
          steps={[
            {
              title: "Company profile",
              body: "Maintain company name, industry, size, location, and about text.",
            },
            {
              title: "Roles list",
              body: "Draft and publish openings; generate JD copy with AI when you need speed.",
            },
            {
              title: "Applicants for a role",
              body: "Open a role to review the applicant table with interview and KYC indicators.",
            },
            {
              title: "Applicant detail sheet",
              body: "Dive into one candidate: profile, interviews, recording, custom answers, KYC when verified.",
            },
            {
              title: "Decision",
              body: "Select or reject. Selected candidates are prompted toward KYC when required.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="kyc" number="08" title="KYC for hirers">
        <p>
          Identity documents are not a free-for-all upload. Order of operations:
          AI authenticity check first, storage only on pass, then recruiter
          visibility.
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
          When verified, you see an{" "}
          <strong className="text-foreground">AI KYC Done</strong> badge plus
          previews and the AI summary. Until then, documents stay hidden.
        </p>
      </DocSection>

      <DocSection id="request-access" number="09" title="Request access">
        <p>
          Ready to run hiring on autopilot with BlueCollarz? Tell us about your
          company and roles. We provision access and reply with onboarding steps.
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
