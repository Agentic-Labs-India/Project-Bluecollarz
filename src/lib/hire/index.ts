import type { JobStatus } from "@/lib/jobs";
import type { HireProfileData } from "@/lib/hire/profile";

/** A single active role summary shown on the hire profile. */
export interface HireActiveRole {
  id: string;
  title: string;
  pay: string;
  status: JobStatus;
  applicants: number;
  publishedAt: string | null;
}

/** Aggregate hiring overview for the signed-in hirer's profile dashboard. */
export interface HireOverview {
  account: {
    name: string | null;
    email: string;
    phoneNumber: string | null;
    image: string | null;
    memberSince: string | null;
  };
  roles: {
    total: number;
    draft: number;
    published: number;
    closed: number;
  };
  applicants: {
    /** All applications across the hirer's roles. */
    total: number;
    /** Open applications on currently published roles. */
    active: number;
    /** Candidates marked as selected. */
    selected: number;
  };
  hiresThisMonth: number;
  activeRoles: HireActiveRole[];
  /** Editable company details stored on the hirer's user document. */
  profile: HireProfileData;
}
