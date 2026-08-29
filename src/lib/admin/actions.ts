"use server";

import { z } from "zod";
import {
  approveJobVerification,
  denyJobVerification,
  getJobUnderVerification,
  listJobsUnderVerification,
} from "@/lib/admin/job-verification";
import type {
  AdminJobVerificationItem,
  AdminJobVerificationListItem,
  AdminUserListItem,
} from "@/lib/admin/types";
import {
  platformSettingsPatchSchema,
  savePlatformSettings,
} from "@/lib/admin/platform-settings";
import type { PlatformSettingsPublic } from "@/lib/admin/platform-settings-types";
import { deleteUserProvision } from "@/lib/admin/provisions";
import {
  listUsersByProfileType,
  upsertUserProfileTypeByEmail,
} from "@/lib/admin/queries";
import { guardToActionFail, requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { actionFail, actionOk, type ActionResult } from "@/lib/core/action";
import { formatZodError } from "@/lib/utils";

const provisionSchema = z.object({
  email: z.string().trim().email("Valid email required"),
  profileType: z.enum(["hire", "admin"]),
});

const cancelInviteSchema = z.object({
  email: z.string().trim().email(),
});

const jobReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    raRcNumber: z.preprocess((val) => {
      if (typeof val !== "string") return undefined;
      const s = val.trim();
      return s.length ? s : undefined;
    }, z.string().max(64).optional()),
  }),
  z.object({
    action: z.literal("deny"),
    reason: z
      .string()
      .trim()
      .min(3, "Please provide a denial reason")
      .max(2000),
  }),
]);

function adminFail(error: unknown, fallback: string) {
  rethrowIfPrerenderAbort(error);
  console.error("admin action:", error);
  return actionFail(error instanceof Error ? error.message : fallback);
}

export async function savePlatformSettingsAction(
  patch: unknown,
): Promise<ActionResult<{ settings: PlatformSettingsPublic }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  const parsed = platformSettingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  try {
    const settings = await savePlatformSettings({
      patch: parsed.data,
      updatedBy: auth.user.id,
    });
    return actionOk({ settings });
  } catch (error) {
    return adminFail(error, "Failed to save settings");
  }
}

export async function listAdminUsersAction(
  type: "hire" | "admin",
): Promise<ActionResult<{ items: AdminUserListItem[] }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const items = await listUsersByProfileType(type);
    return actionOk({ items });
  } catch (error) {
    return adminFail(error, "Failed to load users");
  }
}

export async function provisionAdminUserAction(
  input: unknown,
): Promise<ActionResult<{ item: AdminUserListItem; created: boolean }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  const parsed = provisionSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  const email = parsed.data.email.trim().toLowerCase();
  if (email === auth.user.email) {
    return actionFail("You cannot change your own role this way");
  }
  try {
    const result = await upsertUserProfileTypeByEmail(
      email,
      parsed.data.profileType,
    );
    return actionOk(result);
  } catch (error) {
    return adminFail(error, "Could not add user");
  }
}

export async function cancelAdminInviteAction(
  input: unknown,
): Promise<ActionResult<{ cancelled: true }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  const parsed = cancelInviteSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  try {
    const removed = await deleteUserProvision(parsed.data.email);
    if (!removed) return actionFail("Invite not found");
    return actionOk({ cancelled: true });
  } catch (error) {
    return adminFail(error, "Could not cancel invite");
  }
}

export async function listJobsUnderVerificationAction(): Promise<
  ActionResult<{ items: AdminJobVerificationListItem[] }>
> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const items = await listJobsUnderVerification();
    return actionOk({ items });
  } catch (error) {
    return adminFail(error, "Failed to load jobs");
  }
}

export async function getJobUnderVerificationAction(
  id: string,
): Promise<ActionResult<{ item: AdminJobVerificationItem }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const item = await getJobUnderVerification(id);
    if (!item) {
      return actionFail("Job not found or not awaiting verification");
    }
    return actionOk({ item });
  } catch (error) {
    return adminFail(error, "Failed to load job details");
  }
}

export async function reviewJobVerificationAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ item: AdminJobVerificationItem }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  const parsed = jobReviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  try {
    if (parsed.data.action === "approve") {
      const item = await approveJobVerification({
        id,
        reviewerName: auth.user.name,
        raRcNumber: parsed.data.raRcNumber,
      });
      return actionOk({ item });
    }
    const item = await denyJobVerification({
      id,
      reason: parsed.data.reason,
      reviewerName: auth.user.name,
    });
    return actionOk({ item });
  } catch (error) {
    return adminFail(error, "Could not update job");
  }
}
