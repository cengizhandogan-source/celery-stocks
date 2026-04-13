import { formatNetWorth } from '@/lib/formatters';

interface NetWorthBadgeProps {
  netWorth: number | null | undefined;
  showNetWorth?: boolean;
}

export default function NetWorthBadge({ netWorth, showNetWorth }: NetWorthBadgeProps) {
  if (!showNetWorth || netWorth == null) return null;

  return (
    <span className="text-xxs font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0">
      {formatNetWorth(netWorth)}
    </span>
  );
}
