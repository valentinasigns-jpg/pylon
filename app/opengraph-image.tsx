import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "PYLON — Every block on Robinhood Chain, as it lands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0A0A0A";
const FG = "#EDEDED";
const DIM = "#7A7A7A";
const LINE = "#1F1F1F";
const ACCENT = "#00FF9C";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          // the same 64px field the site runs
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.030) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.030) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          padding: "56px 64px",
          fontFamily: "monospace",
        }}
      >
        {/* header rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${LINE}`,
            paddingBottom: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="34" height="34" viewBox="0 0 32 32">
              <path d="M4 27 L16 5 L28 27" fill="none" stroke={ACCENT} strokeWidth="2.4" />
              <path d="M9.6 17.5 H22.4" stroke={ACCENT} strokeWidth="2.4" />
            </svg>
            <div
              style={{
                fontSize: 30,
                color: FG,
                letterSpacing: "-0.02em",
                fontWeight: 600,
              }}
            >
              PYLON
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 17,
              color: ACCENT,
              letterSpacing: "0.16em",
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 9,
                background: ACCENT,
                display: "flex",
              }}
            />
            LIVE
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 74,
              lineHeight: 1.04,
              color: FG,
              letterSpacing: "-0.03em",
              fontWeight: 600,
              textTransform: "uppercase",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Every block on</div>
            <div>Robinhood Chain,</div>
            <div style={{ color: ACCENT }}>as it lands.</div>
          </div>
          <div style={{ fontSize: 21, color: DIM, display: "flex" }}>
            Public, read-only. No login, no wallet, no tracking.
          </div>
        </div>

        {/* footer rail */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 22,
            fontSize: 17,
            color: DIM,
            letterSpacing: "0.1em",
          }}
        >
          <div style={{ display: "flex" }}>ARBITRUM ORBIT · CHAIN ID 4663</div>
          <div style={{ display: "flex" }}>BLOCKS · GAS · EQUITIES</div>
        </div>
      </div>
    ),
    size,
  );
}
