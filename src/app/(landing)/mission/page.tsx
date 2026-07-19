import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "Mission · BlueCollarz",
  description:
    "BlueCollarz’s mission: help blue-collar workers find dream jobs worldwide.",
};

export default function MissionPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Our mission"
      description="Open real pathways for skilled workers — from hometown trade to the job they have been working toward."
    >
      <MarketingSection title="Why we exist">
        <p>
          Millions of electricians, welders, drivers, technicians, and facility
          teams look for better work across borders every year. Too often they
          face unclear postings, slow screening, and little chance to show what
          they can actually do. Our mission is to fix that path.
        </p>
      </MarketingSection>

      <MarketingSection title="What we believe">
        <p>
          Skill should travel. A strong hands-on worker in Delhi, Manila, Lagos,
          or Kathmandu deserves a fair shot at roles in Dubai, Doha, Riyadh, and
          beyond — with honest requirements and clear next steps.
        </p>
      </MarketingSection>

      <MarketingSection title="What success looks like">
        <p>
          Workers get roles that match their craft and ambition. Employers get
          candidates they can trust. Families see steadier income. That is the
          dream job promise BlueCollarz is built to keep.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
