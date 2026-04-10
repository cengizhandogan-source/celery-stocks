'use client';

import { useState, useEffect, useRef } from 'react';
import { NewsArticle } from '@/lib/types';
import { NEWS_POLL_INTERVAL } from '@/lib/constants';

export function useNews(query: string) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch(`/api/news?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
          } else {
            setArticles(data.articles || []);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
          setLoading(false);
        }
      }
    }

    setLoading(true);
    fetchNews();

    intervalRef.current = setInterval(fetchNews, NEWS_POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [query]);

  return { articles, loading, error };
}
