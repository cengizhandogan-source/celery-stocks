'use client';

import Image from 'next/image';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      <Image
        src="/celery-logo.png"
        alt="Celery Stocks"
        width={120}
        height={120}
        className="opacity-30 mb-4"
        priority
      />
      <div className="text-4xl font-mono font-bold tracking-widest text-text-muted/30">
        CELERY STOCKS
      </div>
      <p className="mt-4 text-sm text-text-muted">
        Press <span className="text-text-secondary">+</span> or{' '}
        <span className="text-text-secondary">&#8984;K</span> to add your first window
      </p>
    </div>
  );
}
