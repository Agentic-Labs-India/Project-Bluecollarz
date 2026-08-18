import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Privacy Notice · Blucollarz",
  description:
    "How Blucollarz Technologies Private Limited processes personal data as Data Fiduciary under the DPDP Act, 2023 and DPDP Rules, 2025.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-8 md:px-8 md:pt-32">
      <LegalDoc title="Privacy Notice" updated="August 18, 2026 · Version 1.4">
        <p>
          This notice is issued by Blucollarz Technologies Private Limited under
          the Digital Personal Data Protection Act, 2023 and the Digital
          Personal Data Protection Rules, 2025. It is standalone: you do not
          need any other document to understand what we collect, why, and how to
          withdraw consent or exercise your rights.
        </p>

        <LegalSection title="1. Who we are">
          <p>
            Blucollarz Technologies Private Limited (“Blucollarz”, “we”, “us”)
            operates a verification and hiring platform for skilled workers
            heading abroad. For the personal data in this notice, Blucollarz is
            the{" "}
            <strong className="text-foreground font-medium">
              Data Fiduciary
            </strong>
            . The person able to answer questions about processing is published
            on{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/grievance"
            >
              /grievance
            </a>{" "}
            (grievance desk:{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="mailto:support@blucollarz.com"
            >
              support@blucollarz.com
            </a>
            , Hyderabad, Telangana, India). This notice is in English. Hindi and
            other Eighth Schedule languages are available on request via that
            desk.
          </p>
        </LegalSection>

        <LegalSection title="2. Itemised personal data, purpose, and service">
          <p>
            We process the following personal data for the specified purposes.
            The service enabled is access to Blucollarz accounts, identity
            verification, job matching, and interviews. Blucollarz is not a
            Recruiting Agent and does not file emigration clearance.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Google account name and email — create and sign in to your
              account.
            </li>
            <li>
              Mobile number — account, OTP-style communication, and matching
              DigiLocker identity.
            </li>
            <li>
              PAN, Aadhaar (masked where required), name, date of birth, gender,
              address/location from DigiLocker / MeriPehchaan — verify identity,
              confirm you are 18 or older, and generate verification
              conclusions. Collected only after you grant purpose consent.
            </li>
            <li>
              Profile, skills, education, work history, languages — match you to
              roles using allowlisted resume fields collected during onboarding.
            </li>
            <li>
              Applications, AI interview transcripts, scores, answers, and
              optional recordings — evaluate you for a role when you grant
              evaluation consent.
            </li>
            <li>Support tickets and Help chats — resolve product issues.</li>
            <li>
              Device, browser, IP, and security logs — operate, secure, and
              debug the service. Processing logs are kept for one year.
            </li>
            <li>
              Optional analytics (Google Analytics): page usage after you Allow
              analytics cookies. Off until you Allow.
            </li>
          </ul>
          <p>
            Employers see allowlisted resume fields and interview evidence — not
            your raw DigiLocker documents, PAN, Aadhaar, email, phone, date of
            birth, or address.
          </p>
        </LegalSection>

        <LegalSection title="3. Consent">
          <p>
            Verification and interview data are processed on consent. Before
            DigiLocker you grant each purpose we use — identity, contact,
            interview evaluation, and medical fitness — as separate switches in
            one sitting. DigiLocker collection happens only after that notice
            (read aloud) and recorded agreement. Interview scores, transcripts,
            and recordings are shared with a hirer only while evaluation
            consent is live. Medical fitness data is processed only while
            medical consent is live, and only after an employer selects you.
            Consent must be free, specific, informed, unconditional, and
            unambiguous. You can withdraw it as easily as you gave it:
            Settings → Data rights → Withdraw, or email the grievance desk.
            Withdrawal does not undo processing already completed lawfully.
            Account operation also relies on using the service (contract).
          </p>
        </LegalSection>

        <LegalSection title="4. Cookies">
          <p>
            Before you sign in, the first banner asks you to click I agree to
            our Terms and Privacy Notice, and to confirm you are 18 or older.
            Essential cookies keep you signed in and protect the account. They
            are required for the service. Optional analytics cookies (Google
            Analytics) measure usage. They stay off until you allow them in
            Settings — the same control lets you turn them off again. We do not
            use ads cookies. Decline on that banner means you cannot Log in or
            Get Started until you click I agree.
          </p>
        </LegalSection>

        <LegalSection title="5. What we never do">
          <ul className="list-disc space-y-2 ps-5">
            <li>Charge workers — employers pay platform fees</li>
            <li>
              Sell personal data, or share raw DigiLocker documents / PAN /
              Aadhaar / passport numbers with employers
            </li>
            <li>Use data beyond the purposes you consented to</li>
            <li>Track children or offer this service to anyone under 18</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Who we share data with">
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Vetted employers — allowlisted resume fields. Interview scores,
              transcripts, recordings, and answers only if you granted
              evaluation consent
            </li>
            <li>
              Licensed Recruiting Agent bound to a role (optional RC number) —
              hire-safe profile and evaluation data they need for that
              placement. We are not that agent and we do not file eMigrate.
            </li>
            <li>
              Verification sources (DigiLocker / MeriPehchaan) — the request
              needed to verify identity
            </li>
            <li>
              Processors under contract: MongoDB (database), Vercel (hosting /
              Blob), AI providers via Vercel AI Gateway, Sarvam (voice), Resend
              (email), Google (OAuth; Analytics only if you Allow)
            </li>
            <li>Authorities where required by law</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. How long we keep it">
          <p>
            We keep data only as long as needed for the purposes above and for
            periods required by applicable law, then delete or anonymise it. Security and processing logs are retained for one
            year. When you delete your account from Settings, we remove your
            profile, applications, interviews, recordings, consent events, and
            rights requests (subject to any legal retention we must honour,
            which we will explain if it applies).
          </p>
        </LegalSection>

        <LegalSection title="8. Your rights and how to use them">
          <p>
            You may seek access, correction/completion, erasure, withdrawal of
            consent, nomination of another person, and grievance redressal.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Signed-in: Settings → Data rights. We identify you by the email on
              this account. After you submit, use the request ID in any
              follow-up.
            </li>
            <li>
              Correction is completed by updating your profile. Erasure is
              completed with Delete account after we verify it is you —
              submitting an erasure request does not wipe the account by itself.
            </li>
            <li>
              Not signed in, or you prefer email: write to{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href="mailto:support@blucollarz.com"
              >
                support@blucollarz.com
              </a>{" "}
              with the email on the account.
            </li>
            <li>
              We acknowledge promptly (target 72 hours) and resolve grievances
              within a reasonable period not exceeding 90 days.
            </li>
            <li>
              You may complain to the Data Protection Board of India if
              unresolved. See{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href="/grievance"
              >
                /grievance
              </a>
              .
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="9. Security and personal data breach">
          <p>
            We apply reasonable security safeguards, including access control,
            encryption in transit, and processing logs. If a personal data
            breach occurs, we will inform affected Data Principals without delay
            (nature, extent, timing, likely consequences, what we did, what you
            can do, and who to contact). We will inform the Data Protection
            Board without delay and send a detailed report within 72 hours of
            becoming aware, or such further time as the Board permits.
          </p>
        </LegalSection>

        <LegalSection title="10. International processing">
          <p>
            Processors may store or process data outside India (for example
            cloud hosting). Those transfers happen under contract with our
            processors.
          </p>
        </LegalSection>

        <LegalSection title="11. Children">
          <p>
            Blucollarz is for persons 18 years or older. Before you create an
            account you must confirm you are 18 or older. We then confirm age
            from DigiLocker date of birth. We do not knowingly collect personal
            data from children. Accounts under 18 are refused.
          </p>
        </LegalSection>

        <LegalSection title="12. Marketing imagery">
          <p>
            Photos on the public homepage are decorative marketing stills. They
            are not photos of your account and are not used to identify you.
          </p>
        </LegalSection>

        <LegalSection title="13. Changes">
          <p>
            We may update this notice and will post the new version with its
            effective date. Contact the grievance desk via{" "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/grievance"
            >
              /grievance
            </a>
            .
          </p>
        </LegalSection>
      </LegalDoc>
    </main>
  );
}
