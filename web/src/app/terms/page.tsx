import type { Metadata } from "next";
import { LegalPage, linkClass } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use · CrewJio",
  description: "The rules for using the CrewJio app and website.",
};

// Plain-language terms. Have a lawyer review them before launch.
const UPDATED = "21 October 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated={UPDATED}>
      <section>
        <p>
          These terms are between you and CrewJio, the operator of the CrewJio app and website. By creating an account or
          using CrewJio you agree to them and to our{" "}
          <a href="/privacy" className={linkClass}>
            privacy policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>What CrewJio is, and is not</h2>
        <p>
          CrewJio helps you share your roster with people you choose and find the days you are free together. It is an
          independent app and is not affiliated with, endorsed by or connected to any airline. CrewJio does not change your
          roster, does not perform duty swaps and does not speak for your airline. Swap ideas are suggestions only: any swap
          happens in your airline&apos;s own system. Your airline&apos;s official roster is always the one to rely on.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be an adult and give us accurate information.</li>
          <li>You are responsible for what happens under your account, so keep your sign-in to yourself.</li>
          <li>One person, one account. You can delete your account at any time in the app.</li>
        </ul>
      </section>

      <section>
        <h2>Your roster and your content</h2>
        <p>
          Your roster and notes stay yours. You give us permission to store them and show them to the people you choose, at
          the level you choose, and to process them to run the app. Only add information you are allowed to share. Do not add
          anything that is confidential to your employer, such as staff numbers or details your airline asks you to keep
          private, and check your airline&apos;s policy on sharing roster information.
        </p>
      </section>

      <section>
        <h2>Using CrewJio properly</h2>
        <ul>
          <li>Don&apos;t try to see anyone&apos;s roster without their permission, or to get around the sharing settings.</li>
          <li>Don&apos;t harass or pester other people, or use CrewJio to do anything unlawful.</li>
          <li>Don&apos;t interfere with the service, reverse engineer it or use it to build a competing product.</li>
          <li>Only invite people you know. Groups are private and are joined with an invite code.</li>
        </ul>
        <p className="mt-3">We may suspend or remove accounts that break these rules.</p>
      </section>

      <section>
        <h2>Suggestions and accuracy</h2>
        <p>
          The days CrewJio suggests, such as &ldquo;Great&rdquo; or &ldquo;Evening&rdquo;, are worked out from what you and
          your people have entered or imported, so they are only as good as that information. Rest estimates are a guide, not
          advice about fatigue or fitness to fly. Imported rosters are read by software and can contain mistakes, so please
          check them before you save.
        </p>
      </section>

      <section>
        <h2>Availability and changes</h2>
        <p>
          We work to keep CrewJio running but cannot promise it will always be available or error free. CrewJio is an early
          product and features may change or be removed. We may update these terms, and if the change matters we will tell you
          in the app or by email.
        </p>
      </section>

      <section>
        <h2>Our responsibility</h2>
        <p>
          To the extent the law allows, CrewJio is provided &ldquo;as is&rdquo;, and we are not liable for indirect or
          consequential loss, or for losses from relying on a suggestion instead of your official roster, such as a missed
          duty or plan. Nothing in these terms limits anything the law does not allow us to limit.
        </p>
      </section>

      <section>
        <h2>Law</h2>
        <p>These terms are governed by the laws of Singapore, and the courts of Singapore can hear any dispute.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
