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
          <path d="M46 18 V162" fill="none" stroke="#00FF9C" strokeWidth="16" />
          <path
            d="M46 18 H134 V84 H46"
            fill="none"
            stroke="#00FF9C"
            strokeWidth="16"
          />
          <path
            d="M46 84 L134 18"
            fill="none"
            stroke="#00FF9C"
            strokeWidth="8"
            opacity="0.5"
          />
        </svg>
      </div>
    ),
    size,
  );
}
