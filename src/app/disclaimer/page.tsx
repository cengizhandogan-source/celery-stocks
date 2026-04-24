import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Coinly is a social platform where users share their own crypto and investment positions and ideas. Nothing on Coinly is investment advice.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/disclaimer" },
};

const LAST_UPDATED = "April 24, 2026";

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-base text-text-primary px-5 py-16 sm:py-24">
      <article className="mx-auto max-w-2xl">
        <header className="mb-10 border-b border-border/60 pb-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold mb-3">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Disclaimer
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Last updated {LAST_UPDATED}
          </p>
        </header>

        <div className="space-y-8 text-[15px] leading-relaxed text-text-secondary">
          <p className="text-text-primary">
            Coinly is a social platform. It exists so people can share their
            own crypto and other investment asset positions, portfolios, and
            ideas with other users. It is not a financial service, a broker,
            an adviser, or a source of recommendations. Please read the full
            disclaimer below before relying on anything you see on the
            platform.
          </p>

          <Section title="1. Nothing on Coinly is investment advice">
            <p>
              All content on Coinly — including posts, comments, portfolios,
              positions, profile pages, charts, numbers, emoji reactions, and
              any in-app messaging — is published by users about their own
              activity. It is personal opinion and commentary. It is not
              financial advice, investment advice, tax advice, legal advice,
              or an accounting opinion. It is not a recommendation,
              solicitation, endorsement, or offer to buy, sell, hold, short,
              stake, lend, borrow, bridge, swap, or otherwise transact in any
              asset, token, security, derivative, or financial instrument.
            </p>
          </Section>

          <Section title="2. No advisory relationship">
            <p>
              Using Coinly does not create a fiduciary, advisory, brokerage,
              custodial, or client relationship of any kind between you and
              Coinly, its operators, its employees, its contractors, or other
              users. Coinly is not registered as a broker-dealer, investment
              adviser, commodity trading advisor, money transmitter, or
              financial institution in any jurisdiction.
            </p>
            <p>
              When you connect an exchange, Coinly reads position and trade
              data only so it can be displayed on your profile and in your
              posts. Coinly does not execute trades for you, hold your funds,
              rebalance your portfolio, or take custody of any assets.
            </p>
          </Section>

          <Section title="3. User-generated content is unverified">
            <p>
              Posts and profiles on Coinly are authored by users. Coinly does
              not independently verify claims about profitability, strategy,
              identity, intent, credentials, or outcomes. Exchange-sourced
              data shown on the platform can be delayed, incomplete, cached,
              mislabeled, or incorrect for reasons outside of our control
              (exchange outages, API limits, account permissions, forks,
              airdrops, corporate actions, and so on).
            </p>
            <p>
              Users may be mistaken, biased, sponsored, or acting in their own
              interest. A position shown on a profile may have been closed,
              hedged, or reversed before you see it. Treat everything you read
              as someone telling you a story about their own trades — not as a
              statement of fact and not as guidance for your own decisions.
            </p>
          </Section>

          <Section title="4. Crypto and other assets are high-risk">
            <p>
              Cryptocurrencies, tokens, NFTs, DeFi positions, derivatives,
              equities, commodities, and other investment assets carry
              substantial risk, including the risk of total loss. These risks
              include but are not limited to: extreme price volatility,
              illiquidity, smart-contract bugs and exploits, protocol
              governance changes, custody and self-custody risk, exchange
              insolvency, rug pulls, phishing, regulatory action, tax
              consequences, forks, depegs, oracle failure, bridge failure,
              MEV, and slippage.
            </p>
            <p>
              Past performance — whether shown in a post, a chart, a portfolio
              history, or a leaderboard — is not indicative of, and does not
              guarantee, future results. Gains shown on the platform can
              disappear instantly. Do not risk money you cannot afford to
              lose.
            </p>
          </Section>

          <Section title="5. Do your own research">
            <p>
              Any decision to buy, sell, hold, or otherwise transact in an
              asset is your decision alone. You should conduct your own
              independent research, perform your own due diligence, and
              consult qualified, licensed professionals — such as a financial
              adviser, tax professional, or attorney licensed in your
              jurisdiction — before acting on anything you encounter on
              Coinly.
            </p>
          </Section>

          <Section title="6. Jurisdictional limits">
            <p>
              Coinly is made available on a worldwide basis, but nothing on
              the platform constitutes an offer, solicitation, or invitation
              to any person in any jurisdiction where such an offer or
              solicitation would be unlawful or unauthorized, or to any
              person to whom it would be unlawful to make such an offer or
              solicitation. You are solely responsible for complying with the
              laws, regulations, and sanctions that apply to you, including
              those governing securities, commodities, derivatives, tax, and
              anti-money-laundering in your jurisdiction.
            </p>
          </Section>

          <Section title="7. No liability">
            <p>
              To the maximum extent permitted by applicable law, Coinly and
              its operators, affiliates, officers, employees, and agents will
              not be liable for any direct, indirect, incidental, special,
              consequential, exemplary, or punitive damages — including loss
              of profits, loss of data, loss of goodwill, or trading losses —
              arising out of or in connection with your use of, or your
              reliance on, any content on the platform, whether based on
              warranty, contract, tort (including negligence), or any other
              legal theory, and whether or not we were advised of the
              possibility of such damages.
            </p>
            <p>
              The platform and all content are provided on an &ldquo;as
              is&rdquo; and &ldquo;as available&rdquo; basis, without
              warranties of any kind, express or implied.
            </p>
          </Section>

          <Section title="8. Changes to this disclaimer">
            <p>
              We may update this disclaimer from time to time to reflect
              changes to the product, the law, or our practices. The updated
              version will be posted on this page with a new &ldquo;Last
              updated&rdquo; date. Your continued use of Coinly after we post
              changes means you accept the updated disclaimer.
            </p>
          </Section>
        </div>

        <footer className="mt-12 border-t border-border/60 pt-6 text-sm text-text-muted">
          <Link
            href="/"
            className="hover:text-gold transition-colors"
          >
            ← Back to Coinly
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}
