import {
  DocCallout,
  DocCta,
  DocCtaRow,
  DocFeatureGrid,
  DocList,
  DocPage,
  DocSection,
  DocSteps,
} from "@/components/landing/marketing-doc";

export const metadata = {
  title: "Mission · BlueCollarz",
  description:
    "BlueCollarz mission: open real pathways for blue-collar workers to find dream jobs worldwide.",
};

const TOC = [
  { id: "mission-statement", label: "Mission statement" },
  { id: "problem", label: "The problem" },
  { id: "what-we-change", label: "What we change" },
  { id: "for-workers", label: "For workers" },
  { id: "for-employers", label: "For employers" },
  { id: "how-we-operate", label: "How we operate" },
  { id: "success", label: "What success looks like" },
  { id: "commitments", label: "Commitments" },
];

export default function MissionPage() {
  return (
    <DocPage
      eyebrow="Company document"
      title="Our mission"
      description="Open real pathways for skilled blue-collar workers — from hometown trade to the job they have been working toward — with hiring teams who can evaluate skill, not just paperwork."
      updated="July 19, 2026"
      toc={TOC}
    >
      <DocSection id="mission-statement" number="01" title="Mission statement">
        <p className="text-foreground text-base font-medium leading-relaxed sm:text-lg">
          Help blue-collar workers find dream jobs worldwide, and help employers
          hire those workers with clearer proof of communication, domain fit,
          and identity.
        </p>
        <DocCallout title="Why this matters">
          <p>
            Cross-border hiring for trades still depends on noisy resumes, slow
            screening, and weak proof of how someone actually communicates or
            works. Our mission is to turn those gaps into a structured path both
            sides can trust.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="problem" number="02" title="The problem we are solving">
        <p>
          Millions of electricians, welders, drivers, technicians, and facility
          teams look for better work across borders every year. Too often they
          face:
        </p>
        <DocList
          items={[
            "Unclear job postings and shifting requirements",
            "Agencies or boards that never explain what “selected” means",
            "Little chance to show spoken communication or practical judgment",
            "Identity checks that feel opaque or unsafe",
            "Employers flooded with applications and almost no signal",
          ]}
        />
        <p>
          On the employer side, hiring managers need crews quickly but cannot
          fly every shortlist candidate for a first conversation. They need
          portable evidence: how the person speaks, how they think about the
          role, and whether identity documents check out.
        </p>
      </DocSection>

      <DocSection id="what-we-change" number="03" title="What we change">
        <DocFeatureGrid
          items={[
            {
              title: "Structured profiles",
              body: "Onboarding collects trade, experience, skills, and residence details in a form employers can actually use.",
            },
            {
              title: "Interview evidence",
              body: "Communication and domain AI interviews produce scores, summaries, transcripts, and recordings.",
            },
            {
              title: "Honest stages",
              body: "Workers see applied / selected / rejected. Recruiters act with explicit status, not silence.",
            },
            {
              title: "Verified identity",
              body: "KYC runs AI authenticity checks before storage and only then surfaces documents to hirers.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="for-workers" number="04" title="Mission for workers">
        <p>
          A strong hands-on worker deserves a fair shot — whether they start in
          Delhi, Dhaka, Kathmandu, Manila, Nairobi, or Lagos. Our mission for
          candidates is concrete:
        </p>
        <DocSteps
          steps={[
            {
              title: "Make getting started possible without a perfect CV",
              body: "Voice onboarding and optional PDF resume extraction reduce the paperwork barrier.",
            },
            {
              title: "Let skill show up in interviews",
              body: "Speak naturally. Pause, answer, and be scored on clarity and role judgment — not typing speed.",
            },
            {
              title: "Keep the funnel readable",
              body: "Know which interviews remain, when you applied, and whether you were selected.",
            },
            {
              title: "Protect identity while unlocking trust",
              body: "Complete KYC when selected; documents are checked before they are stored or shown.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="for-employers" number="05" title="Mission for employers">
        <p>
          Recruiters should spend time on the right people, not sorting noise.
          Our mission for hiring teams:
        </p>
        <DocList
          items={[
            "Publish roles with pay, location, and a real overview the domain interview can use",
            "Review applicants with communication and domain scores side by side",
            "Watch recordings and read transcripts when a score needs context",
            "Select or reject with a clear status the candidate can see",
            "Open verified KYC only after AI passes — not as an unchecked upload dump",
          ]}
        />
        <DocCallout title="Access model">
          <p>
            Hire accounts are invite-based. We share private access rather than
            open self-serve recruiter signup, so the applicant pool stays tied
            to serious hiring teams.
          </p>
        </DocCallout>
      </DocSection>

      <DocSection id="how-we-operate" number="06" title="How we operate day to day">
        <p>
          Mission shows up in product defaults. Interviews require full screen
          share and a larger device so the session is harder to fake. KYC
          refuses storage when documents look inauthentic or mismatched to the
          profile. Published roles are cached for performance so workers can
          browse quickly on slow connections. Voice uses Sarvam STT/TTS so
          spoken English in real environments stays usable.
        </p>
        <p>
          We will keep choosing the path that increases trust even when it adds
          friction — because dream jobs require both opportunity and integrity.
        </p>
      </DocSection>

      <DocSection id="success" number="07" title="What success looks like">
        <DocFeatureGrid
          items={[
            {
              title: "For a worker",
              body: "A clearer offer path: profile complete, interviews done, application visible, KYC done when selected.",
            },
            {
              title: "For a family",
              body: "Steadier income from a role that matches the craft someone already knows how to do.",
            },
            {
              title: "For an employer",
              body: "Shorterlists with scores and recordings instead of guesswork from CVs alone.",
            },
            {
              title: "For the corridor",
              body: "Talent moves with proof — limited less by geography and more by readiness.",
            },
          ]}
        />
      </DocSection>

      <DocSection id="commitments" number="08" title="Commitments">
        <DocList
          items={[
            "Stay focused on blue-collar and skilled operational roles",
            "Keep candidate and recruiter experiences separate and purposeful",
            "Use AI for signal and speed — not for inventing candidate facts",
            "Never show KYC documents to hirers before verification passes",
            "Explain stages in plain language workers can follow",
          ]}
        />
        <DocCtaRow>
          <DocCta href="/">Start as a worker</DocCta>
          <DocCta href="/vision" variant="secondary">
            Read our vision
          </DocCta>
          <DocCta href="/about" variant="secondary">
            About the company
          </DocCta>
        </DocCtaRow>
      </DocSection>
    </DocPage>
  );
}
