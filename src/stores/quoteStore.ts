'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import type { Quote } from '@/lib/types';

interface QuoteEntry {
  quote: Quote | null;
  expiry: number;
}

const TTL_MS = 30_000;
const inflight = new Map<string, Promise<Quote | null>>();

interface QuoteState {
  quotes: Map<string, QuoteEntry>;
  fetchQuote: (symbol: string) => Promise<Quote | null>;
}

export const useQuoteStore = create<QuoteState>()((set, get) => ({
  quotes: new Map(),

  fetchQuote: async (symbol) => {
    const cached = get().quotes.get(symbol);
    if (cached && Date.now() < cached.expiry) return cached.quote;

    const existing = inflight.get(symbol);
    if (existing) return existing;

    const promise = fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((data) => {
        const quote: Quote | null = data.quote ?? null;
        set((s) => {
          const next = new Map(s.quotes);
          next.set(symbol, { quote, expiry: Date.now() + TTL_MS });
          return { quotes: next };
        });
        return quote;
      })
      .catch(() => null)
      .finally(() => {
        inflight.delete(symbol);
      });

    inflight.set(symbol, promise);
    return promise;
  },
}));

export function useQuote(symbol: string | null | undefined): Quote | null {
  const quote = useQuoteStore((s) => (symbol ? s.quotes.get(symbol)?.quote ?? null : null));
  const fetchQuote = useQuoteStore((s) => s.fetchQuote);

  useEffect(() => {
    if (symbol) void fetchQuote(symbol);
  }, [symbol, fetchQuote]);

  return quote;
}
