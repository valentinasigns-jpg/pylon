import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'><rect width='18' height='18' fill='%230A0A0A'/><path d='M2 16 L9 2 L16 16' fill='none' stroke='%2300FF9C' stroke-width='1.6'/><path d='M5.2 10.5 H12.8' stroke='%2300FF9C' stroke-width='1.6'/></svg>",
      },
    ],
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
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
