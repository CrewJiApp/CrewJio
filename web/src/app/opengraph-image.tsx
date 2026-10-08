import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link preview for Instagram bios, WhatsApp and iMessage.
export const alt = "CrewJio: find the days you're both home";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const icon = await readFile(join(process.cwd(), "public/brand/icon.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(900px 500px at 100% 0%, rgba(245,182,66,0.16), transparent 70%), #0E1726",
          color: "#EEF2F7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={iconSrc} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            Crew<span style={{ color: "#F5B642" }}>Jio</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, maxWidth: 900 }}>
            Find the days you&apos;re both home.
          </div>
          <div style={{ fontSize: 32, color: "#9AA8BF" }}>Roster sharing for SG cabin crew and pilots</div>
        </div>
      </div>
    ),
    size,
  );
}
