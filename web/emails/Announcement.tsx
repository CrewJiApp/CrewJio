import { CrewJioLayout, H1, P, CTA, SignOff } from "./components/CrewJioLayout";

/**
 * General-purpose CrewJio email: beta invites, product updates, anything else.
 * Copy this file for a new email type, or use it as is with props.
 */
type Props = {
  preview: string;
  headline: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  reason?: string;
  unsubscribeUrl?: string;
};

export default function Announcement({ preview, headline, paragraphs, cta, reason, unsubscribeUrl }: Props) {
  return (
    <CrewJioLayout preview={preview} reason={reason} unsubscribeUrl={unsubscribeUrl}>
      <H1>{headline}</H1>
      {paragraphs.map((p, i) => (
        <P key={i}>{p}</P>
      ))}
      {cta ? <CTA href={cta.href}>{cta.label}</CTA> : null}
      <SignOff />
    </CrewJioLayout>
  );
}

Announcement.PreviewProps = {
  preview: "Your CrewJio beta spot is ready.",
  headline: "Your beta spot is ready",
  paragraphs: [
    "You're in. Download CrewJio, screenshot your roster, and add your batch.",
    "It ranks the days you're all home and rested, and keeps reservist and leave days blocked.",
  ],
  cta: { label: "Get the beta", href: "https://crewjio.com/beta" },
  unsubscribeUrl: "https://crewjio.com/unsubscribe?t=preview",
} satisfies Props;
