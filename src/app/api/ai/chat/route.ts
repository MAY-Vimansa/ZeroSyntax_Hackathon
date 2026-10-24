import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: { code: "AI_NOT_CONFIGURED" } },
    { status: 503 },
  );
}
