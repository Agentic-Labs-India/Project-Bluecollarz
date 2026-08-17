import { type NextRequest, NextResponse } from "next/server";
import {
  getPlatformSettings,
  platformSettingsPatchSchema,
  savePlatformSettings,
} from "@/lib/admin/platform-settings";
import { defaultPlatformSettings } from "@/lib/admin/platform-settings-defaults";
import { requireProfile, rethrowIfPrerenderAbort } from "@/lib/auth/session";
import { ensureIndexes } from "@/lib/db/indexes";
import { formatZodError } from "@/lib/utils";

/** Current + default platform settings for the admin Settings page. */
export async function GET() {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const [settings, defaults] = await Promise.all([
      getPlatformSettings(),
      Promise.resolve(defaultPlatformSettings()),
    ]);
    return NextResponse.json({ settings, defaults });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("GET /api/admin/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/** Replace platform settings and bust the shared cache tag. */
export async function PATCH(req: NextRequest) {
  try {
    await ensureIndexes();
    const auth = await requireProfile("admin");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const body = await req.json().catch(() => null);
    const parsed = platformSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const settings = await savePlatformSettings({
      patch: parsed.data,
      updatedBy: auth.user.id,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    rethrowIfPrerenderAbort(error);
    console.error("PATCH /api/admin/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
