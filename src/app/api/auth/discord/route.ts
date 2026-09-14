import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { discordAuthorizeUrl, discordOAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!discordOAuthConfigured()) {
    return NextResponse.redirect(`${origin}/?auth=discord-off`);
  }
  const state = crypto.randomUUID();
  const store = await cookies();
  store.set("dpd_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(discordAuthorizeUrl(origin, state));
}
