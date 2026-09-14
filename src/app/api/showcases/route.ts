import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { createShowcase, listShowcases } from "@/lib/showcases";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeed();
  const url = new URL(request.url);
  const user = await getSessionUser();
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "new" || sortParam === "downloads" ? sortParam : "top";

  const items = await listShowcases({
    q: url.searchParams.get("q") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    sort,
    limit: Number(url.searchParams.get("limit") ?? 60),
    userId: user?.id ?? null,
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Нужно войти, чтобы публиковать сборки" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const created = await createShowcase(user.id, body);
    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось опубликовать" },
      { status: 400 },
    );
  }
}
