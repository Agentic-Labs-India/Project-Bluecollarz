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
  title: "Vision · BlueCollarz",
  description:
    "BlueCollarz vision: skilled hands cross borders with proof and land dream jobs worldwide.",
};

const TOC = [
  { id: "north-star", label: "North star" },
  { id: "future-of-work", label: "Future of blue-collar work" },
  { id: "portable-proof", label: "Portable proof" },
  { id: "corridors", label: "Global corridors" },
  { id: "product-direction", label: "Product direction" },
  { id: "trust-stack", label: "The trust stack" },
  { id: "what-we-will-not-do", label: "What we will not do" },
  { id: "join-the-path", label: "Join the path" },
];

export default function VisionPage() {
  return (
    <DocPage
      eyebrow="Company document"
      title="Our vision"
      description="A world where skilled hands can cross borders with proof — and land the jobs they dream of — while employers hire with confidence instead of guesswork."
      updated="July 19, 2026"
      toc={TOC}
    >
      <DocSection id="north-star" number="01" title="North star">
        <p className="text-foreground text-base font-medium leading-relaxed sm:text-lg">
          BlueCollarz becomes the trusted bridge between blue-collar workers and
          the employers who need them: practical profiles, interview evidence,
          and identity verification that respects craft.
        </p>
        <p>
          In that future, opportunity is limited less by passport stamps and
          more by readiness — the ability to show how you communicate, how you
          think about the work, and who you are.
        </p>
      </DocSection>

      <DocSection
        id="future-of-work"
        number="02"
        title="The future of blue-collar work"
      >
        <p>
          Global facilities, construction, logistics, and hospitality will keep
          needing people who can wire a building, weld a joint, drive a route,
          or run a site. The demand is not disappearing. What must change is the
          path into those jobs.
        </p>
        <DocFeatureGrid
          items={[
            {
              title: "From rumor to role",
              body: "Workers discover published openings with pay and location instead of opaque forwards.",
            },
            {
              title: "From CV theater to demonstrated skill",
              body: "Short AI interviews capture spoken answers and role judgment with recordings attached.",
            },
            {
              title: "From silence to status",
              body: "Applied, selected, and rejected are explicit states both sides can see.",
            },
            {
              title: "From paper copies to verified identity",
              body: "Documents are AI-checked before storage and only then shown to hirers.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="portable-proof" number="03" title="Portable proof">
        <p>
          We envision every serious candidate carrying a portable packet of
          proof: profile fields, interview scores, summaries, transcripts, and —
          when selected — verified KYC. That packet should travel with the
          worker across applications so they do not restart from zero every
          time.
        </p>
        <DocTable
          headers={["Proof layer", "What it shows a hirer"]}
          rows={[
            ["Profile", "Trade, experience, skills, location, authorization"],
            [
              "Communication interview",
              "Clarity, fluency, confidence, professionalism",
            ],
            ["Domain interview", "Fit against the actual job overview"],
            ["Recording + transcript", "How answers were given, not just a score"],
            ["KYC (when verified)", "Identity documents that passed AI checks"],
          ]}
        />
      </DocSection>

      <DocSection id="corridors" number="04" title="Global corridors">
        <p>
          Vision is geographic as well as product. BlueCollarz is rooted in
          Dubai and oriented around corridors where blue-collar mobility already
          happens — South Asia, Southeast Asia, and Africa into Gulf hubs and
          other markets that hire skilled crews.
        </p>
        <DocList
          items={[
            "Workers understand which roles are on-site and where",
            "Employers hire across borders with structured evaluation",
            "Families can plan around clearer timelines and statuses",
            "Language and voice tooling meet people where they already speak",
          ]}
        />
        <DocCallout title="Ambition with realism">
          <p>
            We are not promising visas or immigration outcomes. We are building
            the hiring layer that makes legitimate employer processes faster and
            fairer for skilled workers.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="product-direction" number="05" title="Product direction">
        <p>
          Over time, the vision expands along the same spine that exists today:
        </p>
        <DocSteps
          steps={[
            {
              title: "Tighter role matching for trades",
              body: "Help workers find openings that match tools, experience, and location preferences.",
            },
            {
              title: "Richer evaluation",
              body: "Keep communication and domain interviews role-aware, with clearer scoring explanations.",
            },
            {
              title: "Safer identity loops",
              body: "Continue AI-first KYC, deferred documents with undertaking, and recruiter visibility only after verify.",
            },
            {
              title: "Faster employer workflows",
              body: "Applicant tables, sheets, and status actions that keep hiring teams moving.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="trust-stack" number="06" title="The trust stack">
        <p>
          Long-term trust is a stack, not a slogan. Each layer exists for a
          reason:
        </p>
        <DocFeatureGrid
          items={[
            {
              title: "Auth",
              body: "Google sign-in with work vs hire separation so surfaces stay intentional.",
            },
            {
              title: "Voice + screen integrity",
              body: "Interviews on larger devices with entire-screen share to reduce proxying.",
            },
            {
              title: "AI scoring",
              body: "Structured scores and summaries recruiters can compare quickly.",
            },
            {
              title: "KYC gate",
              body: "Vision authenticity checks before Blob storage and before hirer access.",
            },
          ]}
        />
      </DocSection>

      <DocSection
        id="what-we-will-not-do"
        number="07"
        title="What we will not do"
      >
        <DocList
          items={[
            "Turn BlueCollarz into a generic white-collar job board",
            "Invent candidate experience or interview answers",
            "Expose identity documents before verification",
            "Open uncontrolled recruiter signup that floods workers with spam roles",
            "Hide application status behind silence",
          ]}
        />
      </DocSection>

      <DocSection id="join-the-path" number="08" title="Join the path">
        <p>
          If this vision matches the work you want — or the crews you need to
          hire — start on the side that fits you.
        </p>
        <DocCtaRow>
          <DocCta href="/">Find your dream job</DocCta>
          <DocCta href="/for-recruiters" variant="secondary">
            For recruiters
          </DocCta>
          <DocCta href="/mission" variant="secondary">
            Read the mission
          </DocCta>
        </DocCtaRow>
      </DocSection>
    </DocPage>
  );
}
