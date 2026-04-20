export default function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        isOnline ? 'bg-profit' : 'bg-text-muted'
      }`}
    />
  );
}
