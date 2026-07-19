import {
  DocCallout,
  DocContactCard,
  DocCta,
  DocCtaRow,
  DocFeatureGrid,
  DocList,
  DocPage,
  DocSection,
  DocSteps,
  DocTable,
} from "@/components/landing/marketing-doc";

export const metadata = {
  title: "Contact · BlueCollarz",
  description:
    "Contact BlueCollarz for support, recruiter access, partnerships, or press. Dubai-based hiring platform for blue-collar talent.",
};

const TOC = [
  { id: "how-to-reach-us", label: "How to reach us" },
  { id: "channels", label: "Channels" },
  { id: "support", label: "Support" },
  { id: "sales", label: "Sales & access" },
  { id: "press", label: "Press" },
  { id: "what-to-include", label: "What to include" },
  { id: "response-times", label: "Response times" },
  { id: "location", label: "Location" },
  { id: "related", label: "Related pages" },
];

export default function ContactPage() {
  return (
    <DocPage
      eyebrow="Company document"
      title="Contact"
      description="Reach BlueCollarz for product support, recruiter access, partnerships, or press. Use the channel that matches your request so we can route it correctly."
      updated="July 19, 2026"
      toc={TOC}
    >
      <DocSection id="how-to-reach-us" number="01" title="How to reach us">
        <p>
          BlueCollarz is a hiring platform for blue-collar workers and the teams
          that hire them. Most conversations start by email. Choose the inbox
          below — mixing support bugs into sales threads slows everyone down.
        </p>
        <DocCallout title="Quick split">
          <DocList
            items={[
              "Account or product problems → support@BlueCollarz.ai",
              "Recruiter access or hiring programs → gtm@BlueCollarz.ai",
              "Media and press → press@BlueCollarz.ai",
            ]}
          />
        </DocCallout>
      </DocSection>

      <DocSection id="channels" number="02" title="Channels">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DocContactCard
            title="Support"
            email="support@BlueCollarz.ai"
            body="Login issues, interview device problems, KYC failures, profile data questions, and product bugs."
            href="mailto:support@BlueCollarz.ai"
            cta="Email support"
          />
          <DocContactCard
            title="Sales & recruiter access"
            email="gtm@BlueCollarz.ai"
            body="Company access requests, hiring volume discussions, and onboarding for hire workspaces."
            href="mailto:gtm@BlueCollarz.ai?subject=Recruiter%20access%20request"
            cta="Request access"
          />
          <DocContactCard
            title="Press"
            email="press@BlueCollarz.ai"
            body="Media inquiries, briefing requests, and official statements about BlueCollarz."
            href="mailto:press@BlueCollarz.ai"
            cta="Email press"
          />
        </div>
      </DocSection>

      <DocSection id="support" number="03" title="Support">
        <p>
          Product and account help for candidates and provisioned recruiters
          goes to{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:support@BlueCollarz.ai"
          >
            support@BlueCollarz.ai
          </a>
          .
        </p>
        <p className="text-foreground font-medium">Common support topics</p>
        <DocFeatureGrid
          items={[
            {
              title: "Sign-in",
              body: "Google OAuth failures, wrong profile type (work vs hire), session loops.",
            },
            {
              title: "Onboarding",
              body: "Resume PDF parse issues, missing required fields, voice mic permissions.",
            },
            {
              title: "Interviews",
              body: "Camera/mic/screen-share requirements, empty recordings, device gate on phones.",
            },
            {
              title: "KYC",
              body: "Failed authenticity checks, deferred PAN/Passport undertaking, document mismatch to profile.",
            },
          ]}
        />
        <DocCallout title="Before you write support">
          <DocList
            items={[
              "Try another browser or allow camera/mic/screen permissions",
              "Confirm you are on laptop/tablet for interviews (not phone)",
              "Note the exact page URL and approximate time of the error",
              "Do not email full Aadhaar/PAN/passport numbers in plain text",
            ]}
          />
        </DocCallout>
      </DocSection>

      <DocSection id="sales" number="04" title="Sales & recruiter access">
        <p>
          Hire accounts are invite-based. There is no public “become a
          recruiter” signup. To hire on BlueCollarz, contact sales — we share a
          private access path for your team.
        </p>
        <DocSteps
          steps={[
            {
              title: "Email gtm@BlueCollarz.ai",
              body: "Subject line “Recruiter access request” helps routing.",
            },
            {
              title: "Describe your hiring need",
              body: "Roles, locations, and volume — see checklist below.",
            },
            {
              title: "Receive onboarding steps",
              body: "We reply with access instructions and profile completion guidance.",
            },
            {
              title: "Publish and review",
              body: "Complete company profile, post roles, and use the applicant sheet.",
            },
          ]}
        />
        <DocCtaRow>
          <DocCta href="mailto:gtm@BlueCollarz.ai?subject=Recruiter%20access%20request">
            Email sales
          </DocCta>
          <DocCta href="/for-recruiters" variant="secondary">
            Recruiter program details
          </DocCta>
        </DocCtaRow>
      </DocSection>

      <DocSection id="press" number="05" title="Press">
        <p>
          Media inquiries:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:press@BlueCollarz.ai"
          >
            press@BlueCollarz.ai
          </a>
          . Include your outlet, deadline, and topic. For company background,
          see About, Mission, and Vision.
        </p>
      </DocSection>

      <DocSection id="what-to-include" number="06" title="What to include">
        <DocTable
          headers={["Request type", "Include"]}
          rows={[
            [
              "Support",
              "Account email, profile type (work/hire), URL, steps to reproduce, screenshots if safe",
            ],
            [
              "Recruiter access",
              "Company name, website, locations, role types, monthly volume, contact person",
            ],
            [
              "Press",
              "Outlet, journalist name, deadline, questions or angle",
            ],
          ]}
        />
      </DocSection>

      <DocSection id="response-times" number="07" title="Response times">
        <p>
          We aim to acknowledge business inquiries within two business days.
          Complex product investigations may take longer; include reproduction
          detail to speed things up. Urgent production outages for active hiring
          teams should say “urgent” in the subject and include your company
          name.
        </p>
        <DocList
          items={[
            "Sunday–Thursday business hours follow UAE working patterns",
            "We may ask for a screen recording for interview or KYC issues",
            "We will never ask you to paste full government ID numbers into email",
          ]}
        />
      </DocSection>

      <DocSection id="location" number="08" title="Location">
        <p>
          BlueCollarz is rooted in <strong className="text-foreground">Dubai, UAE</strong>,
          and built for cross-border hiring corridors into the Gulf and other
          global hubs. We do not publish a walk-in retail address for drop-in
          visits; commercial and support conversations run through email first.
        </p>
      </DocSection>

      <DocSection id="related" number="09" title="Related pages">
        <p>For product context before you write:</p>
        <DocCtaRow>
          <DocCta href="/about" variant="secondary">
            About
          </DocCta>
          <DocCta href="/mission" variant="secondary">
            Mission
          </DocCta>
          <DocCta href="/vision" variant="secondary">
            Vision
          </DocCta>
          <DocCta href="/for-recruiters" variant="secondary">
            For Recruiters
          </DocCta>
          <DocCta href="/privacy" variant="secondary">
            Privacy
          </DocCta>
        </DocCtaRow>
      </DocSection>
    </DocPage>
  );
}
