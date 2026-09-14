import Link from "next/link";
import AuthMenu from "@/components/AuthMenu";
import { discordOAuthConfigured, getSessionUser } from "@/lib/auth";

export default async function SiteHeader() {
  const user = await getSessionUser().catch(() => null);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c10]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[15px] font-black text-white shadow-lg shadow-indigo-900/40">
            D
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Profile<span className="text-indigo-400">Designer</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {[
            { href: "/studio", label: "Студия" },
            { href: "/sets", label: "Парные сеты" },
            { href: "/gallery", label: "Галерея" },
            { href: "/#how", label: "Как это работает" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <AuthMenu
            displayName={user?.displayName ?? null}
            username={user?.username ?? null}
            discordAvailable={discordOAuthConfigured()}
          />
        </div>
      </div>
    </header>
  );
}
