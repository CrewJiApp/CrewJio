import Link from "next/link";
import Image from "next/image";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";
import { CONTACT_EMAIL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1200px] px-4 pb-12 pt-8 md:px-8">
      <div className="flex flex-col gap-8 border-t border-white/[0.07] pt-10 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CrewJio home">
            <Image src="/brand/icon.png" alt="" width={32} height={32} className="rounded-[9px]" />
            <span className="text-[17px] font-bold tracking-tight">
              Crew<span className="text-amber">Jio</span>
            </span>
          </Link>
          <p className="max-w-[40ch] text-sm leading-relaxed text-faint">
            Jio your crew. Find the day. Not affiliated with any airline.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-muted transition-colors duration-300 ease-fluid hover:text-cloud sm:-ml-0"
          >
            <EnvelopeSimpleIcon size={18} weight="light" aria-hidden />
            {CONTACT_EMAIL}
          </a>
          <a
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-muted transition-colors duration-300 ease-fluid hover:text-cloud"
          >
            Privacy policy
          </a>
          <span className="px-3 text-faint">© 2026 CrewJio</span>
        </nav>
      </div>
    </footer>
  );
}
