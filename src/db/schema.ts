import {
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Пользователи. Создаются либо через Discord OAuth2 (если заданы ключи),
 * либо через быстрый guest-вход (только ник) — чтобы сайт работал "из коробки".
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    discordId: text("discord_id"),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    isGuest: integer("is_guest").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_discord_id_key").on(table.discordId)],
);

/**
 * Витрина (showcase) — опубликованная сборка профиля Discord.
 */
export const showcases = pgTable(
  "showcases",
  {
    id: serial("id").primaryKey(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
    pronouns: text("pronouns"),
    bio: text("bio"),
    primaryColor: text("primary_color").notNull(),
    accentColor: text("accent_color").notNull(),
    avatarUrl: text("avatar_url"),
    bannerUrl: text("banner_url"),
    /** Нормализованные координаты фокуса (0..1) и зум для бесшовных пар. */
    avatarFocusX: real("avatar_focus_x").notNull().default(0.22),
    avatarFocusY: real("avatar_focus_y").notNull().default(0.42),
    avatarZoom: real("avatar_zoom").notNull().default(1),
    tags: text("tags").array().notNull().default([]),
    likes: integer("likes").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("showcases_likes_idx").on(table.likes)],
);

export const showcaseLikes = pgTable(
  "showcase_likes",
  {
    id: serial("id").primaryKey(),
    showcaseId: integer("showcase_id")
      .notNull()
      .references(() => showcases.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("showcase_likes_unique").on(table.showcaseId, table.userId)],
);

export type User = typeof users.$inferSelect;
export type Showcase = typeof showcases.$inferSelect;
export type NewShowcase = typeof showcases.$inferInsert;
