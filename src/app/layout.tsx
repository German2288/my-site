import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord Profile Designer — аватарки, баннеры и темы профиля",
  description:
    "Конструктор профиля Discord: точный предпросмотр, автоподбор палитры по картинке, бесшовные пары аватар+баннер и галерея готовых сборок.",
  openGraph: {
    title: "Discord Profile Designer",
    description:
      "Подбирайте аватарки, баннеры и цветовые схемы для профиля Discord в живом предпросмотре.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#0b0c10] text-white antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="border-t border-white/10 bg-[#0a0b0e]">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-8 text-[13px] text-white/40 sm:flex-row sm:items-center lg:px-8">
            <p>
              Discord Profile Designer — пет-проект для дизайнеров профилей. Не связан с Discord
              Inc.
            </p>
            <nav className="flex gap-4 sm:ml-auto">
              <Link href="/studio" className="transition hover:text-white">
                Студия
              </Link>
              <Link href="/sets" className="transition hover:text-white">
                Сеты
              </Link>
              <Link href="/gallery" className="transition hover:text-white">
                Галерея
              </Link>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                GitHub
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
