import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Privacy Notice · Blucollarz",
  description:
    "How Blucollarz Technologies Private Limited processes personal data as Data Fiduciary under the DPDP Act, 2023.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-8 md:px-8 md:pt-32">
      <LegalDoc title="Privacy Notice" updated="August 15, 2026 · Version 1.1">
        <p className="border-border bg-muted/40 border p-3 text-sm">
          Pending counsel clearance before relying on this notice for live
          placements. Data Fiduciary: Blucollarz Technologies Private Limited.
        </p>

        <LegalSection title="1.1 Who we are">
          <p>
            Blucollarz Technologies Private Limited (“Blucollarz”, “we”, “us”)
            operates a verification and technology platform for international
            workforce mobility. For the personal data described in this notice,
            Blucollarz is the{" "}
            <strong className="text-foreground font-medium">
              Data Fiduciary
            </strong>{" "}
            — we decide why and how your data is processed. Privacy questions
            go to our Grievance Officer (see{" "}
            <a className="text-foreground underline underline-offset-4" href="/grievance">
              /grievance
            </a>
            ).
          </p>
        </LegalSection>

        <LegalSection title="1.2 What data we collect">
          <p>
            We collect attributes to verify your profile. Most are verified
            through DigiLocker (API Setu / MeriPehchaan) with your consent; some
            you provide directly.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>PAN — identity &amp; tax-number verification</li>
            <li>
              Aadhaar — identity (number handled per UIDAI rules; stored masked
              where required)
            </li>
            <li>Name — identity matching across documents</li>
            <li>Email &amp; mobile — account and communication</li>
            <li>Educational certificates — qualification verification</li>
            <li>
              Police Clearance Certificate (Passport Seva) — background
              conclusion when available
            </li>
            <li>Passport — identity &amp; emigration processing when provided</li>
            <li>
              Profile, applications, AI interview transcripts/scores, and
              optional interview recordings you choose to upload
            </li>
            <li>
              Technical data such as device/browser information, IP address, and
              usage logs needed to operate and secure the service
            </li>
          </ul>
          <p>
            We generate identity conclusions from DigiLocker for Blucollarz
            verification. Employers see allowlisted resume fields and interview
            evidence — not your raw documents or KYC identifiers.
          </p>
        </LegalSection>

        <LegalSection title="1.3 How we use your data">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Verify identity, qualifications and background and generate
              conclusions
            </li>
            <li>
              Match you to roles using allowlisted resume fields and interview
              evidence — never raw DigiLocker documents or KYC identifiers
            </li>
            <li>
              Enable a licensed Recruiting Agent to carry out regulated
              recruitment for a placement when that workflow applies
            </li>
            <li>
              Operate your account, communicate with you, and keep a secure
              audit record of journey events
            </li>
            <li>
              Evaluate you for a role using AI interviews, scores, transcripts,
              and optional recordings when you grant evaluation consent
            </li>
            <li>Detect fraud, protect workers, and comply with law</li>
          </ul>
        </LegalSection>

        <LegalSection title="1.4 Legal basis — your consent">
          <p>
            We process verification data on the basis of your consent, given
            through our Consent Notice before DigiLocker collection. You must
            hear the notice (Read aloud) before agreeing; agreement is recorded
            as a voice confirmation. Consent is purpose-specific (including a
            separate evaluation purpose for interviews) and recorded immutably.
            You can withdraw it at any time from Settings or by contacting the
            Grievance Officer. Certain steps may also rely on legal obligation
            (for example emigration-clearance requirements).
          </p>
        </LegalSection>

        <LegalSection title="1.5 What we never do">
          <ul className="list-disc space-y-2 ps-5">
            <li>Charge workers — employers pay platform fees</li>
            <li>
              Sell personal data, or share raw DigiLocker documents / PAN /
              passport numbers with employers
            </li>
            <li>Use data beyond the purposes you consented to</li>
          </ul>
        </LegalSection>

        <LegalSection title="1.6 Who we share data with">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Vetted employers — allowlisted resume fields used for matching
              (not email, phone, PAN, Aadhaar, date of birth, or address).
              Interview scores, transcripts, recordings, and answers only if you
              granted evaluation consent
            </li>
            <li>
              Licensed Recruiting Agent — data needed to perform regulated
              recruitment as recruiter of record
            </li>
            <li>
              Verification sources (DigiLocker / MeriPehchaan, Passport Seva,
              etc.) — the request needed to verify an attribute
            </li>
            <li>
              Processors under contract: MongoDB (database), Vercel (hosting /
              Blob storage), AI providers via Vercel AI Gateway, Sarvam (voice),
              Resend (email), Google (OAuth sign-in; Analytics only if you allow
              cookies)
            </li>
            <li>Authorities where required by law</li>
          </ul>
        </LegalSection>

        <LegalSection title="1.7 How long we keep it">
          <p>
            We keep data only as long as needed for the purposes above and for
            periods required by emigration and other applicable law, then delete
            or anonymise it. When you delete your account from Settings, we remove
            your profile, applications, interviews, recordings, consent events,
            and rights requests in our deletion cascade (subject to any legal
            retention we must honour, which we will explain if it applies).
          </p>
        </LegalSection>

        <LegalSection title="1.8 Your rights">
          <p>
            Under the Digital Personal Data Protection Act, 2023 you can ask us
            for access, correction/completion, erasure, withdrawal of consent,
            nomination, and grievance. Start in Settings (Data rights) or email
            the Grievance Officer. Correction is completed by updating your
            profile. Erasure is completed with Delete account after we can
            verify it is you — submitting an erasure request does not wipe the
            account by itself. See{" "}
            <a className="text-foreground underline underline-offset-4" href="/grievance">
              /grievance
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="1.9 Security &amp; breach">
          <p>
            We apply reasonable security safeguards. Access to identity data is
            controlled. We will notify you and the Data Protection Board of a
            personal data breach as required by law.
          </p>
        </LegalSection>

        <LegalSection title="1.10 International processing">
          <p>
            Processors may store or process data outside India (for example
            cloud hosting). By using the service you understand those transfers
            may occur under contractual safeguards with our processors.
          </p>
        </LegalSection>

        <LegalSection title="1.11 Children">
          <p>
            Blucollarz is not directed to children under 18. We do not knowingly
            collect personal data from children under 18.
          </p>
        </LegalSection>

        <LegalSection title="1.12 Changes &amp; contact">
          <p>
            We may update this notice and will post the new version with its
            effective date. Contact our Grievance Officer via{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/grievance"
            >
              /grievance
            </a>{" "}
            or email the published address there.
          </p>
        </LegalSection>
      </LegalDoc>
    </main>
  );
}
