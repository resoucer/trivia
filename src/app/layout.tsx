import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/AuthForm";
import { requestContext } from "@/server/context";
import "@/app/globals.css";

export { metadata, RootLayout as default };

const metadata: Metadata = {
  title: "Trivia — crie e compartilhe perguntas",
  description: "Crie trivias de múltipla escolha, compartilhe por link e veja o ranking das mais jogadas.",
};

async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await requestContext().match(
    (ctx) => ctx.viewer,
    () => ({ type: "anonymous" }) as const,
  );
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="mr-auto text-lg font-bold text-indigo-600">
              Trivia
            </Link>
            <Link href="/ranking" className="text-slate-600 hover:text-slate-900">Ranking</Link>
            <Link href="/criar" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">Criar trivia</Link>
            {viewer.type === "user" ? (
              <>
                <Link href="/minhas" className="text-slate-600 hover:text-slate-900">Minhas trivias</Link>
                <span className="text-slate-400">{viewer.user.displayName.value}</span>
                <LogoutButton />
              </>
            ) : (
              <Link href="/entrar" className="text-slate-600 hover:text-slate-900">Entrar</Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
