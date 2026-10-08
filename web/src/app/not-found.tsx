import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page not found · CrewJio",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <main className="mx-auto flex min-h-[80svh] max-w-[32rem] flex-col items-start justify-center gap-6 px-4 py-16">
        <p className="font-mono text-sm font-bold tracking-[0.2em] text-amber">404</p>
        <h1 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">This page isn&apos;t on the roster</h1>
        <p className="text-lg leading-relaxed text-muted">The link may be old or mistyped. The waitlist is on the home page.</p>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-amber px-6 font-semibold text-on-amber transition-transform duration-500 ease-fluid active:scale-[0.97]"
        >
          Back to CrewJio
        </Link>
      </main>
      <Footer />
    </>
  );
}
