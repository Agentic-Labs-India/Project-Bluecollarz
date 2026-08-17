import type { ReactNode } from "react";
import { blobFileUrl } from "@/lib/blob/pathname";
import { countryName, stateName } from "@/lib/core/geo/places";
import {
  GCC_RULE_KEYS,
  GCC_RULE_LABELS,
  HIRE_ONBOARDING_CONTACT_KEYS,
  HIRE_ONBOARDING_CONTACT_LABELS,
  type HireOnboardingDocument,
  type HireOnboardingSaveInput,
} from "@/lib/hire/onboarding/types";

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value == null || String(value).trim() === "") return null;
  return (
    <div className="border-border bg-muted/20 min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1.5 text-sm wrap-break-word whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

function DocLink({
  label,
  document,
}: {
  label: string;
  document: HireOnboardingDocument | null;
}) {
  if (!document) return <Field label={label} value="Not uploaded" />;
  return (
    <div className="border-border bg-muted/20 min-w-0 border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <a
        href={blobFileUrl(document.url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary mt-1.5 block truncate text-sm underline-offset-4 hover:underline"
      >
        {document.filename}
      </a>
    </div>
  );
}

function formatPhone(countryCode: number | null, phone: number | null): string {
  if (phone == null) return "";
  if (countryCode != null) return `+${countryCode} ${phone}`;
  return String(phone);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-foreground mb-2 text-sm font-medium">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function HireOnboardingPackView({
  data,
  about,
  companySize,
}: {
  data: HireOnboardingSaveInput;
  about?: string | null;
  companySize?: string | null;
}) {
  const identity = data.identity;
  const location = data.location;
  const sponsor = data.sponsorshipLicence;

  return (
    <div className="space-y-6">
      <Section title="Company identity">
        <Field label="Legal name" value={identity.legalName} />
        <Field label="Trade name" value={identity.tradeName} />
        <Field
          label="Registration number"
          value={identity.registrationNumber}
        />
        <Field label="Tax / VAT ID" value={identity.taxVatId} />
        <Field label="Chamber ID" value={identity.chamberId} />
        <Field label="Sponsor ID" value={identity.sponsorId} />
        <Field label="Year established" value={identity.yearEstablished} />
        <Field label="Website" value={identity.website} />
        <DocLink
          label="Establishment card"
          document={data.documents.establishmentCard}
        />
        <DocLink
          label="Immigration file"
          document={data.documents.immigrationFile}
        />
        {about ? (
          <div className="sm:col-span-2">
            <Field label="About" value={about} />
          </div>
        ) : null}
      </Section>

      <Section title="Location & size">
        <Field label="Country" value={countryName(location.countryCode)} />
        <Field
          label="State"
          value={stateName(location.countryCode, location.stateCode)}
        />
        <Field label="City" value={location.city} />
        <Field label="Address" value={location.address} />
        <Field label="Industry" value={location.industry} />
        <Field
          label="Team size"
          value={companySize ? `${companySize} employees` : null}
        />
        <Field label="Total employees" value={location.totalEmployees} />
        <Field label="Foreign workers" value={location.foreignWorkers} />
        <Field label="National employees" value={location.nationalEmployees} />
        <Field label="Blue collar" value={location.blueCollarCount} />
      </Section>

      <Section title="Key contacts">
        {HIRE_ONBOARDING_CONTACT_KEYS.map((key) => {
          const person = data.contacts[key];
          const bits = [
            person.name,
            countryName(person.nationalityCode),
            formatPhone(person.phoneCountryCode, person.phoneNumber),
            person.email,
          ].filter(Boolean);
          return (
            <Field
              key={key}
              label={HIRE_ONBOARDING_CONTACT_LABELS[key]}
              value={bits.length ? bits.join(" · ") : null}
            />
          );
        })}
      </Section>

      <Section title="Sponsorship licence">
        <Field label="Type" value={sponsor.type} />
        <Field label="Number" value={sponsor.number} />
        <Field label="Category" value={sponsor.category} />
        <Field label="Worker limit" value={sponsor.workerLimit} />
        <Field label="Used slots" value={sponsor.usedSlots} />
        <Field label="Expiry" value={sponsor.expiry} />
      </Section>

      {data.legalLicences.length ? (
        <div>
          <p className="text-foreground mb-2 text-sm font-medium">
            Legal licences
          </p>
          <div className="space-y-2">
            {data.legalLicences.map((row) => (
              <div key={row.id} className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={row.type}
                  value={[row.number, row.issuedAt, row.expiryAt]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <DocLink label="Scan" document={row.document} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-foreground mb-2 text-sm font-medium">
          Country rules
        </p>
        <ul className="text-muted-foreground space-y-1 text-sm">
          {GCC_RULE_KEYS.map((key) => (
            <li key={key}>
              {data.gccRules[key] ? "Yes" : "No"} — {GCC_RULE_LABELS[key]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
