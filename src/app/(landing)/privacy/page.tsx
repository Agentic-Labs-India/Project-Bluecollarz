import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Privacy Policy · BlueCollarz",
  description:
    "How BlueCollarz collects, uses, and protects personal data for candidates and hirers.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-8 pt-28 md:px-8 md:pt-32">
      <LegalDoc title="Privacy Policy" updated="July 12, 2026">
        <LegalSection title="1. Who we are">
          <p>
            BlueCollarz (“we”, “us”, “our”) operates a platform that connects
            candidates with hirers, including profile management, job postings,
            applications, and AI-assisted interviews. This Privacy Policy
            explains what information we collect and how we use it.
          </p>
        </LegalSection>

        <LegalSection title="2. Information we collect">
          <p>Depending on how you use BlueCollarz, we may collect:</p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Account details such as name, email address, and profile photo
              from your sign-in provider (for example Google).
            </li>
            <li>
              Candidate profile information such as resume content, skills,
              education, work experience, location, and contact details you
              provide.
            </li>
            <li>
              Hirer / company information such as company name, industry, size,
              location, website, and about text.
            </li>
            <li>
              Job and application data, including roles you post or apply to and
              application status.
            </li>
            <li>
              Interview data, including chat transcripts, analysis scores and
              summaries, and interview video recordings you choose to capture
              and upload.
            </li>
            <li>
              Technical data such as device/browser information, IP address, and
              basic usage logs needed to operate and secure the service.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. How we use information">
          <p>We use personal data to:</p>
          <ul className="list-disc space-y-2 ps-5">
            <li>Create and manage your account and workspace.</li>
            <li>
              Power candidate–hirer matching, applications, and hiring
              workflows.
            </li>
            <li>
              Run AI interview experiences and generate scores/summaries for
              review by authorized hirers for the relevant role.
            </li>
            <li>Improve reliability, security, and product quality.</li>
            <li>Communicate service updates and respond to support requests.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. AI interviews and recordings">
          <p>
            When you participate in an AI interview, we process your spoken or
            typed responses to generate interview feedback and scores. If you
            enable screen or camera recording, the recording may be stored and
            made available to the hirer for that role so they can review your
            interview. Do not share sensitive information you do not want
            processed for these purposes.
          </p>
        </LegalSection>

        <LegalSection title="5. How we share information">
          <p>
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Hirers, for roles you apply to — including profile and interview
              results needed to evaluate your application.
            </li>
            <li>
              Service providers that help us host, store, analyze, or operate
              the platform (for example cloud hosting, file storage, and AI
              providers), under appropriate safeguards.
            </li>
            <li>
              Authorities when required by law or to protect rights, safety, and
              security.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Retention">
          <p>
            We retain account, profile, application, and interview data for as
            long as your account remains active or as needed to provide the
            service, resolve disputes, and meet legal requirements. You may
            request account deletion from Settings; when deletion is processed,
            associated application and interview data may also be removed
            according to our deletion cascade.
          </p>
        </LegalSection>

        <LegalSection title="7. Security">
          <p>
            We use reasonable technical and organizational measures to protect
            personal data. No method of transmission or storage is completely
            secure, and we cannot guarantee absolute security.
          </p>
        </LegalSection>

        <LegalSection title="8. Your choices">
          <p>
            You can update profile information in-product, sign out at any time,
            and request account deletion from Settings. Depending on your
            location, you may have rights to access, correct, or delete personal
            data. Contact us using the details below to make a request.
          </p>
        </LegalSection>

        <LegalSection title="9. International processing">
          <p>
            BlueCollarz may process and store information in countries other than
            where you live. By using the service, you understand that your
            information may be transferred to and processed in those locations.
          </p>
        </LegalSection>

        <LegalSection title="10. Children">
          <p>
            BlueCollarz is not directed to children under 16, and we do not
            knowingly collect personal information from children.
          </p>
        </LegalSection>

        <LegalSection title="11. Changes">
          <p>
            We may update this Privacy Policy from time to time. We will post
            the updated version on this page and revise the “Last updated” date.
          </p>
        </LegalSection>

        <LegalSection title="12. Contact">
          <p>
            Questions about privacy:{" "}
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
