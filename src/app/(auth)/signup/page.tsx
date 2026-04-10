'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signup, type AuthState } from '../actions'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, { error: null } as AuthState)
  const [clientError, setClientError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    const password = formData.get('password') as string
    const confirm = formData.get('confirmPassword') as string

    if (password !== confirm) {
      setClientError('Passwords do not match')
      return
    }

    setClientError(null)
    formAction(formData)
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
      <h1 className="text-sm font-mono text-text-primary uppercase tracking-widest mb-6 text-center">
        Create Account
      </h1>

      <form action={handleSubmit} className="space-y-4">
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
            minLength={6}
            className="w-full px-3 py-2 text-sm font-mono bg-terminal-input border border-terminal-border rounded text-text-primary placeholder:text-text-muted focus:border-up/50 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xxs font-mono text-text-muted uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 text-sm font-mono bg-terminal-input border border-terminal-border rounded text-text-primary placeholder:text-text-muted focus:border-up/50 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {(clientError || state.error) && (
          <p className="text-down text-xs font-mono">{clientError || state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-terminal-panel border border-terminal-border rounded font-mono text-sm text-text-primary uppercase tracking-wider hover:border-up/50 hover:text-up transition-colors disabled:opacity-50"
        >
          {pending ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs font-mono text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
