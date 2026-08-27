"use server";

import { z } from "zod";
import { guardToActionFail, requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { actionFail, actionOk, type ActionResult } from "@/lib/core/action";
import { resolveCountryName } from "@/lib/core/geo/places";
import { ensureIndexes } from "@/lib/db/indexes";
import {
  createRecruiterInquiry,
  listRecruiterInquiries,
  reviewRecruiterInquiry,
} from "@/lib/hire/inquiries";
import type { RecruiterInquiryListItem } from "@/lib/hire/inquiries/types";
import {
  RECRUITER_INQUIRY_STATUSES,
  recruiterInquiryCreateSchema,
  type RecruiterInquiryStatus,
} from "@/lib/hire/inquiries/types";
import { formatZodError } from "@/lib/utils";

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function createRecruiterInquiryAction(
  input: unknown,
): Promise<ActionResult<{ item: RecruiterInquiryListItem }>> {
  await ensureIndexes();
  const parsed = recruiterInquiryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  const country = resolveCountryName(parsed.data.country);
  if (!country) {
    return actionFail("Select a valid country from the list");
  }
  try {
    const item = await createRecruiterInquiry({
      ...parsed.data,
      country,
    });
    return actionOk({ item });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("createRecruiterInquiryAction:", error);
    return actionFail("Could not submit request");
  }
}

export async function listRecruiterInquiriesAction(
  status: "all" | RecruiterInquiryStatus,
): Promise<
  ActionResult<{ items: RecruiterInquiryListItem[]; hasMore: boolean }>
> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  if (
    status !== "all" &&
    !(RECRUITER_INQUIRY_STATUSES as readonly string[]).includes(status)
  ) {
    return actionFail("Invalid inquiry status");
  }
  try {
    const result = await listRecruiterInquiries({ status });
    return actionOk(result);
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("listRecruiterInquiriesAction:", error);
    return actionFail("Failed to load inquiries");
  }
}

export async function reviewRecruiterInquiryAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ item: RecruiterInquiryListItem }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  if (!auth.user.email) {
    return actionFail("Admin account is missing email");
  }
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  try {
    const item = await reviewRecruiterInquiry({
      id,
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      reviewer: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      },
    });
    if (!item) return actionFail("Inquiry not found");
    return actionOk({ item });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    const message =
      error instanceof Error ? error.message : "Could not update inquiry";
    console.error("reviewRecruiterInquiryAction:", error);
    return actionFail(message);
  }
}
