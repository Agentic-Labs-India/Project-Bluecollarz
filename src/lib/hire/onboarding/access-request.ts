import { countryCodeFromName } from "@/lib/core/geo/places";
import {
  RECRUITER_INDUSTRIES,
  type RecruiterIndustry,
} from "@/lib/hire/inquiries/types";
import {
  emptyHireOnboardingSave,
  type HireOnboardingSaveInput,
  type HireOnboardingUser,
} from "@/lib/hire/onboarding/types";

export type { HireOnboardingUser };

function asIndustry(raw: string): RecruiterIndustry | null {
  return (RECRUITER_INDUSTRIES as readonly string[]).includes(raw)
    ? (raw as RecruiterIndustry)
    : null;
}

/** Overwrite access-request answers. Recruiter cannot change these in onboarding. */
export function lockAccessRequestFields(
  payload: HireOnboardingSaveInput,
  user: HireOnboardingUser | null,
): HireOnboardingSaveInput {
  if (!user) return payload;
  const industry = asIndustry((user.industry || "").trim());
  const countryCode = countryCodeFromName(user.location);

  return {
    ...payload,
    identity: {
      ...payload.identity,
      legalName: (user.companyName || "").trim(),
      website: (user.website || "").trim(),
    },
    location: {
      ...payload.location,
      countryCode: countryCode ?? payload.location.countryCode,
      industry: industry ?? payload.location.industry,
    },
    contacts: {
      ...payload.contacts,
      owner: {
        ...payload.contacts.owner,
        name: (user.contactName || user.name || "").trim(),
        email: (user.email || "").trim().toLowerCase(),
        phoneCountryCode:
          typeof user.phoneCountryCode === "number"
            ? user.phoneCountryCode
            : null,
        phoneNumber:
          typeof user.phoneNumber === "number" ? user.phoneNumber : null,
      },
    },
  };
}

export function seedHireOnboardingFromUser(
  user: HireOnboardingUser | null,
): HireOnboardingSaveInput {
  const seeded = lockAccessRequestFields(emptyHireOnboardingSave(), user);
  return {
    ...seeded,
    contacts: {
      ...seeded.contacts,
      owner: {
        ...seeded.contacts.owner,
        nationalityCode: seeded.location.countryCode,
      },
    },
  };
}
