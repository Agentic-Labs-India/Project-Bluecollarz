import { asPositiveInt } from "@/lib/utils";

/** DPDP Rules, 2025: acknowledge promptly; grievances within 90 days. */
export const RIGHTS_ACKNOWLEDGE_HOURS = asPositiveInt(
  process.env.DPDP_RIGHTS_ACK_HOURS,
  72,
);
export const RIGHTS_RESOLVE_DAYS = asPositiveInt(
  process.env.DPDP_RIGHTS_RESOLVE_DAYS,
  90,
);
