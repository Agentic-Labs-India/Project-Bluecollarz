import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "About · BlueCollarz",
  description:
    "BlueCollarz connects skilled people with global opportunities through profiles, roles, and AI-assisted interviews.",
};

export default function AboutPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="About BlueCollarz"
      description="We organize human expertise so candidates and hiring teams can meet with clearer signal and less friction."
    >
      <MarketingSection title="What we build">
        <p>
          BlueCollarz is a hiring platform for candidates and companies. Candidates
          build verified profiles, explore roles, and complete AI-assisted
          interviews. Hiring teams review applications with structured scores,
          summaries, and recordings — then decide who to move forward.
        </p>
      </MarketingSection>

      <MarketingSection title="Who it’s for">
        <p>
          Candidates looking for serious remote and on-site opportunities, and
          organizations that want a tighter hiring loop with better context on
          communication and domain fit.
        </p>
      </MarketingSection>

      <MarketingSection title="Where we’re based">
        <p>
          BlueCollarz is rooted in Dubai, UAE, and built for cross-border talent
          pathways across the Gulf and beyond.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
