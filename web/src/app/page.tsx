import {
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";
import { ArcMark } from "@/components/ArcMark";
import { CtaLink } from "@/components/CtaLink";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PhoneShot } from "@/components/PhoneShot";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex self-start rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted ring-1 ring-white/10">
      {children}
    </span>
  );
}

const STEPS = [
  {
    title: "Snap it, don't type it",
    body: "Screenshot your month in the airline app and upload. We read the flights, standby and training days for you.",
    src: "/screens/import.png",
    alt: "CrewJio import screen listing November duties read from three roster screenshots",
  },
  {
    title: "A group for each circle",
    body: "Not everyone knows everyone. Each group only sees its own members, and you choose what each group sees.",
    src: "/screens/groups.png",
    alt: "CrewJio groups screen with a partner and three crew groups, each with its own sharing level",
  },
  {
    title: "See the best day, then jio",
    body: "We rank days by rest, so nobody gets jio-ed to dinner straight after a London flight.",
    src: "/screens/best-days.png",
    alt: "CrewJio group plan showing the best days in November ranked Great, Evening and Tired",
  },
];

const FAQ = [
  {
    q: "Who is CrewJio for?",
    a: "Cabin crew and pilots based in Singapore, starting with SIA and Scoot. Partners, family and friends of crew can join too, so they know when you're home.",
  },
  {
    q: "Is this an official airline app?",
    a: "No. CrewJio is independent and not affiliated with any airline. Your official roster and any duty swaps stay in your airline's own system.",
  },
  {
    q: "Who can see my roster?",
    a: "Only people you add, in groups you create. For each group you choose what they see: off days only, where you're flying, or your full roster. Groups never see each other.",
  },
  {
    q: "What happens to my roster screenshots?",
    a: "We read them, then delete them straight away. Staff numbers, crew IDs and aircraft registrations are removed before anything is saved.",
  },
  {
    q: "My partner isn't crew. Can they use it?",
    a: "Yes. Partners get a one-to-one connection with your full roster and a heads-up when you land. Family can follow along with a share link, no app needed.",
  },
  {
    q: "When can I start using it?",
    a: "We're opening the beta to a small group first. Everyone on the waitlist hears from us by email, and beta volunteers get in first.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid min-h-[100dvh] max-w-[1200px] items-center gap-10 px-4 pb-16 pt-24 md:px-8 md:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <div className="order-2 flex flex-col items-start gap-6 lg:order-1">
            <div className="rise">
              <Eyebrow>For SG cabin crew and pilots</Eyebrow>
            </div>
            <div className="rise" style={{ animationDelay: "80ms" }}>
              <h1 className="max-w-[13ch] text-[2.75rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
                Find the days you&apos;re both home.
              </h1>
            </div>
            <div className="rise" style={{ animationDelay: "160ms" }}>
              <p className="max-w-[38ch] text-lg leading-relaxed text-muted md:text-xl">
                Share rosters with your crew friends and partner. No more group-chat date juggling.
              </p>
            </div>
            <div className="rise" style={{ animationDelay: "240ms" }}>
              <CtaLink href="#waitlist">Get early access</CtaLink>
            </div>
          </div>

          <div className="relative order-1 mx-auto w-full max-w-[17rem] sm:max-w-[22rem] lg:order-2 lg:max-w-none">
            <ArcMark className="w-full lg:hidden" />
            {/* Desktop: the mark behind a tilted phone showing a real roster */}
            <div className="relative hidden h-[640px] lg:block">
              <ArcMark className="absolute inset-x-0 top-6 w-full" />
              <div style={{ animationDelay: "350ms" }} className="rise absolute left-1/2 top-[150px] w-[290px] -translate-x-1/2">
                <PhoneShot
                  src="/screens/roster.png"
                  alt="CrewJio roster for October 2026 with flights, training and standby days"
                  priority
                  sizes="290px"
                  className="rotate-[3deg]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1200px] px-4 py-24 md:px-8 md:py-36">
          <Reveal className="mb-14 flex max-w-[34rem] flex-col gap-4 md:mb-20">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">How it works</h2>
            <p className="text-lg leading-relaxed text-muted">Three steps from roster screenshot to a day everyone can make.</p>
          </Reveal>

          <ol className="grid gap-16 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className={i === 1 ? "md:mt-20" : i === 2 ? "md:mt-40" : ""}>
                <Reveal delay={i * 120} className="flex flex-col gap-6">
                  <PhoneShot src={s.src} alt={s.alt} className="mx-auto w-full max-w-[19rem]" sizes="(min-width: 768px) 30vw, 80vw" />
                  <div className="flex gap-4 px-1">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/12 font-mono text-sm font-bold text-amber ring-1 ring-amber/30"
                    >
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                      <p className="leading-relaxed text-muted">{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-[1200px] px-4 py-24 md:px-8 md:py-36">
          <Reveal className="mb-14 flex max-w-[36rem] flex-col gap-4 md:mb-16">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">Your roster, on your terms</h2>
            <p className="text-lg leading-relaxed text-muted">You decide who sees what. Nothing is public.</p>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-6 md:gap-5">
            {/* Large: private codes, with a live example of what friends see */}
            <Reveal className="md:col-span-4 md:row-span-2">
              <Bezel className="h-full">
                <div className="flex h-full flex-col justify-between gap-10 bg-[radial-gradient(28rem_18rem_at_100%_0%,rgb(201_182_255/0.10),transparent_70%)] p-7 md:p-10">
                  <div className="flex flex-col gap-3">
                    <EyeSlashIcon size={28} weight="light" className="text-lavender" aria-hidden />
                    <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">Private codes stay private</h3>
                    <p className="max-w-[44ch] leading-relaxed text-muted">
                      Medical leave, interviews, family leave and other personal codes are never shown to friends or groups. They
                      only ever see &ldquo;Unavailable&rdquo;.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-night/70 p-4 ring-1 ring-white/5">
                      <p className="mb-2 text-xs font-medium text-faint">You see</p>
                      <p className="flex items-center justify-between gap-3">
                        <span className="font-medium">Thu 12 Nov</span>
                        <span className="rounded-full bg-lavender/15 px-3 py-1 font-mono text-xs font-bold text-lavender">
                          Medical leave
                        </span>
                      </p>
                    </div>
                    <div className="rounded-2xl bg-night/70 p-4 ring-1 ring-white/5">
                      <p className="mb-2 text-xs font-medium text-faint">Your groups see</p>
                      <p className="flex items-center justify-between gap-3">
                        <span className="font-medium">Thu 12 Nov</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold text-muted">Unavailable</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Bezel>
            </Reveal>

            <Reveal delay={100} className="md:col-span-2">
              <Bezel className="h-full">
                <div className="flex h-full flex-col gap-3 bg-[radial-gradient(20rem_14rem_at_0%_0%,rgb(79_209_197/0.10),transparent_70%)] p-7">
                  <MagnifyingGlassIcon size={28} weight="light" className="text-teal" aria-hidden />
                  <h3 className="text-xl font-semibold tracking-tight">Nobody can search for you</h3>
                  <p className="leading-relaxed text-muted">People connect only through an invite link or your contacts.</p>
                </div>
              </Bezel>
            </Reveal>

            <Reveal delay={200} className="md:col-span-2">
              <Bezel className="h-full">
                <div className="flex h-full flex-col gap-3 p-7">
                  <TrashIcon size={28} weight="light" className="text-amber" aria-hidden />
                  <h3 className="text-xl font-semibold tracking-tight">Screenshots deleted after reading</h3>
                  <p className="leading-relaxed text-muted">Staff numbers and aircraft registrations are removed first.</p>
                </div>
              </Bezel>
            </Reveal>

            <Reveal delay={100} className="md:col-span-6">
              <Bezel>
                <div className="flex flex-col gap-3 p-7 md:flex-row md:items-center md:gap-6 md:px-10">
                  <ShieldCheckIcon size={28} weight="light" className="shrink-0 text-cloud" aria-hidden />
                  <p className="leading-relaxed text-muted">
                    <span className="font-semibold text-cloud">Not affiliated with any airline.</span> CrewJio is an independent
                    app made for crew. Swaps and roster changes still happen in your airline&apos;s official system.
                  </p>
                </div>
              </Bezel>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 md:px-8 md:py-36 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl lg:sticky lg:top-32">Questions</h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="faq-item group rounded-3xl bg-card/60 ring-1 ring-white/[0.06] open:bg-card">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left text-[17px] font-semibold">
                    {f.q}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                      <PlusIcon size={14} weight="bold" className="faq-icon transition-transform duration-500 ease-fluid" aria-hidden />
                    </span>
                  </summary>
                  <p className="faq-body max-w-[60ch] px-6 pb-6 leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="mx-auto max-w-[1200px] px-4 py-24 md:px-8 md:py-36">
          <Reveal>
            <Bezel radius="2.5rem">
              <div className="grid gap-12 bg-[radial-gradient(40rem_24rem_at_0%_0%,rgb(245_182_66/0.08),transparent_70%)] p-6 py-10 md:p-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:p-16">
                <div className="flex flex-col gap-5">
                  <Eyebrow>Waitlist</Eyebrow>
                  <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">Get early access</h2>
                  <p className="max-w-[36ch] text-lg leading-relaxed text-muted">
                    We&apos;re opening the beta to a small group first. Join the list and we&apos;ll email you when your spot is
                    ready.
                  </p>
                </div>
                <WaitlistForm />
              </div>
            </Bezel>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** Double-bezel container: hairline tray outside, raised card inside. */
function Bezel({ children, className = "", radius = "2rem" }: { children: React.ReactNode; className?: string; radius?: string }) {
  return (
    <div
      className={`bg-white/[0.03] p-1.5 ring-1 ring-white/[0.08] ${className}`}
      style={{ borderRadius: radius }}
    >
      <div
        className="h-full overflow-hidden bg-card shadow-[inset_0_1px_1px_rgb(255_255_255/0.08)]"
        style={{ borderRadius: `calc(${radius} - 0.375rem)` }}
      >
        {children}
      </div>
    </div>
  );
}
