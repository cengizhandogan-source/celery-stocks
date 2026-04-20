import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import AuthGateProvider from "@/components/auth/AuthGateProvider";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://coinly.club";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Coinly — Trade. Verify. Share.",
    template: "%s | Coinly",
  },
  description:
    "The social network for crypto traders. Share verified trades and positions from your connected exchanges, follow other traders, and chat in real time.",
  keywords: [
    "crypto social",
    "verified trades",
    "trader feed",
    "share trades",
    "share positions",
    "crypto portfolio",
    "trader community",
    "crypto chat",
  ],
  authors: [{ name: "Coinly" }],
  creator: "Coinly",
  publisher: "Coinly",
  applicationName: "Coinly",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Coinly",
    title: "Coinly — Trade. Verify. Share.",
    description:
      "The social network for crypto traders. Share verified trades from connected exchanges, follow traders, and chat in real time.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Coinly — Trade. Verify. Share.",
    description:
      "The social network for crypto traders. Share verified trades from connected exchanges, follow traders, and chat in real time.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "finance",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Coinly",
      url: siteUrl,
      description:
        "Social network for crypto traders: share verified trades and positions from connected exchanges, follow other traders, and chat in real time.",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Social feed of verified trade and position posts",
        "Connect crypto exchanges to share trades automatically",
        "Public profiles with portfolio net worth",
        "Real-time direct messages and chatrooms",
        "Follow other traders",
      ],
    },
    {
      "@type": "Organization",
      name: "Coinly",
      url: siteUrl,
      logo: `${siteUrl}/coinly-logo.png`,
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${inter.variable} dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-mono bg-base text-text-primary antialiased">
        <AuthGateProvider>
          {children}
        </AuthGateProvider>
      </body>
    </html>
  );
}
