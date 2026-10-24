import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Preserve the browser host when Next.js normalizes its internal request URL.
  const origin = new URL(url.origin);
  origin.host = req.headers.get("host") ?? origin.host;
  const code = url.searchParams.get("code");
  if (code) {
    const client = await db();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await client.auth.getUser();
      const { data: profile } = user
        ? await client
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
        : { data: null };
      return NextResponse.redirect(
        new URL(
          profile?.role === "EMPLOYER" ? "/employer/company" : "/profile",
          origin,
        ),
      );
    }
  }
  return NextResponse.redirect(new URL("/login?verification=sign-in", origin));
}
