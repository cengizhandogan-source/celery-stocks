import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Coinly to share verified trades, follow other crypto traders, track your net worth, and chat in real time.",
  openGraph: {
    title: "Sign In to Coinly",
    description:
      "The social network for crypto traders. Share verified trades, follow traders, and chat in real time.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
