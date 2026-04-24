import { formatNetWorth } from '@/lib/formatters';

interface NetWorthBadgeProps {
  netWorth: number | null | undefined;
  showNetWorth?: boolean;
}

export default function NetWorthBadge({ netWorth, showNetWorth }: NetWorthBadgeProps) {
  if (!showNetWorth || netWorth == null) return null;

  return (
    <span className="text-xxs font-mono text-profit shrink-0">
      {formatNetWorth(netWorth)}
    </span>
  );
}
