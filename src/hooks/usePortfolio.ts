'use client';

import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useUser } from '@/hooks/useUser';

export function usePortfolio() {
  const store = usePortfolioStore();
  const { user } = useUser();
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      store.initialize();
    }
  }, [user]);

  return store;
}
