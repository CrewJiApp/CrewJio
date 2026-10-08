import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const description =
  "Share rosters with your crew friends and partner, and find the days you're all home. For SG cabin crew and pilots. Join the waitlist.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CrewJio · Find the days you're both home",
  description,
  openGraph: {
    title: "CrewJio · Find the days you're both home",
    description,
    url: SITE_URL,
    siteName: "CrewJio",
    locale: "en_SG",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0E1726",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-SG" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-[100dvh] overflow-x-clip">
        <div className="ambient" aria-hidden />
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
