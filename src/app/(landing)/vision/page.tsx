import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "Vision · BlueCollarz",
  description:
    "BlueCollarz’s vision: blue-collar workers find dream jobs worldwide with fair, trusted hiring.",
};

export default function VisionPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Our vision"
      description="A world where skilled hands can cross borders with proof — and land the jobs they dream of."
    >
      <MarketingSection title="The future we’re building">
        <p>
          We envision BlueCollarz as the trusted bridge between blue-collar
          workers and the employers who need them: practical profiles, clear
          interview evidence, and hiring that respects craft — not just paper.
        </p>
      </MarketingSection>

      <MarketingSection title="Long-term direction">
        <p>
          Over time, that means better role matching for trades, safer
          placements, and a network where opportunity is limited less by
          geography and more by skill and readiness.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
