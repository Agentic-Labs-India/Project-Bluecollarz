import { afterEach, describe, expect, test } from "bun:test";
import { normalizeBlobContentType } from "@/lib/blob/pathname";
import { blobReadWriteToken } from "@/lib/blob/token";

describe("normalizeBlobContentType", () => {
  test("strips codec parameters", () => {
    expect(normalizeBlobContentType("video/webm;codecs=vp9,opus")).toBe(
      "video/webm",
    );
  });

  test("falls back when empty", () => {
    expect(normalizeBlobContentType(undefined)).toBe(
      "application/octet-stream",
    );
  });
});

describe("blobReadWriteToken", () => {
  const previous = process.env.BLOB_READ_WRITE_TOKEN;

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = previous;
  });

  test("requires BLOB_READ_WRITE_TOKEN", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(() => blobReadWriteToken()).toThrow(/BLOB_READ_WRITE_TOKEN is required/);
  });

  test("returns the private store token", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_private";
    expect(blobReadWriteToken()).toBe("vercel_blob_rw_private");
  });
});
