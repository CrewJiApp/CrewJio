import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Copy comes from CLAUDE.md "Waitlist". Change it there first, then here.
// Preview locally with: npm run email:dev

interface Props {
  firstName: string;
  unsubscribeUrl: string;
  siteUrl: string;
}

const c = {
  night: "#0E1726",
  card: "#17233A",
  border: "#26354F",
  cloud: "#EEF2F7",
  muted: "#9AA8BF",
  faint: "#7A89A3",
  amber: "#F5B642",
};

const font = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const p = { color: c.cloud, fontSize: "16px", lineHeight: "26px", margin: "0 0 18px" } as const;

export default function WaitlistConfirmation({ firstName, unsubscribeUrl, siteUrl }: Props) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>You&apos;re on the list. We&apos;ll email you when your spot is ready.</Preview>
      <Body style={{ backgroundColor: c.night, margin: 0, padding: "32px 12px", fontFamily: font }}>
        <Container style={{ maxWidth: "520px", margin: "0 auto" }}>
          <Img src={`${siteUrl}/email/wordmark.png`} alt="CrewJio" width="160" height="48" style={{ margin: "0 0 24px -8px" }} />

          <Section
            style={{
              backgroundColor: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: "20px",
              padding: "32px 28px 14px",
            }}
          >
            <Text style={{ ...p, fontSize: "22px", lineHeight: "30px", fontWeight: 700 }}>
              Hi {firstName}, you&apos;re on the list.
            </Text>
            <Text style={p}>
              CrewJio helps SG crew and pilots find the days you&apos;re all home, without the group-chat juggling.
            </Text>
            <Text style={p}>
              We&apos;re opening the beta to a small group first, and we&apos;ll email you when your spot is ready.
            </Text>
            <Text style={p}>
              Want in faster?{" "}
              <Link href={siteUrl} style={{ color: c.amber, fontWeight: 700, textDecoration: "none" }}>
                Jio your crew
              </Link>{" "}
              and share{" "}
              <Link href={siteUrl} style={{ color: c.cloud, textDecoration: "none" }}>
                crewjio.com
              </Link>{" "}
              with your batch.
            </Text>
            <Text style={p}>Just reply if you have ideas or questions. We read everything.</Text>
            <Text style={{ ...p, color: c.muted }}>— Nick, CrewJio</Text>
          </Section>

          <Hr style={{ borderColor: c.border, margin: "28px 0 16px" }} />
          <Text style={{ color: c.faint, fontSize: "12px", lineHeight: "19px", margin: "0 0 6px" }}>
            You&apos;re getting this because you joined the CrewJio waitlist at{" "}
            <Link href={siteUrl} style={{ color: c.faint, textDecoration: "none" }}>
              crewjio.com
            </Link>
            .{" "}
            <Link href={unsubscribeUrl} style={{ color: c.muted, textDecoration: "underline" }}>
              Unsubscribe
            </Link>
          </Text>
          <Text style={{ color: c.faint, fontSize: "12px", lineHeight: "19px", margin: 0 }}>
            Not affiliated with any airline.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

WaitlistConfirmation.PreviewProps = {
  firstName: "Jia Li",
  unsubscribeUrl: "https://crewjio.com/unsubscribe?t=preview",
  siteUrl: "https://crewjio.com",
} satisfies Props;
