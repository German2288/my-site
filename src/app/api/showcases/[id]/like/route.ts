import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleLike } from "@/lib/showcases";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Нужно войти, чтобы ставить лайки" }, { status: 401 });
  }
  const { id } = await params;
  const showcaseId = Number.parseInt(id, 10);
  if (!Number.isFinite(showcaseId)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }
  try {
    const result = await toggleLike(showcaseId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка лайка" },
      { status: 400 },
    );
  }
}
