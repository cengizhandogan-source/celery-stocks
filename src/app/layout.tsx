import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://celery-stocks.cengizhan-dogan.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Celery Stocks — Professional Financial Terminal",
    template: "%s | Celery Stocks",
  },
  description:
    "Real-time stock and crypto quotes, portfolio tracking, SEC filings, financial analysis, AI assistant, and collaborative chatrooms in a professional terminal interface.",
  keywords: [
    "stock terminal",
    "financial terminal",
    "stock quotes",
    "crypto quotes",
    "portfolio tracker",
    "SEC filings",
    "financial analysis",
    "stock screener",
    "market data",
    "AI financial assistant",
  ],
  authors: [{ name: "Celery Stocks" }],
  creator: "Celery Stocks",
  publisher: "Celery Stocks",
  applicationName: "Celery Stocks",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Celery Stocks",
    title: "Celery Stocks — Professional Financial Terminal",
    description:
      "Real-time stock and crypto quotes, portfolio tracking, SEC filings, financial analysis, and AI-powered insights in a terminal-style interface.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Celery Stocks — Professional Financial Terminal",
    description:
      "Real-time stock and crypto quotes, portfolio tracking, SEC filings, and AI-powered financial analysis.",
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
      name: "Celery Stocks",
      url: siteUrl,
      description:
        "Professional financial terminal with real-time stock and crypto quotes, portfolio tracking, SEC filings, financial analysis, AI assistant, and collaborative chatrooms.",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Real-time stock and cryptocurrency quotes",
        "Portfolio tracking and performance analysis",
        "SEC filings browser",
        "Financial statement analysis",
        "AI-powered financial assistant",
        "Collaborative chatrooms",
        "Stock screener",
        "Customizable terminal dashboard",
        "Market overview and most active stocks",
      ],
    },
    {
      "@type": "Organization",
      name: "Celery Stocks",
      url: siteUrl,
      logo: `${siteUrl}/celery-logo.png`,
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
      <body className="font-mono bg-terminal-bg text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
