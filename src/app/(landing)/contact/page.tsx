import {
  DocCallout,
  DocContactCard,
  DocCta,
  DocCtaRow,
  DocFeatureGrid,
  DocFigure,
  DocList,
  DocPage,
  DocSection,
  DocSteps,
  DocTable,
} from "@/components/landing/marketing-doc";

export const metadata = {
  title: "Contact · Blucollarz",
  description:
    "Get Blucollarz support via the in-app Help agent, or contact sales and press. Hyderabad-based hiring platform for blue-collar talent.",
};

const TOC = [
  { id: "how-to-reach-us", label: "How to reach us" },
  { id: "channels", label: "Channels" },
  { id: "in-app-help", label: "In-app Help" },
  { id: "support", label: "Support email" },
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
      title="Contact"
      description="Product problems are handled inside the app by Help — our AI support agent that can open a ticket for the team. Use email for sales, press, or if you cannot sign in."
      updated="July 24, 2026"
      toc={TOC}
    >
      <DocSection id="how-to-reach-us" number="01" title="How to reach us">
        <p>
          Blucollarz is a hiring platform for blue-collar workers and the teams
          that hire them. For product or account issues while you are signed in,
          start with <strong className="text-foreground">in-app Help</strong> —
          not email. Help already knows your profile type (candidate, recruiter,
          or admin), walks through the problem, and can create a support ticket
          for our team.
        </p>
        <DocCallout title="Quick split">
          <DocList
            items={[
              "Signed-in product / account problems → open Help in the app (preferred)",
              "Cannot sign in, or Help is unavailable → support@blucollarz.com",
              "Recruiter access or hiring programs → gtm@blucollarz.com",
              "Media and press → press@blucollarz.com",
            ]}
          />
        </DocCallout>
      </DocSection>

      <DocSection id="channels" number="02" title="Channels">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DocContactCard
            title="Support (fallback email)"
            email="support@blucollarz.com"
            body="Use only if you cannot sign in. Prefer in-app Help for bugs, interviews, KYC, and profile issues while logged in."
            href="mailto:support@blucollarz.com"
            cta="Email support"
          />
          <DocContactCard
            title="Sales & recruiter access"
            email="gtm@blucollarz.com"
            body="Company access requests, hiring volume discussions, and onboarding for hire workspaces."
            href="mailto:gtm@blucollarz.com?subject=Recruiter%20access%20request"
            cta="Request access"
          />
          <DocContactCard
            title="Press"
            email="press@blucollarz.com"
            body="Media inquiries, briefing requests, and official statements about Blucollarz."
            href="mailto:press@blucollarz.com"
            cta="Email press"
          />
        </div>
      </DocSection>

      <DocSection id="in-app-help" number="03" title="In-app Help (preferred)">
        <p>
          After you sign in with Google, use the Help control in the left rail
          (desktop) — it sits just above cookie preferences. Help opens a chat
          where you describe the problem. The agent clarifies what is wrong,
          offers to open a ticket, asks if you want to add anything else, then
          files a structured ticket for admins (summary, issue category,
          seriousness, priority, and the chat transcript).
        </p>
        <DocSteps
          steps={[
            {
              title: "Sign in",
              body: "Use Google on Blucollarz so Help can attach your account, email, and profile type (candidate, recruiter, or admin).",
            },
            {
              title: "Open Help",
              body: "In the left rail, click the Help (?) control above Cookies. On smaller screens, open the same control from the app chrome where Help appears.",
            },
            {
              title: "Describe the problem",
              body: "Say what you were doing, what went wrong, and the page you were on. Answer any short clarifying questions.",
            },
            {
              title: "Confirm the ticket",
              body: "When Help offers to create a ticket, accept. If it asks “anything else?”, add notes or say no. You should get a ticket id confirmation.",
            },
          ]}
        />
        <div className="grid gap-4 sm:gap-5">
          <DocFigure
            src="/images/support/1.png"
            alt="Screenshot highlighting where to click Help in the Blucollarz left rail"
            caption="1 — Where to click: the Help control in the left rail (above Cookies)."
          />
          <DocFigure
            src="/images/support/2.png"
            alt="Screenshot of the Blucollarz Help chat dialog after it opens"
            caption="2 — What opens: the Help chat. Describe your issue and let the agent create a ticket when ready."
          />
        </div>
        <DocCallout title="What you need to do">
          <DocList
            items={[
              "Be signed in before opening Help",
              "Describe the real problem in your own words — Help will ask follow-ups",
              "Agree to a ticket when offered if you need human follow-up",
              "Keep the ticket id from Help’s confirmation if you contact us later",
              "Do not paste full Aadhaar / PAN / passport numbers into the chat",
            ]}
          />
        </DocCallout>
      </DocSection>

      <DocSection id="support" number="04" title="Support email">
        <p>
          If you cannot reach Help (for example sign-in is broken), email{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:support@blucollarz.com"
          >
            support@blucollarz.com
          </a>
          . Prefer Help whenever you are signed in so tickets include your
          transcript and profile automatically.
        </p>
        <p className="text-foreground font-medium">Common support topics</p>
        <DocFeatureGrid
          items={[
            {
              title: "Sign-in",
              body: "Google OAuth failures, unexpected redirects, session loops.",
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
        <DocCallout title="Before you write support email">
          <DocList
            items={[
              "Try in-app Help first if you can sign in",
              "Try another browser or allow camera/mic/screen permissions",
              "Confirm you are on laptop/tablet for interviews (not phone)",
              "Note the exact page URL and approximate time of the error",
              "Do not email full Aadhaar/PAN/passport numbers in plain text",
            ]}
          />
        </DocCallout>
      </DocSection>

      <DocSection id="sales" number="05" title="Sales & recruiter access">
        <p>
          Hire accounts are provisioned by Blucollarz. There is no public
          “become a recruiter” signup. To hire on Blucollarz, contact sales —
          we enable hire access for your team from the admin console.
        </p>
        <DocSteps
          steps={[
            {
              title: "Email gtm@blucollarz.com",
              body: "Subject line “Recruiter access request” helps routing.",
            },
            {
              title: "Describe your hiring need",
              body: "Roles, locations, and volume — see checklist below.",
            },
            {
              title: "Receive onboarding steps",
              body: "We enable hire on your account and reply with profile completion guidance.",
            },
            {
              title: "Publish and review",
              body: "Complete company profile, post roles, and use the applicant sheet.",
            },
          ]}
        />
        <DocCtaRow>
          <DocCta href="mailto:gtm@blucollarz.com?subject=Recruiter%20access%20request">
            Email sales
          </DocCta>
          <DocCta href="/for-recruiters" variant="secondary">
            Recruiter program details
          </DocCta>
        </DocCtaRow>
      </DocSection>

      <DocSection id="press" number="06" title="Press">
        <p>
          Media inquiries:{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:press@blucollarz.com"
          >
            press@blucollarz.com
          </a>
          . Include your outlet, deadline, and topic. For company background,
          see About, Mission, and Vision.
        </p>
      </DocSection>

      <DocSection id="what-to-include" number="07" title="What to include">
        <DocTable
          headers={["Request type", "Include"]}
          rows={[
            [
              "In-app Help ticket",
              "Just describe the problem in Help — account, profile type, and transcript are captured automatically",
            ],
            [
              "Support email (fallback)",
              "Account email, profile type (work/hire/admin), URL, steps to reproduce, screenshots if safe",
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

      <DocSection id="response-times" number="08" title="Response times">
        <p>
          Tickets created through Help appear for our admin team under Support.
          We aim to acknowledge business inquiries within two business days.
          Complex product investigations may take longer; clear reproduction
          detail speeds things up. Urgent production outages for active hiring
          teams should say “urgent” in the subject (email) or in the Help
          conversation and include your company name.
        </p>
        <DocList
          items={[
            "Monday–Friday business hours follow India working patterns",
            "We may ask for a screen recording for interview or KYC issues",
            "We will never ask you to paste full government ID numbers into Help or email",
          ]}
        />
      </DocSection>

      <DocSection id="location" number="09" title="Location">
        <p>
          Blucollarz is rooted in{" "}
          <strong className="text-foreground">Hyderabad, India</strong>, and
          built for cross-border hiring corridors into the Gulf and other global
          hubs. We do not publish a walk-in retail address for drop-in visits;
          commercial conversations run through email, and product support
          through Help first.
        </p>
      </DocSection>

      <DocSection id="related" number="10" title="Related pages">
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
