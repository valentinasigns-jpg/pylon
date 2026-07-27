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

export const metadata: Metadata = {
  metadataBase: new URL("https://pylon.vercel.app"),
  title: {
    default: "PYLON — Every block on Robinhood Chain, as it lands",
    template: "%s — PYLON",
  },
  description:
    "A public, read-only dashboard for Robinhood Chain. Live blocks, gas, and tokenized equities. No login, no wallet, no tracking.",
  openGraph: {
    title: "PYLON — Every block on Robinhood Chain, as it lands",
    description:
      "Live blocks, gas and tokenized equities on Robinhood Chain. Public data, read-only.",
    siteName: "PYLON",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PYLON — Every block on Robinhood Chain, as it lands",
    description:
      "Live blocks, gas and tokenized equities on Robinhood Chain. Public data, read-only.",
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
