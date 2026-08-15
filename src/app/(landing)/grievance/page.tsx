import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";
import { getGrievanceOfficer } from "@/lib/compliance/grievance";

export const metadata = {
  title: "Grievance Officer · Blucollarz",
  description:
    "Data protection contact and grievance redressal for Blucollarz under the DPDP Act, 2023 and DPDP Rules, 2025.",
};

export default async function GrievancePage() {
  const go = await getGrievanceOfficer();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-8 md:px-8 md:pt-32">
      <LegalDoc
        title="Grievance Officer"
        updated="August 15, 2026 · DPDP Rules, 2025"
      >
        <LegalSection title="Contact">
          <p>
            Business contact of the person able to answer questions about how
            Blucollarz Technologies Private Limited processes personal data.
          </p>
          <ul className="list-disc space-y-2 ps-5">
            <li>
              <strong className="text-foreground font-medium">Role:</strong>{" "}
              {go.role}
            </li>
            <li>
              <strong className="text-foreground font-medium">Name:</strong>{" "}
              {go.name}
            </li>
            <li>
              <strong className="text-foreground font-medium">Email:</strong>{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href={`mailto:${go.email}`}
              >
                {go.email}
              </a>
            </li>
            {go.phone ? (
              <li>
                <strong className="text-foreground font-medium">Phone:</strong>{" "}
                {go.phone}
              </li>
            ) : null}
            <li>
              <strong className="text-foreground font-medium">
                Postal address:
              </strong>{" "}
              {go.postalAddress}
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Languages:
              </strong>{" "}
              {go.languages.join(", ")} (other Eighth Schedule languages on
              request)
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Response commitment:
              </strong>{" "}
              Acknowledge within {go.acknowledgeHours} hours; resolve grievances
              within a reasonable period not exceeding {go.resolveDays} days
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="How to exercise your rights">
          <ol className="list-decimal space-y-2 ps-5">
            <li>
              Signed in: open Settings → Data rights. We identify you by the
              email on that account. Keep the request ID we show after you
              submit.
            </li>
            <li>
              Email {go.email} from the same address, or include that address
              and your request ID.
            </li>
            <li>
              Rights: access, correction/completion, erasure, withdraw consent,
              nominate another person, or raise a grievance.
            </li>
          </ol>
        </LegalSection>

        <LegalSection title="Escalation">
          <ol className="list-decimal space-y-2 ps-5">
            <li>Grievance desk (above).</li>
            <li>
              If unresolved, internal escalation to Blucollarz leadership via
              the same email.
            </li>
            <li>You may complain to the Data Protection Board of India.</li>
          </ol>
        </LegalSection>

        <LegalSection title="Worker support fallback">
          <p>
            For any worker in distress or unsure what to do, the Overseas
            Workers Resource Centre (OWRC) helpline{" "}
            <strong className="text-foreground font-medium">
              {go.owrcHelpline}
            </strong>{" "}
            is available.
          </p>
        </LegalSection>

        <LegalSection title="Related">
          <p>
            <a
              className="text-foreground underline underline-offset-4"
              href="/privacy"
            >
              Privacy Notice
            </a>
            {" · "}
            <a
              className="text-foreground underline underline-offset-4"
              href="/terms"
            >
              Terms
            </a>
          </p>
        </LegalSection>
      </LegalDoc>
    </main>
  );
}
