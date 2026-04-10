'use client';

import { useNews } from '@/hooks/useNews';
import { timeAgo } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';

interface NewsPanelProps {
  query?: string;
}

export default function NewsPanel({ query }: NewsPanelProps) {
  const { articles, loading } = useNews(query || 'stock market');

  if (loading && articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        No news available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto" data-scrollable>
      {articles.map((article) => (
        <button
          key={article.id}
          onClick={() => window.open(article.url, '_blank')}
          className="block text-left px-3 py-2.5 border-b border-terminal-border hover:bg-terminal-hover cursor-pointer transition-colors"
        >
          <div className="text-sm text-text-primary font-medium leading-tight line-clamp-2">
            {article.title}
          </div>
          <div className="mt-1 text-xxs text-text-muted font-mono">
            {article.source} &mdash; {timeAgo(article.publishedAt)}
          </div>
        </button>
      ))}
    </div>
  );
}
