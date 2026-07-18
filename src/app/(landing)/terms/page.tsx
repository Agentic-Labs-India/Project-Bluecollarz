import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Terms of Service · BlueCollarz",
  description:
    "Terms governing use of the BlueCollarz platform for candidates and hirers.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-8 pt-28 md:px-8 md:pt-32">
      <LegalDoc title="Terms of Service" updated="July 12, 2026">
        <LegalSection title="1. Agreement">
          <p>
            These Terms of Service (“Terms”) govern your access to and use of
            BlueCollarz’s websites, products, and services (the “Service”). By
            creating an account or using the Service, you agree to these Terms.
            If you do not agree, do not use the Service.
          </p>
        </LegalSection>

        <LegalSection title="2. Accounts and profile types">
          <p>
            You may use BlueCollarz as a candidate (“work” profile) or as a hirer
            (“hire” profile), depending on the account type you select at
            sign-in. You are responsible for activity under your account and for
            keeping your sign-in credentials secure. Provide accurate
            information and keep your profile up to date.
          </p>
        </LegalSection>

        <LegalSection title="3. Candidate responsibilities">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Complete required profile information before applying to roles or
              starting interviews when prompted by the Service.
            </li>
            <li>
              Represent your experience and qualifications honestly.
            </li>
            <li>
              Complete AI interviews yourself; do not misrepresent authorship of
              responses or recordings.
            </li>
            <li>
              Understand that interview scores, summaries, transcripts, and
              recordings may be shared with the hirer for roles you pursue.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Hirer responsibilities">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Complete your company profile before posting roles when required.
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
              the hiring process for the relevant role.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. AI features">
          <p>
            BlueCollarz offers AI-assisted interviews and related analysis. AI
            outputs may be imperfect and are provided to support — not replace —
            human hiring judgment. You remain responsible for decisions you make
            based on platform information.
          </p>
        </LegalSection>

        <LegalSection title="6. Acceptable use">
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

        <LegalSection title="7. Content you provide">
          <p>
            You retain ownership of content you submit (such as profile text,
            job descriptions, and interview responses). You grant BlueCollarz a
            worldwide, non-exclusive license to host, process, display, and
            transmit that content as needed to operate the Service, including
            sharing application and interview materials with the relevant
            counterparty in a hiring flow.
          </p>
        </LegalSection>

        <LegalSection title="8. Third-party services">
          <p>
            The Service may rely on third-party providers (for example
            authentication, hosting, storage, and AI models). Your use of those
            providers may also be subject to their terms and privacy policies.
          </p>
        </LegalSection>

        <LegalSection title="9. Disclaimers">
          <p>
            The Service is provided “as is” and “as available.” To the fullest
            extent permitted by law, BlueCollarz disclaims warranties of
            merchantability, fitness for a particular purpose, and
            non-infringement. We do not guarantee that you will obtain
            employment, fill a role, or receive any particular interview
            outcome.
          </p>
        </LegalSection>

        <LegalSection title="10. Limitation of liability">
          <p>
            To the fullest extent permitted by law, BlueCollarz and its affiliates
            will not be liable for indirect, incidental, special, consequential,
            or punitive damages, or any loss of profits, data, or goodwill,
            arising from your use of the Service. Our aggregate liability for
            claims relating to the Service will not exceed the greater of (a)
            amounts you paid us for the Service in the 12 months before the
            claim or (b) USD 100, if you have not paid us.
          </p>
        </LegalSection>

        <LegalSection title="11. Termination">
          <p>
            You may stop using the Service and delete your account from
            Settings. We may suspend or terminate access if you violate these
            Terms or if needed to protect the Service or other users.
          </p>
        </LegalSection>

        <LegalSection title="12. Changes">
          <p>
            We may update these Terms from time to time. Continued use of the
            Service after changes become effective constitutes acceptance of the
            updated Terms.
          </p>
        </LegalSection>

        <LegalSection title="13. Contact">
          <p>
            Questions about these Terms:{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:support@gulfpath.com"
            >
              support@gulfpath.com
            </a>
            .
          </p>
        </LegalSection>
      </LegalDoc>
    </main>
  );
}
