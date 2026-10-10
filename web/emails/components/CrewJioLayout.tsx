import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * CrewJio base email layout. Every email we send (waitlist, beta invites,
 * updates, account emails) should use this so they all look the same.
 *
 * Brand: navy #0E1726, card #17233A, amber #F5B642, teal #4FD1C5. DM Sans.
 * Images are served from crewjio.com/email/ (web/public/email/).
 */

export const SITE_URL = "https://crewjio.com";
const ASSETS = `${SITE_URL}/email`;

export const colors = {
  bg: "#0E1726",
  card: "#17233A",
  line: "#24324D",
  text: "#EEF2F7",
  body: "#C8D1DE",
  muted: "#8593A8",
  amber: "#F5B642",
  teal: "#4FD1C5",
};

const font =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

type LayoutProps = {
  /** Shown in the inbox list after the subject. Keep it under ~90 characters. */
  preview: string;
  children: ReactNode;
  /** One line: why the person is getting this email. */
  reason?: string;
  /** Leave out only for emails people can't opt out of (e.g. sign-in codes). */
  unsubscribeUrl?: string;
};

export function CrewJioLayout({
  preview,
  children,
  reason = "You're getting this because you joined the CrewJio waitlist at crewjio.com.",
  unsubscribeUrl,
}: LayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        {/* DM Sans loads in Apple Mail and some others; everyone else falls back to system fonts */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- an email, not a Next.js page */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, margin: 0, padding: "32px 0", fontFamily: font }}>
        <Container style={{ maxWidth: 560, width: "100%", margin: "0 auto", padding: "0 16px" }}>
          {/* Header */}
          <Section style={{ padding: "8px 4px 20px" }}>
            <Link href={SITE_URL}>
              <Img
                src={`${ASSETS}/crewjio-wordmark@2x.png`}
                width="176"
                height="48"
                alt="CrewJio"
                style={{ display: "block", border: 0 }}
              />
            </Link>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Two flight paths: amber + teal top rule */}
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={{ height: 4, backgroundColor: colors.amber, width: "50%" }} />
                  <td style={{ height: 4, backgroundColor: colors.teal, width: "50%" }} />
                </tr>
              </tbody>
            </table>
            <Section style={{ padding: "32px 32px 28px" }}>{children}</Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "24px 4px 8px" }}>
            <Text style={footerText}>{reason}</Text>
            <Text style={footerText}>
              {unsubscribeUrl ? (
                <>
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Unsubscribe
                  </Link>
                  {"  ·  "}
                </>
              ) : null}
              <Link href={SITE_URL} style={footerLink}>
                crewjio.com
              </Link>
              {"  ·  "}
              <Link href="https://instagram.com/crewjio" style={footerLink}>
                Instagram
              </Link>
            </Text>
            <Text style={footerText}>CrewJio · Singapore · Not affiliated with any airline.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ---------- Building blocks for email bodies ---------- */

export function H1({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        color: colors.text,
        fontSize: 26,
        lineHeight: "32px",
        fontWeight: 700,
        letterSpacing: "-0.4px",
        margin: "0 0 16px",
        fontFamily: font,
      }}
    >
      {children}
    </Heading>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Text style={{ color: colors.body, fontSize: 16, lineHeight: "26px", margin: "0 0 16px", fontFamily: font }}>
      {children}
    </Text>
  );
}

/** Amber pill button. 48px tall so it's easy to tap. */
export function CTA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.amber,
          color: colors.bg,
          fontSize: 16,
          fontWeight: 700,
          borderRadius: 12,
          padding: "14px 24px",
          textDecoration: "none",
          display: "inline-block",
          fontFamily: font,
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: colors.line, borderTopWidth: 1, margin: "8px 0 20px" }} />;
}

/** Sign-off from Nick. */
export function SignOff({ name = "Nick", role = "CrewJio" }: { name?: string; role?: string }) {
  return (
    <Text style={{ color: colors.body, fontSize: 16, lineHeight: "26px", margin: 0, fontFamily: font }}>
      — {name}, <span style={{ color: colors.amber }}>{role}</span>
    </Text>
  );
}

const footerText = {
  color: colors.muted,
  fontSize: 12,
  lineHeight: "18px",
  margin: "0 0 6px",
  fontFamily: font,
};
const footerLink = { color: colors.muted, textDecoration: "underline" };
