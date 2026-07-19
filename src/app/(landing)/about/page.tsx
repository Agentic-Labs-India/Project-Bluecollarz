import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "About · BlueCollarz",
  description:
    "BlueCollarz connects blue-collar workers with dream jobs worldwide through profiles, roles, and AI-assisted interviews.",
};

export default function AboutPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="About BlueCollarz"
      description="We help skilled blue-collar workers find serious work around the world — and help employers hire with clearer signal."
    >
      <MarketingSection title="What we build">
        <p>
          BlueCollarz is a hiring platform for tradespeople and the teams that
          need them. Workers build practical profiles, explore open roles, and
          complete short AI interviews. Hiring teams review applications with
          scores, summaries, and recordings — then decide who to move forward.
        </p>
      </MarketingSection>

      <MarketingSection title="Who it’s for">
        <p>
          Candidates in electrical, welding, driving, facilities, construction,
          hospitality, and related trades — plus organizations hiring reliable
          crews across the Gulf and other global hubs.
        </p>
      </MarketingSection>

      <MarketingSection title="Where we’re based">
        <p>
          BlueCollarz is rooted in Dubai, UAE, and built for cross-border talent
          pathways from South Asia, Africa, and Southeast Asia into opportunity
          markets worldwide.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
