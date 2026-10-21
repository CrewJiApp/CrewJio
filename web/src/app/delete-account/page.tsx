import type { Metadata } from "next";
import { LegalPage, linkClass } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your account · CrewJio",
  description: "How to permanently delete your CrewJio account and data.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account">
      <section>
        <h2>In the app (instant)</h2>
        <ol>
          <li>Open CrewJio and tap Me.</li>
          <li>Tap Delete my account, then confirm.</li>
        </ol>
        <p className="mt-3">Your account is deleted straight away. You can&apos;t undo it.</p>
      </section>

      <section>
        <h2>If you can&apos;t open the app</h2>
        <p>
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Delete my CrewJio account`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>{" "}
          from the email address you signed up with (or tell us the mobile number you use) and write &ldquo;Delete my
          account&rdquo;. We may ask one question to check it is you. We delete your account within 30 days, usually much
          sooner, and confirm by email.
        </p>
      </section>

      <section>
        <h2>What is deleted</h2>
        <ul>
          <li>Your profile and sign-in details</li>
          <li>Your roster: every duty, leave day and note, and any busy times copied from your calendar</li>
          <li>Your place in every group, and your connection with your partner</li>
          <li>Any limits you set on what individual people see, and your import count</li>
        </ul>
        <p className="mt-3">
          A group you started stays with its other members, and the longest-standing member becomes its owner. If you were the
          only member, the group is deleted too. Copies in our providers&apos; routine backups are removed as those backups roll
          over. We never stored your roster screenshots.
        </p>
      </section>

      <section>
        <h2>Waitlist emails</h2>
        <p>
          To stop waitlist emails, use the unsubscribe link at the bottom of any of them. To have your waitlist details deleted
          as well, email us.
        </p>
      </section>

      <section>
        <p>
          More in our{" "}
          <a href="/privacy" className={linkClass}>
            privacy policy
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
