import type { Metadata } from "next";
import StudioClient from "@/components/studio/StudioClient";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Студия профиля — Discord Profile Designer",
  description: "Интерактивный конструктор профиля Discord с автоподбором палитры.",
};

export default async function StudioPage() {
  const user = await getSessionUser();

  return (
    <div>
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8">
          <h1 className="text-[26px] font-bold tracking-tight">Студия профиля</h1>
          <p className="mt-1 max-w-2xl text-[13.5px] text-white/50">
            Слева — живой предпросмотр поповера Discord, справа — картинки, пипетки, палитры и
            экспорт. Аватар в режиме пары можно перетаскивать прямо мышью.
          </p>
        </div>
      </div>
      <StudioClient isLoggedIn={Boolean(user)} />
    </div>
  );
}
