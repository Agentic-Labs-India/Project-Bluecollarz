import {
  MarketingCta,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";

export const metadata = {
  title: "Contact · BlueCollarz",
  description: "Contact BlueCollarz for support, press, sales, or recruiter access.",
};

export default function ContactPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Contact"
      description="Reach the BlueCollarz team for product support, partnerships, press, or recruiter access."
    >
      <MarketingSection title="Support">
        <p>
          Product and account help:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:support@BlueCollarz.ai"
          >
            support@BlueCollarz.ai
          </a>
        </p>
      </MarketingSection>

      <MarketingSection title="Sales & recruiter access">
        <p>
          To hire on BlueCollarz, contact sales — we share a private access link
          rather than open self-serve signup for hirers.
        </p>
        <p>
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:gtm@BlueCollarz.ai?subject=Recruiter%20access%20request"
          >
            gtm@BlueCollarz.ai
          </a>
        </p>
        <div className="pt-2">
          <MarketingCta href="mailto:gtm@BlueCollarz.ai?subject=Recruiter%20access%20request">
            Request recruiter access
          </MarketingCta>
        </div>
      </MarketingSection>

      <MarketingSection title="Press">
        <p>
          Media inquiries:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:press@BlueCollarz.ai"
          >
            press@BlueCollarz.ai
          </a>
        </p>
      </MarketingSection>

      <MarketingSection title="Location">
        <p>Dubai, UAE</p>
      </MarketingSection>
    </MarketingPage>
  );
}
