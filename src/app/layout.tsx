import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DecisionLab: overthink it, but make it fun",
  description:
    "Work through a dilemma with pros & cons or weighted criteria, then put it before a jury of friends.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b-2 border-ink bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-sun">
                ⚖️
              </span>
              DecisionLab
            </Link>
            <span className="hidden text-sm text-ink/60 sm:block">Overthink it, but make it fun.</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="py-6 text-center text-xs text-ink/50">
          DecisionLab helps you think. It doesn&apos;t know the right answer, and neither does the jury.
        </footer>
      </body>
    </html>
  );
}
