"use server";

import { z } from "zod";
import { guardToActionFail, requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { actionFail, actionOk, type ActionFailure, type ActionResult } from "@/lib/core/action";
import {
  getOrCreateHireOnboarding,
  listHireOnboardings,
  reviewHireOnboarding,
  saveHireOnboarding,
  submitHireOnboarding,
} from "@/lib/hire/onboarding";
import {
  HIRE_ONBOARDING_STATUSES,
  type HireOnboardingData,
  type HireOnboardingListItem,
  type HireOnboardingStatus,
  hireOnboardingSaveSchema,
} from "@/lib/hire/onboarding/types";
import { formatZodError } from "@/lib/utils";

const reviewSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("verified"),
    adminNote: z.string().trim().max(2000).optional(),
  }),
  z.object({
    status: z.literal("rejected"),
    adminNote: z
      .string()
      .trim()
      .min(8, "Describe the changes required")
      .max(2000),
  }),
]);

function onboardingFail(error: unknown, fallback: string): ActionFailure {
  rethrowIfPrerenderAbort(error);
  const message = error instanceof Error ? error.message : fallback;
  console.error("hire onboarding action:", error);
  return actionFail(message);
}

export async function getHireOnboardingAction(): Promise<
  ActionResult<{ item: HireOnboardingData }>
> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const item = await getOrCreateHireOnboarding(auth.user.id);
    return actionOk({ item });
  } catch (error) {
    return onboardingFail(error, "Failed to load onboarding");
  }
}

export async function saveHireOnboardingAction(
  input: unknown,
): Promise<ActionResult<{ item: HireOnboardingData }>> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  const parsed = hireOnboardingSaveSchema.safeParse(input);
  if (!parsed.success) {
    return actionFail(formatZodError(parsed.error));
  }
  try {
    const item = await saveHireOnboarding({
      userId: auth.user.id,
      payload: parsed.data,
    });
    return actionOk({ item });
  } catch (error) {
    return onboardingFail(error, "Could not save onboarding");
  }
}

export async function submitHireOnboardingAction(): Promise<
  ActionResult<{ item: HireOnboardingData }>
> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const item = await submitHireOnboarding(auth.user.id);
    return actionOk({ item });
  } catch (error) {
    return onboardingFail(error, "Could not submit onboarding");
  }
}

export async function listHireOnboardingsAction(
  status: "all" | HireOnboardingStatus,
): Promise<ActionResult<{ items: HireOnboardingListItem[] }>> {
  const auth = await requireProfile("admin");
  if (!auth.ok) return guardToActionFail(auth);
  if (
    status !== "all" &&
    !(HIRE_ONBOARDING_STATUSES as readonly string[]).includes(status)
  ) {
    return actionFail("Invalid onboarding status");
  }
  try {
    const result = await listHireOnboardings({ status });
    return actionOk(result);
  } catch (error) {
    return onboardingFail(error, "Failed to load onboarding");
  }
}

export async function reviewHireOnboardingAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ item: HireOnboardingListItem }>> {
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
    const item = await reviewHireOnboarding({
      id,
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      reviewer: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      },
    });
    if (!item) return actionFail("Onboarding not found");
    return actionOk({ item });
  } catch (error) {
    return onboardingFail(error, "Could not update onboarding");
  }
}
