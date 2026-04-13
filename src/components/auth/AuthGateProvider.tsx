'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { AuthGateContext } from '@/hooks/useAuthGate';

export default function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const [modal, setModal] = useState<{ action: string } | null>(null);

  const requireAuth = useCallback(
    (action?: string): boolean => {
      if (user) return true;
      setModal({ action: action ?? 'continue' });
      return false;
    },
    [user]
  );

  const redirectTo = encodeURIComponent(pathname);

  return (
    <AuthGateContext value={{ requireAuth }}>
      {children}

      {/* Auth gate modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div
            className="bg-terminal-panel border border-terminal-border rounded-lg p-6 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-mono text-text-primary text-center mb-6">
              Sign in to {modal.action}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/login?redirectTo=${redirectTo}`}
                className="w-full py-2 bg-terminal-panel border border-up/40 rounded font-mono text-sm text-up text-center uppercase tracking-wider hover:bg-up/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/signup?redirectTo=${redirectTo}`}
                className="w-full py-2 bg-terminal-panel border border-terminal-border rounded font-mono text-sm text-text-secondary text-center uppercase tracking-wider hover:border-text-muted transition-colors"
              >
                Sign Up
              </Link>
            </div>
            <button
              onClick={() => setModal(null)}
              className="mt-4 w-full text-xxs font-mono text-text-muted hover:text-text-secondary text-center transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AuthGateContext>
  );
}
