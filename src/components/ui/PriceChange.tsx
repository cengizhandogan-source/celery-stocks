'use client';

import { formatChange, formatPercent } from '@/lib/formatters';

interface PriceChangeProps {
  change: number;
  changePercent: number;
  showPercent?: boolean;
}

export default function PriceChange({ change, changePercent, showPercent = true }: PriceChangeProps) {
  const color = change > 0 ? 'text-profit' : change < 0 ? 'text-loss' : 'text-text-secondary';

  return (
    <span className={`${color} font-mono`}>
      {formatChange(change)}
      {showPercent && ` (${formatPercent(changePercent)})`}
    </span>
  );
}
