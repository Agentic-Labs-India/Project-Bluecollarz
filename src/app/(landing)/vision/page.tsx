import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "Vision · BlueCollarz",
  description:
    "BlueCollarz’s vision for a trusted global talent network powered by structured evaluation.",
};

export default function VisionPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Our vision"
      description="A world where talent can move across borders with proof — not just promises."
    >
      <MarketingSection title="The future we’re building">
        <p>
          We envision BlueCollarz as the trusted layer between skilled people and
          the companies that need them: portable profiles, interview evidence,
          and hiring workflows that scale without losing judgment.
        </p>
      </MarketingSection>

      <MarketingSection title="Long-term direction">
        <p>
          Over time, that means tighter role matching, richer evaluation across
          communication and domain skill, and a network where opportunity is
          limited less by geography and more by readiness.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
