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
  title: "About · BlueCollarz",
  description:
    "About BlueCollarz — AI-native hiring for blue-collar workers and the teams that hire them worldwide.",
};

const TOC = [
  { id: "who-we-are", label: "Who we are" },
  { id: "what-we-build", label: "What we build" },
  { id: "who-its-for", label: "Who it’s for" },
  { id: "how-hiring-works", label: "How hiring works" },
  { id: "ai-capabilities", label: "AI capabilities" },
  { id: "identity-kyc", label: "Identity & KYC" },
  { id: "where-we-operate", label: "Where we operate" },
  { id: "principles", label: "Principles" },
  { id: "next-steps", label: "Next steps" },
];

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="Company document"
      title="About BlueCollarz"
      description="BlueCollarz is AI-native hiring infrastructure for blue-collar workers searching for dream jobs around the world — and for recruiters who need clearer signal before they hire."
      updated="July 19, 2026"
      toc={TOC}
    >
      <DocSection id="who-we-are" number="01" title="Who we are">
        <p>
          BlueCollarz connects skilled people with hiring teams through
          structured profiles, AI-assisted interviews, and identity checks. We
          exist so a welder in Bihar, an electrician in Manila, or a driver in
          Lagos can pursue serious roles in Dubai, Doha, Riyadh, and beyond —
          with a fairer process than a resume alone.
        </p>
        <p>
          The product is built around two account types.{" "}
          <strong className="text-foreground">Candidates (work)</strong>{" "}
          onboard, explore roles, interview, apply, and verify identity when
          selected. <strong className="text-foreground">Recruiters (hire)</strong>{" "}
          publish roles, review scored applicants, select or reject, and see
          verified KYC documents only after AI verification passes.
        </p>
        <DocCallout title="Plain definition">
          <p>
            We are not a white-collar AI labeling marketplace. We are a hiring
            platform for trades and skilled operational roles — with AI that
            helps workers show ability and helps employers decide with evidence.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="what-we-build" number="02" title="What we build">
        <p>
          The platform covers the full loop from first sign-in to a
          decision-ready applicant file:
        </p>
        <DocFeatureGrid
          items={[
            {
              title: "Profiles that travel",
              body: "Voice-guided onboarding and optional resume PDF extraction into a structured candidate profile.",
            },
            {
              title: "Role discovery",
              body: "Published jobs with pay, location, and clear stages — cached for fast browsing on landing and explore.",
            },
            {
              title: "AI interviews",
              body: "Communication and domain interviews with scores, summaries, transcripts, and screen recordings.",
            },
            {
              title: "Verified identity",
              body: "AI KYC on Aadhaar, PAN, and passport — documents stored only after authenticity checks pass.",
            },
          ]}
        />
        <p>
          Auth uses Google via Better Auth, with profile-scoped access so work
          and hire surfaces stay separated. AI runs through the Vercel AI
          Gateway; voice interviews use Sarvam for speech-to-text and
          text-to-speech.
        </p>
      </DocSection>

      <DocSection id="who-its-for" number="03" title="Who it’s for">
        <p>
          <strong className="text-foreground">Workers:</strong> electricians,
          welders, drivers, technicians, facility staff, construction crews,
          hospitality teams, machine operators, and related trades looking for
          better pay, clearer placements, and honest requirements.
        </p>
        <p>
          <strong className="text-foreground">Hiring teams:</strong> facilities,
          construction, logistics, hospitality, and industrial employers who
          need crews they can evaluate beyond a PDF — with communication and
          domain signal before shortlisting.
        </p>
        <DocTable
          headers={["Profile", "Who", "Where they start"]}
          rows={[
            [
              "work",
              "Candidate / worker",
              "Landing “Start working” → onboarding → home",
            ],
            [
              "hire",
              "Recruiter / company",
              "For Recruiters → invite access → roles workspace",
            ],
          ]}
        />
      </DocSection>

      <DocSection id="how-hiring-works" number="04" title="How hiring works">
        <p className="text-foreground font-medium">For candidates</p>
        <DocSteps
          steps={[
            {
              title: "Sign in as work",
              body: "Google OAuth creates or opens a candidate profile.",
            },
            {
              title: "Finish AI onboarding",
              body: "Optional resume PDF plus a voice agent that collects missing profile fields.",
            },
            {
              title: "Explore and interview",
              body: "Browse published roles, complete communication then domain AI interviews for a role.",
            },
            {
              title: "Apply",
              body: "Submit an application once interview stages for that role are done.",
            },
            {
              title: "KYC if selected",
              body: "When a recruiter selects you, complete AI KYC so verified documents can be shared.",
            },
          ]}
        />
        <p className="text-foreground pt-2 font-medium">For recruiters</p>
        <DocSteps
          steps={[
            {
              title: "Sign in as hire",
              body: "Access is invite-based — we share a private link rather than open self-serve signup.",
            },
            {
              title: "Complete company profile",
              body: "Company details required before posting roles.",
            },
            {
              title: "Publish roles",
              body: "Create jobs with overview, pay, location, and interview expectations.",
            },
            {
              title: "Review applicants",
              body: "See resume context, interview scores, recordings, transcripts, and KYC when verified.",
            },
            {
              title: "Select or reject",
              body: "Move candidates forward with status updates the worker can see on their dashboard.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="ai-capabilities" number="05" title="AI capabilities">
        <p>
          AI is used where it reduces friction or increases signal — not to
          replace human hiring judgment.
        </p>
        <DocTable
          headers={["Capability", "What it does"]}
          rows={[
            [
              "Onboarding agent",
              "Voice-guided profile setup with tools to save structured fields",
            ],
            [
              "Resume extraction",
              "Reads a PDF in memory and fills the profile; PDF is not stored in Blob",
            ],
            [
              "Communication interview",
              "Scores clarity, fluency, confidence, and professionalism",
            ],
            [
              "Domain interview",
              "Role-aware questions grounded in the job overview",
            ],
            [
              "KYC verification",
              "Vision checks for authenticity and tampering before storage",
            ],
          ]}
        />
        <DocCallout title="Interview device rules">
          <p>
            Live interviews require a laptop, tablet, or PC — not a phone —
            because candidates must share their entire screen, keep the camera
            on, and stay in a quiet room alone for the session.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="identity-kyc" number="06" title="Identity & KYC">
        <p>
          When a candidate is selected, they complete AI KYC. Aadhaar front and
          back are required. PAN and Passport may be deferred with a
          submit-later undertaking. Documents must match the logged-in profile
          name, date of birth, and address where those fields exist.
        </p>
        <DocList
          items={[
            "AI runs first — Blob upload happens only if verification passes",
            "Failed checks return reasons; nothing sensitive is stored on fail",
            "Recruiters see an “AI KYC Done” badge and document previews only after verified status",
            "Deferred PAN/Passport remain visible to hirers as pending later under undertaking",
          ]}
        />
      </DocSection>

      <DocSection id="where-we-operate" number="07" title="Where we operate">
        <p>
          BlueCollarz is rooted in Dubai, UAE, and built for cross-border talent
          pathways — especially from South Asia, Southeast Asia, and Africa into
          Gulf opportunity hubs and other global markets. Roles may be on-site
          or location-specific depending on the employer.
        </p>
        <p>
          The product language and interview experience are designed for
          practical spoken English, with voice tools tuned for clarity in
          real-world candidate environments.
        </p>
      </DocSection>

      <DocSection id="principles" number="08" title="Principles">
        <DocFeatureGrid
          items={[
            {
              title: "Skill over polish",
              body: "Workers should be judged on craft and communication — not on who wrote a fancy CV.",
            },
            {
              title: "Evidence over noise",
              body: "Interviews, recordings, and scores give hirers something concrete to review.",
            },
            {
              title: "Privacy with purpose",
              body: "Identity documents are checked by AI before storage and shown only when verified.",
            },
            {
              title: "Two-sided fairness",
              body: "Candidates get a clear path; recruiters get decision-ready files without open spam signup.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="next-steps" number="09" title="Next steps">
        <p>
          Whether you are looking for work or building a crew, start from the
          path that matches your role.
        </p>
        <DocCtaRow>
          <DocCta href="/">Find work</DocCta>
          <DocCta href="/for-recruiters" variant="secondary">
            Hire on BlueCollarz
          </DocCta>
          <DocCta href="/contact" variant="secondary">
            Contact us
          </DocCta>
        </DocCtaRow>
      </DocSection>
    </DocPage>
  );
}
