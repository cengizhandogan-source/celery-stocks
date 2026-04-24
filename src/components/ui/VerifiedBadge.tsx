interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export default function VerifiedBadge({ size = 14, className = '' }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-label="Verified"
    >
      <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
      <path
        d="M7.5 12.5l3 3 6-6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
