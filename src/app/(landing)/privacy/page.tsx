import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";

export const metadata = {
  title: "Privacy Notice · Blucollarz",
  description:
    "How Blucollarz Technologies Private Limited processes personal data as Data Fiduciary under the DPDP Act, 2023 and, where it applies, the GDPR.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-8 md:px-8 md:pt-32">
      <LegalDoc title="Privacy Notice" updated="August 26, 2026 · Version 1.5">
        <p>
          This notice is issued by Blucollarz Technologies Private Limited under
          the Digital Personal Data Protection Act, 2023 and the Digital
          Personal Data Protection Rules, 2025. It is standalone: you do not
          need any other document to understand what we collect, why, and how to
          withdraw consent or exercise your rights. Where the EU/UK GDPR applies
          to you, the same notice describes that processing. We have not
          appointed an EU Article 27 representative.
        </p>

        <LegalSection title="1. Who we are">
          <p>
            Blucollarz Technologies Private Limited (“Blucollarz”, “we”, “us”)
            operates a verification and hiring platform for skilled workers
            heading abroad. For the personal data in this notice, Blucollarz is
            the{" "}
            <strong className="text-foreground font-medium">
              Data Fiduciary
            </strong>{" "}
            (and the controller if GDPR applies). The person able to answer
            questions about processing is published on{" "}
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
              DigiLocker user id — unique candidate account id used to sign in
              and to identify you on the platform (contract).
            </li>
            <li>
              Google account name and email — recruiter and admin sign-in via
              Corporate Login (contract).
            </li>
            <li>
              Mobile number — account, OTP-style communication, and matching
              DigiLocker identity (consent: contact).
            </li>
            <li>
              PAN, Aadhaar (masked where required), name, date of birth, gender,
              address/location from DigiLocker / MeriPehchaan — verify identity,
              confirm you are 18 or older, and generate verification
              conclusions. Collected when you sign in with DigiLocker (consent:
              identity). Email and username are not collected from DigiLocker.
            </li>
            <li>
              Profile, skills, education, work history, languages — match you to
              roles using allowlisted resume fields collected during onboarding
              (consent / contract).
            </li>
            <li>
              Applications, AI interview transcripts, scores, answers, and
              recordings — evaluate you for a role when you grant evaluation
              consent. Scores assist a human employer; they do not hire you
              automatically (consent: evaluation).
            </li>
            <li>
              Medical fitness appointments and report files — booked only after
              an employer selects you, and only while medical consent is live.
              Employers never see the report files (consent: medical; health
              data).
            </li>
            <li>
              Hire company onboarding documents (establishment card, immigration
              file, licences) — verify the employer (contract).
            </li>
            <li>Support tickets and Help chats — resolve product issues.</li>
            <li>
              Device, browser, IP, and security logs — operate, secure, and
              debug the service. Processing logs are kept for one year.
            </li>
            <li>
              Optional analytics (Google Analytics): page usage after you allow
              analytics cookies. Off until you allow them.
            </li>
          </ul>
          <p>
            Employers see allowlisted resume fields and interview evidence — not
            your raw DigiLocker documents, PAN, Aadhaar, DigiLocker user id,
            phone, date of birth, or address.
          </p>
        </LegalSection>

        <LegalSection title="3. Consent">
          <p>
            Verification and interview data are processed on consent. Signing in
            with DigiLocker is identity verification. You grant each purpose we
            use — identity, contact, interview evaluation, and medical fitness.
            Interview scores, transcripts, and recordings are shared with a
            hirer only while evaluation consent is live. Medical fitness data is
            processed only while medical consent is live, and only after an
            employer selects you. Consent must be free, specific, informed,
            unconditional, and unambiguous. You can withdraw it as easily as you
            gave it: Settings → Data rights → Withdraw, or email the grievance
            desk. Withdrawal does not undo processing already completed
            lawfully. Account operation also relies on using the service
            (contract).
          </p>
        </LegalSection>

        <LegalSection id="cookies" title="4. Cookies">
          <p>
            Before you sign in, the first banner requires you to confirm you are
            18 or older and agree to these Terms and this Privacy Notice.
            Essential cookies keep you signed in and protect the account. They
            are required for the service. Optional analytics cookies (Google
            Analytics) measure usage and stay off unless you turn them on in
            Cookie settings. Agree and continue does not turn analytics on.
            Reject All means you cannot Log in or Get Started until you agree to
            the Terms, this notice, and the 18+ confirmation. We do not use ads
            cookies. You can turn analytics off later in account Settings.
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
            <li>Let an AI score be the sole decision that hires you</li>
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
              (email), DigiLocker / MeriPehchaan (candidate sign-in), Google
              (recruiter/admin OAuth; Analytics only if you allow)
            </li>
            <li>Authorities where required by law</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. How long we keep it">
          <p>
            We keep data only as long as needed for the purposes above and for
            periods required by applicable law, then delete or anonymise it.
            Security and processing logs are retained for one year. When you
            delete your account from Settings, we remove your profile,
            applications, interviews, recordings, medical reports, hire company
            documents, consent events, and rights requests, then delete the
            stored files from private Blob (subject to any legal hold we must
            honour, which we will explain if it applies). If we later erase data
            because we no longer need it, DPDP Rules require 48 hours’ notice
            before that erasure; that countdown is not yet an automated
            worker-facing timer.
          </p>
        </LegalSection>

        <LegalSection title="8. Your rights and how to use them">
          <p>
            Under DPDP you may seek access, correction/completion, erasure,
            withdrawal of consent, nomination of another person, and grievance
            redressal. If GDPR applies to you, you may also seek restriction of
            processing, objection, and data portability through the same
            Settings queue.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              Signed-in: Settings → Data rights. Candidates are identified by
              DigiLocker user id; recruiters and admins by the Google email on
              the account. After you submit, use the request ID in any
              follow-up.
            </li>
            <li>
              Access and portability download a JSON package. Recording and
              medical-report files are linked as authorised same-origin
              downloads (`/api/blob/file`), not as raw cloud URLs.
            </li>
            <li>
              Correction is completed by updating your profile. Erasure is
              completed with Delete account after we verify it is you —
              submitting an erasure request does not wipe the account by itself.
            </li>
            <li>
              Restriction and objection are logged for the grievance desk to
              action. They do not automatically freeze every system.
            </li>
            <li>
              Not signed in, or you prefer email: write to{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href="mailto:support@blucollarz.com"
              >
                support@blucollarz.com
              </a>{" "}
              with the email on a recruiter/admin account, or the DigiLocker
              user id on a candidate account.
            </li>
            <li>
              We acknowledge promptly (target 72 hours) and resolve grievances
              within a reasonable period not exceeding 90 days.
            </li>
            <li>
              You may complain to the Data Protection Board of India if
              unresolved. If GDPR applies, you may also complain to your local
              supervisory authority. See{" "}
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
            encryption in transit, and processing logs. Private files have no
            shareable URL; they are streamed only after we re-check who you are.
            If a personal data breach occurs, we will inform affected people
            without delay (nature, extent, timing, likely consequences, what we
            did, what you can do, and who to contact). We will inform the Data
            Protection Board of India without delay and send a detailed report
            within 72 hours of becoming aware, or such further time as the Board
            permits. That filing is an operations action, not an automated
            product feature. If GDPR Art. 33 applies, we will also notify the
            competent supervisory authority within 72 hours where required.
          </p>
        </LegalSection>

        <LegalSection title="10. International processing">
          <p>
            Processors may store or process data outside India (for example
            cloud hosting in the United States). Those transfers happen under
            contract with our processors. India is not an EU adequacy country.
            We have not published Standard Contractual Clauses in this product.
            If GDPR applies to you and you object to those transfers, contact
            the grievance desk.
          </p>
        </LegalSection>

        <LegalSection title="11. Children">
          <p>
            Blucollarz is for persons 18 years or older. Before you create an
            account you must confirm you are 18 or older. We then confirm age
            from DigiLocker date of birth. We do not knowingly collect personal
            data from children. Accounts under 18 are refused. We do not offer
            parental-consent onboarding.
          </p>
        </LegalSection>

        <LegalSection title="12. Automated scoring">
          <p>
            AI interview scores and summaries are stored on the interview and
            shown to the hirer for that role while evaluation consent is live. A
            human employer decides whether to proceed. You can ask for the
            scores in an access export and raise a grievance if you contest
            them.
          </p>
        </LegalSection>

        <LegalSection title="13. Marketing imagery">
          <p>
            Photos on the public homepage are decorative marketing stills. They
            are not photos of your account and are not used to identify you.
          </p>
        </LegalSection>

        <LegalSection title="14. Changes">
          <p>
            We may update this notice and will post the new version with its
            effective date. A version bump re-prompts the site agreement before
            you can keep using the signed-in product. Contact the grievance desk
            via{" "}
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
