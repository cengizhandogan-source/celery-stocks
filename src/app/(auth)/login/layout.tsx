import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Celery Stocks to access real-time stock quotes, portfolio tracking, financial analysis, and your personalized terminal dashboard.",
  openGraph: {
    title: "Sign In to Celery Stocks",
    description:
      "Access your professional financial terminal with real-time market data and AI-powered analysis.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
