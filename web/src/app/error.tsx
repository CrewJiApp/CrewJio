"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

// Shown if a page crashes while rendering. Keeps people on brand with a way forward.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[32rem] flex-col items-start justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-[-0.03em] md:text-5xl">Something went wrong</h1>
      <p className="text-lg leading-relaxed text-muted">
        Try again in a moment. If it keeps happening, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-cloud underline decoration-white/30 underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center rounded-full bg-amber px-6 font-semibold text-on-amber transition-transform duration-500 ease-fluid active:scale-[0.97]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full bg-white/[0.04] px-6 font-semibold text-cloud ring-1 ring-white/10"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
