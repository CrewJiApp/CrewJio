import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { Footer } from "@/components/Footer";

/** Shared layout for the privacy policy, terms, support and delete-account pages. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-[44rem] px-4 pb-24 pt-10 md:px-8 md:pt-16">
        <Link
          href="/"
          className="mb-12 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.04] pl-3 pr-4 text-sm text-muted ring-1 ring-white/10 transition-colors duration-300 ease-fluid hover:text-cloud"
        >
          <ArrowLeftIcon size={16} weight="light" aria-hidden />
          Back to CrewJio
        </Link>
        <h1 className="mb-3 text-4xl font-bold tracking-[-0.03em] md:text-5xl">{title}</h1>
        {updated ? <p className="mb-12 text-faint">Last updated {updated}</p> : <div className="mb-12" />}
        <div className="flex flex-col gap-10 leading-relaxed text-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-cloud [&_li]:ml-5 [&_li]:list-disc [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1.5 [&_ol_li]:list-decimal [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

export const linkClass = "text-cloud underline decoration-white/30 underline-offset-4";
