import { sql } from "drizzle-orm";
import { db } from "@/db";
import { showcases, users } from "@/db/schema";

type SeedShowcase = {
  author: string;
  username: string;
  title: string;
  displayName: string;
  pronouns: string | null;
  bio: string;
  primaryColor: string;
  accentColor: string;
  avatarUrl: string;
  bannerUrl: string;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  tags: string[];
  likes: number;
  downloads: number;
};

const SEED: SeedShowcase[] = [
  {
    author: "kira",
    username: "kira.exe",
    title: "Neon Tokyo Night",
    displayName: "Kira",
    pronouns: "she/her",
    bio: "night city enjoyer · valorant radiant · 3am playlists\npair: neon tokyo",
    primaryColor: "#7b2ff7",
    accentColor: "#00e5ff",
    avatarUrl: "/art/cyberpunk.png",
    bannerUrl: "/art/cyberpunk.png",
    avatarFocusX: 0.2118,
    avatarFocusY: 0.4,
    avatarZoom: 1,
    tags: ["Cyberpunk", "Neon", "Gamer"],
    likes: 428,
    downloads: 96,
  },
  {
    author: "yuki",
    username: "yuki_04",
    title: "Sakura Dusk",
    displayName: "Yuki",
    pronouns: "she/her",
    bio: "люблю пастельные профили и долгие плейлисты 🌸",
    primaryColor: "#f2a1c1",
    accentColor: "#8a6ff0",
    avatarUrl: "/art/sakura.png",
    bannerUrl: "/art/sakura.png",
    avatarFocusX: 0.2118,
    avatarFocusY: 0.4,
    avatarZoom: 1,
    tags: ["Anime", "Pastel", "Kawaii"],
    likes: 651,
    downloads: 214,
  },
  {
    author: "void",
    username: "void.exe",
    title: "Deep Ocean Minimal",
    displayName: "void",
    pronouns: "they/them",
    bio: "less, but better.",
    primaryColor: "#0f7f8b",
    accentColor: "#a8e0d0",
    avatarUrl: "/art/ocean.png",
    bannerUrl: "/art/ocean.png",
    avatarFocusX: 0.2118,
    avatarFocusY: 0.4,
    avatarZoom: 1,
    tags: ["Minimalism", "Calm", "Nature"],
    likes: 307,
    downloads: 88,
  },
  {
    author: "retro",
    username: "retro.drive",
    title: "Retro Drive 1985",
    displayName: "RETR∅",
    pronouns: null,
    bio: "synthwave / retrowave / outrun\nvinyl > spotify",
    primaryColor: "#ff5f6d",
    accentColor: "#6a1b9d",
    avatarUrl: "/art/sunset.png",
    bannerUrl: "/art/sunset.png",
    avatarFocusX: 0.58,
    avatarFocusY: 0.52,
    avatarZoom: 1.1,
    tags: ["Synthwave", "Retro", "Neon"],
    likes: 512,
    downloads: 173,
  },
  {
    author: "moss",
    username: "mossy",
    title: "Emerald Botanic",
    displayName: "moss",
    pronouns: "they/them",
    bio: "растения, кофе, тишина ☕🌿",
    primaryColor: "#1f6f50",
    accentColor: "#d4af37",
    avatarUrl: "/art/botanic.png",
    bannerUrl: "/art/botanic.png",
    avatarFocusX: 0.2118,
    avatarFocusY: 0.4,
    avatarZoom: 1,
    tags: ["Nature", "Dark", "Aesthetic"],
    likes: 189,
    downloads: 41,
  },
  {
    author: "nova",
    username: "novainspace",
    title: "Cosmic Drift",
    displayName: "Nova",
    pronouns: null,
    bio: "astro photo · elite dangerous · tea\n«мы — способ космоса узнать о себе»",
    primaryColor: "#3b3bb5",
    accentColor: "#2ee6c8",
    avatarUrl: "/art/nebula.png",
    bannerUrl: "/art/nebula.png",
    avatarFocusX: 0.2118,
    avatarFocusY: 0.4,
    avatarZoom: 1,
    tags: ["Space", "Sci-Fi", "Dark"],
    likes: 376,
    downloads: 129,
  },
];

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(showcases);
  if (count > 0) return;

  const authorIds = new Map<string, number>();
  for (const row of SEED) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.username} = ${row.username}`)
      .limit(1);
    if (existing) {
      authorIds.set(row.author, existing.id);
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({
        username: row.username,
        displayName: row.displayName,
        isGuest: 1,
      })
      .returning({ id: users.id });
    authorIds.set(row.author, created.id);
  }

  await db.insert(showcases).values(
    SEED.map((row) => ({
      authorId: authorIds.get(row.author)!,
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
      tags: row.tags,
      likes: row.likes,
      downloads: row.downloads,
    })),
  );
}

/** Идемпотентно наполняет галерею демо-контентом (один раз на процесс). */
export async function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      console.error("seed failed", error);
    });
  }
  await seedPromise;
}
