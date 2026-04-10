'use client';

const sizes = {
  sm: 'w-3 h-3',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-text-muted border-t-cyan`}
    />
  );
}
