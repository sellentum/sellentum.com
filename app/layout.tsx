import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "Findly — Guided selling that feels human",
  description: "Build AI-powered product finders that turn product choice into confident purchases.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${body.variable} ${display.variable}`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
