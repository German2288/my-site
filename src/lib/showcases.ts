import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { showcaseLikes, showcases, users } from "@/db/schema";
import { isValidHex, normalizeHex } from "./color";
import { slugifyUsername } from "./auth";

export type ShowcaseDto = {
  id: number;
  title: string;
  displayName: string;
  username: string;
  pronouns: string | null;
  bio: string | null;
  primaryColor: string;
  accentColor: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  tags: string[];
  likes: number;
  downloads: number;
  createdAt: string;
  author: { id: number; displayName: string; username: string; avatarUrl: string | null };
  likedByMe: boolean;
};

export type ListOptions = {
  q?: string;
  tag?: string;
  sort?: "top" | "new" | "downloads";
  limit?: number;
  userId?: number | null;
};

export async function listShowcases(options: ListOptions = {}): Promise<ShowcaseDto[]> {
  const { q, tag, sort = "top", limit = 60, userId } = options;
  const filters = [];
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    filters.push(
      or(
        ilike(showcases.title, needle),
        ilike(showcases.displayName, needle),
        ilike(showcases.username, needle),
        ilike(showcases.bio, needle),
      ),
    );
  }
  if (tag && tag.trim()) {
    filters.push(sql`${showcases.tags} && ARRAY[${tag.trim()}]::text[]`);
  }

  const order =
    sort === "new" ? desc(showcases.createdAt) : sort === "downloads" ? desc(showcases.downloads) : desc(showcases.likes);

  const rows = await db
    .select({
      id: showcases.id,
      title: showcases.title,
      displayName: showcases.displayName,
      username: showcases.username,
      pronouns: showcases.pronouns,
      bio: showcases.bio,
      primaryColor: showcases.primaryColor,
      accentColor: showcases.accentColor,
      avatarUrl: showcases.avatarUrl,
      bannerUrl: showcases.bannerUrl,
      avatarFocusX: showcases.avatarFocusX,
      avatarFocusY: showcases.avatarFocusY,
      avatarZoom: showcases.avatarZoom,
      tags: showcases.tags,
      likes: showcases.likes,
      downloads: showcases.downloads,
      createdAt: showcases.createdAt,
      authorId: users.id,
      authorName: users.displayName,
      authorUsername: users.username,
      authorAvatar: users.avatarUrl,
    })
    .from(showcases)
    .innerJoin(users, eq(users.id, showcases.authorId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(order, desc(showcases.id))
    .limit(Math.min(Math.max(limit, 1), 100));

  let liked = new Set<number>();
  if (userId && rows.length) {
    const likes = await db
      .select({ showcaseId: showcaseLikes.showcaseId })
      .from(showcaseLikes)
      .where(
        and(
          eq(showcaseLikes.userId, userId),
          sql`${showcaseLikes.showcaseId} in (${sql.join(
            rows.map((row) => sql`${row.id}`),
            sql`, `,
          )})`,
        ),
      );
    liked = new Set(likes.map((like) => like.showcaseId));
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    displayName: row.displayName,
    username: row.username,
    pronouns: row.pronouns,
    bio: row.bio,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    avatarUrl: row.avatarUrl,
    bannerUrl: row.bannerUrl,
    avatarFocusX: row.avatarFocusX,
    avatarFocusY: row.avatarFocusY,
    avatarZoom: row.avatarZoom,
    tags: row.tags ?? [],
    likes: row.likes,
    downloads: row.downloads,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.authorId,
      displayName: row.authorName,
      username: row.authorUsername,
      avatarUrl: row.authorAvatar,
    },
    likedByMe: liked.has(row.id),
  }));
}

export type CreateShowcaseInput = {
  title?: string;
  displayName?: string;
  username?: string;
  pronouns?: string | null;
  bio?: string | null;
  primaryColor?: string;
  accentColor?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarZoom?: number;
  tags?: string[];
};

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function createShowcase(authorId: number, input: CreateShowcaseInput) {
  const primary = normalizeHex(String(input.primaryColor ?? ""));
  const accent = normalizeHex(String(input.accentColor ?? ""));
  if (!isValidHex(primary) || !isValidHex(accent)) {
    throw new Error("Нужны корректные HEX-цвета для Primary и Accent");
  }
  const displayName = clean(input.displayName, 32) || "Anonymous";
  const title = clean(input.title, 60) || `${displayName} pack`;
  const tags = Array.isArray(input.tags)
    ? [...new Set(input.tags.map((tag) => clean(tag, 24)).filter(Boolean))].slice(0, 5)
    : [];

  const [created] = await db
    .insert(showcases)
    .values({
      authorId,
      title,
      displayName,
      username: slugifyUsername(clean(input.username, 32) || displayName),
      pronouns: input.pronouns ? clean(input.pronouns, 24) : null,
      bio: input.bio ? String(input.bio).slice(0, 400) : null,
      primaryColor: primary,
      accentColor: accent,
      avatarUrl: input.avatarUrl ? String(input.avatarUrl).slice(0, 800) : null,
      bannerUrl: input.bannerUrl ? String(input.bannerUrl).slice(0, 800) : null,
      avatarFocusX: Number.isFinite(input.avatarFocusX) ? Number(input.avatarFocusX) : 0.22,
      avatarFocusY: Number.isFinite(input.avatarFocusY) ? Number(input.avatarFocusY) : 0.38,
      avatarZoom: Number.isFinite(input.avatarZoom) ? Number(input.avatarZoom) : 1,
      tags,
    })
    .returning({ id: showcases.id });

  return created;
}

export async function toggleLike(showcaseId: number, userId: number) {
  const [existing] = await db
    .select({ id: showcaseLikes.id })
    .from(showcaseLikes)
    .where(and(eq(showcaseLikes.showcaseId, showcaseId), eq(showcaseLikes.userId, userId)))
    .limit(1);

  if (existing) {
    await db.delete(showcaseLikes).where(eq(showcaseLikes.id, existing.id));
    const [row] = await db
      .update(showcases)
      .set({ likes: sql`greatest(${showcases.likes} - 1, 0)` })
      .where(eq(showcases.id, showcaseId))
      .returning({ likes: showcases.likes });
    return { liked: false, likes: row?.likes ?? 0 };
  }

  await db.insert(showcaseLikes).values({ showcaseId, userId }).onConflictDoNothing();
  const [row] = await db
    .update(showcases)
    .set({ likes: sql`${showcases.likes} + 1` })
    .where(eq(showcases.id, showcaseId))
    .returning({ likes: showcases.likes });
  return { liked: true, likes: row?.likes ?? 1 };
}

export async function registerDownload(showcaseId: number) {
  const [row] = await db
    .update(showcases)
    .set({ downloads: sql`${showcases.downloads} + 1` })
    .where(eq(showcases.id, showcaseId))
    .returning({ downloads: showcases.downloads });
  return row?.downloads ?? 0;
}
