import { LoginButton } from "@/components/auth/login-button";
import {
  MarketingCta,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";

export const metadata = {
  title: "For RAs · Gulf Path",
  description:
    "How research assistants and agents work with Gulf Path pipelines and deployments.",
};

export default function ForRaPage() {
  return (
    <MarketingPage
      eyebrow="Programs"
      title="For RAs"
      description="Gulf Path’s agent workspace is for research assistants and operators who help run pipelines, review work, and support deployments."
    >
      <MarketingSection title="What RAs do here">
        <p>
          RAs use a dedicated agents area to stay close to operational work —
          tracking pipelines, coordinating reviews, and supporting the systems
          that keep hiring and evaluation moving.
        </p>
      </MarketingSection>

      <MarketingSection title="How to get started">
        <p>
          If you already have RA access, sign in with your Gulf Path agent
          account. If you need access, contact us and we’ll guide the next step.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <LoginButton
            profileType="agents"
            className="bg-primary text-primary-foreground hover:bg-primary-active inline-flex items-center justify-center rounded-md px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Sign in as RA
          </LoginButton>
          <MarketingCta href="/contact">Contact us</MarketingCta>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
