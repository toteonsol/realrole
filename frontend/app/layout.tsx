import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sans = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "RealRole · Honest job postings on GenLayer",
  description: "Pay-transparency audits and bonded ghost-job pledges for public job postings, verified by GenLayer validator consensus.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
