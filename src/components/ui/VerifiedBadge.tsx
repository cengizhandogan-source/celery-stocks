interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  pulse?: boolean;
}

export default function VerifiedBadge({ size = 14, className = 'text-gold', pulse = true }: VerifiedBadgeProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`shrink-0 ${className}`}
      aria-label="Verified"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.4 14.2l-3.8-3.8 1.4-1.4 2.4 2.4 5.6-5.6 1.4 1.4-7 7z" />
    </svg>
  );
  if (!pulse) return svg;
  return <span className="verified-pulse">{svg}</span>;
}
