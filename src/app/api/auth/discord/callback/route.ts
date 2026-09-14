import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { discordOAuthConfigured, discordRedirectUri, loginWithDiscord } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!discordOAuthConfigured() || !code) {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  const store = await cookies();
  const expectedState = store.get("dpd_oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/?auth=state`);
  }
  store.delete("dpd_oauth_state");

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID ?? "",
        client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
        grant_type: "authorization_code",
        code,
        redirect_uri: discordRedirectUri(origin),
      }),
    });
    if (!tokenResponse.ok) throw new Error("token exchange failed");
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) throw new Error("no access token");

    const profileResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!profileResponse.ok) throw new Error("profile fetch failed");
    const profile = await profileResponse.json();

    await loginWithDiscord(profile);
    return NextResponse.redirect(`${origin}/studio`);
  } catch {
    return NextResponse.redirect(`${origin}/?auth=error`);
  }
}
