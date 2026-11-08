import type { Metadata } from "next";
import { LegalPage, linkClass } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help and support · CrewJio",
  description: "Get help with CrewJio: signing in, importing your roster, groups and deleting your account.",
};

export default function SupportPage() {
  return (
    <LegalPage title="Help and support">
      <section>
        <h2>Contact us</h2>
        <p>
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>{" "}
          and a real person will reply, usually within two working days. Tell us which phone you use and what happened, and
          send a screenshot if you can. Please don&apos;t send us your roster or any codes.
        </p>
      </section>

      <section>
        <h2>Common questions</h2>
        <h3 className="mb-1 mt-4 font-semibold text-cloud">My sign-in code didn&apos;t arrive</h3>
        <p>
          Check your spam folder, wait a minute, then ask for a new code. Each new code replaces the last one, so use the
          newest. If you use a mobile number, make sure you entered it with your country code.
        </p>
        <h3 className="mb-1 mt-4 font-semibold text-cloud">How do I import my roster?</h3>
        <p>
          Tap the + button, then Import whole month. Choose up to four screenshots of your roster app (list view or calendar
          view), or one PDF of your roster up to 2.5 MB, tap Read my roster, and check what we found before you save. A code we don&apos;t recognise is never saved
          until you confirm it.
        </p>
        <h3 className="mb-1 mt-4 font-semibold text-cloud">Who can see my roster?</h3>
        <p>
          Only people in a group with you or your partner, and only at the level you chose for that group. Nobody can search
          for you. You can show any one person less in the group screen, and they are not told.
        </p>
        <h3 className="mb-1 mt-4 font-semibold text-cloud">How do I add my partner?</h3>
        <p>
          One of you opens the Partner tab, makes a code and sends it. The other enters it. Entering the code connects you
          straight away.
        </p>
        <h3 className="mb-1 mt-4 font-semibold text-cloud">I don&apos;t fly. Can I still use CrewJio?</h3>
        <p>
          Yes. Choose &ldquo;I&apos;m not crew&rdquo; when you sign up, add your work or busy time (or copy your phone calendar),
          and connect with your partner to see the days you are both free.
        </p>
      </section>

      <section>
        <h2>Delete my account</h2>
        <p>
          In the app, open Me and tap Delete my account. Can&apos;t get into the app? See{" "}
          <a href="/delete-account" className={linkClass}>
            how to delete your account
          </a>
          .
        </p>
      </section>

      <section>
        <p>
          CrewJio is independent and is not affiliated with any airline.{" "}
          <a href="/privacy" className={linkClass}>
            Privacy policy
          </a>{" "}
          ·{" "}
          <a href="/terms" className={linkClass}>
            Terms of use
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
