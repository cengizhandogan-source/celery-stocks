'use client'

import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, type AuthState } from '../actions'

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, { error: null } as AuthState)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/social'

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <h1 className="text-base font-mono text-text-primary uppercase tracking-widest mb-6 text-center">
        Sign In
      </h1>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label htmlFor="email" className="block text-xxs font-mono text-text-muted uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 text-sm font-mono bg-input border border-border rounded text-text-primary placeholder:text-text-muted focus:border-profit/50 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xxs font-mono text-text-muted uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 text-sm font-mono bg-input border border-border rounded text-text-primary placeholder:text-text-muted focus:border-profit/50 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p className="text-loss text-xs font-mono">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-surface border border-border rounded font-mono text-sm text-text-primary uppercase tracking-wider hover:border-profit/50 hover:text-profit transition-colors disabled:opacity-50"
        >
          {pending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-xxs font-mono text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-text-secondary hover:text-profit transition-colors">
          Sign Up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
