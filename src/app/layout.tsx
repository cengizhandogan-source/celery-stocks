import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Exo_2 } from "next/font/google";
import Link from "next/link";
import { EperBadge } from "@/components/ui/EperBadge";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
  authors: [{ name: "Eper Technologies", url: "https://epertechnologies.com" }],
  creator: "Eper Technologies",
  publisher: "Eper Technologies",
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
        "Real-time direct messages",
        "Follow other traders",
      ],
      publisher: {
        "@type": "Organization",
        name: "Eper Technologies",
        url: "https://epertechnologies.com",
      },
    },
    {
      "@type": "Organization",
      name: "Coinly",
      url: siteUrl,
      logo: `${siteUrl}/coinly-logo.png`,
    },
    {
      "@type": "Organization",
      name: "Eper Technologies",
      url: "https://epertechnologies.com",
      logo: `${siteUrl}/eper-logo.png`,
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${instrumentSans.variable} ${exo2.variable} dark`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans bg-base text-text-primary antialiased">
        {children}
        <Link
          href="/disclaimer"
          className="fixed bottom-3 right-3 z-40 text-[10px] uppercase tracking-wider text-text-muted hover:text-gold transition-colors px-2 py-1 rounded-md bg-base/70 backdrop-blur-sm border border-border/50"
        >
          Not investment advice
        </Link>
        <EperBadge />
      </body>
    </html>
  );
}
