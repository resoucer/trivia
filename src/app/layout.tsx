import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";

export { metadata, RootLayout as default };

const metadata: Metadata = { title: "Trivia" };

function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
