import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, DeviceMobileIcon, LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { CtaLink } from "@/components/CtaLink";
import { Footer } from "@/components/Footer";
import { PhoneShot } from "@/components/PhoneShot";
import { CONTACT_EMAIL, TESTFLIGHT_APP_URL, TESTFLIGHT_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Join the iPhone beta · CrewJio",
  description: "How to install the CrewJio beta on your iPhone with TestFlight, and how to get started: add your roster, make a group, connect your partner.",
};

const link = "text-cloud underline decoration-white/30 underline-offset-4";

interface Step {
  title: string;
  body: React.ReactNode;
  /** Small numbered taps shown under the step. */
  taps?: React.ReactNode[];
  shot?: { src: string; alt: string };
}

const b = (text: string) => <strong className="text-cloud">{text}</strong>;

const STEPS: Step[] = [
  {
    title: "Install TestFlight",
    body: (
      <>
        TestFlight is Apple&apos;s free app for trying apps before they are in the App Store. You only do this once. If you already
        have it, skip to step 2.
      </>
    ),
    taps: [
      <>Open the {b("App Store")} on your iPhone.</>,
      <>
        Tap {b("Search")} at the bottom right and type {b("TestFlight")}. Or{" "}
        <a href={TESTFLIGHT_APP_URL} className={link}>
          tap here to open it directly
        </a>
        .
      </>,
      <>
        Tap {b("Get")} next to TestFlight (the blue icon, by Apple), then confirm with Face ID, Touch ID or your Apple ID password.
      </>,
      <>
        Tap {b("Open")}. If it asks you to sign in, use your Apple ID, then tap {b("Continue")} and accept the terms.
      </>,
    ],
  },
  {
    title: "Add CrewJio to TestFlight",
    body: TESTFLIGHT_URL ? (
      <>
        The invite link is what adds CrewJio to your TestFlight. Do this on your iPhone, not on a computer.
      </>
    ) : (
      <>
        The invite arrives by email, from TestFlight or from us. We email it to you as soon as the beta link opens. Open the email on your
        iPhone and follow these taps.
      </>
    ),
    taps: TESTFLIGHT_URL
      ? [
          <>
            Tap {b("Open the TestFlight invite")} at the top of this page. If it opens inside another app, copy the link into Safari
            instead.
          </>,
          <>
            Safari asks if you want to open this in TestFlight. Tap {b("Open")}.
          </>,
          <>
            TestFlight shows a page for CrewJio. Tap {b("Accept")}, or {b("Start Testing")} if it shows that instead.
          </>,
          <>
            Tap {b("Install")} and wait for the download. Tap {b("Open")} when it finishes. CrewJio is now on your home screen, with a small
            orange dot next to its name. The dot means it is a beta app.
          </>,
        ]
      : [
          <>Open the invite email on your iPhone.</>,
          <>
            Tap {b("View in TestFlight")} (or {b("Start Testing")}). When Safari asks to open TestFlight, tap {b("Open")}.
          </>,
          <>
            TestFlight shows a page for CrewJio. Tap {b("Accept")}, then {b("Install")}.
          </>,
          <>
            Tap {b("Open")} when it finishes. CrewJio is now on your home screen, with a small orange dot next to its name. The dot means it
            is a beta app.
          </>,
        ],
  },
  {
    title: "Sign in",
    body: (
      <>
        Choose <strong className="text-cloud">Continue with Apple</strong>, <strong className="text-cloud">Continue with Google</strong>, or{" "}
        <strong className="text-cloud">Use email</strong> and we send a 6-digit code to your inbox. There is no password to remember. Check
        your spam folder if the code is slow.
      </>
    ),
  },
  {
    title: "Tell us how you use CrewJio",
    body: (
      <>
        Pick cabin crew, pilot, or <strong className="text-cloud">I&apos;m not crew</strong> if you are a partner, family member or friend.
        Crew then choose their rank and aircraft. Friends only see these as small labels.
      </>
    ),
  },
  {
    title: "Add your roster",
    body: (
      <>
        Tap <strong className="text-cloud">+</strong>, then <strong className="text-cloud">Import whole month</strong>. Choose up to four
        screenshots of your roster app (list view or calendar view), or one PDF of 2.5 MB or less, and tap Read my roster. Check what we
        found, then tap <strong className="text-cloud">Looks right</strong>. A code we don&apos;t recognise is never saved until you say
        so. You can also type codes one by one, or add a flight by hand. Not crew? Copy your phone calendar or add your work days instead.
      </>
    ),
    shot: { src: "/screens/import.png", alt: "CrewJio import screen listing duties read from roster screenshots" },
  },
  {
    title: "Make a group and invite your crew",
    body: (
      <>
        Open <strong className="text-cloud">Crew</strong>, tap <strong className="text-cloud">+</strong>, name your group and choose what
        it can see: off days only, where you are flying, or your full roster. Share the invite code. Friends tap{" "}
        <strong className="text-cloud">Join with a code</strong> on their Crew tab. Groups never see each other.
      </>
    ),
    shot: { src: "/screens/groups.png", alt: "CrewJio groups screen with a partner and three crew groups" },
  },
  {
    title: "Connect your partner",
    body: (
      <>
        Open <strong className="text-cloud">Partner</strong> and make a code. Send it to your partner, who enters it in their app. Entering
        the code connects you straight away, and your partner sees your full roster. Either of you can disconnect any time.
      </>
    ),
  },
  {
    title: "Find the best day, then jio",
    body: (
      <>
        Open a group to see the best days this month, ranked by rest. Tap <strong className="text-cloud">When can we meet?</strong> on the
        Crew tab to pick friends from different groups and find a day that works. Tap Propose to send a day to your friends.
      </>
    ),
  },
];

const TROUBLE = [
  {
    q: "TestFlight says the beta is full or not available",
    a: "The beta has a limited number of places. Join the waitlist on our home page and we will email you when more open, or ask the person who invited you to send a fresh link.",
  },
  {
    q: "I opened the link but nothing happened",
    a: "Open the link on your iPhone, not on a computer, and install the TestFlight app first. If the link opened in another app, copy it into Safari.",
  },
  {
    q: "The sign-in code did not arrive",
    a: "Check your spam folder, wait a minute, then ask for a new code. Only the newest code works. Apple and Google sign-in need no code.",
  },
  {
    q: "TestFlight says the build has expired",
    a: "Beta builds last 90 days. Open TestFlight and tap Update next to CrewJio. If there is no update yet, email us and we will send a new one.",
  },
  {
    q: "TestFlight says my iPhone is not compatible",
    a: "CrewJio needs iOS 16.4 or later. Open Settings, then General, then Software Update to see if your iPhone can update. Older iPhones that cannot reach 16.4 cannot run the beta yet.",
  },
  {
    q: "I use Android",
    a: "Android is not ready yet. Join the waitlist on our home page and we will email you when it is.",
  },
];

export default function BetaPage() {
  return (
    <>
      <main className="mx-auto max-w-[56rem] px-4 pb-24 pt-10 md:px-8 md:pt-16">
        <Link
          href="/"
          className="mb-12 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.04] pl-3 pr-4 text-sm text-muted ring-1 ring-white/10 transition-colors duration-300 ease-fluid hover:text-cloud"
        >
          <ArrowLeftIcon size={16} weight="light" aria-hidden />
          Back to CrewJio
        </Link>

        <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber sm:text-[13px] sm:tracking-[0.32em]">
          iPhone beta
        </p>
        <h1 className="mb-5 max-w-[18ch] text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-balance md:text-6xl">
          Join the CrewJio beta
        </h1>
        <p className="mb-10 max-w-[44ch] text-lg leading-relaxed text-muted">
          CrewJio is in a small beta for Singapore cabin crew, pilots and their partners, on iPhone. It takes about five minutes to
          install and set up.
        </p>

        {TESTFLIGHT_URL ? (
          <div className="mb-16 flex flex-col gap-4">
            <div>
              <CtaLink href={TESTFLIGHT_URL} icon="out">
                Open the TestFlight invite
              </CtaLink>
            </div>
            <p className="max-w-[48ch] text-sm leading-relaxed text-faint">
              Open this on your iPhone. If you don&apos;t have TestFlight yet, install it first (step 1 below).
            </p>
          </div>
        ) : (
          <div className="mb-16 flex flex-col gap-4 rounded-3xl bg-card p-6 ring-1 ring-white/[0.08] md:p-8">
            <h2 className="text-xl font-semibold tracking-tight">The invite link opens soon</h2>
            <p className="max-w-[52ch] leading-relaxed text-muted">
              We are finishing Apple&apos;s beta check. Join the list and we&apos;ll email you the invite as soon as it is ready. The
              steps below show what to expect.
            </p>
            <div>
              <CtaLink href="/#waitlist">Join the list</CtaLink>
            </div>
          </div>
        )}

        <section aria-labelledby="need" className="mb-16 grid gap-4 md:grid-cols-2">
          <h2 id="need" className="sr-only">
            What you need
          </h2>
          <div className="flex gap-4 rounded-3xl bg-card/60 p-6 ring-1 ring-white/[0.06]">
            <DeviceMobileIcon size={28} weight="light" className="mt-0.5 shrink-0 text-teal" aria-hidden />
            <p className="leading-relaxed text-muted">
              <span className="font-semibold text-cloud">An iPhone on iOS 16.4 or later.</span> To check, open Settings, then General, then About. Android is not ready yet.
            </p>
          </div>
          <div className="flex gap-4 rounded-3xl bg-card/60 p-6 ring-1 ring-white/[0.06]">
            <LockSimpleIcon size={28} weight="light" className="mt-0.5 shrink-0 text-amber" aria-hidden />
            <p className="leading-relaxed text-muted">
              <span className="font-semibold text-cloud">Your roster stays yours.</span> Only people you add see it, at the level you
              choose. Screenshots and PDFs are read once and never stored.
            </p>
          </div>
        </section>

        <h2 className="mb-8 text-3xl font-bold tracking-[-0.03em] md:text-4xl">Step by step</h2>
        <ol className="mb-20 flex flex-col gap-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-6 md:grid-cols-[1fr_15rem] md:items-start md:gap-10">
              <div className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/12 font-mono text-sm font-bold text-amber ring-1 ring-amber/30"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="max-w-[56ch] leading-relaxed text-muted">{s.body}</p>
                  {s.taps ? (
                    <ol className="mt-1 flex max-w-[56ch] flex-col gap-2.5 rounded-2xl bg-card/60 p-4 ring-1 ring-white/[0.06]">
                      {s.taps.map((t, k) => (
                        <li key={k} className="flex gap-3 leading-relaxed text-muted">
                          <span
                            aria-hidden
                            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] font-mono text-xs font-bold text-cloud ring-1 ring-white/10"
                          >
                            {String.fromCharCode(97 + k)}
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </div>
              {s.shot ? <PhoneShot src={s.shot.src} alt={s.shot.alt} className="mx-auto w-full max-w-[13rem] md:max-w-none" sizes="240px" /> : null}
            </li>
          ))}
        </ol>

        <h2 className="mb-6 text-3xl font-bold tracking-[-0.03em] md:text-4xl">If something goes wrong</h2>
        <div className="mb-16 flex flex-col gap-3">
          {TROUBLE.map((t) => (
            <details key={t.q} className="faq-item group rounded-3xl bg-card/60 ring-1 ring-white/[0.06] open:bg-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left text-[17px] font-semibold">
                {t.q}
              </summary>
              <p className="faq-body max-w-[60ch] px-6 pb-6 leading-relaxed text-muted">{t.a}</p>
            </details>
          ))}
        </div>

        <p className="max-w-[52ch] leading-relaxed text-muted">
          Found a bug, or something confusing? Take a screenshot and email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
          . We read everything. CrewJio is independent and not affiliated with any airline.
        </p>
      </main>
      <Footer />
    </>
  );
}
