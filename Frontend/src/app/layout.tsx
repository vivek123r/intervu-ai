import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Intervu AI — Interview preparation that compounds",
    template: "%s · Intervu AI",
  },
  description:
    "Calendar-aware interview preparation, realistic adaptive mock interviews, and evidence-based coaching for the role you actually want.",
  applicationName: "Intervu AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Intervu AI",
    description: "Turn every interview into your advantage.",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

const directionContract = `
<!--
DIRECTION CONTRACT — c124c7c4
THESIS: Intervu is a signal-calibration instrument; it refuses the interchangeable SaaS card grid.
OWN-WORLD: Black lacquer, charcoal instruments, warm-white type, sparse champagne-gold state, signal lines, and a reactive glass interviewer.
STORY: Calendar evidence becomes a focused plan, realistic practice, a legible report, and one obvious next action.
FIRST VIEWPORT: Editorial headline left; live readiness console right; primary action below the promise; floating navigation above both.
FORM: Signal-calibration console, direction 3 in the seeded order, seed c124c7c4.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <template
          data-direction-contract="c124c7c4"
          dangerouslySetInnerHTML={{ __html: directionContract }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
