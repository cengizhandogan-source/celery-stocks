'use client';

import { useContext, createContext } from 'react';

export interface AuthGateContextValue {
  requireAuth: (action?: string) => boolean;
}

export const AuthGateContext = createContext<AuthGateContextValue>({
  requireAuth: () => false,
});

export function useAuthGate() {
  return useContext(AuthGateContext);
}
