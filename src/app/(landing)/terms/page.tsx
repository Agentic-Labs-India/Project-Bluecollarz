import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Terms of Service · Blucollarz",
  description:
    "Terms governing use of the Blucollarz platform for candidates and hirers.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-8 pt-28 md:px-8 md:pt-32">
      <LegalDoc title="Terms of Service" updated="August 26, 2026 · Version 2">
        <LegalSection title="1. Agreement">
          <p>
            These Terms of Service (“Terms”) govern your access to and use of
            Blucollarz’s websites, apps, and services (the “Service”), operated
            by Blucollarz Technologies Private Limited, Hyderabad, Telangana,
            India. By creating an account or using the Service, you agree to
            these Terms and the{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/privacy"
            >
              Privacy Notice
            </a>
            . If you do not agree, do not use the Service. You must be 18 or
            older.
          </p>
        </LegalSection>

        <LegalSection title="2. What Blucollarz is — and is not">
          <p>
            Blucollarz is a verification and hiring platform. It is not a
            Recruiting Agent registered with the Protector General of Emigrants.
            It does not file eMigrate clearance, charge workers a recruitment
            fee, or tell you that an ECNR passport means you need no agent.
            Licensed Recruiting Agents, where bound to a role, file clearance
            themselves.
          </p>
        </LegalSection>

        <LegalSection title="3. Accounts and profile types">
          <p>
            Google sign-in creates a candidate (“work”) account. Hirer (“hire”)
            access is provisioned by Blucollarz for approved companies — it is
            not available as a public sign-up option. You are responsible for
            activity under your account and for keeping your sign-in credentials
            secure. Provide accurate information and keep your profile up to
            date.
          </p>
        </LegalSection>

        <LegalSection title="4. Candidate responsibilities">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Complete required profile information before applying to roles or
              starting interviews when prompted by the Service.
            </li>
            <li>Represent your experience and qualifications honestly.</li>
            <li>
              Complete AI interviews yourself; do not misrepresent authorship of
              responses or recordings.
            </li>
            <li>
              Understand that interview scores, summaries, transcripts, and
              recordings may be shared with the hirer for roles you pursue if
              you grant evaluation consent. Scores assist a human; they do not
              hire you automatically.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Hirer responsibilities">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Complete company onboarding, including documents we request,
              before posting roles when required.
            </li>
            <li>
              Post accurate role details and use candidate data only for
              legitimate hiring purposes related to those roles.
            </li>
            <li>
              Comply with applicable employment, non-discrimination, and privacy
              laws when evaluating applicants.
            </li>
            <li>
              Do not misuse interview recordings or candidate materials outside
              the hiring process for the relevant role. You never receive
              medical report files.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="6. AI features">
          <p>
            Blucollarz offers AI-assisted interviews and related analysis. AI
            outputs may be imperfect and are provided to support — not replace —
            human hiring judgment. You remain responsible for decisions you make
            based on platform information.
          </p>
        </LegalSection>

        <LegalSection title="7. Personal data">
          <p>
            How we process personal data is set out in the Privacy Notice, which
            is part of these Terms. Purpose consents (identity, contact,
            evaluation, medical) are granted separately before DigiLocker.
            You may withdraw those consents and delete your account from
            Settings. Delete account removes profile data, applications,
            interviews, recordings, medical reports, and hire company documents
            from our systems, except where a legal hold requires us to keep
            material.
          </p>
        </LegalSection>

        <LegalSection title="8. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 ps-5">
            <li>Violate any law or third-party rights.</li>
            <li>
              Upload malware, scrape the Service without permission, or attempt
              to disrupt or reverse engineer the platform.
            </li>
            <li>
              Harass others, post fraudulent roles, or submit fake applications.
            </li>
            <li>
              Use another person’s account or access data you are not authorized
              to see.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="9. Content you provide">
          <p>
            You retain ownership of content you submit (such as profile text,
            job descriptions, company documents, and interview responses). You
            grant Blucollarz a worldwide, non-exclusive licence to host,
            process, display, and transmit that content as needed to operate the
            Service, including sharing application and interview materials with
            the relevant counterparty in a hiring flow, limited by the Privacy
            Notice.
          </p>
        </LegalSection>

        <LegalSection title="10. Third-party services">
          <p>
            The Service relies on processors including Google (sign-in), MongoDB
            (database), Vercel (hosting and private file storage), AI providers
            via the Vercel AI Gateway, Sarvam (voice), and Resend (email). Your
            use of those providers may also be subject to their terms.
          </p>
        </LegalSection>

        <LegalSection title="11. Disclaimers">
          <p>
            The Service is provided “as is” and “as available.” To the fullest
            extent permitted by law, Blucollarz disclaims warranties of
            merchantability, fitness for a particular purpose, and
            non-infringement. We do not guarantee that you will obtain
            employment, fill a role, or receive any particular interview
            outcome.
          </p>
        </LegalSection>

        <LegalSection title="12. Limitation of liability">
          <p>
            To the fullest extent permitted by law, Blucollarz and its
            affiliates will not be liable for indirect, incidental, special,
            consequential, or punitive damages, or any loss of profits, data, or
            goodwill, arising from your use of the Service. Our aggregate
            liability for claims relating to the Service will not exceed the
            greater of (a) amounts you paid us for the Service in the 12 months
            before the claim or (b) USD 100, if you have not paid us. Nothing in
            these Terms limits liability that cannot be limited under applicable
            law, including DPDP.
          </p>
        </LegalSection>

        <LegalSection title="13. Termination">
          <p>
            You may stop using the Service and delete your account from
            Settings. We may suspend or terminate access if you violate these
            Terms or if needed to protect the Service or other users. After
            deletion you may create a new Google account later; we may wait
            before allowing the same email to return.
          </p>
        </LegalSection>

        <LegalSection title="14. Changes">
          <p>
            We may update these Terms from time to time. When we do, the site
            agreement banner returns and you must agree again before continuing
            signed-in. Continued use after that agreement is acceptance of the
            updated Terms.
          </p>
        </LegalSection>

        <LegalSection title="15. Governing law">
          <p>
            These Terms are governed by the laws of India. Courts at Hyderabad,
            Telangana, have exclusive jurisdiction, subject to any mandatory
            rights you have under DPDP or, if it applies, GDPR.
          </p>
        </LegalSection>

        <LegalSection title="16. Contact">
          <p>
            Questions about these Terms:{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:support@blucollarz.com"
            >
              support@blucollarz.com
            </a>
            . Personal data:{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/privacy"
            >
              Privacy Notice
            </a>{" "}
            and{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/grievance"
            >
              Grievance
            </a>
            .
          </p>
        </LegalSection>
      </LegalDoc>
    </main>
  );
}
