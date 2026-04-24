const variants = {
  default: 'bg-white/5 text-text-secondary',
  green: 'bg-profit-dim text-profit',
  red: 'bg-loss-dim text-loss',
  amber: 'bg-gold/15 text-gold',
  cyan: 'bg-info/15 text-info',
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
