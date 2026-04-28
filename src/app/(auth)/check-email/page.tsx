import Link from 'next/link'

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const loginHref = next ? `/login?redirectTo=${encodeURIComponent(next)}` : '/login'

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h1 className="text-base font-mono text-text-primary uppercase tracking-widest mb-6 text-center">
        Check Your Inbox
      </h1>
      <p className="text-sm text-text-primary mb-3">
        We&apos;ve sent a confirmation link to your email address. Click the link
        to verify your account.
      </p>
      <p className="text-sm text-text-muted">
        Once verified, you can{' '}
        <Link href={loginHref} className="text-profit hover:underline">log in</Link>.
      </p>
    </div>
  )
}
