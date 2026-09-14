import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export const SESSION_COOKIE = "dpd_session";

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugifyUsername(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .split("")
    .map((char) => TRANSLIT[char] ?? char)
    .join("")
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 24);
  return base || `user${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) return null;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

async function setSession(userId: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Быстрый вход без пароля — чтобы сайт был живым сразу после клонирования. */
export async function loginAsGuest(displayName: string): Promise<User> {
  const name = (displayName || "").trim().slice(0, 32) || "Гость";
  const username = slugifyUsername(name);
  const [user] = await db
    .insert(users)
    .values({
      username,
      displayName: name,
      isGuest: 1,
    })
    .returning();
  await setSession(user.id);
  return user;
}

export type DiscordProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function loginWithDiscord(profile: DiscordProfile): Promise<User> {
  const displayName = (profile.global_name || profile.username || "Discord user").slice(0, 32);
  const username = slugifyUsername(profile.username || displayName);
  const avatarUrl = profile.avatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`
    : null;

  const [existing] = await db.select().from(users).where(eq(users.discordId, profile.id)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ displayName, username, avatarUrl })
      .where(eq(users.id, existing.id))
      .returning();
    await setSession(updated.id);
    return updated;
  }
  const [created] = await db
    .insert(users)
    .values({ discordId: profile.id, username, displayName, avatarUrl, isGuest: 0 })
    .returning();
  await setSession(created.id);
  return created;
}

export function discordOAuthConfigured(): boolean {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export function discordRedirectUri(origin: string): string {
  return process.env.DISCORD_REDIRECT_URI || `${origin}/api/auth/discord/callback`;
}

export function discordAuthorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    redirect_uri: discordRedirectUri(origin),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
