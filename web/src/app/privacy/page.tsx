import type { Metadata } from "next";
import { LegalPage, linkClass } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy · CrewJio",
  description: "How CrewJio collects, uses and protects your personal data under Singapore's PDPA.",
};

// Plain-language policy covering the waitlist, the website and the app. Have a lawyer review it
// before launch, and update it whenever the app starts collecting something new.
const UPDATED = "21 October 2026";

export default function PrivacyPage() {
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
      {CONTACT_EMAIL}
    </a>
  );
  return (
    <LegalPage title="Privacy policy" updated={UPDATED}>
      <section>
        <p>
          CrewJio (&ldquo;we&rdquo;) is an independent app for cabin crew and pilots in Singapore, and for the partners and
          friends who plan around them. We are not affiliated with any airline. This policy explains what personal data we
          collect, why, who can see it and how to delete it, in line with Singapore&apos;s Personal Data Protection Act 2012
          (PDPA).
        </p>
      </section>

      <section>
        <h2>What we collect in the CrewJio app</h2>
        <ul>
          <li>
            <strong className="text-cloud">Your account:</strong> your email address or mobile number, or your Apple or Google
            sign-in identifier. We never see your Apple or Google password.
          </li>
          <li>
            <strong className="text-cloud">Your profile:</strong> the name you choose, whether you are cabin crew, a pilot or
            not crew, and for crew and pilots your airline, rank, aircraft fleets, whether you are Business class qualified
            and whether you are open to swaps.
          </li>
          <li>
            <strong className="text-cloud">Your roster:</strong> the duties you add, type or import (dates, duty types, flight
            numbers, airports and times), your leave and holidays, and any private notes you write. Only you can see your
            notes and the raw roster codes.
          </li>
          <li>
            <strong className="text-cloud">Groups and your partner:</strong> the groups you create or join, what each group
            may see of you, any person you have chosen to show less to, and your connection with your partner.
          </li>
          <li>
            <strong className="text-cloud">Busy times from your phone calendar</strong> (only if you are not crew and choose
            to copy it): the start and end times of when you are busy. We never read or store event names, places or who is
            invited.
          </li>
          <li>
            <strong className="text-cloud">Roster screenshots</strong> (only if you use import): see below. We also keep a
            count of how many imports you have used each month, to apply a monthly limit.
          </li>
        </ul>
        <p className="mt-3">
          We do not collect your location, contacts, photos (other than screenshots you choose to import), advertising
          identifiers or health information.
        </p>
      </section>

      <section>
        <h2>Who can see your roster</h2>
        <p>
          Nobody can search for you. People see your roster only if you join the same group or connect as partners, and only
          at the level you choose for each group: off days only, plus where you are flying, or your full roster. Groups never
          see each other. Leave, holidays, busy time and reservist days always show to groups as &ldquo;Away&rdquo;, and
          private codes always show as &ldquo;Unavailable&rdquo; to everyone but you. You can show any one person less than
          your group setting without them being told. Your partner sees your full roster.
        </p>
      </section>

      <section>
        <h2>Roster screenshots</h2>
        <p>
          When you import a roster, your screenshots (or a PDF of your roster) are sent to our secure server and then to an AI service (Anthropic&apos;s
          Claude) that reads the rows. We ask it to ignore staff numbers, names and aircraft details, and we remove anything
          other than dates, duty codes, flight numbers, airports and times before you see the result. The screenshots and PDFs are not
          saved by CrewJio, and nothing is added to your roster until you have checked it. Under Anthropic&apos;s commercial
          terms, data sent through its API is not used to train its models.
        </p>
      </section>

      <section>
        <h2>How we use it</h2>
        <p>
          To run CrewJio: sign you in, show your roster, find days you and your people are free, and sign you up to and
          email you about the waitlist or beta. We don&apos;t sell your data, we don&apos;t use it for advertising, and we
          don&apos;t track you across other apps or websites.
        </p>
      </section>

      <section>
        <h2>What we collect on the waitlist and the website</h2>
        <ul>
          <li>Your first name and email address</li>
          <li>Your Instagram handle, if you give it</li>
          <li>Whether you&apos;re cabin crew, a pilot, or a partner or friend of crew, and your airline</li>
          <li>What you find hardest about planning around rosters, if you tell us</li>
          <li>Whether you&apos;d like to be a beta tester, and when you gave consent</li>
        </ul>
        <p className="mt-3">
          We count visits to this website with Vercel Web Analytics. It records which pages are viewed, the page you came
          from, and your country, browser, operating system and device type. It doesn&apos;t use cookies and doesn&apos;t
          follow you across other sites.
        </p>
      </section>

      <section>
        <h2>Who processes it for us, and where</h2>
        <p>
          We use these providers, who process data only on our behalf and only as needed to run CrewJio: Supabase (database
          and sign-in, hosted in Singapore); Anthropic (reading roster screenshots, United States); Resend (emails); our SMS
          provider (sign-in codes to mobile numbers); Apple and Google (if you sign in with them); and Vercel (this website).
          Some of them process data outside Singapore. We only use providers that protect personal data to a standard
          comparable to the PDPA.
        </p>
      </section>

      <section>
        <h2>How long we keep it, and deleting it</h2>
        <p>
          We keep your data while you have an account. You can delete your account at any time in the app (Me, then Delete my
          account), or by following the steps on our{" "}
          <a href="/delete-account" className={linkClass}>
            delete account page
          </a>
          . Deleting your account permanently removes your profile, roster, group memberships and partner connection straight
          away. A group you started stays with its other members. Copies in our providers&apos; routine backups are removed
          as those backups roll over. Waitlist details are kept until you unsubscribe or ask us to delete them, or until the
          waitlist is no longer needed after launch.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          Every email has a one-click unsubscribe link. You can also withdraw consent, ask what data we hold about you, or ask
          us to correct or delete it by emailing {mail}. We reply within 30 days. If we ever have a data breach that is likely
          to cause you significant harm, we will tell you and the Personal Data Protection Commission as the law requires.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>CrewJio is for adults. We do not knowingly collect personal data from anyone under 16.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy in a way that matters, we will update the date above and tell app users in the app or by
          email.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions about this policy, or for our Data Protection Officer, email {mail}.</p>
      </section>
    </LegalPage>
  );
}
