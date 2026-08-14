import { LegalDoc, LegalSection } from "@/components/landing/legal-doc";
import { getGrievanceOfficer } from "@/lib/compliance/grievance";

export const metadata = {
  title: "Grievance Officer · Blucollarz",
  description:
    "Grievance Officer and Data Protection contact for Blucollarz under the DPDP Act, 2023.",
};

export default function GrievancePage() {
  const go = getGrievanceOfficer();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-8 md:px-8 md:pt-32">
      <LegalDoc
        title="Grievance Officer"
        updated="August 14, 2026 · Artifact 4"
      >
        {go.interim ? (
          <p className="border-border bg-muted/40 border p-3 text-sm">
            Interim contact — set{" "}
            <code className="text-foreground">DPDP_GRIEVANCE_OFFICER_*</code>{" "}
            env vars when counsel confirms the named officer.
          </p>
        ) : null}

        <LegalSection title="Contact">
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
            <li>
              <strong className="text-foreground font-medium">Phone:</strong>{" "}
              {go.phone}
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Postal address:
              </strong>{" "}
              {go.postalAddress}
            </li>
            <li>
              <strong className="text-foreground font-medium">Languages:</strong>{" "}
              {go.languages.join(", ")}
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Response commitment:
              </strong>{" "}
              Acknowledge within {go.acknowledgeHours} hours; resolve within{" "}
              {go.resolveDays} days (provisional until DPDP Rules timelines are
              finalised)
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Escalation path">
          <ol className="list-decimal space-y-2 ps-5">
            <li>Grievance Officer (above).</li>
            <li>
              If unresolved, internal escalation to Blucollarz leadership via
              the same email.
            </li>
            <li>You may approach the Data Protection Board of India.</li>
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
