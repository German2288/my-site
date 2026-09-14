import { NextResponse } from "next/server";
import { registerDownload } from "@/lib/showcases";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showcaseId = Number.parseInt(id, 10);
  if (!Number.isFinite(showcaseId)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }
  const downloads = await registerDownload(showcaseId);
  return NextResponse.json({ downloads });
}
