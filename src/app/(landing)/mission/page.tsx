import { MarketingPage, MarketingSection } from "@/components/landing/marketing-page";

export const metadata = {
  title: "Mission · Gulf Path",
  description: "Gulf Path’s mission: organize human intelligence for the AI economy.",
};

export default function MissionPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Our mission"
      description="Make high-signal hiring accessible — for people who want better work, and teams who need better matches."
    >
      <MarketingSection title="Why we exist">
        <p>
          Global hiring still relies on noisy resumes, slow screening, and weak
          proof of communication or domain skill. Our mission is to turn those
          gaps into a clearer process: structured profiles, role-specific
          interviews, and decision-ready insight for hiring teams.
        </p>
      </MarketingSection>

      <MarketingSection title="What success looks like">
        <p>
          Candidates get a fair path to show ability. Companies get applicants
          they can evaluate with confidence. Both sides spend less time guessing
          and more time on the right conversations.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
