'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const MiniStockChartInner = dynamic(() => import('./MiniStockChartInner'), {
  ssr: false,
  loading: () => <div className="h-[100px] rounded bg-hover/50 animate-pulse" />,
});

export default function MiniStockChart({
  symbol,
  compact = false,
}: {
  symbol: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mt-2 mb-1">
      {visible && <MiniStockChartInner symbol={symbol} compact={compact} />}
    </div>
  );
}
