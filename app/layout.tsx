import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { GridField } from "@/components/grid-field";
import { Heartbeat } from "@/components/heartbeat";
import { SectionIndex } from "@/components/section-index";
import { KeyboardShortcuts } from "@/components/keyboard";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Absolute URLs in the metadata (notably og:image) have to point at the
 * host this deployment actually answers on. Hardcoding one meant the OG
 * card resolved against a domain this project does not own.
 */
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PYLON — Prove the draw wasn't rigged",
    template: "%s — PYLON",
  },
  description:
    "Verifiable winner selection for giveaways and airdrops on Robinhood Chain. Commit a list, draw with an oracle nobody controls, and let anyone recompute the result offline.",
  openGraph: {
    title: "PYLON — Prove the draw wasn't rigged",
    description:
      "Commit a list of entrants, draw from it with an oracle nobody controls, and let anyone recompute the winners offline.",
    siteName: "PYLON",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PYLON — Prove the draw wasn't rigged",
    description:
      "Commit a list of entrants, draw from it with an oracle nobody controls, and let anyone recompute the winners offline.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body>
        <GridField />
        <Heartbeat />
        <Header />
        {children}
        <Footer />
        <SectionIndex />
        <KeyboardShortcuts />
      </body>
    </html>
  );
}
