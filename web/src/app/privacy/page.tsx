import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { Footer } from "@/components/Footer";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy · CrewJio",
  description: "How CrewJio collects, uses and protects your personal data under Singapore's PDPA.",
};

// Starting point written for the waitlist. Have it reviewed before the app launches,
// and extend it to cover rosters, groups and partner sharing.
const UPDATED = "9 October 2026";

export default function PrivacyPage() {
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
        <h1 className="mb-3 text-4xl font-bold tracking-[-0.03em] md:text-5xl">Privacy policy</h1>
        <p className="mb-12 text-faint">Last updated {UPDATED}</p>

        <div className="flex flex-col gap-10 leading-relaxed text-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-cloud [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          <section>
            <p>
              CrewJio (&ldquo;we&rdquo;) is an independent app for cabin crew and pilots in Singapore. We are not affiliated with
              any airline. This policy explains how we handle personal data in line with Singapore&apos;s Personal Data
              Protection Act 2012 (PDPA).
            </p>
          </section>

          <section>
            <h2>What we collect on the waitlist</h2>
            <ul>
              <li>Your first name and email address</li>
              <li>Your Instagram handle, if you give it</li>
              <li>Whether you&apos;re cabin crew, a pilot, or a partner or friend of crew, and your airline</li>
              <li>What you find hardest about planning around rosters, if you tell us</li>
              <li>Whether you&apos;d like to be a beta tester, and when you gave consent</li>
            </ul>
          </section>

          <section>
            <h2>How we use it</h2>
            <p>
              To confirm your sign-up, tell you when the beta or the app is ready for you, ask for feedback if you volunteered as
              a beta tester, and understand what crew need from CrewJio. We don&apos;t sell your data or use it for advertising.
            </p>
          </section>

          <section>
            <h2>Where it&apos;s stored and who processes it</h2>
            <p>
              Waitlist data is stored with Supabase in its Singapore region. Emails are sent through Resend. The site is hosted on
              Vercel. These providers process data on our behalf and only as needed to run CrewJio.
            </p>
          </section>

          <section>
            <h2>How long we keep it</h2>
            <p>
              Until you unsubscribe or ask us to delete it, or until the waitlist is no longer needed after launch, whichever
              comes first.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              Every email has a one-click unsubscribe link. You can also withdraw consent, ask what data we hold about you, or
              ask us to correct or delete it by emailing{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cloud underline decoration-white/30 underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              . We reply within 30 days.
            </p>
          </section>

          <section>
            <h2>The CrewJio app</h2>
            <p>
              When the app launches, this policy will be updated to cover roster data. Our principles already apply: roster
              screenshots are deleted right after reading, staff numbers and aircraft registrations are never stored, and private
              duty codes are only ever shown to you.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy, or for our Data Protection Officer, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-cloud underline decoration-white/30 underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
