import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free Celery Stocks account to access real-time stock and crypto quotes, portfolio tracking, SEC filings, and AI-powered financial analysis.",
  openGraph: {
    title: "Create a Celery Stocks Account",
    description:
      "Get started with your professional financial terminal. Free access to real-time market data, portfolio tracking, and AI assistant.",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
