import type { HireProfileData } from "@/lib/hire/profile";
import type { JobStatus } from "@/lib/jobs/enums";

/** A single active role summary shown on the hire profile. */
export interface HireActiveRole {
  id: string;
  title: string;
  pay: string;
  status: JobStatus;
  applicants: number;
}

/** Aggregate hiring overview for the signed-in hirer's profile dashboard. */
export interface HireOverview {
  account: {
    name: string | null;
    email: string;
    phoneNumber: number | null;
    phoneCountryCode: number | null;
    image: string | null;
    memberSince: string | null;
  };
  roles: {
    total: number;
    draft: number;
    underVerification: number;
    published: number;
    closed: number;
  };
  applicants: {
    /** All applications across the hirer's roles. */
    total: number;
    /** Candidates marked as selected. */
    selected: number;
  };
  activeRoles: HireActiveRole[];
  /** Access-request company fields on Users (read-only). */
  profile: HireProfileData;
};
