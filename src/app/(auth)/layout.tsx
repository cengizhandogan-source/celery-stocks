import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center px-4">
      <div className="flex-1 w-full max-w-sm flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <Image src="/coinly-logo.webp" alt="" width={96} height={96} priority />
          <span
            className="text-5xl font-bold text-text-primary tracking-tight"
            style={{ fontFamily: "var(--font-exo2), system-ui, sans-serif" }}
          >
            Coinly
          </span>
        </div>
        {children}
      </div>
      <a
        href="https://epertechnologies.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors pb-6 pt-8"
      >
        <Image src="/eper-logo.webp" alt="" width={14} height={14} className="opacity-80" />
        Built by Eper Technologies
      </a>
    </div>
  )
}
