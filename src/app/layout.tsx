import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ThemeProvider";
import { DesignStyleProvider, DESIGN_STYLE_INIT_SCRIPT } from "@/components/DesignStyleProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Map Timeline Visualizer",
  description:
    "Import a Google Maps Timeline export and see your journeys, places, and stats — processed entirely in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // THEME_INIT_SCRIPT sets data-theme on this element before hydration to avoid a
      // flash of the wrong theme; React only ever sees the default, so it's expected
      // (and harmless) for hydration to see that attribute already present.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: DESIGN_STYLE_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <DesignStyleProvider>{children}</DesignStyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
