import {
  MarketingCta,
  MarketingPage,
  MarketingSection,
} from "@/components/landing/marketing-page";

export const metadata = {
  title: "For Recruiters · BlueCollarz",
  description:
    "Hire on BlueCollarz — contact us for recruiter access. We share a private link when you’re ready.",
};

export default function ForRecruitersPage() {
  return (
    <MarketingPage
      eyebrow="Programs"
      title="For Recruiters"
      description="Post roles, review AI interview scores, and shortlist candidates — with hiring access shared by our team."
    >
      <MarketingSection title="What you can do">
        <ul className="list-disc space-y-2 ps-5">
          <li>Publish roles with pay, location, and interview stages.</li>
          <li>
            Review applicants with communication and domain interview scores,
            summaries, transcripts, and recordings.
          </li>
          <li>Select the people who fit — with clearer signal, faster.</li>
        </ul>
      </MarketingSection>

      <MarketingSection title="How access works">
        <p>
          Recruiter / hirer accounts are not open for self-serve signup on this
          site. If you’d like to hire through BlueCollarz, contact us and we’ll
          share a private access link for your team.
        </p>
        <div className="border-canvas-soft bg-muted/30 mt-4 space-y-3 rounded-none border p-5">
          <p className="text-foreground font-medium">
            Ready to hire with BlueCollarz?
          </p>
          <p>
            Email{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:gtm@gulfpath.com?subject=Recruiter%20access%20request"
            >
              gtm@gulfpath.com
            </a>{" "}
            or use the contact page. Tell us about your company and hiring needs
            — we’ll reply with the link and onboarding steps.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <MarketingCta href="/contact">Contact us</MarketingCta>
            <MarketingCta href="mailto:gtm@gulfpath.com?subject=Recruiter%20access%20request">
              Email sales
            </MarketingCta>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection title="What happens after">
        <p>
          Once you have access, you’ll complete your company profile, post
          roles, and manage candidates from your hiring workspace. Until then,
          there’s no public “become a hirer” signup on BlueCollarz.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
