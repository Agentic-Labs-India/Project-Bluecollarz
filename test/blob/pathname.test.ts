import { afterEach, describe, expect, test } from "bun:test";
import {
  isInterviewRecordingUrl,
  isMedicalReportUrl,
  isStoredPrivateBlobUrl,
} from "@/lib/blob/pathname";

const INTERVIEW_ID = "67c0a1b2c3d4e5f678901234";
const APPOINTMENT_ID = "67c0a1b2c3d4e5f678901235";

describe("isStoredPrivateBlobUrl", () => {
  test("accepts private and unlabeled hosts", () => {
    expect(
      isStoredPrivateBlobUrl(
        "https://abc.private.blob.vercel-storage.com/file.pdf",
      ),
    ).toBe(true);
    expect(
      isStoredPrivateBlobUrl("https://abc.blob.vercel-storage.com/file.pdf"),
    ).toBe(true);
  });

  test("rejects public hosts", () => {
    expect(
      isStoredPrivateBlobUrl(
        "https://abc.public.blob.vercel-storage.com/file.pdf",
      ),
    ).toBe(false);
  });
});

describe("isInterviewRecordingUrl", () => {
  const previous = process.env.DB_NAME;

  afterEach(() => {
    process.env.DB_NAME = previous;
  });

  test("accepts a private blob URL under the interview folder", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isInterviewRecordingUrl(
        `https://abc123.private.blob.vercel-storage.com/blucollarz-dev/interviews/${INTERVIEW_ID}/clip-xyz.webm`,
        INTERVIEW_ID,
      ),
    ).toBe(true);
  });

  test("accepts a store host without public/private in the subdomain", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isInterviewRecordingUrl(
        `https://abc123.blob.vercel-storage.com/blucollarz-dev/interviews/${INTERVIEW_ID}/clip.mp4`,
        INTERVIEW_ID,
      ),
    ).toBe(true);
  });

  test("rejects a public blob URL even with the right path", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isInterviewRecordingUrl(
        `https://abc123.public.blob.vercel-storage.com/blucollarz-dev/interviews/${INTERVIEW_ID}/clip.webm`,
        INTERVIEW_ID,
      ),
    ).toBe(false);
  });

  test("rejects a private URL for a different interview", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isInterviewRecordingUrl(
        `https://abc123.private.blob.vercel-storage.com/blucollarz-dev/interviews/${INTERVIEW_ID}/clip.webm`,
        "aaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBe(false);
  });
});

describe("isMedicalReportUrl", () => {
  const previous = process.env.DB_NAME;

  afterEach(() => {
    process.env.DB_NAME = previous;
  });

  test("accepts a private report URL", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isMedicalReportUrl(
        `https://abc.private.blob.vercel-storage.com/blucollarz-dev/admin/medical/${APPOINTMENT_ID}/report.pdf`,
        APPOINTMENT_ID,
      ),
    ).toBe(true);
  });

  test("rejects a public report URL", () => {
    process.env.DB_NAME = "blucollarz-dev";
    expect(
      isMedicalReportUrl(
        `https://abc.public.blob.vercel-storage.com/blucollarz-dev/admin/medical/${APPOINTMENT_ID}/report.pdf`,
        APPOINTMENT_ID,
      ),
    ).toBe(false);
  });
});
