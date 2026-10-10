import { CrewJioLayout, H1, P, CTA, Divider, SignOff } from "./components/CrewJioLayout";

const WHATSAPP_SHARE =
  "https://wa.me/?text=" +
  encodeURIComponent("Found an app that finds the days our whole batch is home. Join the waitlist: https://crewjio.com");

/**
 * Sent right after someone joins the waitlist.
 * Subject: "You're on the CrewJio list ✈️"
 */
type Props = {
  firstName?: string;
  unsubscribeUrl: string;
};

export default function WaitlistConfirmation({ firstName = "there", unsubscribeUrl }: Props) {
  return (
    <CrewJioLayout
      preview="We'll email you when your beta spot is ready."
      unsubscribeUrl={unsubscribeUrl}
    >
      <H1>Hi {firstName}, you&apos;re on the list ✈️</H1>
      <P>
        CrewJio helps SG crew and pilots find the days you&apos;re all home, without the group-chat juggling.
      </P>
      <P>We&apos;re opening the beta to a small group first, and we&apos;ll email you when your spot is ready.</P>
      <P>
        <strong style={{ color: "#EEF2F7" }}>Want in faster?</strong> Jio your crew and share crewjio.com with
        your batch.
      </P>
      <CTA href={WHATSAPP_SHARE}>Send it to your batch</CTA>
      <Divider />
      <P>Just reply if you have ideas or questions. We read everything.</P>
      <SignOff />
    </CrewJioLayout>
  );
}

WaitlistConfirmation.PreviewProps = {
  firstName: "Sarah",
  unsubscribeUrl: "https://crewjio.com/unsubscribe?t=preview",
} satisfies Props;
