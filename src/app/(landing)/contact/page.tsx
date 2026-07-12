import {
  MarketingCta,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";

export const metadata = {
  title: "Contact · Gulf Path",
  description: "Contact Gulf Path for support, press, sales, or recruiter access.",
};

export default function ContactPage() {
  return (
    <MarketingPage
      eyebrow="Company"
      title="Contact"
      description="Reach the Gulf Path team for product support, partnerships, press, or recruiter access."
    >
      <MarketingSection title="Support">
        <p>
          Product and account help:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:support@gulfpath.com"
          >
            support@gulfpath.com
          </a>
        </p>
      </MarketingSection>

      <MarketingSection title="Sales & recruiter access">
        <p>
          To hire on Gulf Path, contact sales — we share a private access link
          rather than open self-serve signup for hirers.
        </p>
        <p>
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:gtm@gulfpath.com?subject=Recruiter%20access%20request"
          >
            gtm@gulfpath.com
          </a>
        </p>
        <div className="pt-2">
          <MarketingCta href="mailto:gtm@gulfpath.com?subject=Recruiter%20access%20request">
            Request recruiter access
          </MarketingCta>
        </div>
      </MarketingSection>

      <MarketingSection title="Press">
        <p>
          Media inquiries:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:press@gulfpath.com"
          >
            press@gulfpath.com
          </a>
        </p>
      </MarketingSection>

      <MarketingSection title="Location">
        <p>Dubai, UAE</p>
      </MarketingSection>
    </MarketingPage>
  );
}
