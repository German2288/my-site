import { NextResponse } from "next/server";
import { clearSession, getSessionUser, loginAsGuest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { displayName?: string };
    const user = await loginAsGuest(String(body.displayName ?? ""));
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось войти" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
