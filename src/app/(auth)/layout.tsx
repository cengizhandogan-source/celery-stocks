export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/coinly-logo.png" alt="" width={24} height={24} className="opacity-60" />
          <span className="text-sm font-mono text-text-muted tracking-widest uppercase">
            Coinly
          </span>
        </div>
        <p className="text-center text-xs font-mono text-text-muted mb-6">
          Created by:{' '}
          <a href="https://www.linkedin.com/in/cengo" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition-colors">
            Cengizhan Dogan
          </a>
        </p>
        {children}
      </div>
    </div>
  )
}
