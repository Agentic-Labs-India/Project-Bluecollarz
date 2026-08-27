import { describe, expect, test } from "bun:test";
import { asUploadableBlob } from "@/lib/native/media-blob";

describe("asUploadableBlob", () => {
  test("materializes a MediaRecorder-style Blob so fetch can read it", async () => {
    const lazy = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: "video/webm",
    });
    const ready = await asUploadableBlob(lazy, "video/webm", "clip.webm");
    expect(ready).not.toBe(lazy);
    expect(ready).toBeInstanceOf(File);
    expect(ready.size).toBe(4);
    expect(ready.type).toBe("video/webm");
    expect((ready as File).name).toBe("clip.webm");
    expect(new Uint8Array(await ready.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  test("leaves File objects from disk inputs untouched", async () => {
    const file = new File([new Uint8Array([9])], "id.pdf", {
      type: "application/pdf",
    });
    const ready = await asUploadableBlob(file, "application/pdf");
    expect(ready).toBe(file);
  });
});
