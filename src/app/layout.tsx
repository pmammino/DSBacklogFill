import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Science Backlog",
  description: "Submit and track Data Science work requests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
                DS
              </span>
              <span className="text-lg font-semibold text-gray-900">
                Data Science Backlog
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/" className="btn-secondary">
                Requests
              </Link>
              <Link href="/new" className="btn-primary">
                New Request
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
