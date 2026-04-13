'use client'

import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, type AuthState } from '../actions'

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, { error: null } as AuthState)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/social'

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
      <h1 className="text-sm font-mono text-text-primary uppercase tracking-widest mb-6 text-center">
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
            className="w-full px-3 py-2 text-sm font-mono bg-terminal-input border border-terminal-border rounded text-text-primary placeholder:text-text-muted focus:border-up/50 focus:outline-none"
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
            className="w-full px-3 py-2 text-sm font-mono bg-terminal-input border border-terminal-border rounded text-text-primary placeholder:text-text-muted focus:border-up/50 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p className="text-down text-xs font-mono">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-terminal-panel border border-terminal-border rounded font-mono text-sm text-text-primary uppercase tracking-wider hover:border-up/50 hover:text-up transition-colors disabled:opacity-50"
        >
          {pending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

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
