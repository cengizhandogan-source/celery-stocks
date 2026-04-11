'use client';

import { useState, useEffect } from 'react';
import { getLogoUrl } from '@/lib/logoUrl';

// Module-level cache so fetches persist across re-renders
const logoCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

function fetchLogoUrl(symbol: string): Promise<string | null> {
  const existing = pendingFetches.get(symbol);
  if (existing) return existing;

  const promise = fetch(`/api/logo?symbol=${encodeURIComponent(symbol)}`)
    .then((res) => res.json())
    .then((data) => {
      const url = data.url as string | null;
      logoCache.set(symbol, url);
      pendingFetches.delete(symbol);
      return url;
    })
    .catch(() => {
      logoCache.set(symbol, null);
      pendingFetches.delete(symbol);
      return null;
    });

  pendingFetches.set(symbol, promise);
  return promise;
}

interface TickerLogoProps {
  symbol: string;
  website?: string;
  size?: number;
  className?: string;
}

export default function TickerLogo({ symbol, website, size = 20, className = '' }: TickerLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    // Try to resolve immediately (crypto or with website)
    if (website) return getLogoUrl(symbol, website);
    const cached = logoCache.get(symbol);
    if (cached !== undefined) return cached;
    return getLogoUrl(symbol);
  });
  const [resolved, setResolved] = useState(() => {
    return logoUrl !== null || logoCache.has(symbol);
  });

  useEffect(() => {
    if (resolved) return;

    // Fetch from API for stocks/ETFs without website
    fetchLogoUrl(symbol).then((url) => {
      setLogoUrl(url);
      setResolved(true);
    });
  }, [symbol, resolved]);

  // Reset error state when symbol changes
  useEffect(() => {
    setImgError(false);
    const cached = logoCache.get(symbol);
    if (website) {
      setLogoUrl(getLogoUrl(symbol, website));
      setResolved(true);
    } else if (cached !== undefined) {
      setLogoUrl(cached);
      setResolved(true);
    } else {
      const direct = getLogoUrl(symbol);
      if (direct) {
        setLogoUrl(direct);
        setResolved(true);
      } else {
        setResolved(false);
      }
    }
  }, [symbol, website]);

  // Show fallback: letter avatar
  if (!logoUrl || imgError) {
    const label = symbol.replace(/-.*$/, '').slice(0, 2);
    return (
      <span
        className={`flex items-center justify-center rounded bg-terminal-hover text-text-muted font-mono font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {label}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className={`pixel-logo rounded shrink-0 bg-terminal-hover ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
