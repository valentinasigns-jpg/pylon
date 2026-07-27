import { ImageResponse } from "next/og";

// iOS ignores SVG touch icons, so this is rendered to PNG at build time.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          backgroundImage:
            "linear-gradient(to right, rgba(0,255,156,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,156,0.10) 1px, transparent 1px)",
          backgroundSize: "45px 45px",
        }}
      >
        <svg width="128" height="128" viewBox="0 0 180 180">
          <path
            d="M26 148 L90 30 L154 148"
            fill="none"
            stroke="#00FF9C"
            strokeWidth="12"
          />
          <path d="M56 93 H124" stroke="#00FF9C" strokeWidth="12" />
          <path d="M90 30 V148" stroke="#00FF9C" strokeWidth="5" opacity="0.5" />
          <circle cx="90" cy="30" r="9" fill="#00FF9C" />
        </svg>
      </div>
    ),
    size,
  );
}
