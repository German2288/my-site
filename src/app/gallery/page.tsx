import type { Metadata } from "next";
import GalleryClient from "@/components/gallery/GalleryClient";
import { getSessionUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { listShowcases } from "@/lib/showcases";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Галерея профилей — Discord Profile Designer",
  description: "Витрина готовых сборок профилей Discord: палитры, лайки, теги, паки картинок.",
};

export default async function GalleryPage() {
  await ensureSeed();
  const user = await getSessionUser();
  const items = await listShowcases({ sort: "top", limit: 60, userId: user?.id ?? null });

  return <GalleryClient initialItems={items} isLoggedIn={Boolean(user)} />;
}
