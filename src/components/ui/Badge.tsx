'use client';

const variants = {
  default: 'bg-white/5 text-text-secondary',
  green: 'bg-up-dim text-up',
  red: 'bg-down-dim text-down',
  amber: 'bg-amber/15 text-amber',
  cyan: 'bg-cyan/15 text-cyan',
};

interface BadgeProps {
  text: string;
  variant?: keyof typeof variants;
}

export default function Badge({ text, variant = 'default' }: BadgeProps) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xxs font-mono uppercase ${variants[variant]}`}>
      {text}
    </span>
  );
}
