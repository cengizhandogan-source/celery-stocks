'use client';

const commands = [
  { command: '/chart', code: '/cht', shortcut: 'Ctrl+1', label: 'Chart', requiresSymbol: true, description: 'Display stock chart with technical analysis' },
  { command: '/watchlist', code: '/wtl', shortcut: 'Ctrl+2', label: 'Watchlist', requiresSymbol: false, description: 'Open watchlist panel' },
  { command: '/news', code: '/nws', shortcut: 'Ctrl+3', label: 'News Feed', requiresSymbol: false, description: 'Display financial news feed' },
  { command: '/market', code: '/mkt', shortcut: 'Ctrl+4', label: 'Market Overview', requiresSymbol: false, description: 'Display market overview indices' },
  { command: '/detail', code: '/dtl', shortcut: 'Ctrl+5', label: 'Stock Detail', requiresSymbol: true, description: 'Show detailed stock information' },
  { command: '/monitor', code: '/qm', shortcut: 'Ctrl+6', label: 'Quote Monitor', requiresSymbol: false, description: 'Monitor multiple stock quotes' },
  { command: '/focus', code: '/fcs', shortcut: 'Ctrl+7', label: 'Focus View', requiresSymbol: true, description: 'Focused view for a single symbol' },
  { command: '/most', code: '/mst', shortcut: 'Ctrl+8', label: 'Most Active', requiresSymbol: false, description: 'Display most active stocks' },
  { command: '/financials', code: '/fin', shortcut: 'Ctrl+9', label: 'Financials', requiresSymbol: true, description: 'Show financial statements' },
  { command: '/holders', code: '/hld', shortcut: 'Ctrl+Shift+H', label: 'Holders', requiresSymbol: true, description: 'Display major stock holders' },
  { command: '/filings', code: '/flg', shortcut: 'Ctrl+Shift+G', label: 'SEC Filings', requiresSymbol: true, description: 'Show SEC filings' },
  { command: '/chatroom', code: '/cr', shortcut: 'Ctrl+Shift+R', label: 'Chatroom', requiresSymbol: false, description: 'Open chatroom' },
  { command: '/dm', code: '/dm', shortcut: 'Ctrl+Shift+X', label: 'Direct Messages', requiresSymbol: false, description: 'Open direct messages' },
  { command: '/feed', code: '/fd', shortcut: 'Ctrl+Shift+Y', label: 'Feed', requiresSymbol: false, description: 'Open the feed' },
  { command: '/crypto', code: '/cry', shortcut: 'Ctrl+Shift+K', label: 'Crypto Overview', requiresSymbol: false, description: 'Show cryptocurrency overview' },
]

export default function CommandsPage() {
  return (
    <div className="h-screen overflow-y-auto bg-terminal-bg font-mono text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <img src="/celery-logo.png" alt="" width={20} height={20} className="opacity-60" />
          <span className="text-xs text-text-muted tracking-widest uppercase">Celery Stocks</span>
        </div>
        <h1 className="text-2xl text-text-primary font-medium mb-1">Terminal Commands</h1>
        <p className="text-sm text-text-secondary mb-10">
          Reference for all available commands, shortcodes, and keyboard shortcuts.
        </p>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="text-xs text-text-muted tracking-widest uppercase mb-4">Usage</h2>
          <div className="bg-terminal-panel border border-terminal-border rounded-md p-5 space-y-3">
            <div>
              <p className="text-sm text-text-secondary mb-2">Commands can be entered in the command bar (<kbd className="text-amber">⌘K</kbd> to focus):</p>
              <div className="space-y-1.5 text-data">
                <p><span className="text-amber">/chart</span> <span className="text-text-muted">AAPL</span> <span className="text-text-muted ml-4">— full command with symbol</span></p>
                <p><span className="text-amber">/cht</span> <span className="text-text-muted">AAPL</span> <span className="text-text-muted ml-4">— shortcode with symbol</span></p>
                <p><span className="text-amber">/ch</span> <span className="text-text-muted">+ Tab</span> <span className="text-text-muted ml-4">— auto-completes to /chart</span></p>
                <p><span className="text-text-muted">Ctrl+1</span> <span className="text-text-muted ml-4">— keyboard shortcut (uses active symbol)</span></p>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Commands marked with <span className="text-cyan">●</span> require a symbol. Pass it after the command or set an active symbol first.
            </p>
          </div>
        </section>

        {/* Commands Table */}
        <section className="mb-10">
          <h2 className="text-xs text-text-muted tracking-widest uppercase mb-4">Commands</h2>
          <div className="bg-terminal-panel border border-terminal-border rounded-md overflow-hidden">
            <table className="w-full text-data">
              <thead>
                <tr className="border-b border-terminal-border text-text-muted text-left">
                  <th className="px-4 py-2.5 font-normal">Command</th>
                  <th className="px-4 py-2.5 font-normal">Code</th>
                  <th className="px-4 py-2.5 font-normal">Shortcut</th>
                  <th className="px-4 py-2.5 font-normal hidden sm:table-cell">Description</th>
                  <th className="px-4 py-2.5 font-normal text-center">Sym</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd) => (
                  <tr key={cmd.command} className="border-b border-terminal-border last:border-0 hover:bg-terminal-hover">
                    <td className="px-4 py-2.5 text-amber">{cmd.command}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{cmd.code}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{cmd.shortcut}</td>
                    <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell">{cmd.description}</td>
                    <td className="px-4 py-2.5 text-center">{cmd.requiresSymbol ? <span className="text-cyan">●</span> : <span className="text-text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="mb-10">
          <h2 className="text-xs text-text-muted tracking-widest uppercase mb-4">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-terminal-panel border border-terminal-border rounded-md p-4">
              <h3 className="text-xs text-text-muted mb-3 uppercase tracking-wide">Ctrl + Number</h3>
              <div className="space-y-1.5 text-data">
                <Row shortcut="Ctrl+1" label="Chart" />
                <Row shortcut="Ctrl+2" label="Watchlist" />
                <Row shortcut="Ctrl+3" label="News Feed" />
                <Row shortcut="Ctrl+4" label="Market Overview" />
                <Row shortcut="Ctrl+5" label="Stock Detail" />
                <Row shortcut="Ctrl+6" label="Quote Monitor" />
                <Row shortcut="Ctrl+7" label="Focus View" />
                <Row shortcut="Ctrl+8" label="Most Active" />
                <Row shortcut="Ctrl+9" label="Financials" />
              </div>
            </div>
            <div className="bg-terminal-panel border border-terminal-border rounded-md p-4">
              <h3 className="text-xs text-text-muted mb-3 uppercase tracking-wide">Ctrl + Shift + Letter</h3>
              <div className="space-y-1.5 text-data">
                <Row shortcut="Ctrl+Shift+H" label="Holders" />
                <Row shortcut="Ctrl+Shift+G" label="SEC Filings" />
                <Row shortcut="Ctrl+Shift+R" label="Chatroom" />
                <Row shortcut="Ctrl+Shift+X" label="Direct Messages" />
                <Row shortcut="Ctrl+Shift+Y" label="Ideas Feed" />
                <Row shortcut="Ctrl+Shift+K" label="Crypto Overview" />
                <Row shortcut="Ctrl+Shift+I" label="AI Chat" />
              </div>
            </div>
          </div>
        </section>

        {/* Global */}
        <section className="mb-10">
          <h2 className="text-xs text-text-muted tracking-widest uppercase mb-4">Global</h2>
          <div className="bg-terminal-panel border border-terminal-border rounded-md p-4">
            <div className="space-y-1.5 text-data">
              <Row shortcut="⌘K / Ctrl+K" label="Focus command bar" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-xs text-text-muted pt-4 border-t border-terminal-border flex items-center justify-between">
          <span>celery-stocks terminal v1.0</span>
          <button
            onClick={() => window.close()}
            className="px-3 py-1.5 text-xs font-mono text-text-secondary hover:text-text-primary bg-terminal-panel border border-terminal-border rounded hover:border-terminal-border-strong transition-colors cursor-pointer"
          >
            ← Back to terminal
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{shortcut}</span>
      <span className="text-text-muted">{label}</span>
    </div>
  )
}
