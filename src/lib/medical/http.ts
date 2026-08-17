import "server-only";

import { NextResponse } from "next/server";
import { MedicalError } from "@/lib/medical/types";

export function handleMedicalRouteError(error: unknown, context: string) {
  if (error instanceof MedicalError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error(context, error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
