import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@/styles/theme.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ConditionalAppShell } from "@/components/layout/ConditionalAppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RealWebWins Research System",
  description:
    "Validate business ideas in minutes with an AI research vault powered by Claude and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  // TODO: Get auth state from Supabase session
  // For now, hardcoded - will be replaced with actual auth check
  const isAuthenticated = false;
  const userEmail = undefined;
  const userTier = 'free' as const;

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {plausibleDomain ? (
          <Script
            src="https://plausible.io/js/script.js"
            data-domain={plausibleDomain}
            strategy="lazyOnload"
          />
        ) : null}

        <ConditionalAppShell
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          userTier={userTier}
        >
          {children}
        </ConditionalAppShell>

        <FeedbackWidget />
      </body>
    </html>
  );
}
