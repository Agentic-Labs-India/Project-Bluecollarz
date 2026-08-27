"use server";

import { actionFail, actionOk, type ActionFailure, type ActionResult } from "@/lib/core/action";
import { guardToActionFail, requireProfile, requireUser } from "@/lib/auth/session";
import { rethrowIfPrerenderAbort } from "@/lib/auth/session";
import {
  getOwnedApplicantDetail,
  getOwnedJobEditor,
  listHireJobs,
  listOwnedJobApplicants,
  type ApplicantListInput,
  type HireJobsListInput,
} from "@/lib/jobs/hire-queries";
import {
  applyToPublishedJob,
  createOwnedJob,
  JobCommandError,
  updateOwnedApplicantStatus,
  updateOwnedJob,
} from "@/lib/jobs/commands";
import type { JobEditorPayload, JobListItem, PaginatedJobsResponse } from "@/lib/jobs";
import type {
  ApplicationStatus,
  ApplicantDetail,
  PaginatedApplicantsResponse,
} from "@/lib/jobs/applications";
import {
  getPublishedOpportunities,
  type OpportunitiesResult,
} from "@/lib/jobs/queries";

function fromCommandError(error: unknown): ActionFailure {
  rethrowIfPrerenderAbort(error);
  if (error instanceof JobCommandError) {
    return actionFail(error.message, error.code);
  }
  console.error("jobs action:", error);
  return actionFail("Internal Server Error");
}

export async function listPublishedOpportunitiesAction(input: {
  tab?: string;
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
  pinJobId?: string | null;
}): Promise<ActionResult<OpportunitiesResult>> {
  const auth = await requireUser();
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const result = await getPublishedOpportunities({
      viewerId: auth.user.id,
      viewerProfileType: auth.user.profileType,
      tab: input.tab ?? "",
      search: input.search ?? "",
      priority: input.priority ?? "",
      page: input.page ?? 1,
      limit: input.limit ?? 12,
      pinJobId: input.pinJobId ?? null,
    });
    return actionOk(result);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function listHireJobsAction(
  input: HireJobsListInput,
): Promise<ActionResult<PaginatedJobsResponse>> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const result = await listHireJobs(auth.user.id, input);
    return actionOk(result);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function getOwnedJobEditorAction(
  jobId: string,
): Promise<ActionResult<JobEditorPayload>> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const payload = await getOwnedJobEditor(auth.user.id, jobId);
    if (!payload) return actionFail("Job not found");
    return actionOk(payload);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function createJobAction(
  input: unknown,
): Promise<ActionResult<{ id: string; item: JobListItem }>> {
  try {
    const created = await createOwnedJob(input);
    return actionOk(created);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function updateJobAction(
  jobId: string,
  input: unknown,
): Promise<ActionResult<{ item: JobListItem }>> {
  try {
    const item = await updateOwnedJob(jobId, input);
    return actionOk({ item });
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function applyToJobAction(
  jobId: string,
): Promise<ActionResult<{ applied: true }>> {
  try {
    const result = await applyToPublishedJob(jobId);
    return actionOk(result);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function listJobApplicantsAction(
  jobId: string,
  input: ApplicantListInput,
): Promise<ActionResult<PaginatedApplicantsResponse>> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const result = await listOwnedJobApplicants(auth.user.id, jobId, input);
    if (!result) return actionFail("Role not found");
    return actionOk(result);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function getOwnedApplicantDetailAction(
  jobId: string,
  applicantId: string,
): Promise<ActionResult<ApplicantDetail>> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const detail = await getOwnedApplicantDetail(
      auth.user.id,
      jobId,
      applicantId,
    );
    if (!detail) return actionFail("Application not found");
    return actionOk(detail);
  } catch (error) {
    return fromCommandError(error);
  }
}

export async function updateApplicantStatusAction(
  jobId: string,
  applicantId: string,
  status: ApplicationStatus,
): Promise<
  ActionResult<{
    application: { id: string; status: ApplicationStatus; appliedAt: string };
  }>
> {
  const auth = await requireProfile("hire");
  if (!auth.ok) return guardToActionFail(auth);
  try {
    const application = await updateOwnedApplicantStatus({
      ownerId: auth.user.id,
      jobId,
      applicantId,
      status,
    });
    return actionOk({ application });
  } catch (error) {
    return fromCommandError(error);
  }
}
